// src/app/api/achievements/unlock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter } from '@/lib/rateLimit';


// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const unlockSchema = z.object({
  achievementId: z.string().cuid('Invalid achievement ID'),
  targetUserId: z.string().cuid('Invalid user ID').optional(),
  reason: z.string().max(500).optional(),
});

// =============================================================================
// POST - Manual Achievement Unlock (Admin or Special Cases)
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized achievement unlock attempt', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Parse and Validate Body
    const body = await req.json();
    const validated = unlockSchema.parse(body);

    // ✅ Determine Target User
    let targetUserId = session.user.id;
    let isAdminUnlock = false;

    // If unlocking for another user, verify admin permissions
    if (validated.targetUserId && validated.targetUserId !== session.user.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true, role: true },
      });

      if (!currentUser?.isAdmin && currentUser?.role !== 'admin') {
        logger.warn('Non-admin attempted to unlock achievement for another user', {
          requesterId: session.user.id,
          targetUserId: validated.targetUserId,
          requestId,
        });
        return apiResponse.forbidden(
          'Admin access required to unlock achievements for other users',
          requestId
        );
      }

      targetUserId = validated.targetUserId;
      isAdminUnlock = true;
    }

    // ✅ Rate Limiting (stricter for manual unlocks)
    const rateLimitKey = isAdminUnlock
      ? `achievements:unlock:admin:${session.user.id}`
      : `achievements:unlock:${session.user.id}`;
    
    const rateLimitResult = await apiRateLimiter.check(5, rateLimitKey);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for achievement unlock', {
        userId: session.user.id,
        requestId,
      });
      return apiResponse.rateLimited(300, requestId); // 5 min cooldown
    }

    logger.info('Attempting to unlock achievement', {
      requestedBy: session.user.id,
      targetUserId,
      achievementId: validated.achievementId,
      isAdminUnlock,
      requestId,
    });

    // ✅ Check if Achievement Exists and is Active
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
      logger.warn('Achievement not found', {
        achievementId: validated.achievementId,
        requestId,
      });
      return apiResponse.notFound('Achievement', requestId);
    }

    if (!achievement.isActive) {
      logger.warn('Attempted to unlock inactive achievement', {
        achievementId: validated.achievementId,
        requestId,
      });
      return apiResponse.validationError(
        'This achievement is not currently active',
        undefined,
        requestId
      );
    }

    // ✅ Check if Already Unlocked (Idempotency)
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
        requestId,
      });
      
      return apiResponse.success(
        {
          achievement: {
            id: achievement.id,
            title: achievement.title,
            alreadyUnlocked: true,
            unlockedAt: existing.unlockedAt,
          },
        },
        {
          status: 200,
          meta: { requestId },
          message: 'Achievement already unlocked',
        }
      );
    }

    // ✅ Unlock Achievement in Transaction
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
        include: { achievement: true },
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
    ]);

    // ✅ Audit Log for Admin Actions
    if (isAdminUnlock) {
      await prisma.auditLog.create({
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
            reason: validated.reason,
          },
          ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          userAgent: req.headers.get('user-agent'),
        },
      });
    }

    const duration = Date.now() - startTime;

    logger.info('Achievement unlocked successfully', {
      userId: targetUserId,
      achievementId: validated.achievementId,
      achievementTitle: achievement.title,
      points: achievement.points,
      isAdminUnlock,
      duration,
      requestId,
    });

    return apiResponse.created(
      {
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
      {
        requestId,
        duration,
        message: `Achievement "${achievement.title}" unlocked!`,
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid unlock request', { errors: error.errors, requestId });
      return apiResponse.validationError(
        'Invalid request data',
        error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    logger.error('Failed to unlock achievement', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}