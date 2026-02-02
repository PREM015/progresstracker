// src/app/api/achievements/stats/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, ForbiddenError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { cache } from '@/lib/redis';
import { auditLogService } from '@/services/auditLogService';

const log = logger.child({ route: 'achievements/stats' });

// =============================================================================
// TYPES
// =============================================================================

interface CategoryStats {
  total: number;
  unlocked: number;
  points: number;
  percentage: number;
}

interface RarityStats {
  total: number;
  unlocked: number;
  percentage: number;
}

interface TierStats {
  total: number;
  unlocked: number;
  percentage: number;
}

interface RecentUnlock {
  id: string;
  achievement: {
    id: string;
    title: string;
    icon: string | null;
    rarity: string;
    points: number;
  };
  unlockedAt: Date;
}

interface PinnedAchievement {
  id: string;
  achievement: {
    id: string;
    title: string;
    icon: string | null;
    rarity: string;
    tier: string;
  };
  unlockedAt: Date;
}

interface NextAchievement {
  achievement: {
    id: string;
    title: string;
    description: string;
    icon: string | null;
    rarity: string;
    points: number;
  };
  percentage: number;
  remaining: number;
  currentProgress: number;
  targetProgress: number;
}

interface AchievementStats {
  total: number;
  unlocked: number;
  locked: number;
  points: number;
  totalPoints: number;
  xpEarned: number;
  totalXp: number;
  completionPercentage: number;
  byCategory: Record<string, CategoryStats>;
  byRarity: Record<string, RarityStats>;
  byTier: Record<string, TierStats>;
  recentUnlocks: RecentUnlock[];
  pinnedAchievements: PinnedAchievement[];
  nextToUnlock: NextAchievement[];
  streakInfo: {
    current: number;
    longest: number;
    isActive: boolean;
  };
  milestones: {
    nextMilestone: number;
    achievementsToNext: number;
    recentMilestones: number[];
  };
}

