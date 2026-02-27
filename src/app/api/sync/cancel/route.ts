/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// src/app/api/sync/cancel/route.ts
// =============================================================================
// Description: Cancel pending/running syncs
// Methods: POST, HEAD, OPTIONS
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

const log = logger.child({ route: 'api/sync/cancel' });

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

const cancelSchema = z.object({
  platformId: z.string().cuid().optional(),
  syncLogIds: z.array(z.string().cuid()).optional(),
  cancelAll: z.boolean().default(false),
  reason: z.string().max(500).optional(),
}).refine(
  data => data.platformId || data.syncLogIds || data.cancelAll,
  { message: 'Must specify platformId, syncLogIds, or cancelAll' }
);

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

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const cancellableCount = await prisma.syncLog.count({
      where: {
        userId: session.user.id,
        status: { in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS] },
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Cancellable-Count', String(cancellableCount));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Cancel Syncs
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, `sync:cancel:${ip}`);
    
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
    let body: unknown;
    
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = cancelSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { platformId, syncLogIds, cancelAll, reason } = validation.data;
    const cancelReason = reason || 'Cancelled by user';
    const results: Array<{ id: string; cancelled: boolean; platformName?: string; error?: string }> = [];

    if (cancelAll) {
      // Cancel all active syncs for user
      await SyncService.cancelSync(userId);
      
      const cancelled = await prisma.syncLog.findMany({
        where: {
          userId,
          status: SyncStatus.CANCELLED,
          completedAt: { gte: new Date(Date.now() - 5000) }, // Just cancelled
        },
        include: { platform: { select: { name: true } } },
      });

      for (const sync of cancelled) {
        results.push({
          id: sync.id,
          cancelled: true,
          platformName: sync.platform?.name,
        });

        // Send SSE notification
        if (sync.platformId) {
          sseSyncService.sendSyncCancelled(
            userId,
            sync.id,
            sync.platformId,
            sync.platform?.name || 'Unknown',
            cancelReason
          );
        }
      }
    } else if (platformId) {
      // Cancel syncs for specific platform
      await SyncService.cancelSync(userId, platformId);
      
      const platform = await prisma.platform.findUnique({
        where: { id: platformId },
        select: { name: true },
      });

      results.push({
        id: platformId,
        cancelled: true,
        platformName: platform?.name,
      });

      sseSyncService.sendSyncCancelled(
        userId,
        'platform-' + platformId,
        platformId,
        platform?.name || 'Unknown',
        cancelReason
      );
    } else if (syncLogIds && syncLogIds.length > 0) {
      // Cancel specific sync logs
      for (const syncLogId of syncLogIds) {
        try {
          const syncLog = await prisma.syncLog.findFirst({
            where: {
              id: syncLogId,
              userId,
              status: { in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS] },
            },
            include: { platform: { select: { name: true, id: true } } },
          });

          if (!syncLog) {
            results.push({ id: syncLogId, cancelled: false, error: 'Sync not found or not cancellable' });
            continue;
          }

          await SyncQueue.cancel(syncLogId, cancelReason);
          
          results.push({
            id: syncLogId,
            cancelled: true,
            platformName: syncLog.platform?.name,
          });

          if (syncLog.platformId) {
            sseSyncService.sendSyncCancelled(
              userId,
              syncLogId,
              syncLog.platformId,
              syncLog.platform?.name || 'Unknown',
              cancelReason
            );
          }
        } catch (error) {
          results.push({
            id: syncLogId,
            cancelled: false,
            error: error instanceof Error ? error.message : 'Cancel failed',
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    log.info('Syncs cancelled', { userId, requestId, cancelledCount: results.filter(r => r.cancelled).length, duration });

    const response = apiResponse.success(
      {
        cancelled: results.filter(r => r.cancelled).length,
        failed: results.filter(r => !r.cancelled).length,
        results,
        message: `Cancelled ${results.filter(r => r.cancelled).length} sync(s)`,
      },
      { meta: { requestId, duration } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('POST cancel failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to cancel syncs', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';