// src/app/api/achievements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter } from '@/lib/rateLimit';
import { PlatformCategory } from '@prisma/client';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateAchievementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).optional(),
  icon: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  points: z.number().int().positive().optional(),
  xpReward: z.number().int().nonnegative().optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
  requirementText: z.string().max(500).optional(),
  isHidden: z.boolean().optional(),
  isSecret: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

// =============================================================================
// GET - Get Single Achievement
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized achievement access', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await apiRateLimiter.check(100, `achievements:get:${ip}`);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { ip, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    const achievementId = params.id;

    logger.debug('Fetching achievement', {
      userId: session.user.id,
      achievementId,
      requestId,
    });

    // ✅ Fetch Achievement
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
      include: {
        users: {
          where: { userId: session.user.id },
          select: {
            progress: true,
            progressPercentage: true,
            unlockedAt: true,
            isPinned: true,
          },
        },
      },
    });

    if (!achievement) {
      logger.warn('Achievement not found', { achievementId, requestId });
      return apiResponse.notFound('Achievement', requestId);
    }

    // Check if user can see this achievement
    const userAchievement = achievement.users[0];
    
    if (!userAchievement && (achievement.isHidden || achievement.isSecret)) {
      logger.warn('Attempted to access hidden achievement', {
        userId: session.user.id,
        achievementId,
        requestId,
      });
      return apiResponse.notFound('Achievement', requestId);
    }

    const duration = Date.now() - startTime;

    logger.info('Achievement fetched', {
      userId: session.user.id,
      achievementId,
      duration,
      requestId,
    });

    return apiResponse.success(
      {
        ...achievement,
        userProgress: userAchievement || null,
        users: undefined, // Remove the include data
      },
      {
        meta: { requestId, duration },
      }
    );
  } catch (error) {
    logger.error('Failed to fetch achievement', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PATCH - Update Achievement (Admin Only)
// =============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized achievement update', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Admin Authorization
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true, role: true },
    });

    if (!currentUser?.isAdmin && currentUser?.role !== 'admin') {
      logger.warn('Non-admin attempted to update achievement', {
        userId: session.user.id,
        requestId,
      });
      return apiResponse.forbidden('Admin access required', requestId);
    }

    // ✅ Rate Limiting
    const rateLimitResult = await apiRateLimiter.check(20, `achievements:update:${session.user.id}`);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { userId: session.user.id, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    // ✅ Validate Body
    const body = await req.json();
    const validated = updateAchievementSchema.parse(body);

    const achievementId = params.id;

    logger.info('Updating achievement', {
      userId: session.user.id,
      achievementId,
      fields: Object.keys(validated),
      requestId,
    });

    // ✅ Check Existence
    const existing = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!existing) {
      logger.warn('Achievement not found for update', { achievementId, requestId });
      return apiResponse.notFound('Achievement', requestId);
    }

    // ✅ Update Achievement
    const updated = await prisma.achievement.update({
      where: { id: achievementId },
      data: {
        ...validated,
        updatedAt: new Date(),
      },
    });

    // ✅ Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        category: 'achievement',
        entityType: 'achievement',
        entityId: achievementId,
        description: `Updated achievement: ${updated.title}`,
        oldValue: existing,
        newValue: updated,
        changes: validated,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: req.headers.get('user-agent'),
      },
    });

    const duration = Date.now() - startTime;

    logger.info('Achievement updated', {
      userId: session.user.id,
      achievementId,
      duration,
      requestId,
    });

    return apiResponse.success(updated, {
      meta: { requestId, duration },
      message: 'Achievement updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid update data', { errors: error.errors, requestId });
      return apiResponse.validationError(
        'Invalid update data',
        error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    logger.error('Failed to update achievement', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE - Soft Delete Achievement (Admin Only)
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized achievement deletion', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Admin Authorization
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true, role: true },
    });

    if (!currentUser?.isAdmin && currentUser?.role !== 'admin') {
      logger.warn('Non-admin attempted to delete achievement', {
        userId: session.user.id,
        requestId,
      });
      return apiResponse.forbidden('Admin access required', requestId);
    }

    // ✅ Rate Limiting
    const rateLimitResult = await apiRateLimiter.check(10, `achievements:delete:${session.user.id}`);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { userId: session.user.id, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    const achievementId = params.id;

    logger.info('Deleting achievement', {
      userId: session.user.id,
      achievementId,
      requestId,
    });

    // ✅ Check Existence
    const existing = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!existing) {
      logger.warn('Achievement not found for deletion', { achievementId, requestId });
      return apiResponse.notFound('Achievement', requestId);
    }

    // ✅ Soft Delete (set isActive to false)
    const deleted = await prisma.achievement.update({
      where: { id: achievementId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // ✅ Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        category: 'achievement',
        entityType: 'achievement',
        entityId: achievementId,
        description: `Soft deleted achievement: ${deleted.title}`,
        oldValue: existing,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: req.headers.get('user-agent'),
      },
    });

    const duration = Date.now() - startTime;

    logger.info('Achievement deleted', {
      userId: session.user.id,
      achievementId,
      duration,
      requestId,
    });

    return apiResponse.success(
      { id: achievementId, deleted: true },
      {
        meta: { requestId, duration },
        message: 'Achievement deleted successfully',
      }
    );
  } catch (error) {
    logger.error('Failed to delete achievement', { requestId }, error);
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
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}