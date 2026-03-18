// =============================================================================
// FILE: app/api/stats/compare/route.ts
// PURPOSE: Compare stats across time periods or platforms
// Methods: GET
// Auth Required: True
// Rate Limit: 20 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';
import { startOfDay, subDays, endOfDay } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  period1Days: z.coerce.number().int().min(1).max(365).default(7),
  period2Days: z.coerce.number().int().min(1).max(365).default(7),
  platformId: z.string().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

function calculateChange(current: number, previous: number): { value: number; percent: number; direction: string } {
  const diff = current - previous;
  const percent = previous > 0 ? Math.round((diff / previous) * 100) : current > 0 ? 100 : 0;
  return {
    value: diff,
    percent,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'unchanged',
  };
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * GET - Compare stats between two time periods
 *
 * Query: period1Days (current period length), period2Days (previous period length),
 *        platformId (optional filter)
 *
 * Compares current period vs previous period of equal length.
 * e.g., period1Days=7 compares last 7 days vs the 7 days before that.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats-compare:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;

    // Parse query
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = querySchema.safeParse({
      period1Days: searchParams.get('period1Days') || undefined,
      period2Days: searchParams.get('period2Days') || undefined,
      platformId: searchParams.get('platformId') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { period1Days, period2Days, platformId } = queryValidation.data;

    // Period 1: Current (most recent)
    const period1End = endOfDay(new Date());
    const period1Start = startOfDay(subDays(new Date(), period1Days));

    // Period 2: Previous (just before period 1)
    const period2End = startOfDay(subDays(new Date(), period1Days));
    const period2Start = startOfDay(subDays(period2End, period2Days));

    // Build where clause
    const baseWhere: { userId: string; platformId?: string } = { userId };
    if (platformId) {
      baseWhere.platformId = platformId;
    }

    // Fetch stats for both periods
    const [period1Agg, period2Agg, period1Days_active, period2Days_active] = await Promise.all([
      prisma.trackerEntry.aggregate({
        where: { ...baseWhere, date: { gte: period1Start, lte: period1End } },
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          points: true,
        },
        _count: { _all: true },
      }),
      prisma.trackerEntry.aggregate({
        where: { ...baseWhere, date: { gte: period2Start, lte: period2End } },
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          points: true,
        },
        _count: { _all: true },
      }),
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: { ...baseWhere, date: { gte: period1Start, lte: period1End } },
      }),
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: { ...baseWhere, date: { gte: period2Start, lte: period2End } },
      }),
    ]);

    const p1 = {
      problems: period1Agg._sum.problemsSolved || 0,
      commits: period1Agg._sum.commits || 0,
      timeSpent: period1Agg._sum.timeSpent || 0,
      points: period1Agg._sum.points || 0,
      entries: period1Agg._count._all,
      activeDays: period1Days_active.length,
    };

    const p2 = {
      problems: period2Agg._sum.problemsSolved || 0,
      commits: period2Agg._sum.commits || 0,
      timeSpent: period2Agg._sum.timeSpent || 0,
      points: period2Agg._sum.points || 0,
      entries: period2Agg._count._all,
      activeDays: period2Days_active.length,
    };

    const data = {
      period1: {
        startDate: period1Start.toISOString(),
        endDate: period1End.toISOString(),
        days: period1Days,
        ...p1,
      },
      period2: {
        startDate: period2Start.toISOString(),
        endDate: period2End.toISOString(),
        days: period2Days,
        ...p2,
      },
      comparison: {
        problems: calculateChange(p1.problems, p2.problems),
        commits: calculateChange(p1.commits, p2.commits),
        timeSpent: calculateChange(p1.timeSpent, p2.timeSpent),
        points: calculateChange(p1.points, p2.points),
        entries: calculateChange(p1.entries, p2.entries),
        activeDays: calculateChange(p1.activeDays, p2.activeDays),
      },
      platformId: platformId || null,
    };

    logger.info('GET /stats/compare completed', {
      userId,
      period1Days,
      period2Days,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /stats/compare failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to compare stats', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
