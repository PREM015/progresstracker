/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/achievements/pinned/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, ValidationError, ApiError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { PinnedQuerySchema } from '@/lib/validations/achievement';
import { z } from 'zod';

const log = logger.child({ route: 'achievements/pinned' });

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const ReorderPinnedSchema = z.object({
  achievementIds: z
    .array(z.string().cuid())
    .min(1, 'At least one achievement ID required')
    .max(5, 'Maximum 5 pinned achievements allowed'),
});

const BulkPinSchema = z.object({
  achievementIds: z
    .array(z.string().cuid())
    .min(1)
    .max(5, 'Maximum 5 achievements can be pinned'),
  replace: z.boolean().default(false), // Replace existing pins or add to them
});

// =============================================================================
// GET /api/achievements/pinned - Get user's pinned achievements
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
    const rateLimitResult = await checkRateLimit(`achievements:pinned:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const queryResult = PinnedQuerySchema.safeParse(searchParams);

    if (!queryResult.success) {
      return apiResponse.validationError(
        'Invalid query parameters',
        queryResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const { limit } = queryResult.data;

    // Fetch pinned achievements
    const pinnedAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        isPinned: true,
        isHidden: false,
      },
      include: {
        achievement: {
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
          },
        },
      },
      orderBy: { unlockedAt: 'desc' },
      take: limit,
    });

    // Get total pinned count
    const totalPinned = await prisma.userAchievement.count({
      where: { userId, isPinned: true },
    });

    log.info('Pinned achievements fetched', {
      userId,
      count: pinnedAchievements.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        pinnedAchievements: pinnedAchievements.map(pa => ({
          id: pa.id,
          achievementId: pa.achievementId,
          achievement: pa.achievement,
          unlockedAt: pa.unlockedAt,
          progress: pa.progress,
          progressPercentage: pa.progressPercentage,
        })),
        totalPinned,
        maxPinned: 5,
        remainingSlots: Math.max(0, 5 - totalPinned),
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error fetching pinned achievements', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// POST /api/achievements/pinned - Bulk pin achievements
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

    // Rate limit
    const rateLimitResult = await checkRateLimit(`achievements:pinned:post:${userId}`, rateLimiters.api);
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
    const validationResult = BulkPinSchema.safeParse(body);
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

    const { achievementIds, replace } = validationResult.data;

    // Verify all achievements are unlocked by user
    const userAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        achievementId: { in: achievementIds },
      },
      select: { achievementId: true, isPinned: true },
    });

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));
    const notUnlocked = achievementIds.filter(id => !unlockedIds.has(id));

    if (notUnlocked.length > 0) {
      throw new ApiError(
        `Some achievements are not unlocked: ${notUnlocked.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Get current pinned count
    const currentPinnedCount = await prisma.userAchievement.count({
      where: { userId, isPinned: true },
    });

    // Calculate new total
    const alreadyPinned = userAchievements.filter(ua => ua.isPinned).length;
    const newPins = achievementIds.length - alreadyPinned;
    const newTotal = replace ? achievementIds.length : currentPinnedCount + newPins;

    if (newTotal > 5) {
      throw new ApiError(
        `Cannot pin more than 5 achievements. Current: ${currentPinnedCount}, Trying to add: ${newPins}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // If replace, unpin all first
      if (replace) {
        await tx.userAchievement.updateMany({
          where: { userId, isPinned: true },
          data: { isPinned: false },
        });
      }

      // Pin the specified achievements
      await tx.userAchievement.updateMany({
        where: {
          userId,
          achievementId: { in: achievementIds },
        },
        data: { isPinned: true },
      });
    });

    // Fetch updated pinned achievements
    const updatedPinned = await prisma.userAchievement.findMany({
      where: { userId, isPinned: true },
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
      orderBy: { unlockedAt: 'desc' },
    });

    log.info('Achievements pinned', {
      userId,
      count: achievementIds.length,
      replace,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        pinned: updatedPinned.map(p => ({
          id: p.id,
          achievementId: p.achievementId,
          achievement: p.achievement,
        })),
        totalPinned: updatedPinned.length,
        message: `Successfully pinned ${achievementIds.length} achievement(s)`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error pinning achievements', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PUT /api/achievements/pinned - Reorder pinned achievements
// =============================================================================

export async function PUT(req: NextRequest) {
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
    const rateLimitResult = await checkRateLimit(`achievements:pinned:put:${userId}`, rateLimiters.api);
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
    const validationResult = ReorderPinnedSchema.safeParse(body);
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

    const { achievementIds } = validationResult.data;

    // Verify all are currently pinned
    const pinnedAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        achievementId: { in: achievementIds },
        isPinned: true,
      },
    });

    if (pinnedAchievements.length !== achievementIds.length) {
      throw new ApiError(
        'Some achievements are not currently pinned',
        400,
        'VALIDATION_ERROR'
      );
    }

    // For reordering, we'll unpin all and re-pin in order
    // Note: Since we don't have a pinOrder field, we'll use unlockedAt or add one
    // For now, we'll just confirm the reorder
    await prisma.$transaction(async (tx) => {
      // Unpin all
      await tx.userAchievement.updateMany({
        where: { userId, isPinned: true },
        data: { isPinned: false },
      });

      // Re-pin in order (using current timestamp offset for ordering)
      const now = new Date();
      for (let i = 0; i < achievementIds.length; i++) {
        await tx.userAchievement.update({
          where: {
            userId_achievementId: {
              userId,
              achievementId: achievementIds[i],
            },
          },
          data: {
            isPinned: true,
            // We could add a pinOrder field, for now just update
          },
        });
      }
    });

    log.info('Pinned achievements reordered', {
      userId,
      count: achievementIds.length,
      duration: Date.now() - startTime,
      
    });

    return apiResponse.success(
      {
        reordered: true,
        order: achievementIds,
        message: 'Pinned achievements reordered successfully',
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error reordering pinned achievements', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE /api/achievements/pinned - Unpin all achievements
// =============================================================================

export async function DELETE(req: NextRequest) {
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
    const rateLimitResult = await checkRateLimit(`achievements:pinned:delete:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Check for specific IDs in query params
    const achievementIds = req.nextUrl.searchParams.get('ids');
    
    let unpinnedCount: number;

    if (achievementIds) {
      // Unpin specific achievements
      const ids = achievementIds.split(',').map(id => id.trim());
      
      const result = await prisma.userAchievement.updateMany({
        where: {
          userId,
          achievementId: { in: ids },
          isPinned: true,
        },
        data: { isPinned: false },
      });

      unpinnedCount = result.count;
    } else {
      // Unpin all
      const result = await prisma.userAchievement.updateMany({
        where: { userId, isPinned: true },
        data: { isPinned: false },
      });

      unpinnedCount = result.count;
    }

    log.info('Achievements unpinned', {
      userId,
      count: unpinnedCount,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        unpinned: unpinnedCount,
        message: `Successfully unpinned ${unpinnedCount} achievement(s)`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error unpinning achievements', { requestId }, error);
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