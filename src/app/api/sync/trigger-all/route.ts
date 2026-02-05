// =============================================================================
// src/app/api/sync/trigger-all/route.ts
// =============================================================================
// Description: Trigger sync for all connected platforms
// Methods: POST, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: 5/hour
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SyncService } from '@/services/syncService';
import { SyncOrchestrator } from '@/services/sync/syncOrchestrator';
import { sseSyncService } from '@/services/sseSyncService';
import { syncRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/trigger-all' });

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

const triggerAllSchema = z.object({
  force: z.boolean().default(false),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  categories: z.array(z.string()).optional(),
  excludePlatforms: z.array(z.string().cuid()).optional(),
  sequential: z.boolean().default(false), // If true, sync one at a time
});

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

    const [connectedPlatforms, activeSyncs] = await Promise.all([
      prisma.userPlatform.count({
        where: { userId: session.user.id, isActive: true },
      }),
      prisma.syncLog.count({
        where: {
          userId: session.user.id,
          status: { in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS] },
        },
      }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Connected-Platforms', String(connectedPlatforms));
    response.headers.set('X-Active-Syncs', String(activeSyncs));
    response.headers.set('X-Can-Sync', String(activeSyncs === 0));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Trigger All Platform Syncs
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Strict rate limiting - 5 per hour
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(syncRateLimiter, 5, `sync:trigger-all:${ip}`);
    
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(3600, requestId), requestId, rateLimitResult);
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
      body = {};
    }

    const validation = triggerAllSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { force, priority, categories, excludePlatforms, sequential } = validation.data;

    // Check for active syncs
    const activeSyncs = await prisma.syncLog.count({
      where: {
        userId,
        status: { in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS] },
      },
    });

    if (activeSyncs > 0 && !force) {
      return addHeaders(
        apiResponse.error(
          {
            message: `${activeSyncs} sync(s) already in progress. Use force=true to override.`,
            statusCode: 409,
            code: 'SYNC_IN_PROGRESS',
          },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Get platforms to sync
    const platformsWhere: Record<string, unknown> = {
      userId,
      isActive: true,
    };

    if (categories && categories.length > 0) {
      platformsWhere.platform = { category: { in: categories } };
    }

    if (excludePlatforms && excludePlatforms.length > 0) {
      platformsWhere.platformId = { notIn: excludePlatforms };
    }

    const platformsToSync = await prisma.userPlatform.findMany({
      where: platformsWhere,
      select: { platformId: true },
    });

    if (platformsToSync.length === 0) {
      return addHeaders(
        apiResponse.success(
          {
            message: 'No platforms to sync',
            platformCount: 0,
            results: [],
          },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    const platformIds = platformsToSync.map(p => p.platformId);

    log.info('Triggering sync for all platforms', {
      userId,
      requestId,
      platformCount: platformIds.length,
      force,
      priority,
    });

    // Use queue-based sync for better performance
    if (!sequential) {
      const queueResult = await SyncOrchestrator.syncAllPlatforms(userId);

      // Send SSE notification for queued syncs
      sseSyncService.sendSyncQueued(
        userId,
        `batch-${requestId}`,
        'all',
        'All Platforms',
        queueResult.queued
      );

      const duration = Date.now() - startTime;

      return addHeaders(
        apiResponse.success(
          {
            mode: 'queued',
            jobId: `batch-${requestId}`,
            platformCount: queueResult.total,
            queuedCount: queueResult.queued,
            failedCount: queueResult.failed,
            message: `Queued ${queueResult.queued} platforms for sync`,
          },
          { meta: { requestId, duration } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Sequential sync - process one at a time
    const result = await SyncService.syncAllPlatforms(userId, {
      platformIds,
      force,
      priority,
      triggeredBy: 'manual',
    });

    // Send SSE notifications for each result
    for (const platformResult of result.results) {
      if (platformResult.success) {
        sseSyncService.sendSyncCompleted(userId, {
          syncId: result.jobId,
          platformId: platformResult.platformId,
          platformName: platformResult.platformName,
          status: 'success',
          itemsCreated: platformResult.entriesAdded,
          itemsUpdated: platformResult.entriesUpdated,
          itemsSkipped: platformResult.entriesSkipped,
          itemsFailed: 0,
          duration: platformResult.duration,
          completedAt: new Date().toISOString(),
        });
      } else {
        sseSyncService.sendSyncCompleted(userId, {
          syncId: result.jobId,
          platformId: platformResult.platformId,
          platformName: platformResult.platformName,
          status: 'failed',
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsSkipped: 0,
          itemsFailed: 0,
          duration: platformResult.duration,
          message: platformResult.error,
          completedAt: new Date().toISOString(),
        });
      }
    }

    const duration = Date.now() - startTime;
    log.info('All platforms sync completed', {
      userId,
      requestId,
      jobId: result.jobId,
      successCount: result.successCount,
      failCount: result.failCount,
      duration,
    });

    const response = apiResponse.success(
      {
        mode: 'sequential',
        jobId: result.jobId,
        platformCount: result.platformCount,
        successCount: result.successCount,
        failCount: result.failCount,
        skippedCount: result.skippedCount,
        duration: result.duration,
        results: result.results.map(r => ({
          platformId: r.platformId,
          platformName: r.platformName,
          success: r.success,
          status: r.status,
          entriesAdded: r.entriesAdded,
          entriesUpdated: r.entriesUpdated,
          error: r.error,
        })),
      },
      { meta: { requestId, duration } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('POST trigger-all failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to trigger sync', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes