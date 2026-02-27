// src/app/api/analytics/leaderboard/route.ts
// =============================================================================
// Leaderboard Rankings
// =============================================================================
// Methods: GET, OPTIONS, HEAD
// Auth Required: Optional (public leaderboard)
// Rate Limit: 100 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { PlatformCategory } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { startOfWeek, startOfMonth, startOfYear } from 'date-fns';

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
  'Cache-Control': 'public, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  metric: z.enum(['problems', 'streak', 'points', 'commits', 'time']).default('problems'),
  period: z.enum(['week', 'month', 'year', 'all']).default('week'),
  category: z.nativeEnum(PlatformCategory).optional(),
  limit: z.coerce.number().int().min(10).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1),
  includeUserRank: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
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

async function checkRateLimit(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `analytics-leaderboard:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), rateLimitResult };
  }

  return { error: null, rateLimitResult };
}

function getPeriodStartDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'week':
      return startOfWeek(now);
    case 'month':
      return startOfMonth(now);
    case 'year':
      return startOfYear(now);
    case 'all':
    default:
      return null;
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
    const { error, rateLimitResult } = await checkRateLimit(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 429 }), requestId, rateLimitResult);
    }

    const totalUsers = await prisma.user.count({
      where: { isPublic: true, isActive: true },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Participants', String(totalUsers));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/leaderboard failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error: rateLimitError, rateLimitResult } = await checkRateLimit(request, requestId);

    if (rateLimitError) {
      return addHeaders(rateLimitError, requestId, rateLimitResult);
    }

    // Optional authentication for user rank
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryValidation = querySchema.safeParse({
      metric: searchParams.get('metric') || 'problems',
      period: searchParams.get('period') || 'week',
      category: searchParams.get('category'),
      limit: searchParams.get('limit') || '50',
      page: searchParams.get('page') || '1',
      includeUserRank: searchParams.get('includeUserRank'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;
    const periodStart = getPeriodStartDate(params.period);
    const skip = (params.page - 1) * params.limit;

    let leaderboard: Array<{
      userId: string;
      username: string | null;
      name: string | null;
      image: string | null;
      score: number;
      rank: number;
    }> = [];
    let total = 0;

    // Different queries based on metric
    if (params.metric === 'streak') {
      // Streak leaderboard from User table
      const [users, count] = await Promise.all([
        prisma.user.findMany({
          where: { isPublic: true, isActive: true },
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            currentStreak: true,
          },
          orderBy: { currentStreak: 'desc' },
          skip,
          take: params.limit,
        }),
        prisma.user.count({ where: { isPublic: true, isActive: true } }),
      ]);

      leaderboard = users.map((user, index) => ({
        userId: user.id,
        username: user.username,
        name: user.name,
        image: user.image,
        score: user.currentStreak,
        rank: skip + index + 1,
      }));
      total = count;

    } else if (params.metric === 'points') {
      // Points leaderboard from User table
      const [users, count] = await Promise.all([
        prisma.user.findMany({
          where: { isPublic: true, isActive: true },
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            totalPoints: true,
          },
          orderBy: { totalPoints: 'desc' },
          skip,
          take: params.limit,
        }),
        prisma.user.count({ where: { isPublic: true, isActive: true } }),
      ]);

      leaderboard = users.map((user, index) => ({
        userId: user.id,
        username: user.username,
        name: user.name,
        image: user.image,
        score: user.totalPoints,
        rank: skip + index + 1,
      }));
      total = count;

    } else {
      // Aggregated leaderboard from TrackerEntry
      const whereClause: {
        user: { isPublic: boolean; isActive: boolean };
        date?: { gte: Date };
        category?: PlatformCategory;
      } = {
        user: { isPublic: true, isActive: true },
      };

      if (periodStart) {
        whereClause.date = { gte: periodStart };
      }

      if (params.category) {
        whereClause.category = params.category;
      }

      // Get aggregated scores
      const aggregateField = params.metric === 'problems' ? 'problemsSolved' :
                             params.metric === 'commits' ? 'commits' : 'timeSpent';

      const aggregated = await prisma.trackerEntry.groupBy({
        by: ['userId'],
        where: whereClause,
        _sum: {
          [aggregateField]: true,
        } as Record<string, boolean>,
        orderBy: {
          _sum: {
            [aggregateField]: 'desc',
          },
        },
        take: params.limit + skip, // Get enough for pagination
      });

      // Get user details
      const userIds = aggregated.slice(skip, skip + params.limit).map(a => a.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, name: true, image: true },
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      leaderboard = aggregated.slice(skip, skip + params.limit).map((agg, index) => {
        const user = userMap.get(agg.userId);
        return {
          userId: agg.userId,
          username: user?.username || null,
          name: user?.name || null,
          image: user?.image || null,
          score: (agg._sum as Record<string, number>)[aggregateField] || 0,
          rank: skip + index + 1,
        };
      });

      total = aggregated.length;
    }

    // Get current user's rank if authenticated and requested
    let userRank = null;
    if (currentUserId && params.includeUserRank) {
      const userIndex = leaderboard.findIndex(e => e.userId === currentUserId);

      if (userIndex !== -1) {
        userRank = {
          rank: leaderboard[userIndex].rank,
          score: leaderboard[userIndex].score,
          isInTop: true,
          percentile: Math.round(((total - leaderboard[userIndex].rank) / total) * 100),
        };
      } else {
        // Find user's rank from full data
        const userScore = await getUserScore(currentUserId, params.metric, periodStart, params.category);
        if (userScore !== null) {
          const higherCount = leaderboard.filter(e => e.score > userScore).length;
          userRank = {
            rank: higherCount + 1,
            score: userScore,
            isInTop: false,
            percentile: Math.round(((total - higherCount - 1) / total) * 100),
          };
        }
      }
    }

    // Mark current user in leaderboard
    const formattedLeaderboard = leaderboard.map(entry => ({
      ...entry,
      isCurrentUser: currentUserId ? entry.userId === currentUserId : false,
    }));

    // Build response
    const response = {
      leaderboard: formattedLeaderboard,
      userRank,
      metadata: {
        metric: params.metric,
        period: params.period,
        category: params.category || null,
        totalParticipants: total,
        lastUpdated: new Date().toISOString(),
      },
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
        hasNextPage: params.page * params.limit < total,
        hasPreviousPage: params.page > 1,
      },
    };

    logger.info('Leaderboard fetched', {
      metric: params.metric,
      period: params.period,
      entries: leaderboard.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/leaderboard failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch leaderboard', requestId), requestId);
  }
}

// Helper function to get user's score
async function getUserScore(
  userId: string,
  metric: string,
  periodStart: Date | null,
  category?: PlatformCategory
): Promise<number | null> {
  if (metric === 'streak') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true },
    });
    return user?.currentStreak || 0;
  }

  if (metric === 'points') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });
    return user?.totalPoints || 0;
  }

  const whereClause: {
    userId: string;
    date?: { gte: Date };
    category?: PlatformCategory;
  } = { userId };

  if (periodStart) {
    whereClause.date = { gte: periodStart };
  }

  if (category) {
    whereClause.category = category;
  }

  const aggregateField = metric === 'problems' ? 'problemsSolved' :
                         metric === 'commits' ? 'commits' : 'timeSpent';

  const result = await prisma.trackerEntry.aggregate({
    where: whereClause,
    _sum: {
      [aggregateField]: true,
    } as Record<string, boolean>,
  });

  return (result._sum as Record<string, number>)[aggregateField] || 0;
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';