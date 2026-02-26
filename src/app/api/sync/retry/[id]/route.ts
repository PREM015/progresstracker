// =============================================================================
// src/app/api/sync/retry/[id]/route.ts
// =============================================================================
// Description: Retry a failed sync
// Methods: POST, GET, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: 20/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SyncService } from '@/services/syncService';
import { SyncQueue } from '@/services/sync/syncQueue';
import { sseSyncService } from '@/services/sseSyncService';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/retry/[id]' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
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

const retryOptionsSchema = z.object({
  force: z.boolean().default(false),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  immediate: z.boolean().default(true),
});

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
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
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const syncLog = await prisma.syncLog.findFirst({
      where: { id, userId: session.user.id },
      select: { status: true, attemptNumber: true, maxAttempts: true },
    });

    if (!syncLog) {
      return new NextResponse(null, { status: 404 });
    }

    const canRetry = syncLog.status === SyncStatus.FAILED &&
      syncLog.attemptNumber < syncLog.maxAttempts;

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Can-Retry', String(canRetry));
    response.headers.set('X-Attempt-Number', String(syncLog.attemptNumber));
    response.headers.set('X-Max-Attempts', String(syncLog.maxAttempts));

    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Retry Info
// =============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:retry:${ip}`);

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

    const syncLog = await prisma.syncLog.findFirst({
      where: { id, userId: session.user.id },
      include: {
        platform: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
    });

    if (!syncLog) {
      return addHeaders(
        apiResponse.notFound('Sync log', requestId),
        requestId,
        rateLimitResult
      );
    }

    const canRetry = syncLog.status === SyncStatus.FAILED &&
      syncLog.attemptNumber < syncLog.maxAttempts;

    const duration = Date.now() - startTime;

    return addHeaders(
      apiResponse.success(
        {
          id: syncLog.id,
          platform: syncLog.platform,
          status: syncLog.status,
          attemptNumber: syncLog.attemptNumber,
          maxAttempts: syncLog.maxAttempts,
          canRetry,
          error: {
            code: syncLog.errorCode,
            message: syncLog.errorMessage,
          },
          timing: {
            startedAt: syncLog.startedAt,
            completedAt: syncLog.completedAt,
            duration: syncLog.duration,
            nextRetryAt: syncLog.nextRetryAt,
          },
          items: {
            found: syncLog.itemsFound,
            created: syncLog.itemsCreated,
            updated: syncLog.itemsUpdated,
            failed: syncLog.itemsFailed,
          },
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('GET retry info failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get retry info', requestId), requestId);
  }
}

// =============================================================================
// POST - Retry Failed Sync
// =============================================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, `sync:retry:post:${ip}`);

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

    const validation = retryOptionsSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { force, immediate } = validation.data;

    // Get the failed sync log
    const syncLog = await prisma.syncLog.findFirst({
      where: { id, userId },
      include: {
        platform: {
          select: { id: true, name: true, slug: true },
        },
        userPlatform: {
          select: { id: true },
        },
      },
    });

    if (!syncLog) {
      return addHeaders(
        apiResponse.notFound('Sync log', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check if can retry
    if (syncLog.status !== SyncStatus.FAILED && !force) {
      return addHeaders(
        apiResponse.error(
          {
            message: 'Only failed syncs can be retried',
            statusCode: 400,
            code: 'NOT_FAILED',
          },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    if (syncLog.attemptNumber >= syncLog.maxAttempts && !force) {
      return addHeaders(
        apiResponse.error(
          {
            message: `Maximum retry attempts (${syncLog.maxAttempts}) exceeded. Use force=true to override.`,
            statusCode: 400,
            code: 'MAX_RETRIES_EXCEEDED',
          },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    if (!syncLog.platformId || !syncLog.userPlatform) {
      return addHeaders(
        apiResponse.error(
          { message: 'Platform information not found', statusCode: 400, code: 'MISSING_PLATFORM' },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    log.info('Retrying failed sync', { userId, syncLogId: id, platformId: syncLog.platformId });

    if (immediate) {
      // Execute sync immediately
      const result = await SyncService.syncPlatform(userId, syncLog.platformId, {
        triggeredBy: 'manual',
      });

      if ('queued' in result) {
        return addHeaders(
          apiResponse.success(
            {
              retried: true,
              queued: true,
              newSyncLogId: null,
              platform: { id: syncLog.platformId, name: syncLog.platform?.name },
              message: 'Retry queued successfully'
            },
            { meta: { requestId, duration: Date.now() - startTime } }
          ),
          requestId,
          rateLimitResult
        );
      }

      // Send SSE notification
      sseSyncService.sendSyncCompleted(userId, {
        syncId: id,
        platformId: syncLog.platformId,
        platformName: syncLog.platform?.name || 'Unknown',
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

      return addHeaders(
        apiResponse.success(
          {
            retried: true,
            success: result.success,
            newSyncLogId: null, // Same sync log updated
            platform: {
              id: syncLog.platformId,
              name: syncLog.platform?.name,
            },
            result: {
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
    } else {
      // Queue the retry
      const newSyncLogId = await SyncQueue.enqueue({
        userId,
        platformId: syncLog.platformId,
        userPlatformId: syncLog.userPlatform.id,
        triggeredBy: 'manual',
        triggerSource: 'retry',
      });

      // Send SSE notification
      sseSyncService.sendSyncQueued(
        userId,
        newSyncLogId,
        syncLog.platformId,
        syncLog.platform?.name || 'Unknown'
      );

      const duration = Date.now() - startTime;

      return addHeaders(
        apiResponse.success(
          {
            retried: true,
            queued: true,
            newSyncLogId,
            platform: {
              id: syncLog.platformId,
              name: syncLog.platform?.name,
            },
            message: 'Sync has been queued for retry',
          },
          { meta: { requestId, duration } }
        ),
        requestId,
        rateLimitResult
      );
    }
  } catch (error) {
    log.error('POST retry failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to retry sync', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;