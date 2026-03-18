// =============================================================================
// FILE: app/api/stats/platform/[platformId]/route.ts
// PURPOSE: Platform-specific statistics
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
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';
import { startOfDay, subDays, endOfDay } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

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
 * GET - Statistics for a specific platform
 *
 * Params: platformId
 * Query: days (default 30)
 * Returns: platform details, aggregated stats, daily trends, and activity data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platformId: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats-platform:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const { platformId } = await params;

    // Validate platform exists
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
      select: { id: true, name: true, icon: true, color: true, category: true, website: true },
    });

    if (!platform) {
      return addHeaders(apiResponse.notFound('Platform', requestId), requestId, rateLimitResult);
    }

    // Parse query
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = querySchema.safeParse({
      days: searchParams.get('days') || undefined,
    });

    const days = queryValidation.success ? queryValidation.data.days : 30;
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Fetch platform-specific stats
    const [aggregation, dailyEntries, totalEntries, recentEntries] = await Promise.all([
      prisma.trackerEntry.aggregate({
        where: {
          userId,
          platformId,
          date: { gte: startDate, lte: endDate },
        },
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          points: true,
          easyProblems: true,
          mediumProblems: true,
          hardProblems: true,
          pullRequests: true,
          pullRequestsMerged: true,
          coursesCompleted: true,
          lessonsCompleted: true,
        },
        _count: { _all: true },
        _avg: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
        },
      }),
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: {
          userId,
          platformId,
          date: { gte: startDate, lte: endDate },
        },
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          points: true,
        },
        orderBy: { date: 'asc' },
      }),
      prisma.trackerEntry.count({
        where: { userId, platformId },
      }),
      prisma.trackerEntry.findMany({
        where: { userId, platformId },
        orderBy: { date: 'desc' },
        take: 10,
        select: {
          id: true,
          date: true,
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          points: true,
          source: true,
        },
      }),
    ]);

    // Active days on this platform
    const activeDays = dailyEntries.length;

    const data = {
      platform: {
        id: platform.id,
        name: platform.name,
        icon: platform.icon,
        color: platform.color,
        category: platform.category,
        website: platform.website,
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totals: {
        entries: aggregation._count._all,
        totalEntries,
        problems: aggregation._sum.problemsSolved || 0,
        commits: aggregation._sum.commits || 0,
        timeSpent: aggregation._sum.timeSpent || 0,
        points: aggregation._sum.points || 0,
        pullRequests: aggregation._sum.pullRequests || 0,
        pullRequestsMerged: aggregation._sum.pullRequestsMerged || 0,
        coursesCompleted: aggregation._sum.coursesCompleted || 0,
        lessonsCompleted: aggregation._sum.lessonsCompleted || 0,
        activeDays,
        difficulty: {
          easy: aggregation._sum.easyProblems || 0,
          medium: aggregation._sum.mediumProblems || 0,
          hard: aggregation._sum.hardProblems || 0,
        },
      },
      averages: {
        problemsPerDay: activeDays > 0 ? Math.round((aggregation._sum.problemsSolved || 0) / activeDays) : 0,
        commitsPerDay: activeDays > 0 ? Math.round((aggregation._sum.commits || 0) / activeDays) : 0,
        timePerDay: activeDays > 0 ? Math.round((aggregation._sum.timeSpent || 0) / activeDays) : 0,
      },
      dailyTrends: dailyEntries.map((entry) => ({
        date: entry.date.toISOString().split('T')[0],
        problems: entry._sum.problemsSolved || 0,
        commits: entry._sum.commits || 0,
        timeSpent: entry._sum.timeSpent || 0,
        points: entry._sum.points || 0,
      })),
      recentActivity: recentEntries.map((entry) => ({
        id: entry.id,
        date: entry.date.toISOString(),
        problemsSolved: entry.problemsSolved,
        commits: entry.commits,
        timeSpent: entry.timeSpent,
        points: entry.points,
        source: entry.source,
      })),
    };

    logger.info('GET /stats/platform/[platformId] completed', {
      userId,
      platformId,
      days,
      entries: data.totals.entries,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /stats/platform/[platformId] failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch platform stats', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
