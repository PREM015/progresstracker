// =============================================================================
// src/app/api/sync/[platformId]/route.ts
// =============================================================================
// Description: Platform-specific sync operations
// Methods: GET, POST, DELETE, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: GET: 60/min, POST: 10/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SyncService } from '@/services/syncService';
import { sseSyncService } from '@/services/sseSyncService';
import { apiRateLimiter, syncRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/[platformId]' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const syncOptionsSchema = z.object({
  force: z.boolean().default(false),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
});

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
  params: Promise<{ platformId: string }>;
}

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return addHeaders(new NextResponse(null, { status: 204 }), generateRequestId());
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { platformId } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId: session.user.id, platformId } },
      select: { syncStatus: true, lastSyncedAt: true },
    });

    if (!userPlatform) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Sync-Status', userPlatform.syncStatus);
    response.headers.set('X-Last-Synced', userPlatform.lastSyncedAt?.toISOString() || 'never');

    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Platform Sync Status
// =============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { platformId } = await context.params;

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:platform:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(
        apiResponse.unauthorized('Authentication required', requestId),
        requestId,
        rateLimitResult
      );
    }

    const userId = session.user.id;

    // Get platform connection with details
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId, platformId } },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            syncInterval: true,
            supportsAutoSync: true,
          },
        },
      },
    });

    if (!userPlatform) {
      return addHeaders(
        apiResponse.notFound('Platform connection', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Get recent sync logs
    const recentLogs = await prisma.syncLog.findMany({
      where: { userId, platformId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        duration: true,
        itemsCreated: true,
        itemsUpdated: true,
        hasError: true,
        errorMessage: true,
        triggeredBy: true,
      },
    });

    // Get entry count for this platform
    const entryCount = await prisma.trackerEntry.count({
      where: { userId, platformId },
    });

    const duration = Date.now() - startTime;

    return addHeaders(
      apiResponse.success(
        {
          platform: userPlatform.platform,
          connection: {
            username: userPlatform.username,
            profileUrl: userPlatform.profileUrl,
            isActive: userPlatform.isActive,
            isVerified: userPlatform.isVerified,
            connectionStatus: userPlatform.connectionStatus,
          },
          sync: {
            status: userPlatform.syncStatus,
            autoSync: userPlatform.autoSync,
            lastSyncedAt: userPlatform.lastSyncedAt,
            lastSyncError: userPlatform.lastSyncError,
            lastSyncDuration: userPlatform.lastSyncDuration,
            nextSyncAt: userPlatform.nextSyncAt,
            consecutiveFailures: userPlatform.consecutiveFailures,
            syncAttempts: userPlatform.syncAttempts,
          },
          stats: {
            entryCount,
            cachedStats: userPlatform.cachedStats,
            statsUpdatedAt: userPlatform.statsUpdatedAt,
          },
          recentLogs,
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('GET platform sync failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get platform sync status', requestId), requestId);
  }
}

// =============================================================================
// POST - Trigger Platform Sync
// =============================================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { platformId } = await context.params;

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(syncRateLimiter, 10, `sync:platform:post:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(300, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(
        apiResponse.unauthorized('Authentication required', requestId),
        requestId,
        rateLimitResult
      );
    }

    const userId = session.user.id;

    // Parse options
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validation = syncOptionsSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { force } = validation.data;

    // Verify platform connection
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId, platformId } },
      include: { platform: { select: { name: true, slug: true } } },
    });

    if (!userPlatform) {
      return addHeaders(
        apiResponse.notFound('Platform connection', requestId),
        requestId,
        rateLimitResult
      );
    }

    if (!userPlatform.isActive) {
      return addHeaders(
        apiResponse.error(
          { message: 'Platform connection is inactive', statusCode: 400, code: 'INACTIVE' },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Check for running sync
    if (userPlatform.syncStatus === SyncStatus.IN_PROGRESS && !force) {
      return addHeaders(
        apiResponse.error(
          { message: 'Sync already in progress', statusCode: 409, code: 'SYNC_IN_PROGRESS' },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    log.info('Starting platform sync', { userId, platformId, force, requestId });

    // Send SSE notification
    sseSyncService.sendSyncStarted(userId, requestId, platformId, userPlatform.platform.name);

    // Execute sync
    const result = await SyncService.syncPlatform(userId, platformId, {
      triggeredBy: 'manual',
    });

    if ('queued' in result) {
      const duration = Date.now() - startTime;
      return addHeaders(
        apiResponse.success(
          {
            queued: true,
            jobId: result.jobId,
            platform: {
              id: platformId,
              name: userPlatform.platform.name,
              slug: userPlatform.platform.slug,
            },
          },
          { meta: { requestId, duration } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Send completion notification
    sseSyncService.sendSyncCompleted(userId, {
      syncId: requestId,
      platformId,
      platformName: userPlatform.platform.name,
      status: result.success ? 'success' : 'failed',
      itemsCreated: result.entriesAdded,
      itemsUpdated: result.entriesUpdated,
      itemsSkipped: result.entriesSkipped,
      itemsFailed: 0,
      duration: result.duration,
      message: result.error,
      completedAt: new Date().toISOString(),
    });

    const duration = Date.now() - startTime;
    log.info('Platform sync completed', { userId, platformId, success: result.success, duration });

    return addHeaders(
      apiResponse.success(
        {
          success: result.success,
          platform: {
            id: platformId,
            name: userPlatform.platform.name,
            slug: userPlatform.platform.slug,
          },
          result: {
            status: result.status,
            entriesAdded: result.entriesAdded,
            entriesUpdated: result.entriesUpdated,
            entriesSkipped: result.entriesSkipped,
            duration: result.duration,
            error: result.error,
          },
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('POST platform sync failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to sync platform', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Disconnect Platform
// =============================================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { platformId } = await context.params;

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 10, `sync:platform:delete:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(
        apiResponse.unauthorized('Authentication required', requestId),
        requestId,
        rateLimitResult
      );
    }

    const userId = session.user.id;

    // Verify platform exists
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId, platformId } },
      include: { platform: { select: { name: true } } },
    });

    if (!userPlatform) {
      return addHeaders(
        apiResponse.notFound('Platform connection', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Cancel any running syncs
    await SyncService.cancelSync(userId, platformId);

    // Deactivate the connection (soft delete)
    await prisma.userPlatform.update({
      where: { userId_platformId: { userId, platformId } },
      data: {
        isActive: false,
        autoSync: false,
        connectionStatus: 'disconnected',
      },
    });

    // Send SSE notification
    sseSyncService.sendPlatformDisconnected(userId, platformId, userPlatform.platform.name);

    const duration = Date.now() - startTime;
    log.info('Platform disconnected', { userId, platformId, duration });

    return addHeaders(
      apiResponse.success(
        {
          disconnected: true,
          platformId,
          platformName: userPlatform.platform.name,
          message: 'Platform has been disconnected',
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('DELETE platform failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to disconnect platform', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;