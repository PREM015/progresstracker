// =============================================================================
// src/app/api/sync/[platformId]/force/route.ts
// =============================================================================
// Description: Force sync for a specific platform (bypass checks)
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

import { sseSyncService } from '@/services/sseSyncService';
import { syncRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { nanoid } from 'nanoid';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/[platformId]/force' });

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

const forceOptionsSchema = z.object({
  clearCache: z.boolean().default(true),
  resetFailureCount: z.boolean().default(true),
  ignoreRateLimit: z.boolean().default(false),
  fullSync: z.boolean().default(true), // Fetch all data, not incremental
  notifyOnComplete: z.boolean().default(true),
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
  return `force_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
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
      select: { consecutiveFailures: true, syncStatus: true },
    });

    if (!userPlatform) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Failure-Count', String(userPlatform.consecutiveFailures));
    response.headers.set('X-Current-Status', userPlatform.syncStatus);
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Force Platform Sync
// =============================================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { platformId } = await context.params;

    // Very strict rate limit for force sync
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(syncRateLimiter, 5, `sync:force:${ip}`);
    
    if (!rateLimitResult.success) {
      log.warn('Force sync rate limit exceeded', { ip, requestId });
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

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validation = forceOptionsSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { clearCache, resetFailureCount, fullSync, notifyOnComplete } = validation.data;

    // Get platform connection
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId, platformId } },
      include: { 
        platform: { 
          select: { name: true, slug: true, icon: true } 
        } 
      },
    });

    if (!userPlatform) {
      return addHeaders(
        apiResponse.notFound('Platform connection', requestId),
        requestId,
        rateLimitResult
      );
    }

    log.info('Force sync initiated', {
      userId,
      platformId,
      platformName: userPlatform.platform.name,
      clearCache,
      resetFailureCount,
      fullSync,
      requestId,
    });

    // Cancel any existing syncs
    await SyncService.cancelSync(userId, platformId);

    // Reset failure count if requested
    if (resetFailureCount) {
      await prisma.userPlatform.update({
        where: { userId_platformId: { userId, platformId } },
        data: { 
          consecutiveFailures: 0,
          lastSyncError: null,
        },
      });
    }

    // Clear cached stats if requested
    if (clearCache) {
      await prisma.userPlatform.update({
        where: { userId_platformId: { userId, platformId } },
        data: { 
          cachedStats: undefined,
          statsUpdatedAt: null,
        },
      });

      // Also delete recent entries if full sync
      if (fullSync) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await prisma.trackerEntry.deleteMany({
          where: {
            userId,
            platformId,
            date: { gte: sevenDaysAgo },
            source: 'sync',
          },
        });
      }
    }

    // Generate unique sync ID
    const syncId = `force_${nanoid()}`;

    // Send SSE start notification
    if (notifyOnComplete) {
      sseSyncService.sendSyncStarted(userId, syncId, platformId, userPlatform.platform.name);
    }

    // Execute force sync with high priority
    const result = await SyncService.syncPlatform(userId, platformId, {
      triggeredBy: 'manual',
     
 
    });

    // Send completion notification
    if (notifyOnComplete) {
      sseSyncService.sendSyncCompleted(userId, {
        syncId,
        platformId,
        platformName: userPlatform.platform.name,
        status: result.success ? 'success' : 'failed',
        itemsCreated: result.entriesAdded,
        itemsUpdated: result.entriesUpdated,
        itemsSkipped: result.entriesSkipped,
        itemsFailed: 0,
        duration: result.duration,
        message: result.error || `Force sync ${result.success ? 'completed' : 'failed'}`,
        completedAt: new Date().toISOString(),
      });
    }

    const duration = Date.now() - startTime;
    log.info('Force sync completed', {
      userId,
      platformId,
      syncId,
      success: result.success,
      duration,
    });

    return addHeaders(
      apiResponse.success(
        {
          syncId,
          success: result.success,
          platform: {
            id: platformId,
            name: userPlatform.platform.name,
            slug: userPlatform.platform.slug,
            icon: userPlatform.platform.icon,
          },
          options: {
            clearCache,
            resetFailureCount,
            fullSync,
          },
          result: {
            status: result.status,
            entriesAdded: result.entriesAdded,
            entriesUpdated: result.entriesUpdated,
            entriesSkipped: result.entriesSkipped,
            duration: result.duration,
            error: result.error,
          },
          message: result.success 
            ? `Force sync completed: ${result.entriesAdded} new, ${result.entriesUpdated} updated entries`
            : `Force sync failed: ${result.error}`,
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Force sync failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to force sync', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutes for force sync