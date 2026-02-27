// src/app/api/platforms/[id]/stats/route.ts
/**
 * Platform Statistics API
 * 
 * Provides comprehensive statistics for a user's platform connection.
 * Includes activity trends, comparisons, and performance metrics.
 * 
 * @route GET  /api/platforms/[id]/stats - Get platform statistics
 * @route HEAD /api/platforms/[id]/stats - Quick stats availability check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, NotFoundError } from '@/lib/apiError';
import { getCategoryDisplayName } from '@/types/platform';
import { SyncStatus, Prisma } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60; // 60 requests per minute
const CACHE_TTL = 60; // 1 minute cache

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// =============================================================================
// TYPES
// =============================================================================

interface PlatformStats {
  platform: {
    id: string;
    name: string;
    slug: string;
    category: string;
    categoryName: string;
    icon: string | null;
    color: string | null;
  };
  connection: {
    id: string;
    username: string | null;
    isActive: boolean;
    isVerified: boolean;
    syncStatus: SyncStatus;
    lastSyncedAt: Date | null;
    autoSync: boolean;
    connectedSince: Date;
  };
  totals: {
    entries: number;
    problems: number;
    commits: number;
    pullRequests: number;
    issuesOpened: number;
    timeSpent: number;
    points: number;
    coursesCompleted: number;
    certificationsEarned: number;
  };
  periods: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    last7Days: number;
    last30Days: number;
  };
  averages: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  streaks: {
    current: number;
    longest: number;
    lastActiveDate: Date | null;
  };
  trends: {
    daily: Array<{ date: string; value: number }>;
    weekly: Array<{ week: string; value: number }>;
    monthly: Array<{ month: string; value: number }>;
  };
  rankings: {
    rating: number | null;
    rank: number | null;
    percentile: number | null;
  };
  syncHistory: Array<{
    id: string;
    status: SyncStatus;
    itemsCreated: number;
    itemsUpdated: number;
    duration: number | null;
    hasError: boolean;
    errorMessage: string | null;
    createdAt: Date;
  }>;
  cachedStats: unknown;
  lastUpdated: Date | null;
}

interface ComparisonStats {
  vsLastWeek: { value: number; percentChange: number };
  vsLastMonth: { value: number; percentChange: number };
  vsAverage: { value: number; percentChange: number };
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const QuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year', 'all']).default('month'),
  metric: z.enum([
    'problems', 'commits', 'pullRequests', 'timeSpent', 'points', 'all'
  ]).default('all'),
  includeTrends: z.coerce.boolean().default(true),
  includeComparison: z.coerce.boolean().default(true),
  includeSyncHistory: z.coerce.boolean().default(true),
  syncHistoryLimit: z.coerce.number().int().min(1).max(50).default(10),
  trendDays: z.coerce.number().int().min(7).max(365).default(30),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
    cacheAge?: number;
  }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('X-Request-ID', requestId);

  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  if (options?.cacheAge) {
    response.headers.set('Cache-Control', `private, max-age=${options.cacheAge}`);
  } else {
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

/**
 * Get date boundaries for period
 */
function getPeriodBoundaries(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;

  switch (period) {
    case 'day':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(0); // All time
  }

  return { start, end };
}

/**
 * Calculate streak for platform
 */
async function calculateStreak(
  userId: string,
  platformId: string
): Promise<{ current: number; longest: number; lastActiveDate: Date | null }> {
  const entries = await prisma.trackerEntry.findMany({
    where: {
      userId,
      platformId,
    },
    select: { date: true },
    orderBy: { date: 'desc' },
    distinct: ['date'],
    take: 365,
  });

  if (entries.length === 0) {
    return { current: 0, longest: 0, lastActiveDate: null };
  }

  const dates = entries.map(e => e.date.toISOString().split('T')[0]);
  const lastActiveDate = entries[0].date;

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (dates[0] === today || dates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diff = (prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000);
      
      if (diff <= 1.5) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diff = (prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000);

    if (diff <= 1.5) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { current: currentStreak, longest: longestStreak, lastActiveDate };
}

/**
 * Calculate daily trends
 */
async function calculateDailyTrends(
  userId: string,
  platformId: string,
  days: number
): Promise<Array<{ date: string; value: number }>> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const entries = await prisma.trackerEntry.groupBy({
    by: ['date'],
    where: {
      userId,
      platformId,
      date: { gte: startDate },
    },
    _sum: {
      problemsSolved: true,
      commits: true,
    },
    orderBy: { date: 'asc' },
  });

  // Fill in missing dates
  const trends: Array<{ date: string; value: number }> = [];
  const dateMap = new Map(
    entries.map(e => [
      e.date.toISOString().split('T')[0],
      (e._sum.problemsSolved || 0) + (e._sum.commits || 0),
    ])
  );

  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    trends.push({
      date: dateStr,
      value: dateMap.get(dateStr) || 0,
    });
  }

  return trends;
}

