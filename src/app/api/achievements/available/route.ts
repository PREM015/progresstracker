// src/app/api/achievements/available/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { PlatformCategory } from '@prisma/client';

// =============================================================================
// GET - Get available (not yet unlocked) achievements
// =============================================================================

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized available achievements access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as PlatformCategory | null;
    const tier = searchParams.get('tier');
    const includeProgress = searchParams.get('progress') === 'true';

    logger.debug('Fetching available achievements', {
      userId: session.user.id,
      category,
      tier,
    });

    // Get user's unlocked achievement IDs
    const unlockedIds = await prisma.userAchievement.findMany({
      where: { userId: session.user.id },
      select: { achievementId: true },
    });

    const unlockedIdSet = new Set(unlockedIds.map(u => u.achievementId));

    // Build where clause
    const where: {
      isActive: boolean;
      isHidden: boolean;
      id: { notIn: string[] };
      category?: PlatformCategory;
      tier?: string;
    } = {
      isActive: true,
      isHidden: false,
      id: { notIn: Array.from(unlockedIdSet) },
    };

    if (category && Object.values(PlatformCategory).includes(category)) {
      where.category = category;
    }

    if (tier) {
      where.tier = tier;
    }

    // Get available achievements
    const achievements = await prisma.achievement.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { points: 'desc' },
      ],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        tier: true,
        icon: true,
        color: true,
        badgeImage: true,
        points: true,
        xpReward: true,
        rarity: true,
        requirementText: true,
        requirement: true,
        thresholds: true,
        totalUnlocked: true,
        unlockPercentage: true,
      },
    });

    // Calculate progress if requested
    let achievementsWithProgress = achievements;

    if (includeProgress) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          totalProblems: true,
          totalCommits: true,
          totalProjects: true,
          currentStreak: true,
          longestStreak: true,
          totalCertifications: true,
        },
      });

      if (user) {
        achievementsWithProgress = achievements.map(achievement => {
          const progress = calculateProgress(achievement.requirement, user);
          return {
            ...achievement,
            progress,
          };
        });
      }
    }

    logger.info('Available achievements fetched', {
      userId: session.user.id,
      count: achievements.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        achievements: achievementsWithProgress,
        count: achievements.length,
        totalUnlocked: unlockedIdSet.size,
      },
    });
  } catch (error) {
    logger.error('Get available achievements error', {}, error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get available achievements' 
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTION
// =============================================================================

function calculateProgress(
  requirement: unknown,
  userStats: {
    totalProblems: number;
    totalCommits: number;
    totalProjects: number;
    currentStreak: number;
    longestStreak: number;
    totalCertifications: number;
  }
): { current: number; target: number; percentage: number } | null {
  if (!requirement || typeof requirement !== 'object') return null;

  const req = requirement as { type?: string; value?: number };
  if (!req.type || !req.value) return null;

  let current = 0;
  const target = req.value;

  switch (req.type) {
    case 'problems_solved':
      current = userStats.totalProblems;
      break;
    case 'commits':
      current = userStats.totalCommits;
      break;
    case 'projects_completed':
      current = userStats.totalProjects;
      break;
    case 'streak_days':
      current = userStats.longestStreak;
      break;
    case 'current_streak':
      current = userStats.currentStreak;
      break;
    case 'certifications':
      current = userStats.totalCertifications;
      break;
    default:
      return null;
  }

  return {
    current,
    target,
    percentage: Math.min(100, Math.round((current / target) * 100)),
  };
}