// src/app/api/platforms/status/route.ts
/**
 * Platform Status API
 *
 * @route GET /api/platforms/status - Get platform health status for user's connections
 * @route HEAD /api/platforms/status - Quick health check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError } from '@/lib/apiError';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { CacheService } from '@/services/cacheService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, no-cache',
};

const log = logger.child({ route: 'platforms/status' });

// =============================================================================
// TYPES
// =============================================================================

interface PlatformStatus {
  platformId: string;
  platform: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
    healthStatus: string | null;
    healthMessage: string | null;
    lastHealthCheck: Date | null;
    maintenanceMode: boolean;
    maintenanceMessage: string | null;
    category: string | null;
  };
  connectionStatus: string;
  syncStatus: string;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  nextSyncAt: Date | null;
  consecutiveFailures: number;
  isActive: boolean;
  autoSync: boolean;
  cachedStats: Record<string, unknown> | null;
}

interface StatusSummary {
  total: number;
  healthy: number;
  syncing: number;
  failing: number;
  maintenance: number;
  disconnected: number;
  errors: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
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

function categorizeConnections(connections: PlatformStatus[]): StatusSummary {
  const summary: StatusSummary = {
    total: connections.length,
    healthy: 0,
    syncing: 0,
    failing: 0,
    maintenance: 0,
    disconnected: 0,
    errors: 0,
  };

  for (const conn of connections) {
    if (conn.platform.maintenanceMode) {
      summary.maintenance++;
    } else if (conn.connectionStatus === 'disconnected') {
      summary.disconnected++;
    } else if (conn.connectionStatus === 'error' || conn.lastSyncError) {
      summary.errors++;
    } else if (conn.consecutiveFailures >= 3) {
      summary.failing++;
    } else if (conn.syncStatus === 'IN_PROGRESS') {
      summary.syncing++;
    } else if (
      conn.connectionStatus === 'connected' &&
      conn.syncStatus === 'SUCCESS' &&
      conn.consecutiveFailures === 0
    ) {
      summary.healthy++;
    }
  }

  return summary;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * HEAD - Quick health check
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const [totalConnections, healthyConnections] = await Promise.all([
      prisma.userPlatform.count({
        where: { userId: session.user.id },
      }),
      prisma.userPlatform.count({
        where: {
          userId: session.user.id,
          connectionStatus: 'connected',
          syncStatus: 'SUCCESS',
          consecutiveFailures: 0,
        },
      }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Connections', String(totalConnections));
    response.headers.set('X-Healthy-Connections', String(healthyConnections));

    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET /api/platforms/status
 *
 * Get platform health status for all user's connections
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:status:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const cacheKey = `api:platforms:status:${userId}`;
    const cachedData = await CacheService.get(cacheKey);
    
    if (cachedData) {
      log.info('Platform status served from cache', { userId, requestId });
      return addHeaders(
        apiResponse.success(cachedData, { meta: { requestId, cached: true, duration: Date.now() - startTime } }),
        requestId,
        rateLimitResult
      );
    }

    // Get user's platform connections with sync status
    const connections = await prisma.userPlatform.findMany({
      where: { userId },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            category: true,
            healthStatus: true,
            healthMessage: true,
            lastHealthCheck: true,
            maintenanceMode: true,
            maintenanceMessage: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Format platform statuses
    const platformStatuses: PlatformStatus[] = connections.map((conn) => ({
      platformId: conn.platformId,
      platform: conn.platform,
      connectionStatus: conn.connectionStatus,
      syncStatus: conn.syncStatus,
      lastSyncedAt: conn.lastSyncedAt,
      lastSyncError: conn.lastSyncError,
      nextSyncAt: conn.nextSyncAt,
      consecutiveFailures: conn.consecutiveFailures,
      isActive: conn.isActive,
      autoSync: conn.autoSync,
      cachedStats: (conn.cachedStats as Record<string, unknown> | null) || null,
    }));

    // Calculate summary
    const summary = categorizeConnections(platformStatuses);

    // Get sync statistics for last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [successfulSyncs, failedSyncs, totalSyncs] = await Promise.all([
      prisma.syncLog.count({
        where: {
          userId,
          status: 'SUCCESS',
          createdAt: { gte: last24Hours },
        },
      }),
      prisma.syncLog.count({
        where: {
          userId,
          status: 'FAILED',
          createdAt: { gte: last24Hours },
        },
      }),
      prisma.syncLog.count({
        where: {
          userId,
          createdAt: { gte: last24Hours },
        },
      }),
    ]);

    const responseData = {
      platforms: platformStatuses,
      summary,
      syncStats: {
        last24Hours: {
          total: totalSyncs,
          successful: successfulSyncs,
          failed: failedSyncs,
          successRate: totalSyncs > 0 ? Math.round((successfulSyncs / totalSyncs) * 100) : 100,
        },
      },
    };

    // Cache the response data for 30 seconds
    await CacheService.set(cacheKey, responseData, 30).catch(() => {});

    log.info('Platform status fetched', {
      userId,
      totalConnections: connections.length,
      healthyCount: summary.healthy,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(responseData, { meta: { requestId, duration: Date.now() - startTime } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Error fetching platform status', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';