/**
 * Calculate comparison with previous periods
 */
async function calculateComparison(
  userId: string,
  platformId: string
): Promise<ComparisonStats> {
  const now = new Date();
  
  const periods = {
    thisWeek: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    lastWeek: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    thisMonth: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    lastMonth: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
  };

  const [thisWeek, lastWeek, thisMonth, lastMonth, allTime] = await Promise.all([
    prisma.trackerEntry.aggregate({
      where: {
        userId,
        platformId,
        date: { gte: periods.thisWeek },
      },
      _sum: { problemsSolved: true, commits: true },
    }),
    prisma.trackerEntry.aggregate({
      where: {
        userId,
        platformId,
        date: { gte: periods.lastWeek, lt: periods.thisWeek },
      },
      _sum: { problemsSolved: true, commits: true },
    }),
    prisma.trackerEntry.aggregate({
      where: {
        userId,
        platformId,
        date: { gte: periods.thisMonth },
      },
      _sum: { problemsSolved: true, commits: true },
    }),
    prisma.trackerEntry.aggregate({
      where: {
        userId,
        platformId,
        date: { gte: periods.lastMonth, lt: periods.thisMonth },
      },
      _sum: { problemsSolved: true, commits: true },
    }),
    prisma.trackerEntry.aggregate({
      where: { userId, platformId },
      _sum: { problemsSolved: true, commits: true },
      _count: true,
    }),
  ]);

  const thisWeekValue = (thisWeek._sum.problemsSolved || 0) + (thisWeek._sum.commits || 0);
  const lastWeekValue = (lastWeek._sum.problemsSolved || 0) + (lastWeek._sum.commits || 0);
  const thisMonthValue = (thisMonth._sum.problemsSolved || 0) + (thisMonth._sum.commits || 0);
  const lastMonthValue = (lastMonth._sum.problemsSolved || 0) + (lastMonth._sum.commits || 0);
  const avgValue = allTime._count > 0 
    ? ((allTime._sum.problemsSolved || 0) + (allTime._sum.commits || 0)) / allTime._count 
    : 0;

  const calcPercentChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  };

  return {
    vsLastWeek: {
      value: thisWeekValue - lastWeekValue,
      percentChange: calcPercentChange(thisWeekValue, lastWeekValue),
    },
    vsLastMonth: {
      value: thisMonthValue - lastMonthValue,
      percentChange: calcPercentChange(thisMonthValue, lastMonthValue),
    },
    vsAverage: {
      value: Math.round(thisWeekValue - avgValue * 7),
      percentChange: calcPercentChange(thisWeekValue, avgValue * 7),
    },
  };
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const { id: platformId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId: session.user.id,
          platformId,
        },
      },
      select: {
        id: true,
        statsUpdatedAt: true,
      },
    });

    if (!connection) {
      return new NextResponse(null, { status: 404 });
    }

    const entryCount = await prisma.trackerEntry.count({
      where: {
        userId: session.user.id,
        platformId,
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Entry-Count', String(entryCount));
    response.headers.set('X-Has-Stats', String(entryCount > 0));
    
    if (connection.statsUpdatedAt) {
      response.headers.set('Last-Modified', connection.statsUpdatedAt.toUTCString());
    }

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD /api/platforms/[id]/stats failed', { requestId, platformId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:stats:${userId}:${platformId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = QuerySchema.safeParse({
      period: searchParams.get('period') || undefined,
      metric: searchParams.get('metric') || undefined,
      includeTrends: searchParams.get('includeTrends') || undefined,
      includeComparison: searchParams.get('includeComparison') || undefined,
      includeSyncHistory: searchParams.get('includeSyncHistory') || undefined,
      syncHistoryLimit: searchParams.get('syncHistoryLimit') || undefined,
      trendDays: searchParams.get('trendDays') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Invalid query parameters',
          queryValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        { rateLimitResult }
      );
    }

    const query = queryValidation.data;

    // Get platform and connection
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            displayName: true,
            category: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    // Get aggregate totals
    const totals = await prisma.trackerEntry.aggregate({
      where: { userId, platformId },
      _sum: {
        problemsSolved: true,
        commits: true,
        pullRequests: true,
        issuesOpened: true,
        timeSpent: true,
        points: true,
        coursesCompleted: true,
        certificationsEarned: true,
      },
      _count: true,
    });

    // Get period stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [today, thisWeek, thisMonth, thisYear, lastWeek, lastMonth] = await Promise.all([
      prisma.trackerEntry.count({
        where: { userId, platformId, date: { gte: todayStart } },
      }),
      prisma.trackerEntry.count({
        where: { userId, platformId, date: { gte: weekStart } },
      }),
      prisma.trackerEntry.count({
        where: { userId, platformId, date: { gte: monthStart } },
      }),
      prisma.trackerEntry.count({
        where: { userId, platformId, date: { gte: yearStart } },
      }),
      prisma.trackerEntry.count({
        where: { userId, platformId, date: { gte: last7Days } },
      }),
      prisma.trackerEntry.count({
        where: { userId, platformId, date: { gte: last30Days } },
      }),
    ]);

    // Get first entry date for averages
    const firstEntry = await prisma.trackerEntry.findFirst({
      where: { userId, platformId },
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    const daysSinceStart = firstEntry 
      ? Math.max(1, Math.ceil((now.getTime() - firstEntry.date.getTime()) / (24 * 60 * 60 * 1000)))
      : 1;

    const totalActivity = (totals._sum.problemsSolved || 0) + (totals._sum.commits || 0);

    // Calculate averages
    const averages = {
      daily: Math.round((totalActivity / daysSinceStart) * 100) / 100,
      weekly: Math.round((totalActivity / Math.max(1, daysSinceStart / 7)) * 100) / 100,
      monthly: Math.round((totalActivity / Math.max(1, daysSinceStart / 30)) * 100) / 100,
    };

    // Get streaks
    const streaks = await calculateStreak(userId, platformId);

    // Get rankings from cached stats
    const cachedStats = connection.cachedStats as Record<string, unknown> | null;
    const rankings = {
      rating: (cachedStats?.rating as number) || null,
      rank: (cachedStats?.rank as number) || null,
      percentile: (cachedStats?.percentile as number) || null,
    };

    // Build response
    const responseData: Record<string, unknown> = {
      platform: {
        id: connection.platform.id,
        name: connection.platform.displayName || connection.platform.name,
        slug: connection.platform.slug,
        category: connection.platform.category,
        categoryName: getCategoryDisplayName(connection.platform.category),
        icon: connection.platform.icon,
        color: connection.platform.color,
      },
      connection: {
        id: connection.id,
        username: connection.username,
        isActive: connection.isActive,
        isVerified: connection.isVerified,
        syncStatus: connection.syncStatus,
        lastSyncedAt: connection.lastSyncedAt,
        autoSync: connection.autoSync,
        connectedSince: connection.createdAt,
      },
      totals: {
        entries: totals._count,
        problems: totals._sum.problemsSolved || 0,
        commits: totals._sum.commits || 0,
        pullRequests: totals._sum.pullRequests || 0,
        issuesOpened: totals._sum.issuesOpened || 0,
        timeSpent: totals._sum.timeSpent || 0,
        points: totals._sum.points || 0,
        coursesCompleted: totals._sum.coursesCompleted || 0,
        certificationsEarned: totals._sum.certificationsEarned || 0,
      },
      periods: {
        today,
        thisWeek,
        thisMonth,
        thisYear,
        last7Days: lastWeek,
        last30Days: lastMonth,
      },
      averages,
      streaks,
      rankings,
      cachedStats: connection.cachedStats,
      lastUpdated: connection.statsUpdatedAt,
    };

    // Include trends if requested
    if (query.includeTrends) {
      const dailyTrends = await calculateDailyTrends(userId, platformId, query.trendDays);
      responseData.trends = {
        daily: dailyTrends,
      };
    }

    // Include comparison if requested
    if (query.includeComparison) {
      responseData.comparison = await calculateComparison(userId, platformId);
    }

    // Include sync history if requested
    if (query.includeSyncHistory) {
      const syncHistory = await prisma.syncLog.findMany({
        where: { userId, platformId },
        orderBy: { createdAt: 'desc' },
        take: query.syncHistoryLimit,
        select: {
          id: true,
          status: true,
          itemsCreated: true,
          itemsUpdated: true,
          duration: true,
          hasError: true,
          errorMessage: true,
          createdAt: true,
        },
      });
      responseData.syncHistory = syncHistory;
    }

    logger.info('Platform stats fetched', {
      requestId,
      userId,
      platformId,
      platformSlug: connection.platform.slug,
      entryCount: totals._count,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(responseData, {
        meta: {
          requestId,
          duration: Date.now() - startTime,
        },
      }),
      requestId,
      {
        rateLimitResult,
        cacheAge: CACHE_TTL,
      }
    );
  } catch (error) {
    logger.error('GET /api/platforms/[id]/stats failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';