// src/app/api/achievements/bulk/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { auditLogService } from '@/services/auditLogService';
import { cache } from '@/lib/redis';
import {
  BulkUpdateSchema,
  BulkDeleteSchema,
  BulkActivateSchema,
} from '@/lib/validations/achievement';
import { z } from 'zod';
import { Prisma, PlatformCategory } from '@prisma/client';

const log = logger.child({ route: 'achievements/bulk' });

// =============================================================================
// TYPES
// =============================================================================

interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

interface BulkOperationResult {
  operation: string;
  affected: number;
  details?: Record<string, unknown>;
}

interface BulkPreviewItem {
  id: string;
  slug: string;
  title: string;
  currentState: Record<string, unknown>;
  willBecome?: Record<string, unknown>;
  userUnlocks: number;
}

interface BulkPreview {
  operation: string;
  affectedAchievements: number;
  affectedUserAchievements: number;
  achievements: BulkPreviewItem[];
  warnings: string[];
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const BulkOperationSchema = z.object({
  operation: z.enum(['update', 'delete', 'activate', 'deactivate', 'hide', 'unhide']),
  ids: z.array(z.string().cuid()).min(1).max(100),
  data: z.record(z.unknown()).optional(),
});

const BulkReplaceSchema = z.object({
  filter: z.object({
    category: z.nativeEnum(PlatformCategory).optional(),
    tier: z.string().optional(),
    rarity: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
  replacement: z.object({
    tier: z.string().optional(),
    rarity: z.string().optional(),
    points: z.number().int().min(0).max(10000).optional(),
    xpReward: z.number().int().min(0).max(50000).optional(),
    isActive: z.boolean().optional(),
    isHidden: z.boolean().optional(),
  }),
  confirm: z.boolean().default(false),
});

type BulkOperationType = z.infer<typeof BulkOperationSchema>['operation'];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getAdminUser(req: NextRequest): Promise<AdminUser> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.id) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!token.isAdmin && token.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }

  return {
    id: token.id as string,
    email: token.email as string,
    isAdmin: true,
  };
}

async function clearAchievementCaches(ids: string[]): Promise<void> {
  const cachePromises = ids.map((id) =>
    Promise.all([
      cache.del(`achievement:${id}`),
      cache.del(`achievement:${id}:details`),
      cache.del(`achievement:${id}:stats`),
    ])
  );
  await Promise.all(cachePromises);
}

function buildUpdateData(
  data: Record<string, unknown>
): Prisma.AchievementUpdateInput {
  const prismaUpdateData: Prisma.AchievementUpdateInput = {};

  if (typeof data.title === 'string') prismaUpdateData.title = data.title;
  if (typeof data.description === 'string') prismaUpdateData.description = data.description;
  if (typeof data.points === 'number') prismaUpdateData.points = data.points;
  if (typeof data.xpReward === 'number') prismaUpdateData.xpReward = data.xpReward;
  if (typeof data.isActive === 'boolean') prismaUpdateData.isActive = data.isActive;
  if (typeof data.isHidden === 'boolean') prismaUpdateData.isHidden = data.isHidden;
  if (typeof data.tier === 'string') prismaUpdateData.tier = data.tier;
  if (typeof data.rarity === 'string') prismaUpdateData.rarity = data.rarity;

  return prismaUpdateData;
}

