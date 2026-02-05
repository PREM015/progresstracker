// src/app/api/platforms/[id]/sync/route.ts
/**
 * Platform Sync API
 * 
 * Manages synchronization for a specific platform connection.
 * Supports triggering sync, checking status, and cancelling operations.
 * 
 * @route GET    /api/platforms/[id]/sync - Get sync status and history
 * @route POST   /api/platforms/[id]/sync - Trigger platform sync
 * @route DELETE /api/platforms/[id]/sync - Cancel running sync
 * @route HEAD   /api/platforms/[id]/sync - Quick sync status check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '@/lib/apiError';
import SyncService from '@/services/syncService';
import { auditLogService } from '@/services/auditLogService';
import { AuditAction, SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMITS = {
  GET: 60,    // 60 per minute
  POST: 5,    // 5 per hour per platform
  DELETE: 10, // 10 per hour
} as const;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const SyncOptionsSchema = z.object({
  force: z.boolean().default(false),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  waitForCompletion: z.boolean().default(false),
});

const SyncHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(SyncStatus).optional(),
  hasError: z.coerce.boolean().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
    syncStatus?: string;
  }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('X-Request-ID', requestId);

  if (options?.syncStatus) {
    response.headers.set('X-Sync-Status', options.syncStatus);
  }

  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  return response;
}

/**
 * Check sync cooldown
 */
