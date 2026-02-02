// src/app/api/achievements/unlock/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ApiError,
} from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { auditLogService } from '@/services/auditLogService';
import { cache } from '@/lib/redis';
import { UnlockAchievementSchema } from '@/lib/validations/achievement';
import { z } from 'zod';

const log = logger.child({ route: 'achievements/unlock' });

// =============================================================================
// TYPES
// =============================================================================

interface AchievementRequirement {
  type: string;
  metric: string;
  value: number;
}

interface UnlockEligibility {
  canUnlock: boolean;
  reason: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  remaining: number;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.id) {
    throw new UnauthorizedError('Authentication required');
  }

  return {
    id: token.id as string,
    email: token.email as string,
    isAdmin: (token.isAdmin as boolean) || token.role === 'admin',
  };
}

async function getMetricValue(userId: string, metric: string): Promise<number> {
  switch (metric) {
    case 'problems_solved': {
      const result = await prisma.trackerEntry.aggregate({
        where: { userId },
        _sum: { problemsSolved: true },
      });
      return result._sum.problemsSolved || 0;
    }

    case 'goals_completed': {
      return await prisma.goal.count({
        where: { userId, status: 'COMPLETED' },
      });
    }

    case 'platforms_connected': {
      return await prisma.userPlatform.count({
        where: { userId, isActive: true },
      });
    }

    case 'current_streak':
    case 'longest_streak': {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, longestStreak: true },
      });
      return metric === 'current_streak'
        ? user?.currentStreak || 0
        : user?.longestStreak || 0;
    }

    case 'days_active': {
      const days = await prisma.trackerEntry.groupBy({
        by: ['date'],
        where: { userId },
      });
      return days.length;
    }

    case 'total_points': {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true },
      });
      return user?.totalPoints || 0;
    }

    case 'achievements_unlocked': {
      return await prisma.userAchievement.count({
        where: { userId },
      });
    }

    case 'total_problems': {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalProblems: true },
      });
      return user?.totalProblems || 0;
    }

    default:
      // For unknown metrics, return 0
      log.warn('Unknown metric requested', { metric, userId });
      return 0;
  }
}

async function checkUnlockEligibility(
  userId: string,
  requirement: AchievementRequirement | null
): Promise<UnlockEligibility> {
  if (!requirement) {
    return {
      canUnlock: true,
      reason: 'No requirements specified',
      currentValue: 0,
      targetValue: 0,
      percentage: 100,
      remaining: 0,
    };
  }

  const currentValue = await getMetricValue(userId, requirement.metric);
  const targetValue = requirement.value;
  const canUnlock = currentValue >= targetValue;
  const percentage = targetValue > 0 
    ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
    : 100;
  const remaining = Math.max(0, targetValue - currentValue);

  return {
    canUnlock,
    reason: canUnlock
      ? 'All requirements met!'
      : `Need ${remaining} more ${requirement.metric.replace(/_/g, ' ')}`,
    currentValue,
    targetValue,
    percentage,
    remaining,
  };
}

async function clearUserAchievementCaches(userId: string): Promise<void> {
  await Promise.all([
    cache.del(`achievement_stats:${userId}`),
    cache.del(`user_achievements:${userId}`),
    cache.del(`achievement_progress:${userId}`),
    cache.del(`recent_achievements:${userId}:*`),
  ]);
}

