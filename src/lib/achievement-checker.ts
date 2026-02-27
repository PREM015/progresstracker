// ============================================================================
// FILE: lib/achievement-checker.ts
// PURPOSE: Achievement checking and unlocking logic
// ============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { cache } from '@/lib/redis';
import { NotificationService } from '@/services/notificationService';
import { achievements, type Achievement, type AchievementRequirement } from '@/config/achievements';
import type { UserAchievement, Prisma } from '@prisma/client';

const log = logger.child({ module: 'AchievementChecker' });

// =============================================================================
// TYPES
// =============================================================================

export interface UserStats {
  problems_solved: number;
  goals_completed: number;
  platforms_connected: number;
  current_streak: number;
  longest_streak: number;
  days_active: number;
  total_commits: number;
  weekend_streak?: number;
  perfect_week_count?: number;
  perfect_month_count?: number;
  early_activity?: number;
  late_activity?: number;
  comeback?: number;
  overachieve?: number;
}

export interface AchievementContext {
  trigger?: 'manual' | 'cron' | 'event' | 'goal_completed' | 'tracker_entry';
  eventType?: string;
  metadata?: Record<string, unknown>;
}

export interface UnlockedAchievementResult {
  achievement: Achievement;
  userAchievement: UserAchievement;
  pointsEarned: number;
  xpEarned: number;
}

export interface AchievementProgress {
  achievementId: string;
  achievement: Achievement;
  current: number;
  target: number;
  percentage: number;
  isUnlocked: boolean;
  remaining: number;
}

// =============================================================================
// CACHE KEYS
// =============================================================================

const CACHE_KEYS = {
  userStats: (userId: string) => `achievement:stats:${userId}`,
  unlocked: (userId: string) => `achievement:unlocked:${userId}`,
  progress: (userId: string, achievementId: string) => 
    `achievement:progress:${userId}:${achievementId}`,
};

const CACHE_TTL = {
  stats: 300, // 5 minutes
  unlocked: 600, // 10 minutes
  progress: 300, // 5 minutes
};

// =============================================================================
// HELPER: Convert to Prisma JSON
// =============================================================================

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

// =============================================================================
// HELPER: Get User Stats
// =============================================================================

async function getUserStats(userId: string, useCache = true): Promise<UserStats> {
  try {
    // Try cache first
    if (useCache) {
      const cached = await cache.get<UserStats>(CACHE_KEYS.userStats(userId));
      if (cached) {
        log.debug('User stats retrieved from cache', { userId });
        return cached;
      }
    }

    // Fetch fresh stats
    const [
      problemsAgg,
      goalsCount,
      platformsCount,
      user,
      daysActive,
      commitsAgg,
      trackerEntries,
    ] = await Promise.all([
      // Total problems solved
      prisma.trackerEntry.aggregate({
        where: { userId },
        _sum: { problemsSolved: true },
      }),
      // Completed goals
      prisma.goal.count({
        where: { userId, status: 'COMPLETED' },
      }),
      // Connected platforms
      prisma.userPlatform.count({
        where: { userId, isActive: true },
      }),
      // User streak data
      prisma.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, longestStreak: true },
      }),
      // Days active (unique dates)
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: { userId },
      }),
      // Total commits
      prisma.trackerEntry.aggregate({
        where: { userId },
        _sum: { commits: true },
      }),
      // Recent tracker entries for special achievements
      prisma.trackerEntry.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 365,
      }),
    ]);

    // Calculate special metrics
    const specialMetrics = calculateSpecialMetrics(trackerEntries);

    const stats: UserStats = {
      problems_solved: problemsAgg._sum.problemsSolved || 0,
      goals_completed: goalsCount,
      platforms_connected: platformsCount,
      current_streak: user?.currentStreak || 0,
      longest_streak: user?.longestStreak || 0,
      days_active: daysActive.length,
      total_commits: commitsAgg._sum.commits || 0,
      ...specialMetrics,
    };

    // Cache the stats
    await cache.set(CACHE_KEYS.userStats(userId), stats, CACHE_TTL.stats);

    log.debug('User stats calculated', { userId, stats });

    return stats;
  } catch (error) {
    log.error('Error getting user stats', { userId }, error);
    throw error;
  }
}

