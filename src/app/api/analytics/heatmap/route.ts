// src/app/api/analytics/heatmap/route.ts
// =============================================================================
// Activity Heatmap Data
// =============================================================================
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================


/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subMonths, subYears, startOfDay, endOfDay, format, eachDayOfInterval, subDays } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, max-age=300',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  range: z.enum(['1w', '1m', '3m', '6m', '1y', 'all']).default('1y'),
  metric: z.enum(['problems', 'commits', 'time', 'activity']).default('activity'),
  platformId: z.string().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `analytics-heatmap:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

function calculateLevel(value: number, maxValue: number): 0 | 1 | 2 | 3 | 4 {
  if (value === 0) return 0;
  if (maxValue === 0) return 1;

  const ratio = value / maxValue;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Data-Type', 'heatmap');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/heatmap failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryValidation = querySchema.safeParse({
      range: searchParams.get('range') || '1y',
      metric: searchParams.get('metric') || 'activity',
      platformId: searchParams.get('platformId'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;

    // Calculate date range
    const endDate = endOfDay(new Date());
    let startDate: Date;

    switch (params.range) {
      case '1w':
        startDate = startOfDay(subDays(endDate, 7));
        break;
      case '1m':
        startDate = startOfDay(subMonths(endDate, 1));
        break;
      case '3m':
        startDate = startOfDay(subMonths(endDate, 3));
        break;
      case '6m':
        startDate = startOfDay(subMonths(endDate, 6));
        break;
      case 'all':
        startDate = startOfDay(subYears(endDate, 3)); // Max 3 years
        break;
      case '1y':
      default:
        startDate = startOfDay(subYears(endDate, 1));
        break;
    }

    // Build where clause
    const where: {
      userId: string;
      date: { gte: Date; lte: Date };
      platformId?: string;
    } = {
      userId,
      date: { gte: startDate, lte: endDate },
    };

    if (params.platformId) {
      where.platformId = params.platformId;
    }

    // Fetch entries
    const entries = await prisma.trackerEntry.findMany({
      where,
      select: {
        date: true,
        problemsSolved: true,
        commits: true,
        timeSpent: true,
        platform: { select: { name: true } },
      },
    });

    // Aggregate by date
    const dateMap = new Map<string, {
      problems: number;
      commits: number;
      time: number;
      platforms: Set<string>;
    }>();

    entries.forEach((entry: { date: Date; problemsSolved: number; commits: number; timeSpent: number; platform: { name: string } | null }) => {
      const dateKey = format(entry.date, 'yyyy-MM-dd');
      const existing = dateMap.get(dateKey) || {
        problems: 0,
        commits: 0,
        time: 0,
        platforms: new Set<string>(),
      };

      existing.problems += entry.problemsSolved;
      existing.commits += entry.commits;
      existing.time += entry.timeSpent;
      if (entry.platform) {
        existing.platforms.add(entry.platform.name);
      }

      dateMap.set(dateKey, existing);
    });

    // Generate all dates in range
    const allDates = eachDayOfInterval({ start: startDate, end: endDate });

    // Calculate max value for level calculation
    let maxValue = 0;
    dateMap.forEach(data => {
      let value: number;
      switch (params.metric) {
        case 'problems':
          value = data.problems;
          break;
        case 'commits':
          value = data.commits;
          break;
        case 'time':
          value = data.time;
          break;
        case 'activity':
        default:
          value = data.problems + data.commits + (data.time > 0 ? 1 : 0);
          break;
      }
      if (value > maxValue) maxValue = value;
    });

    // Build heatmap data
    const heatmapData = allDates.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const data = dateMap.get(dateKey);

      let count = 0;
      if (data) {
        switch (params.metric) {
          case 'problems':
            count = data.problems;
            break;
          case 'commits':
            count = data.commits;
            break;
          case 'time':
            count = data.time;
            break;
          case 'activity':
          default:
            count = data.problems + data.commits + (data.time > 0 ? 1 : 0);
            break;
        }
      }

      return {
        date: dateKey,
        count,
        level: calculateLevel(count, maxValue),
        details: data ? {
          problems: data.problems,
          commits: data.commits,
          time: data.time,
          platforms: Array.from(data.platforms),
        } : null,
      };
    });

    // Calculate summary stats
    const activeDays = heatmapData.filter(d => d.count > 0).length;
    const totalDays = heatmapData.length;
    const totalValue = heatmapData.reduce((sum, d) => sum + d.count, 0);

    // Find streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate longest streak (forward scan)
    for (let i = 0; i < heatmapData.length; i++) {
      if (heatmapData[i].count > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate current streak (backwards from today — no cap!)
    const reversedData = [...heatmapData].reverse();
    for (let i = 0; i < reversedData.length; i++) {
      if (reversedData[i].count > 0) {
        currentStreak++;
      } else {
        break; // First gap ends the current streak
      }
    }

    // Build response
    const response = {
      data: heatmapData,
      summary: {
        range: params.range,
        metric: params.metric,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDays,
        activeDays,
        activityRate: Math.round((activeDays / totalDays) * 100),
        totalValue,
        maxValue,
        avgValue: activeDays > 0 ? Math.round(totalValue / activeDays) : 0,
        currentStreak,
        longestStreak,
      },
    };

    logger.info('Heatmap data fetched', {
      userId,
      range: params.range,
      metric: params.metric,
      dataPoints: heatmapData.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/heatmap failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch heatmap data', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';