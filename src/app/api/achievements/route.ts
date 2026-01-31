/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/achievements/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma, PlatformCategory } from '@prisma/client';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  category: z.string().optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).optional(),
  includeProgress: z.string().transform(v => v === 'true').optional(),
  includeStats: z.string().transform(v => v === 'true').optional(),
  includeHidden: z.string().transform(v => v === 'true').optional(),
  unlockedOnly: z.string().transform(v => v === 'true').optional(),
});

// =============================================================================
// GET - Get achievements
// =============================================================================

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized achievements access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const params = querySchema.parse({
      category: searchParams.get('category') || undefined,
      tier: searchParams.get('tier') || undefined,
      includeProgress: searchParams.get('progress') || 'false',
      includeStats: searchParams.get('stats') || 'false',
      includeHidden: searchParams.get('hidden') || 'false',
      unlockedOnly: searchParams.get('unlockedOnly') || 'false',
    });

    logger.debug('Fetching achievements', {
      userId: session.user.id,
      params,
    });

    // Build where clause for achievements
    const achievementWhere: Prisma.AchievementWhereInput = {
      isActive: true,
    };

    if (!params.includeHidden) {
      achievementWhere.isHidden = false;
    }

    if (params.category) {
      achievementWhere.category = params.category as PlatformCategory;
    }

    if (params.tier) {
      achievementWhere.tier = params.tier;
    }

    // Get user's unlocked achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: session.user.id },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: 'desc' },
    });

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    // Get all achievements (filtered)
    let allAchievements: Array<{
      id: string;
      slug: string;
      title: string;
      description: string;
      category: PlatformCategory;
      tier: string;
      icon: string | null;
      color: string | null;
      badgeImage: string | null;
      points: number;
      xpReward: number;
      rarity: string;
      isHidden: boolean;
      isSecret: boolean;
      requirementText: string | null;
      requirement: Prisma.JsonValue;
      thresholds: Prisma.JsonValue;
      sortOrder: number;
    }> = [];

    if (!params.unlockedOnly) {
      allAchievements = await prisma.achievement.findMany({
        where: achievementWhere,
        orderBy: [
          { sortOrder: 'asc' },
          { points: 'desc' },
        ],
      });
    }

    // Combine unlocked status with achievements
    const achievements = params.unlockedOnly
      ? userAchievements.map(ua => ({
          ...ua.achievement,
          unlocked: true,
          unlockedAt: ua.unlockedAt,
          progress: ua.progress,
          progressPercentage: ua.progressPercentage,
          isPinned: ua.isPinned,
        }))
      : allAchievements.map(achievement => {
          const userAch = userAchievements.find(ua => ua.achievementId === achievement.id);
          return {
            ...achievement,
            unlocked: unlockedIds.has(achievement.id),
            unlockedAt: userAch?.unlockedAt || null,
            progress: userAch?.progress || 0,
            progressPercentage: userAch?.progressPercentage || 0,
            isPinned: userAch?.isPinned || false,
          };
        });

    // Calculate progress for locked achievements if requested
    let progressData: Record<string, { current: number; target: number; percentage: number }> | null = null;

    if (params.includeProgress) {
      progressData = await calculateAchievementProgress(
        session.user.id,
        allAchievements.map(a => ({
          id: a.id,
          requirement: a.requirement,
        }))
      );
    }

    // Calculate stats if requested
    let stats: {
      total: number;
      unlocked: number;
      locked: number;
      percentage: number;
      totalPoints: number;
      earnedPoints: number;
      byTier: Record<string, { total: number; unlocked: number }>;
      byCategory: Record<string, { total: number; unlocked: number }>;
      recentUnlocks: number;
    } | null = null;

    if (params.includeStats) {
      const allActiveAchievements = await prisma.achievement.findMany({
        where: { isActive: true },
        select: {
          id: true,
          tier: true,
          category: true,
          points: true,
        },
      });

      const tierStats: Record<string, { total: number; unlocked: number }> = {};
      const categoryStats: Record<string, { total: number; unlocked: number }> = {};
      let totalPoints = 0;
      let earnedPoints = 0;

      allActiveAchievements.forEach(ach => {
        totalPoints += ach.points;

        // Tier stats
        if (!tierStats[ach.tier]) {
          tierStats[ach.tier] = { total: 0, unlocked: 0 };
        }
        tierStats[ach.tier].total++;
        if (unlockedIds.has(ach.id)) {
          tierStats[ach.tier].unlocked++;
          earnedPoints += ach.points;
        }

        // Category stats
        if (!categoryStats[ach.category]) {
          categoryStats[ach.category] = { total: 0, unlocked: 0 };
        }
        categoryStats[ach.category].total++;
        if (unlockedIds.has(ach.id)) {
          categoryStats[ach.category].unlocked++;
        }
      });

      // Recent unlocks (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentUnlocks = userAchievements.filter(
        ua => ua.unlockedAt >= weekAgo
      ).length;

      stats = {
        total: allActiveAchievements.length,
        unlocked: unlockedIds.size,
        locked: allActiveAchievements.length - unlockedIds.size,
        percentage: allActiveAchievements.length > 0
          ? Math.round((unlockedIds.size / allActiveAchievements.length) * 100)
          : 0,
        totalPoints,
        earnedPoints,
        byTier: tierStats,
        byCategory: categoryStats,
        recentUnlocks,
      };
    }

    logger.info('Achievements fetched', {
      userId: session.user.id,
      total: achievements.length,
      unlocked: unlockedIds.size,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        achievements,
        progress: progressData,
        stats,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid achievements query params', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to fetch achievements', { duration: Date.now() - startTime }, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch achievements',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Check and unlock achievements
// =============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized achievement check');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Checking achievements', { userId: session.user.id });

    // Get user stats
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        totalProblems: true,
        totalCommits: true,
        totalProjects: true,
        totalCertifications: true,
        currentStreak: true,
        longestStreak: true,
        totalPoints: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all active achievements user hasn't unlocked
    const unlockedIds = await prisma.userAchievement.findMany({
      where: { userId: session.user.id },
      select: { achievementId: true },
    });

    const unlockedIdSet = new Set(unlockedIds.map(u => u.achievementId));

    const lockedAchievements = await prisma.achievement.findMany({
      where: {
        isActive: true,
        id: { notIn: Array.from(unlockedIdSet) },
      },
    });

    // Check each achievement
    const newUnlocks: Array<{
      id: string;
      title: string;
      description: string;
      tier: string;
      points: number;
      xpReward: number;
      icon: string | null;
      badgeImage: string | null;
    }> = [];

    for (const achievement of lockedAchievements) {
      const isUnlocked = await checkAchievementRequirement(
        achievement,
        user,
        session.user.id
      );

      if (isUnlocked) {
        // Create user achievement
        await prisma.userAchievement.create({
          data: {
            userId: session.user.id,
            achievementId: achievement.id,
            progress: 100,
            progressPercentage: 100,
            unlockedAt: new Date(),
          },
        });

        // Update achievement unlock count
        await prisma.achievement.update({
          where: { id: achievement.id },
          data: { totalUnlocked: { increment: 1 } },
        });

        // Update user total achievements and points
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            totalAchievements: { increment: 1 },
            totalPoints: { increment: achievement.points },
          },
        });

        // Create notification
        await prisma.notification.create({
          data: {
            userId: session.user.id,
            type: 'ACHIEVEMENT_UNLOCKED',
            priority: 'NORMAL',
            title: '🏆 Achievement Unlocked!',
            message: `You've earned: ${achievement.title}`,
            entityType: 'achievement',
            entityId: achievement.id,
            imageUrl: achievement.badgeImage,
          },
        });

        newUnlocks.push({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          tier: achievement.tier,
          points: achievement.points,
          xpReward: achievement.xpReward,
          icon: achievement.icon,
          badgeImage: achievement.badgeImage,
        });

        logger.info('Achievement unlocked', {
          userId: session.user.id,
          achievementId: achievement.id,
          title: achievement.title,
          points: achievement.points,
        });
      }
    }

    logger.info('Achievement check complete', {
      userId: session.user.id,
      checked: lockedAchievements.length,
      unlocked: newUnlocks.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        newUnlocks,
        count: newUnlocks.length,
      },
      message: newUnlocks.length > 0
        ? `Unlocked ${newUnlocks.length} new achievement(s)!`
        : 'No new achievements unlocked',
    });
  } catch (error) {
    logger.error('Failed to check achievements', { duration: Date.now() - startTime }, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check achievements',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function calculateAchievementProgress(
  userId: string,
  achievements: Array<{ id: string; requirement: Prisma.JsonValue }>
): Promise<Record<string, { current: number; target: number; percentage: number }>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalProblems: true,
      totalCommits: true,
      totalProjects: true,
      totalCertifications: true,
      currentStreak: true,
      longestStreak: true,
    },
  });

  if (!user) return {};

  const progress: Record<string, { current: number; target: number; percentage: number }> = {};

  for (const achievement of achievements) {
    if (!achievement.requirement) continue;

    const req = achievement.requirement as { type?: string; value?: number };
    if (!req.type || !req.value) continue;

    let current = 0;
    const target = req.value;

    switch (req.type) {
      case 'problems_solved':
        current = user.totalProblems;
        break;
      case 'commits':
        current = user.totalCommits;
        break;
      case 'projects_completed':
        current = user.totalProjects;
        break;
      case 'certifications':
        current = user.totalCertifications;
        break;
      case 'streak_days':
        current = user.longestStreak;
        break;
      case 'current_streak':
        current = user.currentStreak;
        break;
      default:
        continue;
    }

    progress[achievement.id] = {
      current,
      target,
      percentage: Math.min(100, Math.round((current / target) * 100)),
    };
  }

  return progress;
}

