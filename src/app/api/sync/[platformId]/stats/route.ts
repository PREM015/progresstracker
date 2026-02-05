// =============================================================================
// src/app/api/sync/[platformId]/stats/route.ts
// =============================================================================
// Description: Get sync statistics for specific platform
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
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/[platformId]/stats' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION
// =============================================================================

const querySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year', 'all']).default('month'),
  detailed: z.coerce.boolean().default(false),
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

function getPeriodStart(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'day':
      return new Date(now.setHours(0, 0, 0, 0));
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      return weekStart;
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
      return null;
    default:
      return new Date(now.setDate(now.getDate() - 30));
  }
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

    const totalSyncs = await prisma.syncLog.count({
      where: { userId: session.user.id, platformId },
    });

    const totalEntries = await prisma.trackerEntry.count({
      where: { userId: session.user.id, platformId },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Syncs', String(totalSyncs));
    response.headers.set('X-Total-Entries', String(totalEntries));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Platform Stats
// =============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { platformId } = await context.params;

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 120, `sync:platform:stats:${ip}`);
    
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

    // Verify platform connection
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId, platformId } },
      include: { 
        platform: { 
          select: { name: true, slug: true, icon: true, category: true } 
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

    // Parse query
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      period: searchParams.get('period'),
      detailed: searchParams.get('detailed'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { period, detailed } = queryValidation.data;
    const periodStart = getPeriodStart(period);

    // Build date filter
    const dateFilter = periodStart ? { gte: periodStart } : {};

    // Get sync stats
    const [
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      avgDuration,
      syncItems,
    ] = await Promise.all([
      prisma.syncLog.count({
        where: { userId, platformId, createdAt: dateFilter },
      }),
      prisma.syncLog.count({
        where: { userId, platformId, status: SyncStatus.SUCCESS, createdAt: dateFilter },
      }),
      prisma.syncLog.count({
        where: { userId, platformId, status: SyncStatus.FAILED, createdAt: dateFilter },
      }),
      prisma.syncLog.aggregate({
        where: { userId, platformId, createdAt: dateFilter },
        _avg: { duration: true },
        _min: { duration: true },
        _max: { duration: true },
      }),
      prisma.syncLog.aggregate({
        where: { userId, platformId, createdAt: dateFilter },
        _sum: {
          itemsFound: true,
          itemsCreated: true,
          itemsUpdated: true,
          itemsSkipped: true,
          itemsFailed: true,
        },
      }),
    ]);

    // Get tracker entry stats
    const [
      totalEntries,
      recentEntries,
      entryStats,
    ] = await Promise.all([
      prisma.trackerEntry.count({
        where: { userId, platformId },
      }),
      prisma.trackerEntry.count({
        where: { userId, platformId, date: dateFilter },
      }),
      prisma.trackerEntry.aggregate({
        where: { userId, platformId, date: dateFilter },
        _sum: {
          problemsSolved: true,
          commits: true,
          pullRequests: true,
          timeSpent: true,
          points: true,
        },
        _avg: {
          problemsSolved: true,
        },
      }),
    ]);

    const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100;

    const responseData: Record<string, unknown> = {
      platform: {
        id: platformId,
        name: userPlatform.platform.name,
        slug: userPlatform.platform.slug,
        icon: userPlatform.platform.icon,
        category: userPlatform.platform.category,
      },
      connection: {
        status: userPlatform.connectionStatus,
        lastSyncedAt: userPlatform.lastSyncedAt,
        consecutiveFailures: userPlatform.consecutiveFailures,
        syncAttempts: userPlatform.syncAttempts,
      },
      sync: {
        period,
        periodStart,
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: Math.round(avgDuration._avg.duration || 0),
        minDuration: avgDuration._min.duration || 0,
        maxDuration: avgDuration._max.duration || 0,
        items: {
          found: syncItems._sum.itemsFound || 0,
          created: syncItems._sum.itemsCreated || 0,
          updated: syncItems._sum.itemsUpdated || 0,
          skipped: syncItems._sum.itemsSkipped || 0,
          failed: syncItems._sum.itemsFailed || 0,
        },
      },
      entries: {
        total: totalEntries,
        inPeriod: recentEntries,
        problemsSolved: entryStats._sum.problemsSolved || 0,
        commits: entryStats._sum.commits || 0,
        pullRequests: entryStats._sum.pullRequests || 0,
        timeSpent: entryStats._sum.timeSpent || 0,
        points: entryStats._sum.points || 0,
        avgProblemsPerDay: Math.round((entryStats._avg.problemsSolved || 0) * 10) / 10,
      },
    };

    // Add detailed stats if requested
    if (detailed) {
      // Get daily breakdown for the period
      const dailyBreakdown = await prisma.$queryRaw<Array<{ 
        date: Date; 
        syncs: bigint; 
        successful: bigint;
        itemsCreated: bigint;
      }>>`
        SELECT 
          DATE(started_at) as date,
          COUNT(*) as syncs,
          SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful,
          SUM(items_created) as itemsCreated
        FROM "SyncLog"
        WHERE user_id = ${userId} 
          AND platform_id = ${platformId}
          ${periodStart ? `AND created_at >= ${periodStart}` : ''}
        GROUP BY DATE(started_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      responseData.detailed = {
        dailyBreakdown: dailyBreakdown.map(d => ({
          date: d.date,
          syncs: Number(d.syncs),
          successful: Number(d.successful),
          itemsCreated: Number(d.itemsCreated),
        })),
        cachedStats: userPlatform.cachedStats,
        statsUpdatedAt: userPlatform.statsUpdatedAt,
      };
    }

    const duration = Date.now() - startTime;

    return addHeaders(
      apiResponse.success(
        responseData,
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('GET platform stats failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get stats', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';