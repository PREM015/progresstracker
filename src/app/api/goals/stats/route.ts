// =============================================================================
// src/app/api/goals/stats/route.ts
// =============================================================================
// Description: Get comprehensive goal statistics for user
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
import { GoalStatus, GoalType, PlatformCategory } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  differenceInDays,
} from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  period: z.enum(['week', 'month', 'year', 'all']).default('all'),
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

async function validateRequest(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `goals-stats:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
    };
  }

  return { error: null, session, rateLimitResult };
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 204 });
  return addHeaders(response, requestId);
}

// =============================================================================
// HEAD - Resource Metadata
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const totalGoals = await prisma.goal.count({ where: { userId } });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Goals', String(totalGoals));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/stats failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Goal Statistics
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      period: searchParams.get('period') || 'all',
    });

    if (!queryValidation.success) {
      const response = apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { period } = queryValidation.data;

    // Calculate date ranges
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    // Get all goals
    const allGoals = await prisma.goal.findMany({
      where: { userId },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Overall counts by status
    const statusCounts = {
      total: allGoals.length,
      draft: allGoals.filter((g) => g.status === GoalStatus.DRAFT).length,
      active: allGoals.filter((g) => g.status === GoalStatus.ACTIVE).length,
      paused: allGoals.filter((g) => g.status === GoalStatus.PAUSED).length,
      completed: allGoals.filter((g) => g.status === GoalStatus.COMPLETED).length,
      failed: allGoals.filter((g) => g.status === GoalStatus.FAILED).length,
      archived: allGoals.filter((g) => g.status === GoalStatus.ARCHIVED).length,
      cancelled: allGoals.filter((g) => g.status === GoalStatus.CANCELLED).length,
    };

    // Calculate completion rate
    const finishedGoals = statusCounts.completed + statusCounts.failed;
    const completionRate = finishedGoals > 0
      ? Math.round((statusCounts.completed / finishedGoals) * 100)
      : 0;

    // Time-based stats
    const thisWeekGoals = allGoals.filter(
      (g) => g.createdAt >= weekStart && g.createdAt <= weekEnd
    );
    const thisMonthGoals = allGoals.filter(
      (g) => g.createdAt >= monthStart && g.createdAt <= monthEnd
    );
    const thisYearGoals = allGoals.filter(
      (g) => g.createdAt >= yearStart && g.createdAt <= yearEnd
    );

    const thisWeekCompleted = thisWeekGoals.filter(
      (g) => g.status === GoalStatus.COMPLETED
    ).length;
    const thisMonthCompleted = thisMonthGoals.filter(
      (g) => g.status === GoalStatus.COMPLETED
    ).length;
    const thisYearCompleted = thisYearGoals.filter(
      (g) => g.status === GoalStatus.COMPLETED
    ).length;

    // By category
    const byCategory: Record<string, { total: number; completed: number; rate: number }> = {};
    Object.values(PlatformCategory).forEach((category) => {
      const categoryGoals = allGoals.filter((g) => g.category === category);
      const categoryCompleted = categoryGoals.filter((g) => g.status === GoalStatus.COMPLETED).length;
      const categoryFinished = categoryGoals.filter(
        (g) => g.status === GoalStatus.COMPLETED || g.status === GoalStatus.FAILED
      ).length;

      byCategory[category] = {
        total: categoryGoals.length,
        completed: categoryCompleted,
        rate: categoryFinished > 0 ? Math.round((categoryCompleted / categoryFinished) * 100) : 0,
      };
    });

    // By type
    const byType: Record<string, { total: number; completed: number; rate: number }> = {};
    Object.values(GoalType).forEach((type) => {
      const typeGoals = allGoals.filter((g) => g.goalType === type);
      const typeCompleted = typeGoals.filter((g) => g.status === GoalStatus.COMPLETED).length;
      const typeFinished = typeGoals.filter(
        (g) => g.status === GoalStatus.COMPLETED || g.status === GoalStatus.FAILED
      ).length;

      byType[type] = {
        total: typeGoals.length,
        completed: typeCompleted,
        rate: typeFinished > 0 ? Math.round((typeCompleted / typeFinished) * 100) : 0,
      };
    });

    // Calculate average completion time for completed goals
    const completedGoalsWithTime = allGoals.filter(
      (g) => g.status === GoalStatus.COMPLETED && g.completedAt
    );
    let avgCompletionDays = 0;
    if (completedGoalsWithTime.length > 0) {
      const totalDays = completedGoalsWithTime.reduce((sum, g) => {
        return sum + differenceInDays(g.completedAt!, g.startDate);
      }, 0);
      avgCompletionDays = Math.round(totalDays / completedGoalsWithTime.length);
    }

    // Upcoming deadlines (next 7 days)
    const sevenDaysFromNow = subDays(now, -7);
    const upcomingDeadlines = allGoals
      .filter(
        (g) =>
          g.status === GoalStatus.ACTIVE &&
          g.deadline &&
          g.deadline >= now &&
          g.deadline <= sevenDaysFromNow
      )
      .map((g) => ({
        id: g.id,
        title: g.title,
        deadline: g.deadline,
        progress: g.progressPercentage,
        daysLeft: differenceInDays(g.deadline!, now),
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);

    // Overdue goals
    const overdueGoals = allGoals
      .filter(
        (g) =>
          g.status === GoalStatus.ACTIVE &&
          g.deadline &&
          g.deadline < now
      )
      .map((g) => ({
        id: g.id,
        title: g.title,
        deadline: g.deadline,
        progress: g.progressPercentage,
        daysOverdue: differenceInDays(now, g.deadline!),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5);

    // Recent completions
    const recentCompleted = allGoals
      .filter((g) => g.status === GoalStatus.COMPLETED)
      .slice(0, 5)
      .map((g) => ({
        id: g.id,
        title: g.title,
        completedAt: g.completedAt,
        category: g.category,
        platform: g.platform,
      }));

    // Progress distribution for active goals
    const activeGoals = allGoals.filter((g) => g.status === GoalStatus.ACTIVE);
    const progressDistribution = {
      notStarted: activeGoals.filter((g) => g.progressPercentage === 0).length,
      inProgress: activeGoals.filter((g) => g.progressPercentage > 0 && g.progressPercentage < 50).length,
      halfWay: activeGoals.filter((g) => g.progressPercentage >= 50 && g.progressPercentage < 75).length,
      almostDone: activeGoals.filter((g) => g.progressPercentage >= 75 && g.progressPercentage < 100).length,
      completed: activeGoals.filter((g) => g.progressPercentage >= 100).length,
    };

    // Streak stats
    const currentStreak = await calculateGoalStreak(userId);

    const stats = {
      overview: {
        ...statusCounts,
        completionRate,
        avgCompletionDays,
      },
      thisWeek: {
        created: thisWeekGoals.length,
        completed: thisWeekCompleted,
        active: thisWeekGoals.filter((g) => g.status === GoalStatus.ACTIVE).length,
      },
      thisMonth: {
        created: thisMonthGoals.length,
        completed: thisMonthCompleted,
        active: thisMonthGoals.filter((g) => g.status === GoalStatus.ACTIVE).length,
      },
      thisYear: {
        created: thisYearGoals.length,
        completed: thisYearCompleted,
        active: thisYearGoals.filter((g) => g.status === GoalStatus.ACTIVE).length,
      },
      byCategory,
      byType,
      activeGoals: {
        total: activeGoals.length,
        progressDistribution,
        avgProgress: activeGoals.length > 0
          ? Math.round(activeGoals.reduce((sum, g) => sum + g.progressPercentage, 0) / activeGoals.length)
          : 0,
      },
      upcomingDeadlines,
      overdueGoals,
      recentCompleted,
      streaks: currentStreak,
    };

    logger.info('GET /api/goals/stats completed', {
      userId,
      totalGoals: allGoals.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(stats, {  });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/stats failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch goal stats', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// HELPER: Calculate Goal Completion Streak
// =============================================================================

async function calculateGoalStreak(userId: string): Promise<{
  current: number;
  longest: number;
  thisWeek: number;
  thisMonth: number;
}> {
  try {
    const completedGoals = await prisma.goal.findMany({
      where: {
        userId,
        status: GoalStatus.COMPLETED,
        completedAt: { not: null },
      },
      select: { completedAt: true },
      orderBy: { completedAt: 'desc' },
    });

    if (completedGoals.length === 0) {
      return { current: 0, longest: 0, thisWeek: 0, thisMonth: 0 };
    }

    // Get unique completion dates
    const completionDates = [...new Set(
      completedGoals
        .filter((g) => g.completedAt)
        .map((g) => startOfDay(g.completedAt!).getTime())
    )].sort((a, b) => b - a);

    // Calculate current streak
    let currentStreak = 0;
    const today = startOfDay(new Date()).getTime();
    const yesterday = today - 86400000;

    if (completionDates[0] === today || completionDates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < completionDates.length; i++) {
        const diff = completionDates[i - 1] - completionDates[i];
        if (diff === 86400000) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;
    for (let i = 1; i < completionDates.length; i++) {
      const diff = completionDates[i - 1] - completionDates[i];
      if (diff === 86400000) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    // This week and month counts
    const weekStart = startOfWeek(new Date()).getTime();
    const monthStart = startOfMonth(new Date()).getTime();

    const thisWeek = completionDates.filter((d) => d >= weekStart).length;
    const thisMonth = completionDates.filter((d) => d >= monthStart).length;

    return {
      current: currentStreak,
      longest: Math.max(longestStreak, currentStreak),
      thisWeek,
      thisMonth,
    };
  } catch (error) {
    logger.error('Error calculating goal streak', { userId }, error);
    return { current: 0, longest: 0, thisWeek: 0, thisMonth: 0 };
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';