async function checkAchievementRequirement(
  achievement: { requirement: Prisma.JsonValue },
  userStats: {
    totalProblems: number;
    totalCommits: number;
    totalProjects: number;
    totalCertifications: number;
    currentStreak: number;
    longestStreak: number;
  },
  userId: string
): Promise<boolean> {
  if (!achievement.requirement) return false;

  const req = achievement.requirement as { type?: string; value?: number; platform?: string };
  if (!req.type || !req.value) return false;

  switch (req.type) {
    case 'problems_solved':
      return userStats.totalProblems >= req.value;

    case 'commits':
      return userStats.totalCommits >= req.value;

    case 'projects_completed':
      return userStats.totalProjects >= req.value;

    case 'certifications':
      return userStats.totalCertifications >= req.value;

    case 'streak_days':
      return userStats.longestStreak >= req.value;

    case 'current_streak':
      return userStats.currentStreak >= req.value;

    case 'platforms_connected':
      const platformCount = await prisma.userPlatform.count({
        where: { userId, isActive: true },
      });
      return platformCount >= req.value;

    case 'goals_completed':
      const goalCount = await prisma.goal.count({
        where: { userId, status: 'COMPLETED' },
      });
      return goalCount >= req.value;

    case 'tracker_entries':
      const entryCount = await prisma.trackerEntry.count({
        where: { userId },
      });
      return entryCount >= req.value;

    case 'consecutive_days':
      // Check if user has been active for X consecutive days
      return userStats.currentStreak >= req.value;

    default:
      logger.debug('Unknown achievement requirement type', { type: req.type });
      return false;
  }
}