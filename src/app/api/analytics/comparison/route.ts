/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/analytics/comparison/route.ts
// =============================================================================
// Period Comparison Analytics
// =============================================================================
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const getQuerySchema = z.object({
  period: z.enum(['previous', 'lastWeek', 'lastMonth', 'lastYear', 'custom']).default('previous'),
  days: z.coerce.number().int().min(1).max(365).default(30),
  metric: z.enum(['problems', 'commits', 'time', 'points', 'all']).default('all'),
  currentStart: z.string().datetime().optional(),
  currentEnd: z.string().datetime().optional(),
  previousStart: z.string().datetime().optional(),
  previousEnd: z.string().datetime().optional(),
});

const postBodySchema = z.object({
  currentPeriod: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  previousPeriod: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  metrics: z.array(z.enum(['problems', 'commits', 'time', 'points'])).optional(),
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
  const rateLimitKey = `analytics-comparison:${ip}`;
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

function calculateChange(current: number, previous: number): {
  absolute: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
} {
  const absolute = current - previous;
  const percentage = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
  const trend = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable';

  return { absolute, percentage, trend };
}

async function getPeriodStats(userId: string, startDate: Date, endDate: Date) {
  const entries = await prisma.trackerEntry.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
  });

  return {
    
    problems: entries.reduce((sum: any, e: { problemsSolved: any; }) => sum + e.problemsSolved, 0),
    commits: entries.reduce((sum: any, e: { commits: any; }) => sum + e.commits, 0),
    time: entries.reduce((sum: any, e: { timeSpent: any; }) => sum + e.timeSpent, 0),
    points: entries.reduce((sum: any, e: { pointsEarned: any; }) => sum + (e.pointsEarned || 0), 0),
    activeDays: new Set(entries.map((e: { date: { toDateString: () => any; }; }) => e.date.toDateString())).size,
    entries: entries.length,
  };
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
    const { error, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Comparison-Types', 'previous,lastWeek,lastMonth,lastYear,custom');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/comparison failed', { requestId }, error);
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
    const queryValidation = getQuerySchema.safeParse({
      period: searchParams.get('period') || 'previous',
      days: searchParams.get('days') || '30',
      metric: searchParams.get('metric') || 'all',
      currentStart: searchParams.get('currentStart'),
      currentEnd: searchParams.get('currentEnd'),
      previousStart: searchParams.get('previousStart'),
      previousEnd: searchParams.get('previousEnd'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;

    // Calculate date ranges
    let currentStart: Date;
    let currentEnd: Date;
    let previousStart: Date;
    let previousEnd: Date;

    if (params.currentStart && params.currentEnd && params.previousStart && params.previousEnd) {
      // Custom dates provided
      currentStart = new Date(params.currentStart);
      currentEnd = new Date(params.currentEnd);
      previousStart = new Date(params.previousStart);
      previousEnd = new Date(params.previousEnd);
    } else {
      // Calculate based on period type
      currentEnd = endOfDay(new Date());
      currentStart = startOfDay(subDays(currentEnd, params.days));

      switch (params.period) {
        case 'lastWeek':
          previousEnd = subWeeks(currentEnd, 1);
          previousStart = subWeeks(currentStart, 1);
          break;
        case 'lastMonth':
          previousEnd = subMonths(currentEnd, 1);
          previousStart = subMonths(currentStart, 1);
          break;
        case 'lastYear':
          previousEnd = subYears(currentEnd, 1);
          previousStart = subYears(currentStart, 1);
          break;
        case 'previous':
        default:
          const periodLength = currentEnd.getTime() - currentStart.getTime();
          previousEnd = new Date(currentStart.getTime() - 1);
          previousStart = new Date(previousEnd.getTime() - periodLength);
          break;
      }
    }

    // Fetch stats for both periods
    const [currentStats, previousStats] = await Promise.all([
      getPeriodStats(userId, currentStart, currentEnd),
      getPeriodStats(userId, previousStart, previousEnd),
    ]);

    // Build comparison
    const comparison = {
      current: {
        period: {
          start: currentStart.toISOString(),
          end: currentEnd.toISOString(),
          days: params.days,
        },
        stats: currentStats,
      },
      previous: {
        period: {
          start: previousStart.toISOString(),
          end: previousEnd.toISOString(),
          days: params.days,
        },
        stats: previousStats,
      },
      changes: {
        problems: calculateChange(currentStats.problems, previousStats.problems),
        commits: calculateChange(currentStats.commits, previousStats.commits),
        time: calculateChange(currentStats.time, previousStats.time),
        points: calculateChange(currentStats.points, previousStats.points),
        activeDays: calculateChange(currentStats.activeDays, previousStats.activeDays),
      },
      insights: [] as Array<{ type: string; message: string; priority: string }>,
    };

    // Generate insights
    if (comparison.changes.problems.percentage > 20) {
      comparison.insights.push({
        type: 'positive',
        message: `Great job! You solved ${comparison.changes.problems.percentage}% more problems than the previous period.`,
        priority: 'high',
      });
    } else if (comparison.changes.problems.percentage < -20) {
      comparison.insights.push({
        type: 'warning',
        message: `Your problem-solving decreased by ${Math.abs(comparison.changes.problems.percentage)}%. Try to maintain consistency!`,
        priority: 'medium',
      });
    }

    if (comparison.changes.activeDays.absolute > 0) {
      comparison.insights.push({
        type: 'positive',
        message: `You were active ${comparison.changes.activeDays.absolute} more days than before.`,
        priority: 'medium',
      });
    }

    logger.info('Comparison analytics fetched', {
      userId,
      period: params.period,
      days: params.days,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(comparison, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/comparison failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch comparison', requestId), requestId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = postBodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { currentPeriod, previousPeriod, metrics } = validation.data;

    // Fetch stats
    const [currentStats, previousStats] = await Promise.all([
      getPeriodStats(userId, new Date(currentPeriod.start), new Date(currentPeriod.end)),
      getPeriodStats(userId, new Date(previousPeriod.start), new Date(previousPeriod.end)),
    ]);

    // Filter metrics if specified
    const metricsToInclude = metrics || ['problems', 'commits', 'time', 'points'];

    const changes: Record<string, ReturnType<typeof calculateChange>> = {};
    metricsToInclude.forEach(metric => {
      changes[metric] = calculateChange(
        currentStats[metric as keyof typeof currentStats] as number,
        previousStats[metric as keyof typeof previousStats] as number
      );
    });

    const response = {
      current: { period: currentPeriod, stats: currentStats },
      previous: { period: previousPeriod, stats: previousStats },
      changes,
    };

    logger.info('Custom comparison created', {
      userId,
      currentPeriod,
      previousPeriod,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST analytics/comparison failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to create comparison', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';