// =============================================================================
// GET /api/achievements/unlock - Check if achievement can be unlocked
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const user = await getAuthenticatedUser(req);

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:unlock:check:${user.id}`,
      rateLimiters.api
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get achievement ID from query
    const achievementId = req.nextUrl.searchParams.get('achievementId');
    const achievementSlug = req.nextUrl.searchParams.get('slug');

    if (!achievementId && !achievementSlug) {
      throw new ValidationError(
        'achievementId or slug query parameter is required'
      );
    }

    // Get achievement
    const achievement = await prisma.achievement.findFirst({
      where: achievementId
        ? { id: achievementId }
        : { slug: achievementSlug! },
    });

    if (!achievement) {
      throw new NotFoundError('Achievement');
    }

    if (!achievement.isActive) {
      return apiResponse.success(
        {
          canUnlock: false,
          reason: 'Achievement is not active',
          achievement: {
            id: achievement.id,
            slug: achievement.slug,
            title: achievement.title,
            isActive: false,
          },
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Check if already unlocked
    const existingUnlock = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId: user.id, achievementId: achievement.id },
      },
    });

    if (existingUnlock) {
      return apiResponse.success(
        {
          canUnlock: false,
          reason: 'Already unlocked',
          alreadyUnlocked: true,
          unlockedAt: existingUnlock.unlockedAt,
          achievement: {
            id: achievement.id,
            slug: achievement.slug,
            title: achievement.title,
          },
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Check requirements
    const requirement = achievement.requirement as AchievementRequirement | null;
    const eligibility = await checkUnlockEligibility(user.id, requirement);

    log.info('Unlock eligibility checked', {
      userId: user.id,
      achievementId: achievement.id,
      canUnlock: eligibility.canUnlock,
      currentValue: eligibility.currentValue,
      targetValue: eligibility.targetValue,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        canUnlock: eligibility.canUnlock,
        reason: eligibility.reason,
        achievement: {
          id: achievement.id,
          slug: achievement.slug,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          points: achievement.points,
          xpReward: achievement.xpReward,
          rarity: achievement.rarity,
          requirementText: achievement.requirementText,
        },
        progress: requirement
          ? {
              current: eligibility.currentValue,
              target: eligibility.targetValue,
              percentage: eligibility.percentage,
              remaining: eligibility.remaining,
              metric: requirement.metric,
            }
          : null,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error checking unlock eligibility', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// POST /api/achievements/unlock - Unlock an achievement
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const user = await getAuthenticatedUser(req);

    // Rate limit (stricter for unlock)
    const rateLimitResult = await checkRateLimit(
      `achievements:unlock:${user.id}`,
      rateLimiters.sync
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate
    const validationResult = UnlockAchievementSchema.safeParse(body);
    if (!validationResult.success) {
      return apiResponse.validationError(
        'Validation failed',
        validationResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const { achievementId, force } = validationResult.data;

    // Only admin can force unlock
    if (force && !user.isAdmin) {
      throw new ForbiddenError('Force unlock requires admin access');
    }

    // Get achievement
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      throw new NotFoundError('Achievement');
    }

    if (!achievement.isActive) {
      throw new ApiError('Achievement is not active', 400, 'VALIDATION_ERROR');
    }

    // Check if already unlocked
    const existingUnlock = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId: user.id, achievementId },
      },
    });

    if (existingUnlock) {
      return apiResponse.success(
        {
          alreadyUnlocked: true,
          userAchievement: {
            id: existingUnlock.id,
            unlockedAt: existingUnlock.unlockedAt,
            isPinned: existingUnlock.isPinned,
          },
          achievement: {
            id: achievement.id,
            title: achievement.title,
          },
          message: 'Achievement already unlocked',
        },
        { status: 200, meta: { requestId } }
      );
    }

    // If not force, verify requirements are met
    if (!force) {
      const requirement = achievement.requirement as AchievementRequirement | null;
      const eligibility = await checkUnlockEligibility(user.id, requirement);

      if (!eligibility.canUnlock) {
        throw new ApiError(
          `Requirement not met: ${eligibility.currentValue}/${eligibility.targetValue} ${requirement?.metric?.replace(/_/g, ' ') || 'progress'}`,
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    // Unlock achievement in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user achievement
      const userAchievement = await tx.userAchievement.create({
        data: {
          userId: user.id,
          achievementId,
          progress: 100,
          progressPercentage: 100,
          unlockedAt: new Date(),
        },
        include: {
          achievement: {
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              icon: true,
              points: true,
              xpReward: true,
              rarity: true,
              tier: true,
            },
          },
        },
      });

      // Update achievement unlock stats
      await tx.achievement.update({
        where: { id: achievementId },
        data: {
          totalUnlocked: { increment: 1 },
        },
      });

      // Update user stats (only fields that exist in schema)
      await tx.user.update({
        where: { id: user.id },
        data: {
          totalAchievements: { increment: 1 },
          totalPoints: { increment: achievement.points },
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId: user.id,
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
            xpReward: achievement.xpReward,
            rarity: achievement.rarity,
          },
        },
      });

      return userAchievement;
    });

    // Clear caches
    await clearUserAchievementCaches(user.id);

    // Audit log - use only supported properties
    await auditLogService.logUserAction(
      user.id,
      'CREATE',
      `Unlocked achievement: ${achievement.title}${force ? ' (forced by admin)' : ''}`,
      {
        entityType: 'user_achievement',
        entityId: result.id,
      }
    );

    log.info('Achievement unlocked', {
      userId: user.id,
      achievementId,
      title: achievement.title,
      points: achievement.points,
      xpReward: achievement.xpReward,
      forced: force || false,
      duration: Date.now() - startTime,
    });

    return apiResponse.created(
      {
        userAchievement: {
          id: result.id,
          unlockedAt: result.unlockedAt,
          achievement: result.achievement,
        },
        rewards: {
          points: achievement.points,
          xp: achievement.xpReward,
        },
        message: `Congratulations! You've unlocked "${achievement.title}"!`,
      },
      { requestId }
    );
  } catch (error) {
    log.error('Error unlocking achievement', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE /api/achievements/unlock - Revoke achievement (Admin only)
// =============================================================================

export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const admin = await getAuthenticatedUser(req);

    if (!admin.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:revoke:${admin.id}`,
      rateLimiters.sync
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate
    const RevokeSchema = z.object({
      userId: z.string().cuid(),
      achievementId: z.string().cuid(),
      reason: z.string().min(1).max(500).optional(),
    });

    const validationResult = RevokeSchema.safeParse(body);
    if (!validationResult.success) {
      return apiResponse.validationError(
        'Validation failed',
        validationResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const { userId, achievementId, reason } = validationResult.data;

    // Get user achievement
    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId },
      },
      include: {
        achievement: {
          select: {
            id: true,
            title: true,
            points: true,
            xpReward: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!userAchievement) {
      throw new NotFoundError('User achievement');
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete user achievement
      await tx.userAchievement.delete({
        where: {
          userId_achievementId: { userId, achievementId },
        },
      });

      // Update user stats
      await tx.user.update({
        where: { id: userId },
        data: {
          totalAchievements: { decrement: 1 },
          totalPoints: { decrement: userAchievement.achievement.points },
        },
      });

      // Update achievement stats
      await tx.achievement.update({
        where: { id: achievementId },
        data: {
          totalUnlocked: { decrement: 1 },
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: 'Achievement Revoked',
          message: `The "${userAchievement.achievement.title}" achievement has been revoked.${reason ? ` Reason: ${reason}` : ''}`,
          entityType: 'achievement',
          entityId: achievementId,
          metadata: {
            achievementId,
            title: userAchievement.achievement.title,
            reason: reason || null,
            revokedBy: admin.id,
          },
        },
      });
    });

    // Clear caches
    await clearUserAchievementCaches(userId);

    // Audit log - use only supported properties
    await auditLogService.logAdminAction(
      admin.id,
      'DELETE',
      `Revoked achievement "${userAchievement.achievement.title}" from user ${userId}`,
      {
        entityType: 'user_achievement',
        entityId: userAchievement.id,
        userId,
        oldValue: {
          achievementId,
          achievementTitle: userAchievement.achievement.title,
          points: userAchievement.achievement.points,
          xpReward: userAchievement.achievement.xpReward,
          unlockedAt: userAchievement.unlockedAt,
          reason: reason || null,
        },
      }
    );

    log.warn('Achievement revoked', {
      adminId: admin.id,
      userId,
      achievementId,
      achievementTitle: userAchievement.achievement.title,
      reason,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        revoked: true,
        userId,
        user: {
          email: userAchievement.user.email,
          name: userAchievement.user.name,
        },
        achievement: {
          id: achievementId,
          title: userAchievement.achievement.title,
        },
        removed: {
          points: userAchievement.achievement.points,
          xp: userAchievement.achievement.xpReward,
        },
        reason: reason || null,
        message: `Achievement "${userAchievement.achievement.title}" has been revoked from user`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error revoking achievement', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// OPTIONS - CORS preflight
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