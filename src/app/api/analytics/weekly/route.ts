// src/app/api/analytics/weekly/route.ts
// =============================================================================
// Weekly Analytics Summary
// =============================================================================
// Methods: GET, OPTIONS, HEAD
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
import { 
  startOfWeek, 
  endOfWeek, 
  subWeeks, 
  format, 
  eachDayOfInterval, 
  getDay 
} from 'date-fns';

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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  weeksBack: z.coerce.number().int().min(0).max(52).default(0),
  includeComparison: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
  includeDailyBreakdown: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
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
  const rateLimitKey = `analytics-weekly:${ip}`;
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
    response.headers.set('X-Report-Type', 'weekly');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/weekly failed', { requestId }, error);
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
      weeksBack: searchParams.get('weeksBack') || '0',
      includeComparison: searchParams.get('includeComparison'),
      includeDailyBreakdown: searchParams.get('includeDailyBreakdown'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;

    // Calculate week dates
    const baseDate = subWeeks(new Date(), params.weeksBack);
    const weekStart = startOfWeek(baseDate);
    const weekEnd = endOfWeek(baseDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Fetch entries for the week
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
      },
      include: {
        platform: { select: { name: true, icon: true, color: true, category: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate week stats
    const weekStats = {
      problems: entries.reduce((sum, e) => sum + e.problemsSolved, 0),
      commits: entries.reduce((sum, e) => sum + e.commits, 0),
      time: entries.reduce((sum, e) => sum + e.timeSpent, 0),
      points: entries.reduce((sum, e) => sum + (e.pointsEarned || 0), 0),
      activeDays: new Set(entries.map(e => e.date.toDateString())).size,
      entries: entries.length,
    };

    // Daily breakdown
    let dailyBreakdown = null;
    if (params.includeDailyBreakdown) {
      dailyBreakdown = weekDays.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayEntries = entries.filter(e => format(e.date, 'yyyy-MM-dd') === dayStr);

        return {
          date: dayStr,
          dayName: DAY_NAMES[getDay(day)],
          dayOfWeek: getDay(day),
          problems: dayEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
          commits: dayEntries.reduce((sum, e) => sum + e.commits, 0),
          time: dayEntries.reduce((sum, e) => sum + e.timeSpent, 0),
          points: dayEntries.reduce((sum, e) => sum + (e.pointsEarned || 0), 0),
          hasActivity: dayEntries.length > 0,
        };
      });
    }

    // Platform breakdown
    const platformMap = new Map<string, {
      name: string;
      icon: string | null;
      color: string | null;
      problems: number;
      commits: number;
      time: number;
    }>();

    entries.forEach(entry => {
      if (entry.platform) {
        const key = entry.platformId!;
        const existing = platformMap.get(key) || {
          name: entry.platform.name,
          icon: entry.platform.icon,
          color: entry.platform.color,
          problems: 0,
          commits: 0,
          time: 0,
        };

        existing.problems += entry.problemsSolved;
        existing.commits += entry.commits;
        existing.time += entry.timeSpent;

        platformMap.set(key, existing);
      }
    });

    const platformBreakdown = Array.from(platformMap.entries())
      .map(([id, data]) => ({ platformId: id, ...data }))
      .sort((a, b) => b.problems - a.problems);

    // Previous week comparison
    let comparison = null;
    if (params.includeComparison) {
      const prevWeekStart = subWeeks(weekStart, 1);
      const prevWeekEnd = subWeeks(weekEnd, 1);

      const prevEntries = await prisma.trackerEntry.findMany({
        where: {
          userId,
          date: { gte: prevWeekStart, lte: prevWeekEnd },
        },
        select: { problemsSolved: true, commits: true, timeSpent: true },
      });

      const prevStats = {
        problems: prevEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
        commits: prevEntries.reduce((sum, e) => sum + e.commits, 0),
        time: prevEntries.reduce((sum, e) => sum + e.timeSpent, 0),
      };

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      comparison = {
        previous: prevStats,
        changes: {
          problems: calculateChange(weekStats.problems, prevStats.problems),
          commits: calculateChange(weekStats.commits, prevStats.commits),
          time: calculateChange(weekStats.time, prevStats.time),
        },
        trend: weekStats.problems > prevStats.problems ? 'up' : 
               weekStats.problems < prevStats.problems ? 'down' : 'stable',
      };
    }

    // Calculate averages
    const avgProblemsPerDay = weekStats.activeDays > 0 
      ? Math.round((weekStats.problems / weekStats.activeDays) * 10) / 10 
      : 0;
    const avgTimePerDay = weekStats.activeDays > 0 
      ? Math.round(weekStats.time / weekStats.activeDays) 
      : 0;

    // Find best day
    let bestDay = null;
    if (dailyBreakdown) {
      const sorted = [...dailyBreakdown].sort((a, b) => b.problems - a.problems);
      if (sorted[0].problems > 0) {
        bestDay = {
          date: sorted[0].date,
          dayName: sorted[0].dayName,
          problems: sorted[0].problems,
        };
      }
    }

    // Build response
    const response = {
      week: {
        number: parseInt(format(weekStart, 'w')),
        year: parseInt(format(weekStart, 'yyyy')),
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
        label: `Week ${format(weekStart, 'w')} of ${format(weekStart, 'yyyy')}`,
      },
      stats: weekStats,
      averages: {
        problemsPerDay: avgProblemsPerDay,
        timePerDay: avgTimePerDay,
        commitsPerDay: weekStats.activeDays > 0 
          ? Math.round((weekStats.commits / weekStats.activeDays) * 10) / 10 
          : 0,
      },
      daily: dailyBreakdown,
      platforms: platformBreakdown,
      comparison,
      highlights: {
        bestDay,
        consistencyRate: Math.round((weekStats.activeDays / 7) * 100),
        isFullWeek: weekStats.activeDays === 7,
      },
    };

    logger.info('Weekly analytics fetched', {
      userId,
      weeksBack: params.weeksBack,
      activeDays: weekStats.activeDays,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/weekly failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch weekly analytics', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';