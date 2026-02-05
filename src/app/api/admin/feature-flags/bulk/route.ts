// =============================================================================
// api/admin/feature-flags/bulk/route.ts
// =============================================================================
// Description: Bulk feature flag operations
// Methods: POST, PUT, DELETE, OPTIONS
// Auth Required: Yes (Admin only)
// Rate Limit: 10 requests/minute (strict for bulk operations)
// Security: Enhanced validation, transaction safety, audit trail
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withTransaction } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SubscriptionTier, AuditAction } from '@prisma/client';

// =============================================================================
// ENHANCED SECURITY CONFIG
// =============================================================================

const BULK_RATE_LIMIT = 10; // Very restrictive for bulk operations
const MAX_BULK_ITEMS = 50; // Maximum items per bulk operation
const ADMIN_IP_WHITELIST = process.env.ADMIN_IP_WHITELIST?.split(',') || [];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const bulkCreateSchema = z.object({
  flags: z.array(z.object({
    key: z.string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
    name: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    isEnabled: z.boolean().default(false),
    enabledForAll: z.boolean().default(false),
    enabledUserIds: z.array(z.string().cuid()).default([]),
    enabledTiers: z.array(z.nativeEnum(SubscriptionTier)).default([]),
    enabledPercentage: z.number().int().min(0).max(100).default(0),
    metadata: z.record(z.unknown()).optional(),
  })).min(1).max(MAX_BULK_ITEMS),
  skipDuplicates: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

const bulkUpdateSchema = z.object({
  operations: z.array(z.object({
    id: z.string().cuid(),
    data: z.object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(500).nullable().optional(),
      isEnabled: z.boolean().optional(),
      enabledForAll: z.boolean().optional(),
      enabledUserIds: z.array(z.string().cuid()).optional(),
      enabledTiers: z.array(z.nativeEnum(SubscriptionTier)).optional(),
      enabledPercentage: z.number().int().min(0).max(100).optional(),
      metadata: z.record(z.unknown()).nullable().optional(),
    })
  })).min(1).max(MAX_BULK_ITEMS),
  dryRun: z.boolean().default(false),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(MAX_BULK_ITEMS),
  confirmation: z.literal('DELETE_CONFIRMED'),
  dryRun: z.boolean().default(false),
});

// =============================================================================
// ENHANCED SECURITY HELPERS
// =============================================================================

async function checkSuperAdminAuth(request: NextRequest, requestId: string) {
  const session = await getServerSession(authOptions);
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   request.headers.get('x-real-ip') || 'unknown';
  
  if (!session?.user?.id) {
    logger.warn('Unauthorized bulk operation attempt', { requestId, ip: clientIp });
    return { error: apiResponse.unauthorized('Authentication required', requestId) };
  }

  if (!session.user.isAdmin) {
    logger.warn('Non-admin attempted bulk operation', {
      userId: session.user.id,
      requestId,
      ip: clientIp
    });
    
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: AuditAction.ADMIN_ACTION,
        category: 'security',
        description: 'Non-admin attempted bulk feature flag operation',
        status: 'failure',
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent'),
      }
    });
    
    return { error: apiResponse.forbidden('Super admin access required for bulk operations', requestId) };
  }

  // Check if user has bulk operation permissions
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissions: true, isActive: true, isBanned: true }
  });

  if (!user?.isActive || user.isBanned) {
    logger.error('Inactive/banned admin attempted bulk operation', {
      userId: session.user.id,
      requestId,
      ip: clientIp
    });
    return { error: apiResponse.forbidden('Account is not active', requestId) };
  }

  if (!user.permissions.includes('BULK_OPERATIONS')) {
    logger.warn('Admin without bulk permissions attempted operation', {
      userId: session.user.id,
      requestId,
      permissions: user.permissions
    });
    return { error: apiResponse.forbidden('Bulk operations permission required', requestId) };
  }

  // IP whitelist check for production
  if (process.env.NODE_ENV === 'production' && ADMIN_IP_WHITELIST.length > 0) {
    if (!ADMIN_IP_WHITELIST.includes(clientIp)) {
      logger.error('Bulk operation from non-whitelisted IP', {
        userId: session.user.id,
        requestId,
        ip: clientIp,
        whitelist: ADMIN_IP_WHITELIST
      });
      return { error: apiResponse.forbidden('IP not whitelisted for bulk operations', requestId) };
    }
  }

  return { session, clientIp };
}

async function logBulkOperation(
  userId: string, 
  action: AuditAction, 
  operation: string, 
  result: any,
  clientIp: string,
  userAgent: string | null
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      category: 'feature_flags_bulk',
      description: operation,
      newValue: result,
      ipAddress: clientIp,
      userAgent,
    }
  });
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '300',
    }
  });
}