// =============================================================================
// HELPER: Calculate Special Metrics
// =============================================================================

function calculateSpecialMetrics(entries: Array<{ 
  date: Date; 
  createdAt: Date;
  [key: string]: unknown;
}>): Partial<UserStats> {
  const metrics: Partial<UserStats> = {
    weekend_streak: 0,
    perfect_week_count: 0,
    perfect_month_count: 0,
    early_activity: 0,
    late_activity: 0,
  };

  if (entries.length === 0) return metrics;

  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Check for early bird / night owl (based on creation time)
  entries.forEach(entry => {
    const hour = new Date(entry.createdAt).getHours();
    if (hour < 8) metrics.early_activity = 1;
    if (hour >= 23) metrics.late_activity = 1;
  });

  // Calculate weekend streak
  let currentWeekendStreak = 0;
  let maxWeekendStreak = 0;
  let lastWeekendDate: Date | null = null;

  sortedEntries.forEach(entry => {
    const date = new Date(entry.date);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      if (!lastWeekendDate) {
        currentWeekendStreak = 1;
      } else {
        const daysDiff = Math.floor(
          (date.getTime() - lastWeekendDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff <= 7) {
          currentWeekendStreak++;
        } else {
          currentWeekendStreak = 1;
        }
      }
      lastWeekendDate = date;
      maxWeekendStreak = Math.max(maxWeekendStreak, currentWeekendStreak);
    }
  });

  metrics.weekend_streak = Math.floor(maxWeekendStreak / 2); // Convert to week count

  // Calculate perfect weeks/months (simplified - would need goal completion data)
  // This is a placeholder - implement based on your goal tracking logic
  metrics.perfect_week_count = 0;
  metrics.perfect_month_count = 0;

  return metrics;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Check all achievements for a user and unlock eligible ones
 */
export async function checkAchievements(
  userId: string,
  context: AchievementContext = {}
): Promise<UnlockedAchievementResult[]> {
  try {
    log.info('Checking achievements', { userId, context });

    // Get user stats
    const stats = await getUserStats(userId, false); // Fresh stats

    // Get already unlocked achievements
    const unlockedAchievements = await getUnlockedAchievements(userId);
    const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievementId));

    // Filter to active, not-yet-unlocked achievements
    const eligibleAchievements = achievements.filter(
      achievement => achievement.isActive !== false && !unlockedIds.has(achievement.id)
    );

    // Check each achievement
    const toUnlock: Achievement[] = [];

    for (const achievement of eligibleAchievements) {
      const isEligible = await checkAchievement(userId, achievement, stats);
      if (isEligible) {
        toUnlock.push(achievement);
      }
    }

    // Unlock achievements
    const unlocked: UnlockedAchievementResult[] = [];

    if (toUnlock.length > 0) {
      for (const achievement of toUnlock) {
        try {
          const result = await unlockAchievement(userId, achievement.id, stats);
          if (result) {
            unlocked.push(result);
          }
        } catch (error) {
          log.error('Error unlocking achievement', { 
            userId, 
            achievementId: achievement.id 
          }, error);
        }
      }

      // Invalidate caches
      await Promise.all([
        cache.del(CACHE_KEYS.userStats(userId)),
        cache.del(CACHE_KEYS.unlocked(userId)),
      ]);
    }

    log.info('Achievement check completed', {
      userId,
      checked: eligibleAchievements.length,
      unlocked: unlocked.length,
    });

    return unlocked;
  } catch (error) {
    log.error('Error checking achievements', { userId }, error);
    throw error;
  }
}

/**
 * Check if a single achievement is eligible for unlock
 */