// =============================================================================
// GET /api/achievements/bulk - Preview bulk operation (Admin only)
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate admin
    const admin = await getAdminUser(req);

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:bulk:preview:${admin.id}`,
      rateLimiters.api
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query params
    const operation = req.nextUrl.searchParams.get('operation');
    const idsParam = req.nextUrl.searchParams.get('ids');
    const category = req.nextUrl.searchParams.get('category');
    const tier = req.nextUrl.searchParams.get('tier');
    const rarity = req.nextUrl.searchParams.get('rarity');
    const isActiveParam = req.nextUrl.searchParams.get('isActive');

    if (!operation) {
      throw new ValidationError('operation query parameter is required');
    }

    const validOperations: BulkOperationType[] = [
      'update',
      'delete',
      'activate',
      'deactivate',
      'hide',
      'unhide',
    ];

    if (!validOperations.includes(operation as BulkOperationType)) {
      throw new ValidationError(
        `Invalid operation. Must be one of: ${validOperations.join(', ')}`
      );
    }

    // Build filter
    const where: Prisma.AchievementWhereInput = {};

    if (idsParam) {
      where.id = { in: idsParam.split(',').map((id) => id.trim()) };
    }
    if (category) {
      where.category = category as PlatformCategory;
    }
    if (tier) {
      where.tier = tier;
    }
    if (rarity) {
      where.rarity = rarity;
    }
    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true';
    }

    // Get matching achievements
    const achievements = await prisma.achievement.findMany({
      where,
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { title: 'asc' },
      take: 500, // Limit for performance
    });

    // Calculate impact
    const totalUserAchievements = achievements.reduce(
      (sum, a) => sum + a._count.users,
      0
    );

    // Generate preview based on operation
    const preview: BulkPreview = {
      operation,
      affectedAchievements: achievements.length,
      affectedUserAchievements: totalUserAchievements,
      achievements: [],
      warnings: [],
    };

    for (const a of achievements) {
      const item: BulkPreviewItem = {
        id: a.id,
        slug: a.slug,
        title: a.title,
        currentState: {
          isActive: a.isActive,
          isHidden: a.isHidden,
          points: a.points,
          tier: a.tier,
          rarity: a.rarity,
        },
        userUnlocks: a._count.users,
      };

      switch (operation) {
        case 'activate':
          item.willBecome = { isActive: true };
          break;
        case 'deactivate':
          item.willBecome = { isActive: false };
          break;
        case 'hide':
          item.willBecome = { isHidden: true };
          break;
        case 'unhide':
          item.willBecome = { isHidden: false };
          break;
        case 'delete':
          if (a._count.users > 0) {
            preview.warnings.push(
              `${a.title}: ${a._count.users} users have unlocked this`
            );
          }
          break;
      }

      preview.achievements.push(item);
    }

    if (operation === 'delete' && totalUserAchievements > 0) {
      preview.warnings.unshift(
        `WARNING: This will affect ${totalUserAchievements} user achievement records`
      );
    }

    log.info('Bulk preview generated', {
      adminId: admin.id,
      operation,
      affectedCount: achievements.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        preview,
        confirmationRequired: operation === 'delete' || totalUserAchievements > 100,
        message: `Preview for ${operation}: ${achievements.length} achievements would be affected`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error generating bulk preview', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// POST /api/achievements/bulk - Bulk operations (Admin only)
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate admin
    const admin = await getAdminUser(req);

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:bulk:${admin.id}`,
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
    const validationResult = BulkOperationSchema.safeParse(body);
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

    const { operation, ids, data } = validationResult.data;

    // Verify achievements exist
    const existingAchievements = await prisma.achievement.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, isActive: true, isHidden: true },
    });

    const existingIds = new Set(existingAchievements.map((a) => a.id));
    const notFound = ids.filter((id) => !existingIds.has(id));

    if (notFound.length > 0) {
      return apiResponse.validationError(
        'Some achievements not found',
        notFound.map((id) => ({
          field: 'ids',
          message: `Achievement ${id} not found`,
        })),
        requestId
      );
    }

    let result: BulkOperationResult;

    switch (operation) {
      case 'update': {
        // Validate update data
        const updateResult = BulkUpdateSchema.safeParse({ ids, data });
        if (!updateResult.success) {
          return apiResponse.validationError(
            'Invalid update data',
            updateResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
            requestId
          );
        }

        const prismaUpdateData = buildUpdateData(updateResult.data.data || {});

        if (Object.keys(prismaUpdateData).length === 0) {
          throw new ValidationError('No valid update fields provided');
        }

        const updated = await prisma.achievement.updateMany({
          where: { id: { in: ids } },
          data: prismaUpdateData,
        });

        result = {
          operation: 'update',
          affected: updated.count,
          details: { updatedFields: Object.keys(prismaUpdateData) },
        };
        break;
      }

      case 'delete': {
        // Check for unlocked achievements
        const unlockedCounts = await prisma.userAchievement.groupBy({
          by: ['achievementId'],
          where: { achievementId: { in: ids } },
          _count: true,
        });

        const hasUnlocks = unlockedCounts.filter((uc) => uc._count > 0);

        if (hasUnlocks.length > 0) {
          return apiResponse.validationError(
            'Some achievements have been unlocked by users. Use DELETE endpoint with force=true.',
            hasUnlocks.map((uc) => ({
              field: 'ids',
              message: `Achievement ${uc.achievementId} has ${uc._count} unlock(s)`,
            })),
            requestId
          );
        }

        const deleted = await prisma.achievement.deleteMany({
          where: { id: { in: ids } },
        });

        result = {
          operation: 'delete',
          affected: deleted.count,
        };
        break;
      }

      case 'activate': {
        const activated = await prisma.achievement.updateMany({
          where: { id: { in: ids } },
          data: { isActive: true },
        });

        result = {
          operation: 'activate',
          affected: activated.count,
        };
        break;
      }

      case 'deactivate': {
        const deactivated = await prisma.achievement.updateMany({
          where: { id: { in: ids } },
          data: { isActive: false },
        });

        result = {
          operation: 'deactivate',
          affected: deactivated.count,
        };
        break;
      }

      case 'hide': {
        const hidden = await prisma.achievement.updateMany({
          where: { id: { in: ids } },
          data: { isHidden: true },
        });

        result = {
          operation: 'hide',
          affected: hidden.count,
        };
        break;
      }

      case 'unhide': {
        const unhidden = await prisma.achievement.updateMany({
          where: { id: { in: ids } },
          data: { isHidden: false },
        });

        result = {
          operation: 'unhide',
          affected: unhidden.count,
        };
        break;
      }

      default: {
        // TypeScript exhaustive check
        const _exhaustiveCheck: never = operation;
        throw new ValidationError(`Unknown operation: ${_exhaustiveCheck}`);
      }
    }

    // Clear achievement caches
    await clearAchievementCaches(ids);

    // Audit log
    await auditLogService.logAdminAction(
      admin.id,
      operation === 'delete' ? 'DELETE' : 'UPDATE',
      `Bulk ${operation}: ${ids.length} achievements`,
      {
        entityType: 'achievement',
        newValue: {
          operation,
          ids,
          affected: result.affected,
        },
      }
    );

    log.info('Bulk operation completed', {
      adminId: admin.id,
      operation,
      requested: ids.length,
      affected: result.affected,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        ...result,
        requested: ids.length,
        message: `Bulk ${operation} completed: ${result.affected} achievement(s) affected`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error in bulk operation', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE /api/achievements/bulk - Bulk delete (Admin only)
// =============================================================================

export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate admin
    const admin = await getAdminUser(req);

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:bulk:delete:${admin.id}`,
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
    const validationResult = BulkDeleteSchema.safeParse(body);
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

    const { ids } = validationResult.data;
    const force = req.nextUrl.searchParams.get('force') === 'true';
    const hard = req.nextUrl.searchParams.get('hard') === 'true';

    // Verify achievements exist
    const existingAchievements = await prisma.achievement.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true },
    });

    const existingIds = new Set(existingAchievements.map((a) => a.id));
    const notFoundIds = ids.filter((id) => !existingIds.has(id));

    if (notFoundIds.length > 0 && notFoundIds.length === ids.length) {
      throw new ValidationError('None of the specified achievements exist');
    }

    const validIds = ids.filter((id) => existingIds.has(id));

    // Check for user achievements
    const unlockedCounts = await prisma.userAchievement.groupBy({
      by: ['achievementId'],
      where: { achievementId: { in: validIds } },
      _count: true,
    });

    const totalUnlocks = unlockedCounts.reduce((sum, uc) => sum + uc._count, 0);

    if (totalUnlocks > 0 && !force) {
      return apiResponse.validationError(
        `${totalUnlocks} user achievement(s) would be affected. Use force=true to proceed.`,
        unlockedCounts.map((uc) => ({
          field: uc.achievementId,
          message: `${uc._count} unlock(s)`,
        })),
        requestId
      );
    }

    let deleted: number;
    let userAchievementsDeleted: number;

    if (hard) {
      // Hard delete - use transaction and return results
      const transactionResult = await prisma.$transaction(async (tx) => {
        // Delete user achievements first
        const uaResult = await tx.userAchievement.deleteMany({
          where: { achievementId: { in: validIds } },
        });

        // Delete achievements
        const aResult = await tx.achievement.deleteMany({
          where: { id: { in: validIds } },
        });

        return {
          userAchievementsDeleted: uaResult.count,
          achievementsDeleted: aResult.count,
        };
      });

      deleted = transactionResult.achievementsDeleted;
      userAchievementsDeleted = transactionResult.userAchievementsDeleted;
    } else {
      // Soft delete (deactivate + hide)
      const result = await prisma.achievement.updateMany({
        where: { id: { in: validIds } },
        data: {
          isActive: false,
          isHidden: true,
        },
      });
      deleted = result.count;
      userAchievementsDeleted = 0;
    }

    // Clear caches
    await clearAchievementCaches(validIds);

    // Also clear global caches
    await Promise.all([
      cache.del('achievements:all'),
      cache.del('achievements:active'),
      cache.del('achievements:categories'),
    ]);

    // Audit log
    await auditLogService.logAdminAction(
      admin.id,
      'DELETE',
      `Bulk delete (${hard ? 'hard' : 'soft'}): ${validIds.length} achievements`,
      {
        entityType: 'achievement',
        oldValue: {
          ids: validIds,
          titles: existingAchievements
            .filter((a) => validIds.includes(a.id))
            .map((a) => a.title),
          userAchievementsAffected: totalUnlocks,
          hardDelete: hard,
        },
      }
    );

    log.warn('Bulk delete completed', {
      adminId: admin.id,
      requested: ids.length,
      deleted,
      hardDelete: hard,
      userAchievementsDeleted,
      notFoundCount: notFoundIds.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        deleted,
        hardDelete: hard,
        userAchievementsDeleted,
        notFound: notFoundIds.length > 0 ? notFoundIds : undefined,
        message: hard
          ? `Permanently deleted ${deleted} achievement(s) and ${userAchievementsDeleted} user achievement(s)`
          : `Soft deleted (deactivated) ${deleted} achievement(s)`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error in bulk delete', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PATCH /api/achievements/bulk - Bulk partial update (Admin only)
// =============================================================================

export async function PATCH(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate admin
    const admin = await getAdminUser(req);

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:bulk:patch:${admin.id}`,
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
    const validationResult = BulkActivateSchema.safeParse(body);
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

    const { ids, isActive } = validationResult.data;

    // Verify achievements exist
    const existingCount = await prisma.achievement.count({
      where: { id: { in: ids } },
    });

    if (existingCount === 0) {
      throw new ValidationError('None of the specified achievements exist');
    }

    // Update achievements
    const updated = await prisma.achievement.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });

    // Clear caches
    await clearAchievementCaches(ids);

    // Audit log
    await auditLogService.logAdminAction(
      admin.id,
      'UPDATE',
      `Bulk ${isActive ? 'activate' : 'deactivate'}: ${ids.length} achievements`,
      {
        entityType: 'achievement',
        newValue: { ids, isActive },
      }
    );

    log.info('Bulk patch completed', {
      adminId: admin.id,
      requested: ids.length,
      updated: updated.count,
      isActive,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        updated: updated.count,
        isActive,
        message: `${isActive ? 'Activated' : 'Deactivated'} ${updated.count} achievement(s)`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error in bulk patch', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PUT /api/achievements/bulk - Replace all matching achievements (Admin only)
// =============================================================================

export async function PUT(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate admin
    const admin = await getAdminUser(req);

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:bulk:replace:${admin.id}`,
      rateLimiters.sync
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(300, requestId);
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate
    const validationResult = BulkReplaceSchema.safeParse(body);
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

    const { filter, replacement, confirm } = validationResult.data;

    if (Object.keys(filter).length === 0) {
      throw new ValidationError('At least one filter is required for bulk replace');
    }

    if (Object.keys(replacement).length === 0) {
      throw new ValidationError('At least one replacement field is required');
    }

    // Build where clause
    const where: Prisma.AchievementWhereInput = {};
    if (filter.category) where.category = filter.category;
    if (filter.tier) where.tier = filter.tier;
    if (filter.rarity) where.rarity = filter.rarity;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    // Get affected achievements for preview/logging
    const affectedAchievements = await prisma.achievement.findMany({
      where,
      select: { id: true, title: true },
      take: 1000,
    });

    const affectedCount = affectedAchievements.length;

    if (affectedCount === 0) {
      return apiResponse.success(
        {
          preview: true,
          filter,
          replacement,
          affectedCount: 0,
          message: 'No achievements match the specified filter',
        },
        { status: 200, meta: { requestId } }
      );
    }

    if (!confirm) {
      return apiResponse.success(
        {
          preview: true,
          filter,
          replacement,
          affectedCount,
          affectedAchievements: affectedAchievements.slice(0, 20).map((a) => ({
            id: a.id,
            title: a.title,
          })),
          hasMore: affectedCount > 20,
          message: `Would update ${affectedCount} achievements. Set confirm=true to proceed.`,
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Perform replacement
    const result = await prisma.achievement.updateMany({
      where,
      data: replacement,
    });

    // Clear all caches for affected achievements
    await clearAchievementCaches(affectedAchievements.map((a) => a.id));

    // Also clear global caches
    await Promise.all([
      cache.del('achievements:all'),
      cache.del('achievements:active'),
      cache.del('achievements:categories'),
    ]);

    // Audit log
    await auditLogService.logAdminAction(
      admin.id,
      'UPDATE',
      `Bulk replaced ${result.count} achievements`,
      {
        entityType: 'achievement',
        newValue: {
          filter,
          replacement,
          affected: result.count,
          affectedIds: affectedAchievements.map((a) => a.id),
        },
      }
    );

    log.info('Bulk replace completed', {
      adminId: admin.id,
      filter,
      replacement,
      affected: result.count,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        replaced: result.count,
        filter,
        replacement,
        message: `Successfully updated ${result.count} achievements`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error in bulk replace', { requestId }, error);
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}