// src/app/api/custom-platforms/bulk/route.ts
/**
 * Custom Platform Bulk Operations Routes
 * 
 * POST   /api/custom-platforms/bulk          - Bulk create platforms
 * PATCH  /api/custom-platforms/bulk          - Bulk update platforms
 * DELETE /api/custom-platforms/bulk          - Bulk delete platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { PlatformCategory, Prisma } from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  ApiError,
  UnauthorizedError,
  ValidationError,
  toApiError,
} from '@/lib/apiError';
import { rateLimiters, checkRateLimit } from '@/lib/rateLimiter';
import { auditLogService } from '@/services/auditLogService';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/custom-platforms/bulk' });

const ALLOWED_METHODS = ['POST', 'PATCH', 'DELETE', 'OPTIONS'];

const MAX_BULK_ITEMS = 20;
const MAX_CUSTOM_PLATFORMS_FREE = 5;
const MAX_CUSTOM_PLATFORMS_PRO = 50;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const bulkCreateSchema = z.object({
  platforms: z
    .array(
      z.object({
        name: z
          .string()
          .min(2)
          .max(50)
          .regex(/^[a-zA-Z0-9\s\-_]+$/),
        displayName: z.string().max(100).optional(),
        description: z.string().max(500).optional(),
        category: z.nativeEnum(PlatformCategory),
        icon: z.string().max(50).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        website: z.string().url().max(200).optional(),
        trackingFields: z.record(z.string(), z.object({
          type: z.enum(['number', 'text', 'boolean', 'date', 'select']),
          label: z.string().max(50).optional(),
          required: z.boolean().optional(),
        })).optional(),
      })
    )
    .min(1, 'At least one platform required')
    .max(MAX_BULK_ITEMS, `Maximum ${MAX_BULK_ITEMS} platforms per request`),
  skipDuplicates: z.boolean().default(true),
});

const bulkUpdateSchema = z.object({
  platforms: z
    .array(
      z.object({
        id: z.string().cuid(),
        data: z.object({
          name: z.string().min(2).max(50).regex(/^[a-zA-Z0-9\s\-_]+$/).optional(),
          displayName: z.string().max(100).nullable().optional(),
          description: z.string().max(500).nullable().optional(),
          category: z.nativeEnum(PlatformCategory).optional(),
          icon: z.string().max(50).nullable().optional(),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
          website: z.string().url().max(200).nullable().optional(),
          isActive: z.boolean().optional(),
        }).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field required' }),
      })
    )
    .min(1, 'At least one platform required')
    .max(MAX_BULK_ITEMS, `Maximum ${MAX_BULK_ITEMS} platforms per request`),
});

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().cuid())
    .min(1, 'At least one ID required')
    .max(MAX_BULK_ITEMS, `Maximum ${MAX_BULK_ITEMS} IDs per request`),
  force: z.boolean().default(false),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
  };
}

function errorResponse(error: unknown, requestId: string): NextResponse {
  const apiError = toApiError(error, requestId);
  apiError.log();

  return NextResponse.json(
    {
      success: false,
      error: apiError.message,
      code: apiError.code,
      details: apiError.details,
      timestamp: apiError.timestamp,
      requestId,
    },
    { 
      status: apiError.statusCode,
      headers: { 'X-Request-ID': requestId },
    }
  );
}

function successResponse<T>(
  data: T, 
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

async function checkPlatformLimit(userId: string, additionalCount: number): Promise<{ allowed: boolean; current: number; limit: number; available: number }> {
  const [subscription, currentCount] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: { tier: true, platformLimit: true },
    }),
    prisma.customPlatform.count({
      where: { userId, isActive: true },
    }),
  ]);

  const limit = subscription?.platformLimit 
    || (subscription?.tier === 'PRO' || subscription?.tier === 'TEAM' || subscription?.tier === 'ENTERPRISE'
      ? MAX_CUSTOM_PLATFORMS_PRO 
      : MAX_CUSTOM_PLATFORMS_FREE);

  const available = Math.max(0, limit - currentCount);

  return {
    allowed: currentCount + additionalCount <= limit,
    current: currentCount,
    limit,
    available,
  };
}

// =============================================================================
// POST - Bulk Create Platforms
// =============================================================================

export async function POST(req: NextRequest) {
  const { requestId, ip, userAgent } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 2. Rate limiting (stricter for bulk operations)
    const rateLimitResult = await checkRateLimit(`custom-platforms:bulk:${userId}`, rateLimiters.sync);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many bulk requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '3600', 'X-Request-ID': requestId } }
      );
    }

    // 3. Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    const validatedData = bulkCreateSchema.safeParse(body);
    if (!validatedData.success) {
      throw new ValidationError(
        'Validation failed',
        validatedData.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { platforms, skipDuplicates } = validatedData.data;

    // 4. Check platform limit
    const limitCheck = await checkPlatformLimit(userId, platforms.length);
    if (!limitCheck.allowed) {
      throw new ApiError(
        `Cannot create ${platforms.length} platforms. You have ${limitCheck.available} slots available (limit: ${limitCheck.limit}).`,
        403,
        'SUBSCRIPTION_REQUIRED',
        [{
          field: 'subscription',
          value: { 
            requested: platforms.length,
            available: limitCheck.available,
            limit: limitCheck.limit,
          },
        }]
      );
    }

    // 5. Get existing platform names for duplicate check
    const existingNames = await prisma.customPlatform.findMany({
      where: { userId },
      select: { name: true },
    });
    const existingNamesLower = new Set(existingNames.map(p => p.name.toLowerCase()));

    // 6. Filter duplicates if skipDuplicates is true
    const results: {
      created: { id: string; name: string }[];
      skipped: { name: string; reason: string }[];
      failed: { name: string; error: string }[];
    } = {
      created: [],
      skipped: [],
      failed: [],
    };

    const platformsToCreate: Prisma.CustomPlatformCreateManyInput[] = [];

    for (const platform of platforms) {
      if (existingNamesLower.has(platform.name.toLowerCase())) {
        if (skipDuplicates) {
          results.skipped.push({ name: platform.name, reason: 'Duplicate name' });
          continue;
        } else {
          results.failed.push({ name: platform.name, error: 'Platform with this name already exists' });
          continue;
        }
      }

      platformsToCreate.push({
        userId,
        name: platform.name.trim(),
        displayName: platform.displayName?.trim() || platform.name.trim(),
        description: platform.description?.trim(),
        category: platform.category,
        icon: platform.icon,
        color: platform.color,
        website: platform.website,
        trackingFields: platform.trackingFields as Prisma.InputJsonValue || {},
        isActive: true,
      });
    }

    // 7. Create platforms in transaction
    if (platformsToCreate.length > 0) {
      const createdPlatforms = await prisma.$transaction(
        platformsToCreate.map(data =>
          prisma.customPlatform.create({
            data,
            select: { id: true, name: true },
          })
        )
      );

      results.created = createdPlatforms;
    }

    // 8. Audit log
    if (results.created.length > 0) {
      await auditLogService.create({
        userId,
        action: 'CREATE',
        category: 'custom-platform',
        entityType: 'CustomPlatform',
        description: `Bulk created ${results.created.length} custom platforms`,
        newValue: { platforms: results.created.map(p => p.name) },
        ipAddress: ip,
        userAgent,
        requestId,
        status: 'success',
      });
    }

    const duration = Date.now() - startTime;
    log.info('Bulk platforms created', { 
      userId, 
      created: results.created.length,
      skipped: results.skipped.length,
      failed: results.failed.length,
      duration,
    });

    return successResponse(
      {
        summary: {
          total: platforms.length,
          created: results.created.length,
          skipped: results.skipped.length,
          failed: results.failed.length,
        },
        results,
      },
      201,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PATCH - Bulk Update Platforms
// =============================================================================

export async function PATCH(req: NextRequest) {
  const { requestId, ip, userAgent } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 2. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:bulk:${userId}`, rateLimiters.sync);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many bulk requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '3600', 'X-Request-ID': requestId } }
      );
    }

    // 3. Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    const validatedData = bulkUpdateSchema.safeParse(body);
    if (!validatedData.success) {
      throw new ValidationError(
        'Validation failed',
        validatedData.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { platforms } = validatedData.data;
    const platformIds = platforms.map(p => p.id);

    // 4. Verify ownership of all platforms
    const ownedPlatforms = await prisma.customPlatform.findMany({
      where: {
        id: { in: platformIds },
        userId,
      },
      select: { id: true, name: true },
    });

    const ownedIds = new Set(ownedPlatforms.map(p => p.id));
    const unauthorizedIds = platformIds.filter(id => !ownedIds.has(id));

    if (unauthorizedIds.length > 0) {
      throw new ApiError(
        `You don't have permission to update platforms: ${unauthorizedIds.join(', ')}`,
        403,
        'FORBIDDEN',
        unauthorizedIds.map(id => ({ field: 'id', value: id }))
      );
    }

    // 5. Update platforms in transaction
    const results: {
      updated: { id: string; name: string }[];
      failed: { id: string; error: string }[];
    } = {
      updated: [],
      failed: [],
    };

    await prisma.$transaction(async (tx) => {
      for (const platform of platforms) {
        try {
          const updated = await tx.customPlatform.update({
            where: { id: platform.id },
            data: {
              ...platform.data,
              updatedAt: new Date(),
            },
            select: { id: true, name: true },
          });
          results.updated.push(updated);
        } catch (err) {
          results.failed.push({ 
            id: platform.id, 
            error: err instanceof Error ? err.message : 'Update failed' 
          });
        }
      }
    });

    // 6. Audit log
    if (results.updated.length > 0) {
      await auditLogService.create({
        userId,
        action: 'UPDATE',
        category: 'custom-platform',
        entityType: 'CustomPlatform',
        description: `Bulk updated ${results.updated.length} custom platforms`,
        newValue: { platforms: results.updated.map(p => p.name) },
        ipAddress: ip,
        userAgent,
        requestId,
        status: 'success',
      });
    }

    const duration = Date.now() - startTime;
    log.info('Bulk platforms updated', { 
      userId, 
      updated: results.updated.length,
      failed: results.failed.length,
      duration,
    });

    return successResponse(
      {
        summary: {
          total: platforms.length,
          updated: results.updated.length,
          failed: results.failed.length,
        },
        results,
      },
      200,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// DELETE - Bulk Delete Platforms
// =============================================================================

export async function DELETE(req: NextRequest) {
  const { requestId, ip, userAgent } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 2. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:bulk:${userId}`, rateLimiters.sync);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many bulk requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '3600', 'X-Request-ID': requestId } }
      );
    }

    // 3. Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    const validatedData = bulkDeleteSchema.safeParse(body);
    if (!validatedData.success) {
      throw new ValidationError(
        'Validation failed',
        validatedData.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { ids, force } = validatedData.data;

    // 4. Verify ownership
    const ownedPlatforms = await prisma.customPlatform.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: { id: true, name: true },
    });

    const ownedIds = new Set(ownedPlatforms.map(p => p.id));
    const unauthorizedIds = ids.filter(id => !ownedIds.has(id));

    if (unauthorizedIds.length > 0) {
      throw new ApiError(
        `You don't have permission to delete platforms: ${unauthorizedIds.join(', ')}`,
        403,
        'FORBIDDEN',
        unauthorizedIds.map(id => ({ field: 'id', value: id }))
      );
    }

    // 5. Check for entries
    const platformsWithEntries = await prisma.trackerEntry.groupBy({
      by: ['customPlatformId'],
      where: {
        customPlatformId: { in: ids },
      },
      _count: true,
    });

    const platformsWithEntriesMap = new Map(
      platformsWithEntries.map(p => [p.customPlatformId, p._count])
    );

    // 6. Process deletions
    const results: {
      deleted: { id: string; name: string }[];
      deactivated: { id: string; name: string; entriesCount: number }[];
      failed: { id: string; error: string }[];
    } = {
      deleted: [],
      deactivated: [],
      failed: [],
    };

    await prisma.$transaction(async (tx) => {
      for (const id of ids) {
        try {
          const platform = ownedPlatforms.find(p => p.id === id);
          if (!platform) continue;

          const entriesCount = platformsWithEntriesMap.get(id) || 0;

          if (entriesCount > 0 && !force) {
            // Deactivate instead of delete
            await tx.customPlatform.update({
              where: { id },
              data: { isActive: false, updatedAt: new Date() },
            });
            results.deactivated.push({ id, name: platform.name, entriesCount });
          } else if (entriesCount > 0 && force) {
            // Force delete with cascade
            await tx.trackerEntry.deleteMany({
              where: { customPlatformId: id },
            });
            await tx.customPlatform.delete({ where: { id } });
            results.deleted.push({ id, name: platform.name });
          } else {
            // No entries, safe to delete
            await tx.customPlatform.delete({ where: { id } });
            results.deleted.push({ id, name: platform.name });
          }
        } catch (err) {
          results.failed.push({ 
            id, 
            error: err instanceof Error ? err.message : 'Delete failed' 
          });
        }
      }
    });

    // 7. Audit log
    await auditLogService.create({
      userId,
      action: 'DELETE',
      category: 'custom-platform',
      entityType: 'CustomPlatform',
      description: `Bulk deleted/deactivated ${results.deleted.length + results.deactivated.length} custom platforms`,
      oldValue: {
        deleted: results.deleted.map(p => p.name),
        deactivated: results.deactivated.map(p => p.name),
      },
      ipAddress: ip,
      userAgent,
      requestId,
      status: 'success',
    });

    const duration = Date.now() - startTime;
    log.info('Bulk platforms deleted', { 
      userId, 
      deleted: results.deleted.length,
      deactivated: results.deactivated.length,
      failed: results.failed.length,
      force,
      duration,
    });

    return successResponse(
      {
        summary: {
          total: ids.length,
          deleted: results.deleted.length,
          deactivated: results.deactivated.length,
          failed: results.failed.length,
        },
        results,
      },
      200,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// OPTIONS - Return allowed methods
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}