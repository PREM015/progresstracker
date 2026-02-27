// src/app/api/achievements/check/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { cache } from '@/lib/redis';


const log = logger.child({ route: 'achievements/check' });

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
}

interface UnlockedAchievement {
  id: string;
  achievementId: string;
  achievement: {
    id: string;
    title: string;
    icon: string | null;
    points: number;
    xpReward: number;
    rarity: string;
  };
  unlockedAt: Date;
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
  ]);

  return {
    problems_solved: problemsAgg._sum.problemsSolved || 0,
    goals_completed: goalsCount,
    platforms_connected: platformsCount,
    current_streak: user?.currentStreak || 0,
    longest_streak: user?.longestStreak || 0,
    days_active: daysActive.length,
    total_commits: commitsAgg._sum.commits || 0,
  };
}

// =============================================================================
// POST /api/achievements/check - Check & unlock all eligible achievements
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

    // Rate limit (stricter - only allow checking every 5 minutes)
    const rateLimitResult = await checkRateLimit(`achievements:check:${userId}`, rateLimiters.sync);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(300, requestId);
    }

    // Get user's current achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    // Get all active achievements not yet unlocked
    const eligibleAchievements = await prisma.achievement.findMany({
      where: {
        isActive: true,
        id: { notIn: Array.from(unlockedIds) },
      },
    });

    if (eligibleAchievements.length === 0) {
      return apiResponse.success(
        {
          checked: 0,
          newUnlocks: [],
          message: 'All achievements already unlocked or no eligible achievements',
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Get user stats
    const stats = await getUserStats(userId);

    // Check each achievement
    const toUnlock: string[] = [];

    for (const achievement of eligibleAchievements) {
      const requirement = achievement.requirement as {
        type: string;
        metric: string;
        value: number;
      } | null;

      if (!requirement) continue;

      const metricMap: Record<string, keyof UserStats> = {
        problems_solved: 'problems_solved',
        goals_completed: 'goals_completed',
        platforms_connected: 'platforms_connected',
        current_streak: 'current_streak',
        longest_streak: 'longest_streak',
        days_active: 'days_active',
        total_commits: 'total_commits',
      };

      const key = metricMap[requirement.metric];
      if (!key) continue;

      const currentValue = stats[key];
      if (currentValue >= requirement.value) {
        toUnlock.push(achievement.id);
      }
    }

    if (toUnlock.length === 0) {
      return apiResponse.success(
        {
          checked: eligibleAchievements.length,
          newUnlocks: [],
          stats,
          message: 'No new achievements to unlock',
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Unlock all eligible achievements in transaction
    const newUnlocks: UnlockedAchievement[] = [];
    let totalPoints = 0;
    let totalXp = 0;

    await prisma.$transaction(async (tx) => {
      for (const achievementId of toUnlock) {
        const achievement = eligibleAchievements.find(a => a.id === achievementId)!;

        // Create user achievement
        const userAchievement = await tx.userAchievement.create({
          data: {
            userId,
            achievementId,
            progress: 100,
            progressPercentage: 100,
            unlockedAt: new Date(),
          },
          include: {
            achievement: {
              select: {
                id: true,
                title: true,
                icon: true,
                points: true,
                xpReward: true,
                rarity: true,
              },
            },
          },
        });

        // Update achievement stats
        await tx.achievement.update({
          where: { id: achievementId },
          data: { totalUnlocked: { increment: 1 } },
        });

        totalPoints += achievement.points;
        totalXp += achievement.xpReward;

        newUnlocks.push({
          id: userAchievement.id,
          achievementId: userAchievement.achievementId,
          achievement: userAchievement.achievement,
          unlockedAt: userAchievement.unlockedAt,
        });

        // Create notification for each unlock
        await tx.notification.create({
          data: {
            userId,
            type: 'ACHIEVEMENT_UNLOCKED',
            title: 'Achievement Unlocked! 🎉',
            message: `You've earned the "${achievement.title}" achievement!`,
            entityType: 'achievement',
            entityId: achievementId,
            metadata: {
              achievementId,
              title: achievement.title,
              icon: achievement.icon,
              points: achievement.points,
            },
          },
        });
      }

      // Update user totals
      await tx.user.update({
        where: { id: userId },
        data: {
          totalAchievements: { increment: toUnlock.length },
          totalPoints: { increment: totalPoints },
        },
      });
    });

    // Clear stats cache
    await cache.del(`achievement_stats:${userId}`);

    log.info('Achievements checked and unlocked', {
      userId,
      checked: eligibleAchievements.length,
      unlocked: newUnlocks.length,
      pointsEarned: totalPoints,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        checked: eligibleAchievements.length,
        newUnlocks,
        summary: {
          count: newUnlocks.length,
          pointsEarned: totalPoints,
          xpEarned: totalXp,
        },
        stats,
        message: newUnlocks.length > 0
          ? `🎉 Congratulations! You've unlocked ${newUnlocks.length} new achievement(s)!`
          : 'No new achievements to unlock',
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error checking achievements', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}
// =============================================================================
// GET /api/achievements/check - Preview eligible achievements without unlocking
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
    const rateLimitResult = await checkRateLimit(`achievements:check:preview:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get user's current achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    // Get all active achievements not yet unlocked
    const eligibleAchievements = await prisma.achievement.findMany({
      where: {
        isActive: true,
        id: { notIn: Array.from(unlockedIds) },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        points: true,
        xpReward: true,
        rarity: true,
        requirement: true,
        requirementText: true,
      },
    });

    if (eligibleAchievements.length === 0) {
      return apiResponse.success(
        {
          preview: true,
          eligible: [],
          almostEligible: [],
          stats: await getUserStats(userId),
          message: 'All achievements already unlocked or no eligible achievements',
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Get user stats
    const stats = await getUserStats(userId);

    // Check each achievement
    const eligible: Array<{
      achievement: typeof eligibleAchievements[0];
      progress: { current: number; target: number; percentage: number };
    }> = [];

    const almostEligible: Array<{
      achievement: typeof eligibleAchievements[0];
      progress: { current: number; target: number; percentage: number; remaining: number };
    }> = [];

    for (const achievement of eligibleAchievements) {
      const requirement = achievement.requirement as {
        type: string;
        metric: string;
        value: number;
      } | null;

      if (!requirement) continue;

      const metricMap: Record<string, keyof UserStats> = {
        problems_solved: 'problems_solved',
        goals_completed: 'goals_completed',
        platforms_connected: 'platforms_connected',
        current_streak: 'current_streak',
        longest_streak: 'longest_streak',
        days_active: 'days_active',
        total_commits: 'total_commits',
      };

      const key = metricMap[requirement.metric];
      if (!key) continue;

      const currentValue = stats[key];
      const targetValue = requirement.value;
      const percentage = Math.round((currentValue / targetValue) * 100);

      if (currentValue >= targetValue) {
        eligible.push({
          achievement,
          progress: {
            current: currentValue,
            target: targetValue,
            percentage: 100,
          },
        });
      } else if (percentage >= 50) {
        // Almost eligible (50%+ progress)
        almostEligible.push({
          achievement,
          progress: {
            current: currentValue,
            target: targetValue,
            percentage,
            remaining: targetValue - currentValue,
          },
        });
      }
    }

    // Sort almost eligible by percentage (closest first)
    almostEligible.sort((a, b) => b.progress.percentage - a.progress.percentage);

    log.info('Eligibility preview completed', {
      userId,
      eligible: eligible.length,
      almostEligible: almostEligible.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        preview: true,
        eligible: eligible.map(e => ({
          ...e.achievement,
          progress: e.progress,
          canUnlock: true,
        })),
        almostEligible: almostEligible.slice(0, 10).map(e => ({
          ...e.achievement,
          progress: e.progress,
          canUnlock: false,
        })),
        summary: {
          totalEligible: eligible.length,
          totalAlmostEligible: almostEligible.length,
          potentialPoints: eligible.reduce((sum, e) => sum + e.achievement.points, 0),
          potentialXp: eligible.reduce((sum, e) => sum + e.achievement.xpReward, 0),
        },
        stats,
        message: eligible.length > 0
          ? `${eligible.length} achievement(s) ready to unlock!`
          : `No achievements eligible yet. ${almostEligible.length} almost ready.`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error previewing eligibility', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}