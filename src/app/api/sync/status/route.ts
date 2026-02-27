// =============================================================================
// src/app/api/sync/status/route.ts
// =============================================================================
// Description: Detailed sync status with real-time info
// Methods: GET, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: 120/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SyncService } from '@/services/syncService';
import { SyncQueue } from '@/services/sync/syncQueue';
import { SyncScheduler } from '@/services/sync/syncScheduler';
import { sseConnectionManager } from '@/services/sseConnectionManager';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

const log = logger.child({ route: 'api/sync/status' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, max-age=0',
};

const querySchema = z.object({
  realtime: z.coerce.boolean().default(false),
  includeHistory: z.coerce.boolean().default(false),
  historyLimit: z.coerce.number().min(1).max(50).default(10),
});

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

    const activeSyncs = await prisma.syncLog.count({
      where: {
        userId: session.user.id,
        status: { in: [SyncStatus.IN_PROGRESS, SyncStatus.PENDING] },
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Active-Syncs', String(activeSyncs));
    response.headers.set('X-Has-SSE-Connection', String(sseConnectionManager.hasUserConnections(session.user.id)));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Detailed Sync Status
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 120, `sync:status:${ip}`);
    
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

    // Parse query
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      realtime: searchParams.get('realtime'),
      includeHistory: searchParams.get('includeHistory'),
      historyLimit: searchParams.get('historyLimit'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { realtime, includeHistory, historyLimit } = queryValidation.data;

    // Get comprehensive sync status
    const [syncStatus, queueStats, schedulerStats] = await Promise.all([
      SyncService.getSyncStatus(userId),
      SyncQueue.getStats(),
      SyncScheduler.getStats(),
    ]);

    // Get active jobs for this user
    const userJobs = await SyncQueue.getUserJobs(userId);

    // Get user's scheduled syncs
    const userSchedules = await SyncScheduler.getUserSchedules(userId);

    // Build response
    const responseData: Record<string, unknown> = {
      // Current status
      current: {
        isRunning: syncStatus.isRunning,
        activeSyncs: syncStatus.activeSyncs,
        lastSync: syncStatus.lastSync,
      },
      
      // Health metrics
      health: {
        ...syncStatus.health,
        status: syncStatus.health.percentage >= 80 
          ? 'healthy' 
          : syncStatus.health.percentage >= 50 
          ? 'degraded' 
          : 'critical',
      },
      
      // Platform statuses
      platforms: syncStatus.platforms,
      
      // Queue info
      queue: {
        global: queueStats,
        user: {
          pending: userJobs.filter(j => j.status === SyncStatus.PENDING).length,
          inProgress: userJobs.filter(j => j.status === SyncStatus.IN_PROGRESS).length,
          jobs: userJobs.slice(0, 5),
        },
      },
      
      // Schedule info
      schedule: {
        global: schedulerStats,
        user: {
          scheduledPlatforms: userSchedules.filter(s => s.isActive).length,
          nextSync: userSchedules
            .filter(s => s.isActive)
            .sort((a, b) => a.nextSyncAt.getTime() - b.nextSyncAt.getTime())[0]?.nextSyncAt || null,
        },
      },
    };

    // Include recent history if requested
    if (includeHistory) {
      const history = await SyncService.getSyncHistory(userId, { limit: historyLimit });
      responseData.recentHistory = history.logs.map((l) => ({
        id: l.id,
        platformName: l.platform?.name,
        platformSlug: l.platform?.slug,
        status: l.status,
        startedAt: l.startedAt,
        completedAt: l.completedAt,
        duration: l.duration,
        itemsCreated: l.itemsCreated,
        itemsUpdated: l.itemsUpdated,
        hasError: l.hasError,
        errorMessage: l.errorMessage,
      }));
    }

    // Include realtime connection info
    if (realtime) {
      responseData.realtime = {
        hasConnection: sseConnectionManager.hasUserConnections(userId),
        connectionCount: sseConnectionManager.getUserConnections(userId).length,
        channels: sseConnectionManager.getUserConnections(userId).map(c => c.channel),
      };
    }

    const duration = Date.now() - startTime;
    log.debug('Sync status retrieved', { userId, requestId, duration });

    const response = apiResponse.success(responseData, {
      meta: { requestId, timestamp: new Date().toISOString(), duration },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET sync status failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get sync status', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';