/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// src/app/api/sync/route.ts
// =============================================================================
// Description: Main sync endpoint - Get sync overview & trigger sync
// Methods: GET, POST, HEAD, OPTIONS
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
import { SyncQueue } from '@/services/sync/syncQueue';
import { SyncScheduler } from '@/services/sync/syncScheduler';
import { sseSyncService } from '@/services/sseSyncService';
import { apiRateLimiter, syncRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const triggerSyncSchema = z.object({
  platformIds: z.array(z.string().cuid()).optional(),
  force: z.boolean().default(false),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
});

const querySchema = z.object({
  include: z.enum(['platforms', 'queue', 'schedule', 'all']).optional(),
  detailed: z.coerce.boolean().default(false),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number; reset: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  response.headers.set('X-Request-ID', requestId);
  
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));
  }
  
  return response;
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return addHeaders(new NextResponse(null, { status: 204 }), generateRequestId());
}

// =============================================================================
// HEAD - Resource Metadata
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    // Get sync counts for headers
    const [activeSyncs, pendingSyncs, connectedPlatforms] = await Promise.all([
      prisma.syncLog.count({
        where: { userId: session.user.id, status: SyncStatus.IN_PROGRESS },
      }),
      prisma.syncLog.count({
        where: { userId: session.user.id, status: SyncStatus.PENDING },
      }),
      prisma.userPlatform.count({
        where: { userId: session.user.id, isActive: true },
      }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Active-Syncs', String(activeSyncs));
    response.headers.set('X-Pending-Syncs', String(pendingSyncs));
    response.headers.set('X-Connected-Platforms', String(connectedPlatforms));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Sync Overview & Status
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Rate limit check
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:get:${ip}`);
    
    if (!rateLimitResult.success) {
      log.warn('Rate limit exceeded', { requestId, ip });
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      include: searchParams.get('include'),
      detailed: searchParams.get('detailed'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { include, detailed } = queryValidation.data;

    // Get sync status
    const syncStatus = await SyncService.getSyncStatus(userId);

    // Build response data
    const responseData: Record<string, unknown> = {
      status: {
        isRunning: syncStatus.isRunning,
        activeSyncs: syncStatus.activeSyncs,
        lastSync: syncStatus.lastSync,
        health: syncStatus.health,
      },
      platforms: syncStatus.platforms.map((p) => ({
        platformId: p.platformId,
        name: p.name,
        slug: p.slug,
        icon: p.icon,
        status: p.status,
        lastSyncedAt: p.lastSyncedAt,
        failures: p.failures,
        ...(detailed ? { lastError: p.lastError } : {}),
      })),
    };

    // Include additional data based on query
    if (include === 'queue' || include === 'all') {
      const queueStats = await SyncQueue.getStats();
      const userJobs = await SyncQueue.getUserJobs(userId);
      responseData.queue = {
        stats: queueStats,
        jobs: userJobs.map((j) => ({
          id: j.id,
          platformId: j.platformId,
          status: j.status,
          priority: j.priority,
          createdAt: j.createdAt,
          attemptNumber: j.attemptNumber,
        })),
      };
    }

    if (include === 'schedule' || include === 'all') {
      const schedules = await SyncScheduler.getUserSchedules(userId);
      responseData.schedules = schedules.map((s) => ({
        platformId: s.platformId,
        nextSyncAt: s.nextSyncAt,
        syncInterval: s.syncInterval,
        isActive: s.isActive,
      }));
    }

    if (include === 'platforms' || include === 'all') {
      const recentLogs = syncStatus.recentLogs.slice(0, 5);
      responseData.recentActivity = recentLogs.map((l) => ({
        id: l.id,
        platformName: l.platform?.name,
        status: l.status,
        createdAt: l.createdAt,
        duration: l.duration,
        itemsCreated: l.itemsCreated,
      }));
    }

    const duration = Date.now() - startTime;
    log.info('Sync overview retrieved', { userId, requestId, duration });

    const response = apiResponse.success(responseData, {
      meta: { requestId, duration },
    });
    
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET sync failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get sync status', requestId), requestId);
  }
}

// =============================================================================
// POST - Trigger Sync
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Rate limit check (stricter for POST)
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(syncRateLimiter, 10, `sync:trigger:${ip}`);
    
    if (!rateLimitResult.success) {
      log.warn('Sync rate limit exceeded', { requestId, ip });
      return addHeaders(apiResponse.rateLimited(300, requestId), requestId, rateLimitResult);
    }

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {}; // Empty body is valid
    }

    const validation = triggerSyncSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { platformIds, force, priority } = validation.data;

    // Check if sync already in progress
    const activeSyncs = await prisma.syncLog.count({
      where: {
        userId,
        status: { in: [SyncStatus.IN_PROGRESS, SyncStatus.PENDING] },
      },
    });

    if (activeSyncs > 0 && !force) {
      return addHeaders(
        apiResponse.error(
          { message: 'Sync already in progress', statusCode: 409, code: 'SYNC_IN_PROGRESS' },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Trigger sync
    log.info('Triggering sync', { userId, requestId, platformIds, force, priority });

    const result = await SyncService.syncAllPlatforms(userId, {
      platformIds,
      force,
      priority,
      triggeredBy: 'manual',
    });

    // Send SSE notification
    if (sseSyncService.hasActiveConnection(userId)) {
      sseSyncService.sendSyncStarted(
        userId,
        result.jobId,
        platformIds?.[0] || 'all',
        'All Platforms'
      );
    }

    const duration = Date.now() - startTime;
    log.info('Sync triggered', { userId, requestId, jobId: result.jobId, duration });

    const response = apiResponse.success(
      {
        jobId: result.jobId,
        platformCount: result.platformCount,
        successCount: result.successCount,
        failCount: result.failCount,
        skippedCount: result.skippedCount,
        duration: result.duration,
        results: result.results.map((r) => ({
          platformId: r.platformId,
          platformName: r.platformName,
          success: r.success,
          status: r.status,
          entriesAdded: r.entriesAdded,
          entriesUpdated: r.entriesUpdated,
          error: r.error,
        })),
      },
      { meta: { requestId, duration }, message: 'Sync completed' }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('POST sync failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to trigger sync', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for long syncs