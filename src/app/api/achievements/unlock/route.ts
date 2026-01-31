// src/app/api/achievements/unlock/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const unlockSchema = z.object({
  achievementId: z.string().min(1, 'Achievement ID required'),
  // For admin manual unlocks
  targetUserId: z.string().optional(),
});

// =============================================================================
// POST - Manually unlock an achievement (admin or special cases)
// =============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized achievement unlock attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = unlockSchema.parse(body);

    // Determine target user
    let targetUserId = session.user.id;

    // If targetUserId is specified, check if current user is admin
    if (validated.targetUserId && validated.targetUserId !== session.user.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true, role: true },
      });

      if (!currentUser?.isAdmin && currentUser?.role !== 'admin') {
        logger.warn('Non-admin attempted to unlock achievement for another user', {
          userId: session.user.id,
          targetUserId: validated.targetUserId,
        });
        return NextResponse.json(
          { success: false, error: 'Admin access required to unlock for other users' },
          { status: 403 }
        );
      }

      targetUserId = validated.targetUserId;
    }

    logger.info('Attempting to unlock achievement', {
      requestedBy: session.user.id,
      targetUserId,
      achievementId: validated.achievementId,
    });

    // Get the achievement
    const achievement = await prisma.achievement.findUnique({
      where: { id: validated.achievementId },
      select: {
        id: true,
        title: true,
        description: true,
        tier: true,
        points: true,
        xpReward: true,
        icon: true,
        badgeImage: true,
        isActive: true,
      },
    });

    if (!achievement) {
      logger.warn('Achievement not found', { achievementId: validated.achievementId });
      return NextResponse.json(
        { success: false, error: 'Achievement not found' },
        { status: 404 }
      );
    }

    if (!achievement.isActive) {
      return NextResponse.json(
        { success: false, error: 'Achievement is not active' },
        { status: 400 }
      );
    }

    // Check if already unlocked
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: targetUserId,
          achievementId: validated.achievementId,
        },
      },
    });

    if (existing) {
      logger.info('Achievement already unlocked', {
        userId: targetUserId,
        achievementId: validated.achievementId,
      });
      return NextResponse.json(
        { success: false, error: 'Achievement already unlocked' },
        { status: 400 }
      );
    }

    // Unlock the achievement in a transaction
    const [userAchievement] = await prisma.$transaction([
      // Create user achievement
      prisma.userAchievement.create({
        data: {
          userId: targetUserId,
          achievementId: validated.achievementId,
          progress: 100,
          progressPercentage: 100,
          unlockedAt: new Date(),
        },
        include: {
          achievement: true,
        },
      }),

      // Update achievement unlock count
      prisma.achievement.update({
        where: { id: validated.achievementId },
        data: { totalUnlocked: { increment: 1 } },
      }),

      // Update user stats
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          totalAchievements: { increment: 1 },
          totalPoints: { increment: achievement.points },
        },
      }),

      // Create notification
      prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'ACHIEVEMENT_UNLOCKED',
          priority: 'NORMAL',
          title: '🏆 Achievement Unlocked!',
          message: `You've earned: ${achievement.title}`,
          entityType: 'achievement',
          entityId: validated.achievementId,
          imageUrl: achievement.badgeImage,
        },
      }),

      // Audit log if admin action
      ...(targetUserId !== session.user.id ? [
        prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'ADMIN_ACTION',
            category: 'achievement',
            entityType: 'user_achievement',
            entityId: validated.achievementId,
            description: `Admin unlocked achievement "${achievement.title}" for user`,
            performedBy: session.user.id,
            newValue: {
              targetUserId,
              achievementId: validated.achievementId,
              achievementTitle: achievement.title,
            },
          },
        }),
      ] : []),
    ]);

    logger.info('Achievement unlocked successfully', {
      userId: targetUserId,
      achievementId: validated.achievementId,
      achievementTitle: achievement.title,
      points: achievement.points,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        achievement: {
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          tier: achievement.tier,
          points: achievement.points,
          xpReward: achievement.xpReward,
          icon: achievement.icon,
          badgeImage: achievement.badgeImage,
        },
        unlockedAt: userAchievement.unlockedAt,
      },
      message: `Achievement "${achievement.title}" unlocked!`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid unlock request', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Unlock achievement error', {}, error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to unlock achievement' 
      },
      { status: 500 }
    );
  }
}