// =============================================================================
// src/app/api/sync/[platformId]/cancel/route.ts
// =============================================================================
// Description: Cancel ongoing sync for specific platform
// Methods: POST, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: 30/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

import { SyncQueue } from '@/services/sync/syncQueue';
import { sseSyncService } from '@/services/sseSyncService';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/[platformId]/cancel' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, HEAD, OPTIONS',
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

const cancelOptionsSchema = z.object({
  reason: z.string().max(500).optional(),
  includePending: z.boolean().default(true),
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

    const activeSyncs = await prisma.syncLog.count({
      where: {
        userId: session.user.id,
        platformId,
        status: { in: [SyncStatus.IN_PROGRESS, SyncStatus.PENDING] },
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Active-Syncs', String(activeSyncs));
    response.headers.set('X-Can-Cancel', String(activeSyncs > 0));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Cancel Platform Sync
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
    const rateLimitResult = await checkLimit(apiRateLimiter, 30, `sync:platform:cancel:${ip}`);
    
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

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validation = cancelOptionsSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { reason, includePending } = validation.data;
    const cancelReason = reason || 'Cancelled by user';

    // Verify platform connection
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

    // Get active sync logs
    const statuses = includePending 
      ? [SyncStatus.IN_PROGRESS, SyncStatus.PENDING]
      : [SyncStatus.IN_PROGRESS];

    const activeSyncLogs = await prisma.syncLog.findMany({
      where: {
        userId,
        platformId,
        status: { in: statuses },
      },
      select: { id: true, status: true },
    });

    if (activeSyncLogs.length === 0) {
      return addHeaders(
        apiResponse.success(
          {
            cancelled: 0,
            message: 'No active syncs to cancel',
            platform: {
              id: platformId,
              name: userPlatform.platform.name,
            },
          },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    log.info('Cancelling platform syncs', {
      userId,
      platformId,
      syncCount: activeSyncLogs.length,
      requestId,
    });

    // Cancel each sync log
    let cancelledCount = 0;
    for (const syncLog of activeSyncLogs) {
      try {
        await SyncQueue.cancel(syncLog.id, cancelReason);
        cancelledCount++;
      } catch (error) {
        log.error('Failed to cancel sync log', { syncLogId: syncLog.id }, error);
      }
    }

    // Also update user platform status
    await prisma.userPlatform.update({
      where: { userId_platformId: { userId, platformId } },
      data: {
        syncStatus: SyncStatus.IDLE,
      },
    });

    // Send SSE notification
    sseSyncService.sendSyncCancelled(
      userId,
      `platform-${platformId}`,
      platformId,
      userPlatform.platform.name,
      cancelReason
    );

    const duration = Date.now() - startTime;
    log.info('Platform syncs cancelled', {
      userId,
      platformId,
      cancelled: cancelledCount,
      total: activeSyncLogs.length,
      duration,
    });

    return addHeaders(
      apiResponse.success(
        {
          cancelled: cancelledCount,
          total: activeSyncLogs.length,
          platform: {
            id: platformId,
            name: userPlatform.platform.name,
          },
          message: `Cancelled ${cancelledCount} sync(s)`,
          reason: cancelReason,
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('POST platform cancel failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to cancel sync', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';