interface AchievementRequirement {
  metric: string;
  value: number;
  operator?: 'gte' | 'lte' | 'eq';
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateMilestones(unlocked: number): {
  nextMilestone: number;
  achievementsToNext: number;
  recentMilestones: number[];
} {
  const milestoneValues = [1, 5, 10, 25, 50, 100, 150, 200, 250, 500, 1000];
  
  const recentMilestones = milestoneValues.filter(m => m <= unlocked).slice(-3);
  const nextMilestone = milestoneValues.find(m => m > unlocked) || milestoneValues[milestoneValues.length - 1];
  const achievementsToNext = Math.max(0, nextMilestone - unlocked);

  return { nextMilestone, achievementsToNext, recentMilestones };
}

function calculatePercentage(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}

function getMetricValue(
  metric: string,
  userStatsMap: Record<string, number>
): number {
  return userStatsMap[metric] ?? 0;
}

// =============================================================================
// GET /api/achievements/stats - Get user's achievement statistics
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = token.id as string;

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:stats:${userId}`,
      rateLimiters.api
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Try cache first
    const cacheKey = `achievement_stats:${userId}`;
    const cached = await cache.get<AchievementStats>(cacheKey);

    if (cached) {
      log.debug('Stats served from cache', { userId });
      return apiResponse.success(
        { stats: cached },
        { status: 200, meta: { requestId, cached: true } }
      );
    }

    // Fetch all data in parallel for optimal performance
    const [
      allAchievements,
      userAchievements,
      recentUnlocks,
      pinnedAchievements,
      userStats,
    ] = await Promise.all([
      prisma.achievement.findMany({
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
          category: true,
          tier: true,
          rarity: true,
          points: true,
          xpReward: true,
          requirement: true,
        },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: {
            select: {
              id: true,
              category: true,
              tier: true,
              rarity: true,
              points: true,
              xpReward: true,
            },
          },
        },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: {
            select: {
              id: true,
              title: true,
              icon: true,
              rarity: true,
              points: true,
            },
          },
        },
        orderBy: { unlockedAt: 'desc' },
        take: 5,
      }),
      prisma.userAchievement.findMany({
        where: { userId, isPinned: true },
        include: {
          achievement: {
            select: {
              id: true,
              title: true,
              icon: true,
              rarity: true,
              tier: true,
            },
          },
        },
        take: 5,
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          totalProblems: true,
          lastActiveAt: true,
        },
      }),
    ]);

    // Initialize counters
    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

    let totalPoints = 0;
    let totalXp = 0;
    let earnedPoints = 0;
    let earnedXp = 0;

    const byCategory: Record<string, CategoryStats> = {};
    const byRarity: Record<string, RarityStats> = {};
    const byTier: Record<string, TierStats> = {};

    // Process all achievements in a single pass
    for (const achievement of allAchievements) {
      const isUnlocked = unlockedIds.has(achievement.id);

      totalPoints += achievement.points;
      totalXp += achievement.xpReward;

      if (isUnlocked) {
        earnedPoints += achievement.points;
        earnedXp += achievement.xpReward;
      }

      // Aggregate by category
      if (!byCategory[achievement.category]) {
        byCategory[achievement.category] = { total: 0, unlocked: 0, points: 0, percentage: 0 };
      }
      byCategory[achievement.category].total++;
      byCategory[achievement.category].points += achievement.points;
      if (isUnlocked) byCategory[achievement.category].unlocked++;

      // Aggregate by rarity
      if (!byRarity[achievement.rarity]) {
        byRarity[achievement.rarity] = { total: 0, unlocked: 0, percentage: 0 };
      }
      byRarity[achievement.rarity].total++;
      if (isUnlocked) byRarity[achievement.rarity].unlocked++;

      // Aggregate by tier
      if (!byTier[achievement.tier]) {
        byTier[achievement.tier] = { total: 0, unlocked: 0, percentage: 0 };
      }
      byTier[achievement.tier].total++;
      if (isUnlocked) byTier[achievement.tier].unlocked++;
    }

    // Calculate percentages for each grouping
    Object.values(byCategory).forEach((cat) => {
      cat.percentage = calculatePercentage(cat.unlocked, cat.total);
    });
    Object.values(byRarity).forEach((rar) => {
      rar.percentage = calculatePercentage(rar.unlocked, rar.total);
    });
    Object.values(byTier).forEach((tier) => {
      tier.percentage = calculatePercentage(tier.unlocked, tier.total);
    });

    // Build user stats mapping for progress calculation
    const userStatsMap: Record<string, number> = {
      problems_solved: userStats?.totalProblems ?? 0,
      current_streak: userStats?.currentStreak ?? 0,
      longest_streak: userStats?.longestStreak ?? 0,
    };

    // Calculate next achievements to unlock (already have title/icon from initial query)
    const lockedAchievements = allAchievements.filter((a) => !unlockedIds.has(a.id));

    const nextToUnlock: NextAchievement[] = lockedAchievements
      .map((achievement) => {
        const requirement = achievement.requirement as AchievementRequirement | null;

        if (!requirement?.metric || !requirement?.value) {
          return null;
        }

        const current = getMetricValue(requirement.metric, userStatsMap);
        const target = requirement.value;
        
        // Avoid division by zero
        if (target <= 0) return null;

        const percentage = Math.min(Math.round((current / target) * 100), 99);

        // Only include if there's actual progress
        if (percentage <= 0) return null;

        return {
          achievement: {
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            rarity: achievement.rarity,
            points: achievement.points,
          },
          percentage,
          remaining: Math.max(0, target - current),
          currentProgress: current,
          targetProgress: target,
        };
      })
      .filter((item): item is NextAchievement => item !== null)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    // Calculate streak info
    const isStreakActive = userStats?.lastActiveAt
      ? Date.now() - new Date(userStats.lastActiveAt).getTime() < 48 * 60 * 60 * 1000
      : false;

    const streakInfo = {
      current: userStats?.currentStreak ?? 0,
      longest: userStats?.longestStreak ?? 0,
      isActive: isStreakActive,
    };

    // Calculate milestones
    const milestones = calculateMilestones(userAchievements.length);

    // Build final stats object
    const stats: AchievementStats = {
      total: allAchievements.length,
      unlocked: userAchievements.length,
      locked: allAchievements.length - userAchievements.length,
      points: earnedPoints,
      totalPoints,
      xpEarned: earnedXp,
      totalXp,
      completionPercentage: calculatePercentage(
        userAchievements.length,
        allAchievements.length
      ),
      byCategory,
      byRarity,
      byTier,
      recentUnlocks: recentUnlocks.map((ru) => ({
        id: ru.id,
        achievement: {
          id: ru.achievement.id,
          title: ru.achievement.title,
          icon: ru.achievement.icon,
          rarity: ru.achievement.rarity,
          points: ru.achievement.points,
        },
        unlockedAt: ru.unlockedAt,
      })),
      pinnedAchievements: pinnedAchievements.map((pa) => ({
        id: pa.id,
        achievement: {
          id: pa.achievement.id,
          title: pa.achievement.title,
          icon: pa.achievement.icon,
          rarity: pa.achievement.rarity,
          tier: pa.achievement.tier,
        },
        unlockedAt: pa.unlockedAt,
      })),
      nextToUnlock,
      streakInfo,
      milestones,
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, stats, 300);

    log.info('Achievement stats fetched', {
      userId,
      unlocked: stats.unlocked,
      total: stats.total,
      completionPercentage: stats.completionPercentage,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      { stats },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error fetching achievement stats', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// POST /api/achievements/stats - Force recalculate all stats
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = token.id as string;

    // Rate limit (stricter for recalculation)
    const rateLimitResult = await checkRateLimit(
      `achievements:stats:recalc:${userId}`,
      rateLimiters.sync
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(300, requestId);
    }

    // Clear all related caches first
    await Promise.all([
      cache.del(`achievement_stats:${userId}`),
      cache.del(`achievement_progress:${userId}`),
      cache.del(`achievement_categories:${userId}`),
      cache.del(`user_achievements:${userId}`),
    ]);

    // Fetch user achievements with full details
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: {
          select: { points: true, xpReward: true },
        },
      },
    });

    // Calculate totals
    const totalAchievements = userAchievements.length;
    const points = userAchievements.reduce(
      (sum, ua) => sum + ua.achievement.points,
      0
    );
    const xp = userAchievements.reduce(
      (sum, ua) => sum + ua.achievement.xpReward,
      0
    );

    // Update user stats atomically
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalAchievements,
        totalPoints: points,
      },
    });

    // Recalculate global achievement unlock percentages
    const [allAchievements, totalUsers] = await Promise.all([
      prisma.achievement.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    // Batch update achievement stats
    const achievementUpdates = await Promise.all(
      allAchievements.map(async (achievement) => {
        const unlockCount = await prisma.userAchievement.count({
          where: { achievementId: achievement.id },
        });

        const percentage =
          totalUsers > 0 ? (unlockCount / totalUsers) * 100 : 0;

        return prisma.achievement.update({
          where: { id: achievement.id },
          data: {
            totalUnlocked: unlockCount,
            unlockPercentage: Math.round(percentage * 100) / 100,
          },
        });
      })
    );

    log.info('Stats recalculated', {
      userId,
      totalAchievements,
      points,
      xp,
      achievementsUpdated: achievementUpdates.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        recalculated: true,
        userStats: {
          totalAchievements,
          totalPoints: points,
          totalXp: xp,
        },
        achievementsUpdated: allAchievements.length,
        message: 'Stats successfully recalculated',
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error recalculating stats', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE /api/achievements/stats - Reset user achievement stats (Admin only)
// =============================================================================

export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = token.id as string;
    const isAdmin = token.isAdmin as boolean;

    // Parse query parameters
    const targetUserId = req.nextUrl.searchParams.get('userId') || userId;
    const confirm = req.nextUrl.searchParams.get('confirm') === 'true';

    // Authorization check - only admin can reset other users
    if (targetUserId !== userId && !isAdmin) {
      throw new ForbiddenError('Admin access required to reset other users');
    }

    // Fetch achievements to be deleted for preview/logging
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: targetUserId },
      include: {
        achievement: {
          select: { id: true, title: true, points: true, rarity: true },
        },
      },
    });

    const totalPointsToLose = achievements.reduce(
      (sum, a) => sum + a.achievement.points,
      0
    );

    // Preview mode - show what would be deleted
    if (!confirm) {
      return apiResponse.success(
        {
          preview: true,
          targetUserId,
          wouldDelete: achievements.length,
          totalPointsLost: totalPointsToLose,
          achievements: achievements.map((a) => ({
            id: a.achievement.id,
            title: a.achievement.title,
            points: a.achievement.points,
            rarity: a.achievement.rarity,
            unlockedAt: a.unlockedAt,
          })),
          warning: 'This action cannot be undone!',
          message: 'Add ?confirm=true to proceed with reset',
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Perform the reset in a transaction
    const deleted = await prisma.$transaction(async (tx) => {
      // Get achievement IDs for updating counters
      const achievementIds = achievements.map((a) => a.achievementId);

      // Delete all user achievements
      const result = await tx.userAchievement.deleteMany({
        where: { userId: targetUserId },
      });

      // Reset user stats
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          totalAchievements: 0,
          totalPoints: 0,
        },
      });

      // Decrement achievement unlock counts
      if (achievementIds.length > 0) {
        await tx.achievement.updateMany({
          where: { id: { in: achievementIds } },
          data: {
            totalUnlocked: { decrement: 1 },
          },
        });
      }

      return result.count;
    });

    // Clear all related caches
    await Promise.all([
      cache.del(`achievement_stats:${targetUserId}`),
      cache.del(`achievement_progress:${targetUserId}`),
      cache.del(`user_achievements:${targetUserId}`),
      cache.del(`achievement_categories:${targetUserId}`),
    ]);

    // Create audit log entry
    await auditLogService.logAdminAction(
      userId,
      'DELETE',
      `Reset achievement stats for user ${targetUserId}`,
      {
        entityType: 'user_achievement',
        userId: targetUserId,
        oldValue: {
          deletedCount: deleted,
          totalPointsLost: totalPointsToLose,
          achievementIds: achievements.map((a) => a.achievementId),
        },
      }
    );

    log.warn('User achievement stats reset', {
      adminId: userId,
      targetUserId,
      deleted,
      totalPointsLost: totalPointsToLose,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        reset: true,
        targetUserId,
        achievementsRemoved: deleted,
        pointsRemoved: totalPointsToLose,
        message: `Reset complete. ${deleted} achievement(s) removed.`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error resetting stats', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// OPTIONS - CORS preflight handler
// =============================================================================

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}