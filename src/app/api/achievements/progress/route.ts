// src/app/api/achievements/progress/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { ProgressQuerySchema } from '@/lib/validations/achievement';
import { cache } from '@/lib/redis';
import { PlatformCategory, Prisma } from '@prisma/client';

const log = logger.child({ route: 'achievements/progress' });

// =============================================================================
// TYPES
// =============================================================================

interface UserStats {
  problems_solved: number;
  goals_completed: number;
  platforms_connected: number;
  current_streak: number;
  longest_streak: number;
  days_active: number;
  total_commits: number;
  total_time_spent: number;
}

interface AchievementProgress {
  achievementId: string;
  achievement: {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    tier: string;
    icon: string | null;
    points: number;
    xpReward: number;
    rarity: string;
    requirementText: string | null;
  };
  current: number;
  target: number;
  percentage: number;
  remaining: number;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  isPinned: boolean;
}

// =============================================================================
// HELPER: Get user stats
// =============================================================================

async function getUserStats(userId: string): Promise<UserStats> {
  const [
    problemsAgg,
    goalsCount,
    platformsCount,
    user,
    daysActive,
    commitsAgg,
    timeAgg,
  ] = await Promise.all([
    prisma.trackerEntry.aggregate({
      where: { userId },
      _sum: { problemsSolved: true },
    }),
    prisma.goal.count({
      where: { userId, status: 'COMPLETED' },
    }),
    prisma.userPlatform.count({
      where: { userId, isActive: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true },
    }),
    prisma.trackerEntry.groupBy({
      by: ['date'],
      where: { userId },
    }),
    prisma.trackerEntry.aggregate({
      where: { userId },
      _sum: { commits: true },
    }),
    prisma.trackerEntry.aggregate({
      where: { userId },
      _sum: { timeSpent: true },
    }),
  ]);

  return {
    problems_solved: problemsAgg._sum.problemsSolved || 0,
    goals_completed: goalsCount,
    platforms_connected: platformsCount,
    current_streak: user?.currentStreak || 0,
    longest_streak: user?.longestStreak || 0,
    days_active: daysActive.length,
    total_commits: commitsAgg._sum.commits || 0,
    total_time_spent: timeAgg._sum.timeSpent || 0,
  };
}

// =============================================================================
// HELPER: Get current value for requirement
// =============================================================================

function getCurrentValue(
  metric: string,
  stats: UserStats
): number {
  const metricMap: Record<string, keyof UserStats> = {
    problems_solved: 'problems_solved',
    goals_completed: 'goals_completed',
    platforms_connected: 'platforms_connected',
    current_streak: 'current_streak',
    longest_streak: 'longest_streak',
    days_active: 'days_active',
    total_commits: 'total_commits',
    total_time_spent: 'total_time_spent',
  };

  const key = metricMap[metric];
  return key ? stats[key] : 0;
}

