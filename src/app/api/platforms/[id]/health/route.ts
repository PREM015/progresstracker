// src/app/api/platforms/[id]/health/route.ts
/**
 * Platform Health API
 * 
 * Checks health status of a specific platform.
 * 
 * @route GET  /api/platforms/[id]/health - Get platform health status
 * @route POST /api/platforms/[id]/health - Trigger health check (Admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { NotFoundError, ForbiddenError } from '@/lib/apiError';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMITS = {
  GET: 60,
  POST: 10,
} as const;

const CACHE_TTL = 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// =============================================================================
// TYPES
// =============================================================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down' | 'maintenance' | 'unknown';
  message: string | null;
  lastCheck: Date | null;
  isStale: boolean;
  metrics: {
    successRate: number;
    avgSyncDuration: number | null;
    recentSyncs: {
      total: number;
      successful: number;
      failed: number;
    };
    activeConnections: number;
  };
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
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
    cacheAge?: number;
    healthStatus?: string;
  }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('X-Request-ID', requestId);

  if (options?.healthStatus) {
    response.headers.set('X-Health-Status', options.healthStatus);
  }

  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  if (options?.cacheAge) {
    response.headers.set('Cache-Control', `public, max-age=${options.cacheAge}`);
  } else {
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

/**
 * Calculate platform health status
 */
async function calculateHealthStatus(platformId: string): Promise<HealthStatus> {
  const platform = await prisma.platform.findUnique({
    where: { id: platformId },
    select: {
      healthStatus: true,
      healthMessage: true,
      lastHealthCheck: true,
      maintenanceMode: true,
      maintenanceMessage: true,
      successRate: true,
      avgSyncDuration: true,
      isActive: true,
    },
  });

  if (!platform) {
    throw new NotFoundError('Platform');
  }

  // Check if health data is stale (more than 24 hours old)
  const isStale = !platform.lastHealthCheck ||
    (Date.now() - platform.lastHealthCheck.getTime()) > 24 * 60 * 60 * 1000;

  // Get recent sync stats
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const [recentSyncs, activeConnections] = await Promise.all([
    prisma.syncLog.groupBy({
      by: ['status'],
      where: {
        platformId,
        createdAt: { gte: last24Hours },
      },
      _count: true,
    }),
    prisma.userPlatform.count({
      where: {
        platformId,
        isActive: true,
      },
    }),
  ]);

  const syncCounts = {
    total: recentSyncs.reduce((sum, s) => sum + s._count, 0),
    successful: recentSyncs.find(s => s.status === SyncStatus.SUCCESS)?._count || 0,
    failed: recentSyncs.find(s => s.status === SyncStatus.FAILED)?._count || 0,
  };

  // Determine health status
  let status: HealthStatus['status'];
  let message: string | null;

  if (platform.maintenanceMode) {
    status = 'maintenance';
    message = platform.maintenanceMessage || 'Platform is under maintenance';
  } else if (!platform.isActive) {
    status = 'down';
    message = 'Platform is not active';
  } else if (platform.healthStatus === 'down' || platform.successRate < 50) {
    status = 'down';
    message = platform.healthMessage || 'Platform is experiencing issues';
  } else if (platform.healthStatus === 'degraded' || platform.successRate < 90) {
    status = 'degraded';
    message = platform.healthMessage || 'Platform performance is degraded';
  } else if (platform.healthStatus === 'healthy') {
    status = 'healthy';
    message = null;
  } else {
    status = 'unknown';
    message = 'Health status unknown';
  }

  return {
    status,
    message,
    lastCheck: platform.lastHealthCheck,
    isStale,
    metrics: {
      successRate: platform.successRate,
      avgSyncDuration: platform.avgSyncDuration,
      recentSyncs: syncCounts,
      activeConnections,
    },
  };
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    // Rate limiting (public endpoint)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `platforms:health:get:${ip}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.GET, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Get platform info
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        id: true,
        slug: true,
        name: true,
        displayName: true,
        isActive: true,
      },
    });

    if (!platform) {
      throw new NotFoundError('Platform');
    }

    // Calculate health status
    const health = await calculateHealthStatus(platformId);

    logger.info('Platform health checked', {
      requestId,
      platformId,
      platformSlug: platform.slug,
      status: health.status,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          platform: {
            id: platform.id,
            slug: platform.slug,
            name: platform.displayName || platform.name,
          },
          health,
          checkedAt: new Date().toISOString(),
        },
        {
          meta: { requestId, duration: Date.now() - startTime },
        }
      ),
      requestId,
      {
        rateLimitResult,
        cacheAge: CACHE_TTL,
        healthStatus: health.status,
      }
    );
  } catch (error) {
    logger.error('GET /api/platforms/[id]/health failed', { requestId, platformId }, error);
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
    // Admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ForbiddenError('Admin access required');
    }

    if (!session.user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Rate limiting
    const rateLimitKey = `platforms:health:post:${session.user.id}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.POST, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(3600, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Get platform
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (!platform) {
      throw new NotFoundError('Platform');
    }

    // Perform health check
    const checkStartTime = Date.now();
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    let message: string | null = null;

    try {
      // Try to get scraper and perform test
      const { getScraperForPlatform } = await import('@/services/scrapers');
      const scraper = getScraperForPlatform(platform.slug);
      
      if (scraper) {
        // Basic connectivity test
        const result = await Promise.race([
          scraper.fetchData({ username: 'test_connectivity_check' }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          ),
        ]) as { success: boolean; error?: string };

        // Even if user not found, platform is reachable
        if (result.success || result.error?.includes('not found')) {
          status = 'healthy';
        } else if (result.error?.includes('rate limit')) {
          status = 'degraded';
          message = 'Rate limited';
        } else {
          status = 'degraded';
          message = result.error;
        }
      }
    } catch (error) {
      status = 'down';
      message = error instanceof Error ? error.message : 'Health check failed';
    }

    const latency = Date.now() - checkStartTime;

    // Update platform health status
    await prisma.platform.update({
      where: { id: platformId },
      data: {
        healthStatus: status,
        healthMessage: message,
        lastHealthCheck: new Date(),
        avgSyncDuration: latency,
      },
    });

    logger.info('Platform health check triggered', {
      requestId,
      platformId,
      platformSlug: platform.slug,
      status,
      latency,
      triggeredBy: session.user.id,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          platform: {
            id: platform.id,
            slug: platform.slug,
            name: platform.name,
          },
          healthCheck: {
            status,
            message,
            latency,
            checkedAt: new Date().toISOString(),
          },
        },
        {
          meta: {
            requestId,
            message: `Health check completed: ${status}`,
            duration: Date.now() - startTime,
          },
        }
      ),
      requestId,
      { rateLimitResult, healthStatus: status }
    );
  } catch (error) {
    logger.error('POST /api/platforms/[id]/health failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';