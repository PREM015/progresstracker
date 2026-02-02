// src/app/api/achievements/[id]/pin/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { 
  UnauthorizedError, 
  NotFoundError,
  ApiError ,
  ValidationError
} from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { cache } from '@/lib/redis';
import { z } from 'zod';

const log = logger.child({ route: 'achievements/[id]/pin' });

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// POST /api/achievements/[id]/pin - Pin/Toggle pin achievement
// =============================================================================

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
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
    const rateLimitResult = await checkRateLimit(`achievements:pin:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get user's achievement
    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: id },
      },
      include: {
        achievement: {
          select: { title: true, icon: true },
        },
      },
    });

    if (!userAchievement) {
      throw new NotFoundError('Achievement not unlocked');
    }

    // Check current pin status
    const currentlyPinned = userAchievement.isPinned;

    // If trying to pin, check limit
    if (!currentlyPinned) {
      const pinnedCount = await prisma.userAchievement.count({
        where: { userId, isPinned: true },
      });

      if (pinnedCount >= 5) {
        throw new ApiError(
          'Maximum 5 achievements can be pinned. Unpin one first.',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    // Toggle pin status
    const updated = await prisma.userAchievement.update({
      where: {
        userId_achievementId: { userId, achievementId: id },
      },
      data: {
        isPinned: !currentlyPinned,
      },
      include: {
        achievement: {
          select: {
            id: true,
            title: true,
            icon: true,
            rarity: true,
          },
        },
      },
    });

    // Clear cache
    await cache.del(`achievement_stats:${userId}`);
    await cache.del(`achievement:${id}:${userId}`);

    log.info('Achievement pin toggled', {
      userId,
      achievementId: id,
      isPinned: updated.isPinned,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        userAchievement: {
          id: updated.id,
          achievementId: updated.achievementId,
          achievement: updated.achievement,
          isPinned: updated.isPinned,
        },
        action: updated.isPinned ? 'pinned' : 'unpinned',
        message: updated.isPinned 
          ? `"${updated.achievement.title}" has been pinned`
          : `"${updated.achievement.title}" has been unpinned`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error toggling achievement pin', { id, requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PUT /api/achievements/[id]/pin - Explicitly pin achievement
// =============================================================================

export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
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
    const rateLimitResult = await checkRateLimit(`achievements:pin:put:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get user's achievement
    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: id },
      },
      include: {
        achievement: {
          select: { title: true },
        },
      },
    });

    if (!userAchievement) {
      throw new NotFoundError('Achievement not unlocked');
    }

    // Already pinned?
    if (userAchievement.isPinned) {
      return apiResponse.success(
        {
          alreadyPinned: true,
          message: 'Achievement is already pinned',
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Check limit
    const pinnedCount = await prisma.userAchievement.count({
      where: { userId, isPinned: true },
    });

    if (pinnedCount >= 5) {
      throw new ApiError(
        'Maximum 5 achievements can be pinned',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Pin achievement
    const updated = await prisma.userAchievement.update({
      where: {
        userId_achievementId: { userId, achievementId: id },
      },
      data: { isPinned: true },
      include: {
        achievement: {
          select: { id: true, title: true, icon: true },
        },
      },
    });

    // Clear cache
    await cache.del(`achievement_stats:${userId}`);

    log.info('Achievement pinned', {
      userId,
      achievementId: id,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        userAchievement: updated,
        pinnedCount: pinnedCount + 1,
        message: `"${updated.achievement.title}" has been pinned`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error pinning achievement', { id, requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE /api/achievements/[id]/pin - Unpin achievement
// =============================================================================

export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
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
    const rateLimitResult = await checkRateLimit(`achievements:pin:delete:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get user's achievement
    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: id },
      },
      include: {
        achievement: {
          select: { title: true },
        },
      },
    });

    if (!userAchievement) {
      throw new NotFoundError('Achievement not unlocked');
    }

    // Not pinned?
    if (!userAchievement.isPinned) {
      return apiResponse.success(
        {
          alreadyUnpinned: true,
          message: 'Achievement is not pinned',
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Unpin achievement
    const updated = await prisma.userAchievement.update({
      where: {
        userId_achievementId: { userId, achievementId: id },
      },
      data: { isPinned: false },
      include: {
        achievement: {
          select: { id: true, title: true },
        },
      },
    });

    // Get remaining pinned count
    const remainingPinned = await prisma.userAchievement.count({
      where: { userId, isPinned: true },
    });

    // Clear cache
    await cache.del(`achievement_stats:${userId}`);

    log.info('Achievement unpinned', {
      userId,
      achievementId: id,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        userAchievement: updated,
        pinnedCount: remainingPinned,
        message: `"${updated.achievement.title}" has been unpinned`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error unpinning achievement', { id, requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// GET /api/achievements/[id]/pin - Get pin status
// =============================================================================

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = token.id as string;

    // Get user's achievement
    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: id },
      },
      select: {
        isPinned: true,
        achievement: {
          select: { id: true, title: true },
        },
      },
    });

    if (!userAchievement) {
      throw new NotFoundError('Achievement not unlocked');
    }

    // Get total pinned count
    const pinnedCount = await prisma.userAchievement.count({
      where: { userId, isPinned: true },
    });

    return apiResponse.success(
      {
        achievementId: id,
        title: userAchievement.achievement.title,
        isPinned: userAchievement.isPinned,
        pinnedCount,
        maxPinned: 5,
        canPin: !userAchievement.isPinned && pinnedCount < 5,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error getting pin status', { id, requestId }, error);
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
// =============================================================================
// PATCH /api/achievements/[id]/pin - Update pin settings
// =============================================================================

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
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
    const rateLimitResult = await checkRateLimit(`achievements:pin:patch:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get user's achievement
    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: id },
      },
      include: {
        achievement: {
          select: { title: true },
        },
      },
    });

    if (!userAchievement) {
      throw new NotFoundError('Achievement not unlocked');
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate
    const PatchPinSchema = z.object({
      isPinned: z.boolean().optional(),
      isHidden: z.boolean().optional(),
      displayOrder: z.number().int().min(0).max(10).optional(),
      notes: z.string().max(500).optional(),
    });

    const validationResult = PatchPinSchema.safeParse(body);
    if (!validationResult.success) {
      return apiResponse.validationError(
        'Validation failed',
        validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const updates = validationResult.data;

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('At least one field to update is required');
    }

    // Check pin limit if trying to pin
    if (updates.isPinned === true && !userAchievement.isPinned) {
      const pinnedCount = await prisma.userAchievement.count({
        where: { userId, isPinned: true },
      });

      if (pinnedCount >= 5) {
        throw new ApiError(
          'Maximum 5 achievements can be pinned',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    // Build update data
    const updateData: {
      isPinned?: boolean;
      isHidden?: boolean;
    } = {};

    if (updates.isPinned !== undefined) updateData.isPinned = updates.isPinned;
    if (updates.isHidden !== undefined) updateData.isHidden = updates.isHidden;

    // Update
    const updated = await prisma.userAchievement.update({
      where: {
        userId_achievementId: { userId, achievementId: id },
      },
      data: updateData,
      include: {
        achievement: {
          select: { id: true, title: true, icon: true },
        },
      },
    });

    // Clear cache
    await cache.del(`achievement_stats:${userId}`);

    log.info('Pin settings patched', {
      userId,
      achievementId: id,
      updates: Object.keys(updates),
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        userAchievement: {
          id: updated.id,
          achievementId: updated.achievementId,
          achievement: updated.achievement,
          isPinned: updated.isPinned,
          isHidden: updated.isHidden,
        },
        updatedFields: Object.keys(updates),
        message: 'Pin settings updated',
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error patching pin settings', { id, requestId }, error);
    return apiResponse.error(error, requestId);
  }
}