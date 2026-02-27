// src/app/api/analytics/summary/route.ts
// =============================================================================
// Quick Summary Analytics
// =============================================================================
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 100 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, max-age=30',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'all']).default('week'),
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
  const rateLimitKey = `analytics-summary:${ip}`;
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

function getPeriodDates(period: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = endOfDay(now);

  switch (period) {
    case 'today':
      return { start: startOfDay(now), end, label: 'Today' };
    case 'week':
      return { start: startOfWeek(now), end, label: 'This Week' };
    case 'month':
      return { start: startOfMonth(now), end, label: 'This Month' };
    case 'year':
      return { start: startOfYear(now), end, label: 'This Year' };
    case 'all':
    default:
      return { start: new Date('2020-01-01'), end, label: 'All Time' };
  }
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
    response.headers.set('X-Summary-Type', 'quick');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/summary failed', { requestId }, error);
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
      period: searchParams.get('period') || 'week',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;
    const { start, end, label } = getPeriodDates(params.period);

    // Parallel fetching for performance
    const [user, entries, activeGoals, recentAchievements, connectedPlatforms] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          totalProblems: true,
          totalCommits: true,
          totalPoints: true,
          rank: true,
        },
      }),
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: start, lte: end } },
        select: {
          date: true,
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          pointsEarned: true,
        },
      }),
      prisma.goal.count({
        where: { userId, status: 'ACTIVE' },
      }),
      prisma.userAchievement.count({
        where: { userId },
      }),
      prisma.userPlatform.count({
        where: { userId, isActive: true },
      }),
    ]);

    // Calculate period stats
    const periodStats = {
      problems: entries.reduce((sum, e) => sum + e.problemsSolved, 0),
      commits: entries.reduce((sum, e) => sum + e.commits, 0),
      time: entries.reduce((sum, e) => sum + e.timeSpent, 0),
      points: entries.reduce((sum, e) => sum + (e.pointsEarned || 0), 0),
      activeDays: new Set(entries.map(e => e.date.toDateString())).size,
      entries: entries.length,
    };

    // Get previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(end.getTime() - periodLength);

    const prevEntries = await prisma.trackerEntry.findMany({
      where: { userId, date: { gte: prevStart, lte: prevEnd } },
      select: { problemsSolved: true, commits: true, timeSpent: true },
    });

    const prevStats = {
      problems: prevEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
      commits: prevEntries.reduce((sum, e) => sum + e.commits, 0),
      time: prevEntries.reduce((sum, e) => sum + e.timeSpent, 0),
    };

    // Calculate changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const changes = {
      problems: calculateChange(periodStats.problems, prevStats.problems),
      commits: calculateChange(periodStats.commits, prevStats.commits),
      time: calculateChange(periodStats.time, prevStats.time),
    };

    // Build quick summary
    const summary = {
      period: {
        type: params.period,
        label,
        start: start.toISOString(),
        end: end.toISOString(),
      },
      stats: periodStats,
      changes,
      totals: {
        problems: await (async () => {
          const platforms = await prisma.userPlatform.findMany({
            where: { userId },
            select: { cachedStats: true }
          });
          const cachedTotal = platforms.reduce((sum, p) => sum + ((p.cachedStats as any)?.totalProblems || (p.cachedStats as any)?.problemsSolved || 0), 0);
          // Prefer cachedTotal (real synced data) over user.totalProblems (potential stale/seed data)
          // unless cachedTotal is 0 (new user or no sync yet)
          return cachedTotal > 0 ? cachedTotal : (user?.totalProblems || 0);
        })(),
        commits: await (async () => {
          const platforms = await prisma.userPlatform.findMany({
            where: { userId },
            select: { cachedStats: true }
          });
          const cachedTotal = platforms.reduce((sum, p) => sum + ((p.cachedStats as any)?.totalCommits || (p.cachedStats as any)?.commits || 0), 0);
          return Math.max(cachedTotal, user?.totalCommits || 0);
        })(),
        time: await prisma.trackerEntry.aggregate({
          where: { userId },
          _sum: { timeSpent: true }
        }).then(res => res._sum.timeSpent || 0),
        points: user?.totalPoints || 0,
      },
      lifetime: {
        problems: await (async () => {
          const platforms = await prisma.userPlatform.findMany({
            where: { userId },
            select: { cachedStats: true }
          });
          const cachedTotal = platforms.reduce((sum, p) => sum + ((p.cachedStats as any)?.totalProblems || (p.cachedStats as any)?.problemsSolved || 0), 0);
          return Math.max(cachedTotal, user?.totalProblems || 0);
        })(),
        commits: await (async () => {
          const platforms = await prisma.userPlatform.findMany({
            where: { userId },
            select: { cachedStats: true }
          });
          const cachedTotal = platforms.reduce((sum, p) => sum + ((p.cachedStats as any)?.totalCommits || (p.cachedStats as any)?.commits || 0), 0);
          return Math.max(cachedTotal, user?.totalCommits || 0);
        })(),
        time: await prisma.trackerEntry.aggregate({
          where: { userId },
          _sum: { timeSpent: true }
        }).then(res => res._sum.timeSpent || 0),
        points: user?.totalPoints || 0,
      },
      streak: {
        current: user?.currentStreak || 0,
        longest: user?.longestStreak || 0,
      },
      counts: {
        activeGoals,
        achievements: recentAchievements,
        platforms: connectedPlatforms,
      },
      rank: user?.rank || null,
      generatedAt: new Date().toISOString(),
    };

    logger.info('Summary fetched', {
      userId,
      period: params.period,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(summary, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/summary failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch summary', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';