async function checkSyncCooldown(
  userId: string,
  platformId: string,
  force: boolean
): Promise<{ allowed: boolean; waitSeconds?: number; reason?: string }> {
  if (force) {
    return { allowed: true };
  }

  const lastSync = await prisma.syncLog.findFirst({
    where: {
      userId,
      platformId,
      status: SyncStatus.SUCCESS,
    },
    orderBy: { completedAt: 'desc' },
    select: { completedAt: true },
  });

  if (!lastSync?.completedAt) {
    return { allowed: true };
  }

  const minInterval = 15 * 60 * 1000; // 15 minutes
  const elapsed = Date.now() - lastSync.completedAt.getTime();

  if (elapsed < minInterval) {
    const waitSeconds = Math.ceil((minInterval - elapsed) / 1000);
    return {
      allowed: false,
      waitSeconds,
      reason: `Please wait ${Math.ceil(waitSeconds / 60)} minutes before syncing again`,
    };
  }

  return { allowed: true };
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const { id: platformId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId: session.user.id,
          platformId,
        },
      },
      select: {
        syncStatus: true,
        lastSyncedAt: true,
        nextSyncAt: true,
      },
    });

    if (!connection) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Sync-Status', connection.syncStatus);
    response.headers.set('X-Is-Syncing', String(connection.syncStatus === 'IN_PROGRESS'));
    
    if (connection.lastSyncedAt) {
      response.headers.set('X-Last-Synced', connection.lastSyncedAt.toISOString());
    }
    
    if (connection.nextSyncAt) {
      response.headers.set('X-Next-Sync', connection.nextSyncAt.toISOString());
    }

    return addHeaders(response, requestId, { syncStatus: connection.syncStatus });
  } catch (error) {
    logger.error('HEAD /api/platforms/[id]/sync failed', { requestId, platformId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:sync:get:${userId}:${platformId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.GET, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = SyncHistoryQuerySchema.safeParse({
      limit: searchParams.get('limit') || undefined,
      status: searchParams.get('status') || undefined,
      hasError: searchParams.get('hasError') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Invalid query parameters',
          queryValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        { rateLimitResult }
      );
    }

    const query = queryValidation.data;

    // Get connection
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: {
            name: true,
            slug: true,
            supportsAutoSync: true,
            syncInterval: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    // Build history query
    const historyWhere: Record<string, unknown> = {
      userId,
      platformId,
    };

    if (query.status) {
      historyWhere.status = query.status;
    }

    if (query.hasError !== undefined) {
      historyWhere.hasError = query.hasError;
    }

    // Get sync history
    const [history, totalSyncs, successfulSyncs, avgDuration] = await Promise.all([
      prisma.syncLog.findMany({
        where: historyWhere,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          duration: true,
          itemsFound: true,
          itemsCreated: true,
          itemsUpdated: true,
          itemsSkipped: true,
          itemsFailed: true,
          hasError: true,
          errorCode: true,
          errorMessage: true,
          triggeredBy: true,
          createdAt: true,
        },
      }),
      prisma.syncLog.count({ where: { userId, platformId } }),
      prisma.syncLog.count({
        where: { userId, platformId, status: SyncStatus.SUCCESS },
      }),
      prisma.syncLog.aggregate({
        where: { userId, platformId, duration: { not: null } },
        _avg: { duration: true },
      }),
    ]);

    const successRate = totalSyncs > 0
      ? Math.round((successfulSyncs / totalSyncs) * 100 * 100) / 100
      : 100;

    logger.info('Sync status fetched', {
      requestId,
      userId,
      platformId,
      syncStatus: connection.syncStatus,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          platform: {
            id: platformId,
            name: connection.platform.name,
            slug: connection.platform.slug,
            supportsAutoSync: connection.platform.supportsAutoSync,
            syncInterval: connection.platform.syncInterval,
          },
          currentStatus: {
            status: connection.syncStatus,
            isActive: connection.isActive,
            lastSyncedAt: connection.lastSyncedAt,
            lastSyncError: connection.lastSyncError,
            lastSyncDuration: connection.lastSyncDuration,
            nextSyncAt: connection.nextSyncAt,
            consecutiveFailures: connection.consecutiveFailures,
            autoSync: connection.autoSync,
          },
          statistics: {
            totalSyncs,
            successfulSyncs,
            failedSyncs: totalSyncs - successfulSyncs,
            successRate,
            avgDuration: avgDuration._avg.duration
              ? Math.round(avgDuration._avg.duration)
              : null,
          },
          history,
        },
        {
          meta: {
            requestId,
            duration: Date.now() - startTime,
          },
        }
      ),
      requestId,
      { rateLimitResult, syncStatus: connection.syncStatus }
    );
  } catch (error) {
    logger.error('GET /api/platforms/[id]/sync failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting (strict - 5 per hour per platform)
    const rateLimitKey = `platforms:sync:post:${userId}:${platformId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.POST, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(3600, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse options
    let options = { force: false, priority: 'normal' as const, waitForCompletion: false };
    try {
      const body = await request.json();
      const validation = SyncOptionsSchema.safeParse(body);
      if (validation.success) {
        options = validation.data;
      }
    } catch {
      // Use defaults
    }

    // Get connection
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: {
            name: true,
            slug: true,
            supportsAutoSync: true,
            isActive: true,
            maintenanceMode: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    if (!connection.platform.isActive) {
      throw new ForbiddenError('Platform is currently unavailable');
    }

    if (connection.platform.maintenanceMode) {
      throw new ForbiddenError('Platform is under maintenance');
    }

    if (!connection.platform.supportsAutoSync) {
      throw new ValidationError(`${connection.platform.name} does not support auto-sync`);
    }

    if (!connection.isActive) {
      throw new ValidationError('Platform connection is inactive');
    }

    // Check if already syncing
    if (connection.syncStatus === SyncStatus.IN_PROGRESS) {
      return addHeaders(
        apiResponse.success(
          {
            status: 'already_syncing',
            message: 'Sync already in progress',
            syncStatus: connection.syncStatus,
            lastSyncedAt: connection.lastSyncedAt,
          },
          { meta: { requestId } }
        ),
        requestId,
        { rateLimitResult, syncStatus: connection.syncStatus }
      );
    }

    // Check cooldown
    const cooldownCheck = await checkSyncCooldown(userId, platformId, options.force);
    if (!cooldownCheck.allowed) {
      throw new ConflictError(cooldownCheck.reason!);
    }

    // Trigger sync
    let result;
    if (options.waitForCompletion) {
      result = await SyncService.syncPlatform(userId, platformId, {
        triggeredBy: 'manual',
      });
    } else {
      // Start sync in background
      SyncService.syncPlatform(userId, platformId, {
        triggeredBy: 'manual',
      }).catch(err => {
        logger.error('Background sync failed', { userId, platformId }, err);
      });

      result = {
        status: 'started',
        message: 'Sync started in background',
      };
    }

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.SYNC_TRIGGER,
      category: 'platform',
      entityType: 'user_platform',
      entityId: connection.id,
      description: `Triggered sync for ${connection.platform.name}`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
    });

    logger.info('Platform sync triggered', {
      requestId,
      userId,
      platformId,
      platformSlug: connection.platform.slug,
      force: options.force,
      waitForCompletion: options.waitForCompletion,
      duration: Date.now() - startTime,
    });

    const statusCode = options.waitForCompletion ? 200 : 202;

    return addHeaders(
      apiResponse.success(result, {
        status: statusCode,
        meta: {
          requestId,
          message: options.waitForCompletion
            ? `Sync completed for ${connection.platform.name}`
            : `Sync started for ${connection.platform.name}`,
        },
      }),
      requestId,
      { rateLimitResult, syncStatus: 'IN_PROGRESS' }
    );
  } catch (error) {
    logger.error('POST /api/platforms/[id]/sync failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting
    const rateLimitKey = `platforms:sync:delete:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.DELETE, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(3600, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Get connection
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: { name: true, slug: true },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    if (connection.syncStatus !== SyncStatus.IN_PROGRESS) {
      return addHeaders(
        apiResponse.success(
          {
            cancelled: false,
            message: 'No sync in progress to cancel',
            syncStatus: connection.syncStatus,
          },
          { meta: { requestId } }
        ),
        requestId,
        { rateLimitResult }
      );
    }

    // Cancel sync
    await SyncService.cancelSync(userId, platformId);

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.UPDATE,
      category: 'platform',
      entityType: 'sync',
      entityId: connection.id,
      description: `Cancelled sync for ${connection.platform.name}`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
    });

    logger.info('Platform sync cancelled', {
      requestId,
      userId,
      platformId,
      platformSlug: connection.platform.slug,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          cancelled: true,
          platform: {
            id: platformId,
            name: connection.platform.name,
          },
          message: 'Sync cancelled successfully',
        },
        { meta: { requestId } }
      ),
      requestId,
      { rateLimitResult, syncStatus: 'CANCELLED' }
    );
  } catch (error) {
    logger.error('DELETE /api/platforms/[id]/sync failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';