// =============================================================================
// GET /api/achievements/progress - Get user's achievement progress
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = token.id as string;

    // Rate limit
    const rateLimitResult = await checkRateLimit(`achievements:progress:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const queryResult = ProgressQuerySchema.safeParse(searchParams);

    if (!queryResult.success) {
      return apiResponse.validationError(
        'Invalid query parameters',
        queryResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const query = queryResult.data;

    // Get user achievements and all achievements
    const [userAchievements, allAchievements, stats] = await Promise.all([
      prisma.userAchievement.findMany({
        where: { userId },
        select: {
          achievementId: true,
          unlockedAt: true,
          isPinned: true,
          progress: true,
          progressPercentage: true,
        },
      }),
      prisma.achievement.findMany({
        where: {
          isActive: true,
          isHidden: false,
          isSecret: false,
          ...(query.category ? { category: query.category } : {}),
        },
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
        ],
      }),
      getUserStats(userId),
    ]);

    // Create lookup map for user achievements
    const unlockedMap = new Map(
      userAchievements.map(ua => [
        ua.achievementId,
        {
          unlockedAt: ua.unlockedAt,
          isPinned: ua.isPinned,
        },
      ])
    );

    // Build progress array
    const progress: AchievementProgress[] = [];

    for (const achievement of allAchievements) {
      const isUnlocked = unlockedMap.has(achievement.id);
      const userAchievement = unlockedMap.get(achievement.id);

      // Filter based on query
      if (!query.includeUnlocked && isUnlocked) continue;
      if (!query.includeLocked && !isUnlocked) continue;

      const requirement = achievement.requirement as {
        type: string;
        metric: string;
        value: number;
      } | null;

      const targetValue = requirement?.value || 1;
      const currentValue = requirement?.metric 
        ? getCurrentValue(requirement.metric, stats)
        : 0;

      const percentage = isUnlocked 
        ? 100 
        : Math.min(Math.round((currentValue / targetValue) * 100), 100);

      progress.push({
        achievementId: achievement.id,
        achievement: {
          id: achievement.id,
          slug: achievement.slug,
          title: achievement.title,
          description: achievement.description,
          category: achievement.category,
          tier: achievement.tier,
          icon: achievement.icon,
          points: achievement.points,
          xpReward: achievement.xpReward,
          rarity: achievement.rarity,
          requirementText: achievement.requirementText,
        },
        current: currentValue,
        target: targetValue,
        percentage,
        remaining: Math.max(0, targetValue - currentValue),
        isUnlocked,
        unlockedAt: userAchievement?.unlockedAt || null,
        isPinned: userAchievement?.isPinned || false,
      });
    }

    // Sort: unlocked first, then by percentage descending
    progress.sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;
      return b.percentage - a.percentage;
    });

    // Summary statistics
    const summary = {
      total: allAchievements.length,
      unlocked: userAchievements.length,
      locked: allAchievements.length - userAchievements.length,
      completionPercentage: Math.round((userAchievements.length / allAchievements.length) * 100),
      nearCompletion: progress.filter(p => !p.isUnlocked && p.percentage >= 80).length,
    };

    log.info('Achievement progress fetched', {
      userId,
      total: progress.length,
      unlocked: summary.unlocked,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        progress,
        stats,
        summary,
      },
      {
        status: 200,
        meta: { requestId },
      }
    );
  } catch (error) {
    log.error('Error fetching achievement progress', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}


// =============================================================================
// POST /api/achievements/progress - Force refresh progress calculation
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = token.id as string;

    // Rate limit (stricter - only allow refresh every 5 minutes)
    const rateLimitResult = await checkRateLimit(`achievements:progress:refresh:${userId}`, rateLimiters.sync);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(300, requestId);
    }

    // Parse optional body
    let body: { category?: string; achievementIds?: string[] } = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is ok
    }

    // Get fresh user stats
    const stats = await getUserStats(userId);

    // Get achievements to recalculate
    const where: Prisma.AchievementWhereInput = {
      isActive: true,
    };

    if (body.category) {
      where.category = body.category as PlatformCategory;
    }

    if (body.achievementIds && body.achievementIds.length > 0) {
      where.id = { in: body.achievementIds };
    }

    const achievements = await prisma.achievement.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        requirement: true,
      },
    });

    // Get current user achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, progress: true, progressPercentage: true },
    });

    const userAchievementMap = new Map(
      userAchievements.map(ua => [ua.achievementId, ua])
    );

    // Recalculate progress for each
    const updatedProgress: Array<{
      achievementId: string;
      title: string;
      oldProgress: number;
      newProgress: number;
      oldPercentage: number;
      newPercentage: number;
      changed: boolean;
      nowEligible: boolean;
    }> = [];

    for (const achievement of achievements) {
      const requirement = achievement.requirement as {
        type: string;
        metric: string;
        value: number;
      } | null;

      if (!requirement) continue;

      const currentValue = getCurrentValue(requirement.metric, stats);
      const targetValue = requirement.value;
      const newPercentage = Math.min(Math.round((currentValue / targetValue) * 100), 100);

      const existing = userAchievementMap.get(achievement.id);
      const oldPercentage = existing?.progressPercentage || 0;
      const oldProgress = existing?.progress || 0;

      const changed = newPercentage !== oldPercentage;
      const nowEligible = !existing && newPercentage >= 100;

      updatedProgress.push({
        achievementId: achievement.id,
        title: achievement.title,
        oldProgress,
        newProgress: currentValue,
        oldPercentage,
        newPercentage,
        changed,
        nowEligible,
      });

      // Update user achievement progress if exists
      if (existing && changed) {
        await prisma.userAchievement.update({
          where: {
            userId_achievementId: { userId, achievementId: achievement.id },
          },
          data: {
            progress: Math.min(currentValue, targetValue),
            progressPercentage: newPercentage,
          },
        });
      }
    }

    // Clear cache
    await cache.del(`achievement_stats:${userId}`);
    await cache.del(`achievement_progress:${userId}`);

    const changedCount = updatedProgress.filter(p => p.changed).length;
    const eligibleCount = updatedProgress.filter(p => p.nowEligible).length;

    log.info('Progress refreshed', {
      userId,
      total: achievements.length,
      changed: changedCount,
      eligible: eligibleCount,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        refreshed: true,
        stats,
        summary: {
          total: achievements.length,
          changed: changedCount,
          nowEligible: eligibleCount,
        },
        progress: updatedProgress.filter(p => p.changed || p.nowEligible),
        eligibleToUnlock: updatedProgress
          .filter(p => p.nowEligible)
          .map(p => ({ achievementId: p.achievementId, title: p.title })),
        message: eligibleCount > 0
          ? `${eligibleCount} achievement(s) are now eligible to unlock!`
          : `Progress refreshed. ${changedCount} achievement(s) updated.`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error refreshing progress', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}