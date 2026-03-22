// src/app/api/achievements/sync/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, ForbiddenError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { auditLogService } from '@/services/auditLogService';
import { cache } from '@/lib/redis';
import { achievements, toPrismaAchievement } from '@/config/achievements';
import { SyncAchievementsSchema } from '@/lib/validations/achievement';
// Removing Prisma type imports to avoid IDE compilation errors
const log = logger.child({ route: 'achievements/sync' });

// =============================================================================
// TYPES
// =============================================================================

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ slug: string; error: string }>;
  details: Array<{
    slug: string;
    action: 'created' | 'updated' | 'skipped';
    reason?: string;
  }>;
}

interface OrphanedAchievement {
  slug: string;
  title: string;
  unlockedBy: number;
}

interface SyncStatus {
  configCount: number;
  databaseCount: number;
  inSync: boolean;
  pendingCreations: Array<{ slug: string; title: string }>;
  orphanedInDb: Array<OrphanedAchievement>;
  needsUpdate: Array<{ slug: string; fields: string[] }>;
  lastSyncCheck: string;
}

// Raw data returned from toPrismaAchievement
interface RawAchievementData {
  slug: string;
  title: string;
  description: string;
  category: string;
  tier: string;
  icon: string;
  points: number;
  xpReward: number;
  rarity: string;
  requirement: object;
  requirementText: string;
  thresholds: object | null;
  isActive: boolean;
  isHidden: boolean;
  isSecret: boolean;
  sortOrder: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getAdminUser(req: NextRequest) {
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

/**
 * Convert raw achievement data to Prisma-compatible format
 * Handles null JSON fields properly using Prisma.JsonNull
 */
function toPrismaCreateData(
  rawData: RawAchievementData
): any {
  return {
    slug: rawData.slug,
    title: rawData.title,
    description: rawData.description,
    category: rawData.category,
    tier: rawData.tier,
    icon: rawData.icon,
    points: rawData.points,
    xpReward: rawData.xpReward,
    rarity: rawData.rarity,
    requirement: rawData.requirement as any,
    requirementText: rawData.requirementText,
    thresholds: rawData.thresholds
      ? (rawData.thresholds as any)
      : null,
    isActive: rawData.isActive,
    isHidden: rawData.isHidden,
    isSecret: rawData.isSecret,
    sortOrder: rawData.sortOrder,
  };
}

/**
 * Convert raw achievement data to Prisma update format
 */
function toPrismaUpdateData(
  rawData: RawAchievementData
): any {
  return {
    slug: rawData.slug,
    title: rawData.title,
    description: rawData.description,
    category: rawData.category,
    tier: rawData.tier,
    icon: rawData.icon,
    points: rawData.points,
    xpReward: rawData.xpReward,
    rarity: rawData.rarity,
    requirement: rawData.requirement as any,
    requirementText: rawData.requirementText,
    thresholds: rawData.thresholds
      ? (rawData.thresholds as any)
      : null,
    isActive: rawData.isActive,
    isHidden: rawData.isHidden,
    isSecret: rawData.isSecret,
    sortOrder: rawData.sortOrder,
  };
}

/**
 * Compare two achievement objects and return changed fields
 */
function getChangedFields(
  configData: RawAchievementData,
  dbData: {
    title: string;
    description: string;
    points: number;
    xpReward: number;
    tier: string;
    rarity: string;
  }
): string[] {
  const changed: string[] = [];

  if (configData.title !== dbData.title) changed.push('title');
  if (configData.description !== dbData.description) changed.push('description');
  if (configData.points !== dbData.points) changed.push('points');
  if (configData.xpReward !== dbData.xpReward) changed.push('xpReward');
  if (configData.tier !== dbData.tier) changed.push('tier');
  if (configData.rarity !== dbData.rarity) changed.push('rarity');

  return changed;
}

// =============================================================================
// GET /api/achievements/sync - Get sync status (Admin only)
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate admin
    const admin = await getAdminUser(req);

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:sync:get:${admin.id}`,
      rateLimiters.api
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get current database achievements with more details for comparison
    const dbAchievements = await prisma.achievement.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        points: true,
        xpReward: true,
        tier: true,
        rarity: true,
        isActive: true,
        updatedAt: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { slug: 'asc' },
    });

    const dbSlugs = new Set(dbAchievements.map((a: any) => a.slug));
    const configSlugs = new Set(achievements.map((a: any) => a.slug));

    // Find differences
    const inConfigNotDb = achievements
      .filter((a: any) => !dbSlugs.has(a.slug))
      .map((a: any) => ({ slug: a.slug, title: a.title }));

    const inDbNotConfig: OrphanedAchievement[] = dbAchievements
      .filter((a: any) => !configSlugs.has(a.slug))
      .map((a: any) => ({
        slug: a.slug,
        title: a.title,
        unlockedBy: a._count.users,
      }));

    // Check for updates needed
    const needsUpdate: Array<{ slug: string; fields: string[] }> = [];

    for (const configAchievement of achievements) {
      const dbAchievement = dbAchievements.find(
        (a: any) => a.slug === configAchievement.slug
      );

      if (dbAchievement) {
        const rawData = toPrismaAchievement(configAchievement) as RawAchievementData;
        const changedFields = getChangedFields(rawData, dbAchievement);

        if (changedFields.length > 0) {
          needsUpdate.push({
            slug: configAchievement.slug,
            fields: changedFields,
          });
        }
      }
    }

    const syncStatus: SyncStatus = {
      configCount: achievements.length,
      databaseCount: dbAchievements.length,
      inSync:
        inConfigNotDb.length === 0 &&
        inDbNotConfig.length === 0 &&
        needsUpdate.length === 0,
      pendingCreations: inConfigNotDb,
      orphanedInDb: inDbNotConfig,
      needsUpdate,
      lastSyncCheck: new Date().toISOString(),
    };

    log.info('Sync status checked', {
      adminId: admin.id,
      inSync: syncStatus.inSync,
      pendingCreations: inConfigNotDb.length,
      orphaned: inDbNotConfig.length,
      needsUpdate: needsUpdate.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(syncStatus, { status: 200, meta: { requestId } });
  } catch (error) {
    log.error('Error checking sync status', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// POST /api/achievements/sync - Sync achievements from config (Admin only)
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate admin
    const admin = await getAdminUser(req);

    // Rate limit (stricter for sync)
    const rateLimitResult = await checkRateLimit(
      `achievements:sync:${admin.id}`,
      rateLimiters.sync
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(300, requestId);
    }

    // Parse body
    let body: unknown = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is ok, use defaults
    }

    // Validate
    const validationResult = SyncAchievementsSchema.safeParse(body);
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

    const { dryRun, overwrite } = validationResult.data;

    // Get current database achievements
    const dbAchievements = await prisma.achievement.findMany({
      select: { id: true, slug: true },
    });

    const dbSlugMap = new Map(dbAchievements.map((a: any) => [a.slug, a.id]));

    // Initialize result
    const result: SyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      details: [],
    };

    // Process each config achievement
    for (const configAchievement of achievements) {
      try {
        const existingId = dbSlugMap.get(configAchievement.slug);
        const rawData = toPrismaAchievement(configAchievement) as RawAchievementData;

        if (existingId) {
          // Achievement exists
          if (overwrite) {
            if (!dryRun) {
              const updateData = toPrismaUpdateData(rawData);
              await prisma.achievement.update({
                where: { id: existingId },
                data: updateData,
              });
            }
            result.updated++;
            result.details.push({
              slug: configAchievement.slug,
              action: 'updated',
            });
          } else {
            result.skipped++;
            result.details.push({
              slug: configAchievement.slug,
              action: 'skipped',
              reason: 'Already exists (use overwrite=true to update)',
            });
          }
        } else {
          // New achievement
          if (!dryRun) {
            const createData = toPrismaCreateData(rawData);
            await prisma.achievement.create({
              data: createData,
            });
          }
          result.created++;
          result.details.push({
            slug: configAchievement.slug,
            action: 'created',
          });
        }
      } catch (error) {
        result.errors.push({
          slug: configAchievement.slug,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Clear all achievement caches
    if (!dryRun && (result.created > 0 || result.updated > 0)) {
      await cache.flushAll();
    }

    // Audit log
    if (!dryRun && (result.created > 0 || result.updated > 0)) {
      await auditLogService.logAdminAction(
        admin.id,
        'CREATE',
        `Synced achievements from config`,
        {
          entityType: 'achievement',
          newValue: {
            created: result.created,
            updated: result.updated,
            skipped: result.skipped,
            errors: result.errors.length,
          },
        }
      );
    }

    log.info('Achievement sync completed', {
      adminId: admin.id,
      dryRun,
      overwrite,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        dryRun,
        overwrite,
        ...result,
        message: dryRun
          ? `Dry run complete: Would create ${result.created}, update ${result.updated}, skip ${result.skipped}`
          : `Sync complete: Created ${result.created}, updated ${result.updated}, skipped ${result.skipped}`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error syncing achievements', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PUT /api/achievements/sync - Full resync (Admin only)
// =============================================================================

export async function PUT(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate admin
    const admin = await getAdminUser(req);

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:sync:put:${admin.id}`,
      rateLimiters.sync
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(300, requestId);
    }