export async function checkAchievement(
  userId: string,
  achievement: Achievement,
  userStats?: UserStats
): Promise<boolean> {
  try {
    // Get stats if not provided
    const stats = userStats || await getUserStats(userId);

    // Evaluate requirement
    return evaluateRequirement(achievement.requirement, stats);
  } catch (error) {
    log.error('Error checking achievement', { 
      userId, 
      achievementId: achievement.id 
    }, error);
    return false;
  }
}

/**
 * Evaluate an achievement requirement against user stats
 */
export function evaluateRequirement(
  requirement: AchievementRequirement,
  userStats: UserStats
): boolean {
  const { type, metric, value } = requirement;

  // Map metric to user stats key
  const metricMap: Record<string, keyof UserStats> = {
    problems_solved: 'problems_solved',
    goals_completed: 'goals_completed',
    platforms_connected: 'platforms_connected',
    current_streak: 'current_streak',
    longest_streak: 'longest_streak',
    days_active: 'days_active',
    total_commits: 'total_commits',
    weekend_streak: 'weekend_streak',
    perfect_week: 'perfect_week_count',
    perfect_month: 'perfect_month_count',
    early_activity: 'early_activity',
    late_activity: 'late_activity',
    comeback: 'comeback',
    overachieve: 'overachieve',
  };

  const key = metricMap[metric];
  if (!key) {
    log.warn('Unknown metric in requirement', { metric });
    return false;
  }

  const currentValue = userStats[key] || 0;

  // Type-specific evaluation
  switch (type) {
    case 'count':
    case 'streak':
    case 'goal':
    case 'platform':
      return currentValue >= value;
    
    case 'special':
      return currentValue >= value;
    
    default:
      log.warn('Unknown requirement type', { type });
      return false;
  }
}

/**
 * Unlock an achievement for a user
 */
export async function unlockAchievement(
  userId: string,
  achievementId: string,
  userStats?: UserStats
): Promise<UnlockedAchievementResult | null> {
  try {
    // Get achievement config
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement) {
      log.error('Achievement not found', { achievementId });
      return null;
    }

    // Get stats if needed for verification
    const stats = userStats || await getUserStats(userId);

    // Verify eligibility
    const isEligible = evaluateRequirement(achievement.requirement, stats);
    if (!isEligible) {
      log.warn('Attempted to unlock ineligible achievement', { 
        userId, 
        achievementId 
      });
      return null;
    }

    // Check if already unlocked
    const existing = await prisma.userAchievement.findFirst({
      where: { userId, achievementId },
    });

    if (existing) {
      log.warn('Achievement already unlocked', { userId, achievementId });
      return null;
    }

    // Find or create achievement in database
    let dbAchievement = await prisma.achievement.findUnique({
      where: { slug: achievement.slug },
    });

    if (!dbAchievement) {
      // Create achievement in database
      dbAchievement = await prisma.achievement.create({
        data: {
          slug: achievement.slug,
          title: achievement.title,
          description: achievement.description,
          category: achievement.prismaCategory,
          tier: achievement.tier,
          icon: achievement.icon,
          points: achievement.points,
          xpReward: achievement.xpReward,
          rarity: achievement.rarity,
          requirement: toJsonValue(achievement.requirement),
          requirementText: achievement.requirementText ?? null,
          thresholds: achievement.thresholds 
            ? toJsonValue(achievement.thresholds) 
            : undefined,
          isHidden: achievement.isHidden ?? false,
          isSecret: achievement.secret ?? false,
          isActive: true,
          sortOrder: achievement.sortOrder ?? 0,
        },
      });
    }

    // Unlock in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user achievement
      const userAchievement = await tx.userAchievement.create({
        data: {
          userId,
          achievementId: dbAchievement!.id,
          progress: achievement.requirement.value,
          progressPercentage: 100,
          unlockedAt: new Date(),
        },
      });

      // Update achievement stats
      await tx.achievement.update({
        where: { id: dbAchievement!.id },
        data: { totalUnlocked: { increment: 1 } },
      });

      // Update user totals
      await tx.user.update({
        where: { id: userId },
        data: {
          totalAchievements: { increment: 1 },
          totalPoints: { increment: achievement.points },
        },
      });

      return userAchievement;
    });

    // Send notification
    try {
      await NotificationService.notifyAchievementUnlocked(userId, {
        title: achievement.title,
        icon: achievement.icon,
        points: achievement.points,
      });
    } catch (error) {
      log.error('Error sending achievement notification', { userId, achievementId }, error);
      // Don't fail the unlock if notification fails
    }

    log.info('Achievement unlocked', {
      userId,
      achievementId,
      points: achievement.points,
      xp: achievement.xpReward,
    });

    return {
      achievement,
      userAchievement: result,
      pointsEarned: achievement.points,
      xpEarned: achievement.xpReward,
    };
  } catch (error) {
    log.error('Error unlocking achievement', { userId, achievementId }, error);
    throw error;
  }
}

