// =============================================================================
// FILE: app/api/stats/category/[category]/route.ts
// PURPOSE: Category-specific statistics
// Methods: GET
// Auth Required: True
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { PlatformCategory } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';
import { startOfDay, subDays, endOfDay } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const VALID_CATEGORIES: PlatformCategory[] = [
  'DSA', 'JOB', 'GIT', 'LEARNING', 'HACKATHON',
  'OPENSOURCE', 'COMPANY', 'DESIGN', 'DATA_SCIENCE', 'OTHER',
];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
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

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * GET - Statistics for a specific category
 *
 * Params: category (DSA, JOB, GIT, LEARNING, etc.)
 * Query: days (default 30)
 * Returns: category totals, platform breakdown within category, daily trends
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats-category:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const { category } = await params;

    // Validate category
    if (!VALID_CATEGORIES.includes(category as PlatformCategory)) {
      return addHeaders(
        apiResponse.validationError(
          `Invalid category. Valid categories: ${VALID_CATEGORIES.join(', ')}`,
          undefined,
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    const validCategory = category as PlatformCategory;

    // Parse query
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = querySchema.safeParse({
      days: searchParams.get('days') || undefined,
    });
    const days = queryValidation.success ? queryValidation.data.days : 30;

    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const whereClause = {
      userId,
      category: validCategory,
      date: { gte: startDate, lte: endDate },
    };

    // Fetch category stats
    const [aggregation, platformBreakdown, dailyTrends, activeDays] = await Promise.all([
      prisma.trackerEntry.aggregate({
        where: whereClause,
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          points: true,
          easyProblems: true,
          mediumProblems: true,
          hardProblems: true,
        },
        _count: { _all: true },
      }),
      prisma.trackerEntry.groupBy({
        by: ['platformId'],
        where: { ...whereClause, platformId: { not: null } },
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          points: true,
        },
        _count: { id: true },
      }),
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: whereClause,
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
        },
        orderBy: { date: 'asc' },
      }),
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: whereClause,
      }),
    ]);

    // Get platform names for breakdown
    const platformIds = platformBreakdown
      .map((g) => g.platformId)
      .filter((id): id is string => id !== null);
    const platforms = await prisma.platform.findMany({
      where: { id: { in: platformIds } },
      select: { id: true, name: true, icon: true, color: true },
    });
    const platformMap = new Map(platforms.map((p) => [p.id, p]));

    const data = {
      category: validCategory,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totals: {
        entries: aggregation._count._all,
        problems: aggregation._sum.problemsSolved || 0,
        commits: aggregation._sum.commits || 0,
        timeSpent: aggregation._sum.timeSpent || 0,
        points: aggregation._sum.points || 0,
        activeDays: activeDays.length,
        difficulty: {
          easy: aggregation._sum.easyProblems || 0,
          medium: aggregation._sum.mediumProblems || 0,
          hard: aggregation._sum.hardProblems || 0,
        },
      },
      platforms: platformBreakdown.map((g) => {
        const platformInfo = platformMap.get(g.platformId!);
        return {
          platformId: g.platformId!,
          name: platformInfo?.name || 'Unknown',
          icon: platformInfo?.icon || null,
          color: platformInfo?.color || null,
          problems: g._sum.problemsSolved || 0,
          commits: g._sum.commits || 0,
          timeSpent: g._sum.timeSpent || 0,
          points: g._sum.points || 0,
          entries: g._count.id,
        };
      }).sort((a, b) => b.problems - a.problems),
      dailyTrends: dailyTrends.map((entry) => ({
        date: entry.date.toISOString().split('T')[0],
        problems: entry._sum.problemsSolved || 0,
        commits: entry._sum.commits || 0,
        timeSpent: entry._sum.timeSpent || 0,
      })),
    };

    logger.info('GET /stats/category/[category] completed', {
      userId,
      category: validCategory,
      days,
      entries: data.totals.entries,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /stats/category/[category] failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch category stats', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
