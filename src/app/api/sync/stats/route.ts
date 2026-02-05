// =============================================================================
// src/app/api/sync/stats/route.ts
// =============================================================================
// Description: Sync statistics and summaries
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
import { SyncQueue } from '@/services/sync/syncQueue';
import { SyncScheduler } from '@/services/sync/syncScheduler';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/stats' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=30',
};

// =============================================================================
// VALIDATION
// =============================================================================

const querySchema = z.object({
  detailed: z.coerce.boolean().default(false),
  includePlatforms: z.coerce.boolean().default(true),
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

    const [totalSyncs, connectedPlatforms] = await Promise.all([
      prisma.syncLog.count({ where: { userId: session.user.id } }),
      prisma.userPlatform.count({ where: { userId: session.user.id, isActive: true } }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Syncs', String(totalSyncs));
    response.headers.set('X-Connected-Platforms', String(connectedPlatforms));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Sync Statistics
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 120, `sync:stats:${ip}`);
    
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
      detailed: searchParams.get('detailed'),
      includePlatforms: searchParams.get('includePlatforms'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { detailed, includePlatforms } = queryValidation.data;

    // Time ranges
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get comprehensive stats
    const [
      totalSyncs,
      todaySyncs,
      weekSyncs,
      monthSyncs,
      statusCounts,
      avgDuration,
      totalItems,
      lastSync,
      connectedPlatforms,
      queueStats,
      schedulerStats,
    ] = await Promise.all([
      prisma.syncLog.count({ where: { userId } }),
      prisma.syncLog.count({ where: { userId, createdAt: { gte: today } } }),
      prisma.syncLog.count({ where: { userId, createdAt: { gte: thisWeek } } }),
      prisma.syncLog.count({ where: { userId, createdAt: { gte: thisMonth } } }),
      prisma.syncLog.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
      }),
      prisma.syncLog.aggregate({
        where: { userId, duration: { not: null } },
        _avg: { duration: true },
        _min: { duration: true },
        _max: { duration: true },
      }),
      prisma.syncLog.aggregate({
        where: { userId },
        _sum: {
          itemsCreated: true,
          itemsUpdated: true,
          itemsSkipped: true,
          itemsFailed: true,
        },
      }),
      prisma.syncLog.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, status: true, platform: { select: { name: true } } },
      }),
      prisma.userPlatform.findMany({
        where: { userId, isActive: true },
        include: {
          platform: { select: { id: true, name: true, slug: true, icon: true } },
        },
      }),
      SyncQueue.getStats(),
      SyncScheduler.getStats(),
    ]);

    // Calculate success rate
    const successCount = statusCounts.find(s => s.status === SyncStatus.SUCCESS)?._count.id || 0;
    const failCount = statusCounts.find(s => s.status === SyncStatus.FAILED)?._count.id || 0;
    const successRate = totalSyncs > 0 ? (successCount / totalSyncs) * 100 : 100;

    // Build response
    const responseData: Record<string, unknown> = {
      overview: {
        totalSyncs,
        todaySyncs,
        weekSyncs,
        monthSyncs,
        successRate: Math.round(successRate * 100) / 100,
        lastSync: lastSync ? {
          date: lastSync.createdAt,
          status: lastSync.status,
          platform: lastSync.platform?.name,
        } : null,
      },
      status: {
        breakdown: Object.fromEntries(
          statusCounts.map(s => [s.status.toLowerCase(), s._count.id])
        ),
        success: successCount,
        failed: failCount,
        pending: statusCounts.find(s => s.status === SyncStatus.PENDING)?._count.id || 0,
        inProgress: statusCounts.find(s => s.status === SyncStatus.IN_PROGRESS)?._count.id || 0,
      },
      performance: {
        avgDuration: Math.round(avgDuration._avg.duration || 0),
        minDuration: avgDuration._min.duration || 0,
        maxDuration: avgDuration._max.duration || 0,
        avgDurationFormatted: `${Math.round((avgDuration._avg.duration || 0) / 1000)}s`,
      },
      items: {
        totalCreated: totalItems._sum.itemsCreated || 0,
        totalUpdated: totalItems._sum.itemsUpdated || 0,
        totalSkipped: totalItems._sum.itemsSkipped || 0,
        totalFailed: totalItems._sum.itemsFailed || 0,
        total: (totalItems._sum.itemsCreated || 0) + (totalItems._sum.itemsUpdated || 0),
      },
      queue: {
        pending: queueStats.pending,
        inProgress: queueStats.inProgress,
        avgWaitTime: queueStats.avgWaitTime,
      },
      schedule: {
        totalScheduled: schedulerStats.totalScheduled,
        dueNow: schedulerStats.dueNow,
        nextHour: schedulerStats.nextHour,
        paused: schedulerStats.paused,
      },
    };

    // Add platform breakdown if requested
    if (includePlatforms) {
      responseData.platforms = connectedPlatforms.map(up => ({
        platform: up.platform,
        status: up.syncStatus,
        lastSynced: up.lastSyncedAt,
        autoSync: up.autoSync,
        consecutiveFailures: up.consecutiveFailures,
        nextSync: up.nextSyncAt,
      }));

      responseData.platformSummary = {
        total: connectedPlatforms.length,
        active: connectedPlatforms.filter(p => p.autoSync).length,
        failing: connectedPlatforms.filter(p => p.consecutiveFailures >= 3).length,
        syncing: connectedPlatforms.filter(p => p.syncStatus === SyncStatus.IN_PROGRESS).length,
      };
    }

    // Add detailed stats if requested
    if (detailed) {
      // Get hourly distribution for today
      const hourlyStats = await prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM "SyncLog"
        WHERE user_id = ${userId} AND created_at >= ${today}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `;

      responseData.detailed = {
        hourlyDistribution: hourlyStats.map(h => ({
          hour: h.hour,
          count: Number(h.count),
        })),
      };
    }

    const duration = Date.now() - startTime;
    log.debug('Sync stats retrieved', { userId, requestId, duration });

    const response = apiResponse.success(responseData, {
      meta: { requestId, duration, generatedAt: new Date().toISOString() },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET stats failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get stats', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';