/**
 * Get progress for a specific achievement
 */
export async function getAchievementProgress(
  userId: string,
  achievementId: string
): Promise<AchievementProgress | null> {
  try {
    // Try cache first
    const cacheKey = CACHE_KEYS.progress(userId, achievementId);
    const cached = await cache.get<AchievementProgress>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get achievement config
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement) {
      return null;
    }

    // Check if already unlocked
    const unlocked = await prisma.userAchievement.findFirst({
      where: { userId, achievementId },
    });

    if (unlocked) {
      const progress: AchievementProgress = {
        achievementId,
        achievement,
        current: achievement.requirement.value,
        target: achievement.requirement.value,
        percentage: 100,
        isUnlocked: true,
        remaining: 0,
      };

      await cache.set(cacheKey, progress, CACHE_TTL.progress);
      return progress;
    }

    // Get user stats
    const stats = await getUserStats(userId);

    // Calculate progress
    const metricMap: Record<string, keyof UserStats> = {
      problems_solved: 'problems_solved',
      goals_completed: 'goals_completed',
      platforms_connected: 'platforms_connected',
      current_streak: 'current_streak',
      longest_streak: 'longest_streak',
      days_active: 'days_active',
      total_commits: 'total_commits',
    };

    const key = metricMap[achievement.requirement.metric];
    const current = key ? (stats[key] || 0) : 0;
    const target = achievement.requirement.value;
    const percentage = Math.min((current / target) * 100, 100);

    const progress: AchievementProgress = {
      achievementId,
      achievement,
      current,
      target,
      percentage,
      isUnlocked: false,
      remaining: Math.max(0, target - current),
    };

    await cache.set(cacheKey, progress, CACHE_TTL.progress);

    return progress;
  } catch (error) {
    log.error('Error getting achievement progress', { userId, achievementId }, error);
    return null;
  }
}

/**
 * Get all unlocked achievements for a user
 */
export async function getUnlockedAchievements(
  userId: string
): Promise<UserAchievement[]> {
  try {
    // Try cache first
    const cacheKey = CACHE_KEYS.unlocked(userId);
    const cached = await cache.get<UserAchievement[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const unlocked = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });

    await cache.set(cacheKey, unlocked, CACHE_TTL.unlocked);

    return unlocked;
  } catch (error) {
    log.error('Error getting unlocked achievements', { userId }, error);
    throw error;
  }
}

/**
 * Get available (not yet unlocked) achievements for a user
 */
export async function getAvailableAchievements(
  userId: string
): Promise<Achievement[]> {
  try {
    const unlocked = await getUnlockedAchievements(userId);
    const unlockedIds = new Set(unlocked.map(ua => ua.achievementId));

    return achievements.filter(
      achievement => 
        achievement.isActive !== false && 
        !achievement.isHidden &&
        !achievement.secret &&
        !unlockedIds.has(achievement.id)
    );
  } catch (error) {
    log.error('Error getting available achievements', { userId }, error);
    throw error;
  }
}

// =============================================================================
// NAMED EXPORT OBJECT
// =============================================================================

export const AchievementChecker = {
  checkAchievements,
  checkAchievement,
  evaluateRequirement,
  unlockAchievement,
  getAchievementProgress,
  getUnlockedAchievements,
  getAvailableAchievements,
  getUserStats,
};