    // Parse optional body for options
    let dryRun = false;
    try {
      const text = await req.text();
      if (text) {
        const body = JSON.parse(text);
        dryRun = body.dryRun === true;
      }
    } catch {
      // Ignore parse errors
    }

    // Check query param too
    if (req.nextUrl.searchParams.get('dryRun') === 'true') {
      dryRun = true;
    }

    // This is a full resync - updates all achievements from config
    const result: SyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      details: [],
    };

    if (dryRun) {
      // Dry run - just calculate what would happen
      const dbAchievements = await prisma.achievement.findMany({
        select: { slug: true },
      });
      const dbSlugs = new Set(dbAchievements.map((a: any) => a.slug));

      for (const configAchievement of achievements) {
        if (dbSlugs.has(configAchievement.slug)) {
          result.updated++;
          result.details.push({
            slug: configAchievement.slug,
            action: 'updated',
          });
        } else {
          result.created++;
          result.details.push({
            slug: configAchievement.slug,
            action: 'created',
          });
        }
      }
    } else {
      // Use transaction for full resync
      await prisma.$transaction(async (tx: any) => {
        for (const configAchievement of achievements) {
          try {
            const rawData = toPrismaAchievement(configAchievement) as RawAchievementData;
            const createData = toPrismaCreateData(rawData);
            const updateData = toPrismaUpdateData(rawData);

            await tx.achievement.upsert({
              where: { slug: configAchievement.slug },
              create: createData,
              update: updateData,
            });

            result.updated++;
            result.details.push({
              slug: configAchievement.slug,
              action: 'updated',
            });
          } catch (error) {
            result.errors.push({
              slug: configAchievement.slug,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      });

      // Clear all caches
      await cache.flushAll();

      // Audit log
      await auditLogService.logAdminAction(
        admin.id,
        'UPDATE',
        `Full resync of achievements from config`,
        {
          entityType: 'achievement',
          newValue: {
            total: achievements.length,
            synced: result.updated,
            errors: result.errors.length,
          },
        }
      );
    }

    log.info('Full achievement resync completed', {
      adminId: admin.id,
      dryRun,
      total: achievements.length,
      synced: result.updated,
      errors: result.errors.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        dryRun,
        ...result,
        message: dryRun
          ? `Dry run: Would sync ${result.updated} achievements`
          : `Full resync complete: ${result.updated} achievements synced`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error in full resync', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE /api/achievements/sync - Remove orphaned achievements (Admin only)
// =============================================================================

export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate admin
    const admin = await getAdminUser(req);

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:sync:delete:${admin.id}`,
      rateLimiters.sync
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(300, requestId);
    }

    const force = req.nextUrl.searchParams.get('force') === 'true';
    const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';

    // Get config slugs
    const configSlugs = new Set(achievements.map((a: any) => a.slug));

    // Find orphaned achievements (in DB but not in config)
    const orphanedAchievements = await prisma.achievement.findMany({
      where: {
        slug: { notIn: Array.from(configSlugs) },
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (orphanedAchievements.length === 0) {
      return apiResponse.success(
        {
          orphaned: 0,
          deleted: 0,
          message: 'No orphaned achievements found',
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Check for user achievements
    const withUnlocks = orphanedAchievements.filter((a: any) => a._count.users > 0);
    const totalUnlocks = withUnlocks.reduce((sum: any, a: any) => sum + a._count.users, 0);

    if (withUnlocks.length > 0 && !force) {
      return apiResponse.validationError(
        `${withUnlocks.length} orphaned achievement(s) have ${totalUnlocks} user unlock(s). Use force=true to delete anyway.`,
        withUnlocks.map((a: any) => ({
          field: a.slug,
          message: `${a._count.users} user(s) have unlocked this`,
        })),
        requestId
      );
    }

    const orphanedInfo: OrphanedAchievement[] = orphanedAchievements.map((a: any) => ({
      slug: a.slug,
      title: a.title,
      unlockedBy: a._count.users,
    }));

    if (dryRun) {
      return apiResponse.success(
        {
          dryRun: true,
          wouldDelete: orphanedAchievements.length,
          wouldDeleteUserAchievements: totalUnlocks,
          orphaned: orphanedInfo,
          message: `Dry run: Would delete ${orphanedAchievements.length} orphaned achievement(s) and ${totalUnlocks} user achievement(s)`,
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Delete orphaned achievements
    const orphanedIds = orphanedAchievements.map((a: any) => a.id);
    let userAchievementsDeleted = 0;
    let achievementsDeleted = 0;

    await prisma.$transaction(async (tx: any) => {
      // Delete user achievements first
      const uaResult = await tx.userAchievement.deleteMany({
        where: { achievementId: { in: orphanedIds } },
      });
      userAchievementsDeleted = uaResult.count;

      // Delete achievements
      const aResult = await tx.achievement.deleteMany({
        where: { id: { in: orphanedIds } },
      });
      achievementsDeleted = aResult.count;
    });

    // Clear caches
    await cache.flushAll();

    // Audit log
    await auditLogService.logAdminAction(
      admin.id,
      'DELETE',
      `Deleted orphaned achievements`,
      {
        entityType: 'achievement',
        oldValue: {
          deleted: orphanedInfo.map((a) => a.slug),
          userAchievementsDeleted,
        },
      }
    );

    log.warn('Orphaned achievements deleted', {
      adminId: admin.id,
      deleted: achievementsDeleted,
      userAchievementsDeleted,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        deleted: achievementsDeleted,
        userAchievementsDeleted,
        deletedAchievements: orphanedInfo,
        message: `Deleted ${achievementsDeleted} orphaned achievement(s) and ${userAchievementsDeleted} user achievement(s)`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error deleting orphaned achievements', { requestId }, error);
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}