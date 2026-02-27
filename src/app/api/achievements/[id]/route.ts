// src/app/api/achievements/[id]/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError,
  ValidationError,
  ApiError 
} from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { auditLogService } from '@/services/auditLogService';
import { cache } from '@/lib/redis';
import { 
  UpdateAchievementSchema, 
  PatchAchievementSchema 
} from '@/lib/validations/achievement';
import { Prisma } from '@prisma/client';

const log = logger.child({ route: 'achievements/[id]' });

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// HELPER: Get authenticated user
// =============================================================================

async function getAuthUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token || !token.id) {
    throw new UnauthorizedError('Authentication required');
  }

  return {
    id: token.id as string,
    email: token.email as string,
    role: token.role as string,
    isAdmin: token.isAdmin as boolean,
  };
}

// =============================================================================
// GET /api/achievements/[id] - Get single achievement
// =============================================================================

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const user = await getAuthUser(req);

    // Rate limit
    const rateLimitResult = await checkRateLimit(`achievements:get:${user.id}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Validate ID format
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Invalid achievement ID');
    }

    // Check cache first
    const cacheKey = `achievement:${id}:${user.id}`;
    const cached = await cache.get<object>(cacheKey);

    if (cached) {
      log.debug('Achievement served from cache', { id, userId: user.id });
      return apiResponse.success(cached, { 
        status: 200, 
        meta: { requestId, cached: true } 
      });
    }

    // Fetch achievement
    const achievement = await prisma.achievement.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!achievement) {
      throw new NotFoundError('Achievement');
    }

    // Check visibility
    if (!user.isAdmin && (achievement.isHidden || achievement.isSecret)) {
      // Check if user has unlocked it
      const userUnlock = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: { userId: user.id, achievementId: id },
        },
      });

      if (!userUnlock) {
        throw new NotFoundError('Achievement');
      }
    }

    // Get user's status for this achievement
    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId: user.id, achievementId: id },
      },
    });

    // Get user's progress toward this achievement
    let progress = { current: 0, target: 1, percentage: 0 };
    const requirement = achievement.requirement as {
      type: string;
      metric: string;
      value: number;
    } | null;

    if (requirement && !userAchievement) {
      // Calculate current progress
      let currentValue = 0;

      switch (requirement.metric) {
        case 'problems_solved': {
          const result = await prisma.trackerEntry.aggregate({
            where: { userId: user.id },
            _sum: { problemsSolved: true },
          });
          currentValue = result._sum.problemsSolved || 0;
          break;
        }
        case 'goals_completed': {
          currentValue = await prisma.goal.count({
            where: { userId: user.id, status: 'COMPLETED' },
          });
          break;
        }
        case 'platforms_connected': {
          currentValue = await prisma.userPlatform.count({
            where: { userId: user.id, isActive: true },
          });
          break;
        }
        case 'current_streak':
        case 'longest_streak': {
          const userData = await prisma.user.findUnique({
            where: { id: user.id },
            select: { currentStreak: true, longestStreak: true },
          });
          currentValue = requirement.metric === 'current_streak'
            ? userData?.currentStreak || 0
            : userData?.longestStreak || 0;
          break;
        }
        case 'days_active': {
          const days = await prisma.trackerEntry.groupBy({
            by: ['date'],
            where: { userId: user.id },
          });
          currentValue = days.length;
          break;
        }
      }

      progress = {
        current: currentValue,
        target: requirement.value,
        percentage: Math.min(Math.round((currentValue / requirement.value) * 100), 100),
      };
    }

    // Get recent users who unlocked this
    const recentUnlockers = await prisma.userAchievement.findMany({
      where: { achievementId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            isPublic: true,
          },
        },
      },
      orderBy: { unlockedAt: 'desc' },
      take: 10,
    });

    // Filter to only public profiles
    const publicUnlockers = recentUnlockers
      .filter(u => u.user.isPublic || u.user.id === user.id)
      .map(u => ({
        userId: u.user.id,
        username: u.user.username,
        name: u.user.name,
        image: u.user.image,
        unlockedAt: u.unlockedAt,
        isCurrentUser: u.user.id === user.id,
      }));

    const result = {
      achievement: {
        id: achievement.id,
        slug: achievement.slug,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        tier: achievement.tier,
        icon: achievement.icon,
        color: achievement.color,
        badgeImage: achievement.badgeImage,
        points: achievement.points,
        xpReward: achievement.xpReward,
        rarity: achievement.rarity,
        requirement: achievement.requirement,
        requirementText: achievement.requirementText,
        thresholds: achievement.thresholds,
        isHidden: achievement.isHidden,
        isSecret: achievement.isSecret,
        isActive: achievement.isActive,
        totalUnlocked: achievement.totalUnlocked,
        unlockPercentage: achievement.unlockPercentage,
        createdAt: achievement.createdAt,
        updatedAt: achievement.updatedAt,
      },
      userStatus: {
        isUnlocked: !!userAchievement,
        unlockedAt: userAchievement?.unlockedAt || null,
        isPinned: userAchievement?.isPinned || false,
        progress: userAchievement ? {
          current: requirement?.value || 0,
          target: requirement?.value || 1,
          percentage: 100,
        } : progress,
      },
      stats: {
        totalUnlocked: achievement._count.users,
        unlockPercentage: achievement.unlockPercentage,
      },
      recentUnlockers: publicUnlockers,
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    log.info('Achievement fetched', {
      achievementId: id,
      userId: user.id,
      isUnlocked: !!userAchievement,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(result, { status: 200, meta: { requestId } });
  } catch (error) {
    log.error('Error fetching achievement', { id, requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PUT /api/achievements/[id] - Full update achievement (Admin only)
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
    const user = await getAuthUser(req);

    // Admin check
    if (!user.isAdmin && user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(`achievements:update:${user.id}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get existing achievement
    const existing = await prisma.achievement.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Achievement');
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate
    const validationResult = UpdateAchievementSchema.safeParse(body);
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

    const data = validationResult.data;

    // Build update data
    const updateData: Prisma.AchievementUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.badgeImage !== undefined) updateData.badgeImage = data.badgeImage;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.xpReward !== undefined) updateData.xpReward = data.xpReward;
    if (data.tier !== undefined) updateData.tier = data.tier;
    if (data.rarity !== undefined) updateData.rarity = data.rarity;
    if (data.requirement !== undefined) updateData.requirement = data.requirement as Prisma.InputJsonValue;
    if (data.requirementText !== undefined) updateData.requirementText = data.requirementText;
    if (data.thresholds !== undefined) updateData.thresholds = data.thresholds as Prisma.InputJsonValue;
    if (data.isHidden !== undefined) updateData.isHidden = data.isHidden;
    if (data.isSecret !== undefined) updateData.isSecret = data.isSecret;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    // Update achievement
    const updated = await prisma.achievement.update({
      where: { id },
      data: updateData,
    });

    // Clear cache
    await cache.del(`achievement:${id}:*`);

    // Audit log
    await auditLogService.logAdminAction(
      user.id,
      'UPDATE',
      `Updated achievement: ${updated.title}`,
      {
        entityType: 'achievement',
        entityId: id,
        oldValue: {
          title: existing.title,
          points: existing.points,
          isActive: existing.isActive,
        },
        newValue: {
          title: updated.title,
          points: updated.points,
          isActive: updated.isActive,
        },
      }
    );

    log.info('Achievement updated', {
      achievementId: id,
      adminId: user.id,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      { achievement: updated },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error updating achievement', { id, requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PATCH /api/achievements/[id] - Partial update achievement (Admin only)
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
    const user = await getAuthUser(req);

    // Admin check
    if (!user.isAdmin && user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(`achievements:patch:${user.id}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get existing achievement
    const existing = await prisma.achievement.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Achievement');
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate (partial)
    const validationResult = PatchAchievementSchema.safeParse(body);
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

    const data = validationResult.data;

    if (Object.keys(data).length === 0) {
      return apiResponse.validationError(
        'No fields to update',
        [{ field: 'body', message: 'At least one field is required' }],
        requestId
      );
    }

    // Build update data
    const updateData: Prisma.AchievementUpdateInput = {};
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
      changes.title = { old: existing.title, new: data.title };
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
      changes.description = { old: existing.description, new: data.description };
    }
    if (data.points !== undefined) {
      updateData.points = data.points;
      changes.points = { old: existing.points, new: data.points };
    }
    if (data.xpReward !== undefined) {
      updateData.xpReward = data.xpReward;
      changes.xpReward = { old: existing.xpReward, new: data.xpReward };
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
      changes.isActive = { old: existing.isActive, new: data.isActive };
    }
    if (data.isHidden !== undefined) {
      updateData.isHidden = data.isHidden;
      changes.isHidden = { old: existing.isHidden, new: data.isHidden };
    }
    if (data.isSecret !== undefined) {
      updateData.isSecret = data.isSecret;
      changes.isSecret = { old: existing.isSecret, new: data.isSecret };
    }
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.badgeImage !== undefined) updateData.badgeImage = data.badgeImage;
    if (data.tier !== undefined) updateData.tier = data.tier;
    if (data.rarity !== undefined) updateData.rarity = data.rarity;
    if (data.requirement !== undefined) updateData.requirement = data.requirement as Prisma.InputJsonValue;
    if (data.requirementText !== undefined) updateData.requirementText = data.requirementText;
    if (data.thresholds !== undefined) updateData.thresholds = data.thresholds as Prisma.InputJsonValue;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    // Update achievement
    const updated = await prisma.achievement.update({
      where: { id },
      data: updateData,
    });

    // Clear cache
    await cache.del(`achievement:${id}:*`);

    // Audit log
    await auditLogService.logAdminAction(
      user.id,
      'UPDATE',
      `Patched achievement: ${updated.title}`,
      {
        entityType: 'achievement',
        entityId: id,
       
      }
    );

    log.info('Achievement patched', {
      achievementId: id,
      adminId: user.id,
      fields: Object.keys(data),
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      { 
        achievement: updated,
        changes: Object.keys(changes),
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error patching achievement', { id, requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE /api/achievements/[id] - Delete achievement (Admin only)
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
    const user = await getAuthUser(req);

    // Admin check
    if (!user.isAdmin && user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(`achievements:delete:${user.id}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Check query param for soft vs hard delete
    const hardDelete = req.nextUrl.searchParams.get('hard') === 'true';
    const force = req.nextUrl.searchParams.get('force') === 'true';

    // Get existing achievement
    const existing = await prisma.achievement.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Achievement');
    }

    // Check if achievement has been unlocked by users
    if (existing._count.users > 0 && !force) {
      throw new ApiError(
        `Cannot delete achievement that has been unlocked by ${existing._count.users} user(s). Use force=true to override.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    if (hardDelete) {
      // Hard delete - remove completely
      await prisma.$transaction(async (tx) => {
        // First delete all user achievements
        await tx.userAchievement.deleteMany({
          where: { achievementId: id },
        });

        // Then delete the achievement
        await tx.achievement.delete({
          where: { id },
        });
      });

      // Audit log
      await auditLogService.logAdminAction(
        user.id,
        'DELETE',
        `Hard deleted achievement: ${existing.title}`,
        {
          entityType: 'achievement',
          entityId: id,
          oldValue: {
            slug: existing.slug,
            title: existing.title,
            unlockedBy: existing._count.users,
          },
        }
      );

      log.warn('Achievement hard deleted', {
        achievementId: id,
        adminId: user.id,
        unlockedBy: existing._count.users,
        duration: Date.now() - startTime,
      });

      return apiResponse.success(
        {
          deleted: true,
          hardDelete: true,
          affectedUsers: existing._count.users,
          message: `Achievement "${existing.title}" permanently deleted`,
        },
        { status: 200, meta: { requestId } }
      );
    } else {
      // Soft delete - just deactivate
      const updated = await prisma.achievement.update({
        where: { id },
        data: {
          isActive: false,
          isHidden: true,
        },
      });

      // Clear cache
      await cache.del(`achievement:${id}:*`);

      // Audit log
      await auditLogService.logAdminAction(
        user.id,
        'DELETE',
        `Soft deleted (deactivated) achievement: ${existing.title}`,
        {
          entityType: 'achievement',
          entityId: id,
          oldValue: { isActive: existing.isActive, isHidden: existing.isHidden },
          newValue: { isActive: false, isHidden: true },
        }
      );

      log.info('Achievement soft deleted', {
        achievementId: id,
        adminId: user.id,
        duration: Date.now() - startTime,
      });

      return apiResponse.success(
        {
          deleted: true,
          hardDelete: false,
          achievement: updated,
          message: `Achievement "${existing.title}" has been deactivated`,
        },
        { status: 200, meta: { requestId } }
      );
    }
  } catch (error) {
    log.error('Error deleting achievement', { id, requestId }, error);
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
      'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
// =============================================================================
// POST /api/achievements/[id] - Clone/Duplicate achievement (Admin only)
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
    const user = await getAuthUser(req);

    // Admin check
    if (!user.isAdmin && user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(`achievements:clone:${user.id}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get source achievement
    const source = await prisma.achievement.findUnique({
      where: { id },
    });

    if (!source) {
      throw new NotFoundError('Achievement');
    }

    // Parse optional overrides from body
    let overrides: Partial<{
      slug: string;
      title: string;
      description: string;
      tier: string;
      rarity: string;
      points: number;
      xpReward: number;
      isActive: boolean;
    }> = {};

    try {
      const text = await req.text();
      if (text) {
        overrides = JSON.parse(text);
      }
    } catch {
      // Empty body is ok
    }

    // Generate new slug
    let newSlug = overrides.slug || `${source.slug}-copy`;
    let suffix = 1;

    // Ensure unique slug
    while (await prisma.achievement.findUnique({ where: { slug: newSlug } })) {
      suffix++;
      newSlug = overrides.slug 
        ? `${overrides.slug}-${suffix}` 
        : `${source.slug}-copy-${suffix}`;
    }

    // Create cloned achievement
    const cloned = await prisma.achievement.create({
      data: {
        slug: newSlug,
        title: overrides.title || `${source.title} (Copy)`,
        description: overrides.description || source.description,
        category: source.category,
        tier: overrides.tier || source.tier,
        icon: source.icon,
        color: source.color,
        badgeImage: source.badgeImage,
        points: overrides.points ?? source.points,
        xpReward: overrides.xpReward ?? source.xpReward,
        rarity: overrides.rarity || source.rarity,
        requirement: source.requirement || undefined,
        requirementText: source.requirementText,
        thresholds: source.thresholds || undefined,
        isHidden: source.isHidden,
        isSecret: source.isSecret,
        isActive: overrides.isActive ?? false, // Default to inactive for review
        sortOrder: source.sortOrder + 1,
      },
    });

    // Audit log
    await auditLogService.logAdminAction(
      user.id,
      'CREATE',
      `Cloned achievement: ${source.title} -> ${cloned.title}`,
      {
        entityType: 'achievement',
        entityId: cloned.id,
        newValue: {
          sourceId: source.id,
          sourceSlug: source.slug,
          newSlug: cloned.slug,
          overrides,
        },
      }
    );

    log.info('Achievement cloned', {
      adminId: user.id,
      sourceId: source.id,
      newId: cloned.id,
      newSlug: cloned.slug,
      duration: Date.now() - startTime,
    });

    return apiResponse.created(
      {
        source: {
          id: source.id,
          slug: source.slug,
          title: source.title,
        },
        cloned: cloned,
        message: `Achievement cloned as "${cloned.title}"`,
      },
      { requestId }
    );
  } catch (error) {
    log.error('Error cloning achievement', { id, requestId }, error);
    return apiResponse.error(error, requestId);
  }
}