/**
 * POST - Bulk create feature flags
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Enhanced auth check
    const { error, session, clientIp } = await checkSuperAdminAuth(request, requestId);
    if (error) return error;

    // Strict rate limiting for bulk operations
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      BULK_RATE_LIMIT,
      `bulk-create:${session!.user.id}:${clientIp}`
    );

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for bulk create', {
        userId: session!.user.id,
        requestId,
        ip: clientIp
      });
      return apiResponse.rateLimited(300, requestId); // 5 min timeout
    }

    // Parse and validate body
    const body = await request.json();
    const validation = bulkCreateSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid bulk create request',
        validation.error.errors,
        requestId
      );
    }

    const { flags, skipDuplicates, dryRun } = validation.data;

    // Check for duplicate keys in request
    const keys = flags.map(f => f.key);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      return apiResponse.validationError(
        'Duplicate keys found in request',
        [{ path: ['flags'], message: 'All keys must be unique' }],
        requestId
      );
    }

    // Check for existing keys in database
    const existingFlags = await prisma.featureFlag.findMany({
      where: { key: { in: keys } },
      select: { key: true }
    });

    const existingKeys = existingFlags.map(f => f.key);
    
    if (existingKeys.length > 0 && !skipDuplicates) {
      return apiResponse.validationError(
        'Some feature flags already exist',
        [{ 
          path: ['flags'], 
          message: `Existing keys: ${existingKeys.join(', ')}. Use skipDuplicates=true to ignore.` 
        }],
        requestId
      );
    }

    // Filter out existing flags if skipDuplicates is true
    const flagsToCreate = flags.filter(f => !existingKeys.includes(f.key));

    if (flagsToCreate.length === 0) {
      return apiResponse.success(
        { created: [], skipped: existingKeys },
        { meta: { requestId, dryRun } }
      );
    }

    // Dry run mode
    if (dryRun) {
      return apiResponse.success(
        { 
          wouldCreate: flagsToCreate.length,
          wouldSkip: existingKeys.length,
          flags: flagsToCreate.map(f => ({ key: f.key, name: f.name }))
        },
        { meta: { requestId, dryRun: true } }
      );
    }

    // Execute bulk create in transaction
    const result = await withTransaction(async (tx) => {
      const createdFlags = [];
      
      for (const flagData of flagsToCreate) {
        const flag = await tx.featureFlag.create({
          data: {
            key: flagData.key,
            name: flagData.name,
            description: flagData.description,
            isEnabled: flagData.isEnabled,
            enabledForAll: flagData.enabledForAll,
            enabledUserIds: flagData.enabledUserIds,
            enabledTiers: flagData.enabledTiers,
            enabledPercentage: flagData.enabledPercentage,
            metadata: flagData.metadata || {},
          }
        });
        
        createdFlags.push(flag);
      }

      return createdFlags;
    });

    // Log bulk operation
    await logBulkOperation(
      session!.user.id,
      AuditAction.CREATE,
      `Bulk created ${result.length} feature flags`,
      { 
        created: result.map(f => ({ id: f.id, key: f.key })),
        skipped: existingKeys
      },
      clientIp!,
      request.headers.get('user-agent')
    );

    logger.info('Bulk feature flags created', {
      requestId,
      adminId: session!.user.id,
      created: result.length,
      skipped: existingKeys.length,
      duration: Date.now() - startTime
    });

    return apiResponse.created(
      { 
        created: result,
        skipped: existingKeys,
        summary: {
          total: flags.length,
          created: result.length,
          skipped: existingKeys.length
        }
      },
      { requestId }
    );
  } catch (error) {
    logger.error('POST admin/feature-flags/bulk failed', { requestId }, error);
    return apiResponse.internalError('Bulk create operation failed', requestId);
  }
}

/**
 * PUT - Bulk update feature flags
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Enhanced auth check
    const { error, session, clientIp } = await checkSuperAdminAuth(request, requestId);
    if (error) return error;

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      BULK_RATE_LIMIT,
      `bulk-update:${session!.user.id}:${clientIp}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(300, requestId);
    }

    // Parse body
    const body = await request.json();
    const validation = bulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid bulk update request',
        validation.error.errors,
        requestId
      );
    }

    const { operations, dryRun } = validation.data;

    // Validate all IDs exist
    const ids = operations.map(op => op.id);
    const existingFlags = await prisma.featureFlag.findMany({
      where: { id: { in: ids } },
      select: { id: true, key: true }
    });

    const existingIds = existingFlags.map(f => f.id);
    const missingIds = ids.filter(id => !existingIds.includes(id));

    if (missingIds.length > 0) {
      return apiResponse.validationError(
        'Some feature flags not found',
        [{ 
          path: ['operations'], 
          message: `Missing IDs: ${missingIds.join(', ')}` 
        }],
        requestId
      );
    }

    // Dry run mode
    if (dryRun) {
      return apiResponse.success(
        { 
          wouldUpdate: operations.length,
          operations: operations.map(op => ({ 
            id: op.id, 
            key: existingFlags.find(f => f.id === op.id)?.key,
            changes: Object.keys(op.data)
          }))
        },
        { meta: { requestId, dryRun: true } }
      );
    }

    // Execute bulk update in transaction
    const result = await withTransaction(async (tx) => {
      const updatedFlags = [];
      
      for (const operation of operations) {
        const updated = await tx.featureFlag.update({
          where: { id: operation.id },
          data: operation.data
        });
        updatedFlags.push(updated);
      }

      return updatedFlags;
    });

    // Log bulk operation
    await logBulkOperation(
      session!.user.id,
      AuditAction.UPDATE,
      `Bulk updated ${result.length} feature flags`,
      { 
        updated: result.map(f => ({ id: f.id, key: f.key })),
        operations: operations.map(op => ({ id: op.id, changes: Object.keys(op.data) }))
      },
      clientIp!,
      request.headers.get('user-agent')
    );

    logger.info('Bulk feature flags updated', {
      requestId,
      adminId: session!.user.id,
      updated: result.length,
      duration: Date.now() - startTime
    });

    return apiResponse.success(
      { 
        updated: result,
        summary: {
          total: operations.length,
          updated: result.length
        }
      },
      { meta: { requestId } }
    );
  } catch (error) {
    logger.error('PUT admin/feature-flags/bulk failed', { requestId }, error);
    return apiResponse.internalError('Bulk update operation failed', requestId);
  }
}

/**
 * DELETE - Bulk delete feature flags
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Enhanced auth check
    const { error, session, clientIp } = await checkSuperAdminAuth(request, requestId);
    if (error) return error;

    // Extra strict rate limiting for bulk delete
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      5, // Only 5 bulk deletes per minute
      `bulk-delete:${session!.user.id}:${clientIp}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(600, requestId); // 10 min timeout
    }

    // Parse body
    const body = await request.json();
    const validation = bulkDeleteSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid bulk delete request',
        validation.error.errors,
        requestId
      );
    }

    const { ids, dryRun } = validation.data;

    // Validate all IDs exist
    const existingFlags = await prisma.featureFlag.findMany({
      where: { id: { in: ids } },
      select: { id: true, key: true, isEnabled: true }
    });

    const existingIds = existingFlags.map(f => f.id);
    const missingIds = ids.filter(id => !existingIds.includes(id));

    if (missingIds.length > 0) {
      return apiResponse.validationError(
        'Some feature flags not found',
        [{ 
          path: ['ids'], 
          message: `Missing IDs: ${missingIds.join(', ')}` 
        }],
        requestId
      );
    }

    // Check for enabled flags (safety measure)
    const enabledFlags = existingFlags.filter(f => f.isEnabled);
    if (enabledFlags.length > 0) {
      logger.warn('Attempting to delete enabled feature flags', {
        requestId,
        adminId: session!.user.id,
        enabledFlags: enabledFlags.map(f => f.key)
      });
    }

    // Dry run mode
    if (dryRun) {
      return apiResponse.success(
        { 
          wouldDelete: existingFlags.length,
          flags: existingFlags.map(f => ({ 
            id: f.id, 
            key: f.key, 
            isEnabled: f.isEnabled,
            warning: f.isEnabled ? 'This flag is currently enabled!' : undefined
          }))
        },
        { meta: { requestId, dryRun: true } }
      );
    }

    // Execute bulk delete in transaction
    const deletedFlags = await withTransaction(async (tx) => {
      // Store flags before deletion for audit log
      const flagsToDelete = await tx.featureFlag.findMany({
        where: { id: { in: existingIds } }
      });

      await tx.featureFlag.deleteMany({
        where: { id: { in: existingIds } }
      });

      return flagsToDelete;
    });

    // Log bulk operation
    await logBulkOperation(
      session!.user.id,
      AuditAction.DELETE,
      `Bulk deleted ${deletedFlags.length} feature flags`,
      { 
        deleted: deletedFlags.map(f => ({ id: f.id, key: f.key, isEnabled: f.isEnabled }))
      },
      clientIp!,
      request.headers.get('user-agent')
    );

    logger.info('Bulk feature flags deleted', {
      requestId,
      adminId: session!.user.id,
      deleted: deletedFlags.length,
      enabledDeleted: enabledFlags.length,
      duration: Date.now() - startTime
    });

    return apiResponse.success(
      { 
        deleted: deletedFlags.map(f => ({ id: f.id, key: f.key })),
        summary: {
          total: ids.length,
          deleted: deletedFlags.length,
          enabledDeleted: enabledFlags.length
        }
      },
      { meta: { requestId } }
    );
  } catch (error) {
    logger.error('DELETE admin/feature-flags/bulk failed', { requestId }, error);
    return apiResponse.internalError('Bulk delete operation failed', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';