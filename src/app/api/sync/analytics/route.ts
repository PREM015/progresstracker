/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// src/app/api/sync/analytics/route.ts
// =============================================================================
// Description: Sync analytics and metrics
// Methods: GET, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: 60/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus, Prisma } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/analytics' });

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
  period: z.enum(['day', 'week', 'month', 'year']).default('week'),
  platformId: z.string().cuid().optional(),
  groupBy: z.enum(['day', 'platform', 'status']).default('day'),
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

function getPeriodStart(period: string): Date {
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
    default:
      return new Date(now.setDate(now.getDate() - 7));
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

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const totalSyncs = await prisma.syncLog.count({
      where: { userId: session.user.id },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Syncs', String(totalSyncs));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Sync Analytics
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:analytics:${ip}`);
    
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
      period: searchParams.get('period'),
      platformId: searchParams.get('platformId'),
      groupBy: searchParams.get('groupBy'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { period, platformId, groupBy } = queryValidation.data;
    const periodStart = getPeriodStart(period);

    // Build where clause
    const where: Prisma.SyncLogWhereInput = {
      userId,
      createdAt: { gte: periodStart },
    };

    if (platformId) {
      where.platformId = platformId;
    }

    // Get aggregate stats
    const [
      totalLogs,
      statusCounts,
      avgDuration,
      totalItems,
      platformStats,
      dailyStats,
      recentErrors,
    ] = await Promise.all([
      // Total syncs
      prisma.syncLog.count({ where }),
      
      // Status breakdown
      prisma.syncLog.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      
      // Average duration
      prisma.syncLog.aggregate({
        where: { ...where, duration: { not: null } },
        _avg: { duration: true },
        _min: { duration: true },
        _max: { duration: true },
      }),
      
      // Total items
      prisma.syncLog.aggregate({
        where,
        _sum: {
          itemsFound: true,
          itemsCreated: true,
          itemsUpdated: true,
          itemsSkipped: true,
          itemsFailed: true,
        },
      }),
      
      // Per-platform stats
      prisma.syncLog.groupBy({
        by: ['platformId'],
        where,
        _count: { id: true },
        _avg: { duration: true },
        _sum: { itemsCreated: true, itemsUpdated: true },
      }),
      
      // Daily trends
      prisma.$queryRaw<Array<{ date: Date; count: bigint; success: bigint }>>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success
        FROM "SyncLog"
        WHERE user_id = ${userId} AND created_at >= ${periodStart}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `,
      
      // Recent errors
      prisma.syncLog.findMany({
        where: { ...where, hasError: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          platformId: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
          platform: { select: { name: true, slug: true } },
        },
      }),
    ]);

    // Get platform details
    const platformIds = platformStats.map(p => p.platformId).filter((id): id is string => id !== null);
    const platforms = await prisma.platform.findMany({
      where: { id: { in: platformIds } },
      select: { id: true, name: true, slug: true, icon: true },
    });
    const platformMap = new Map(platforms.map(p => [p.id, p]));

    // Calculate success rate
    const successCount = statusCounts.find(s => s.status === SyncStatus.SUCCESS)?._count.id || 0;
    const successRate = totalLogs > 0 ? (successCount / totalLogs) * 100 : 100;

    // Format response
    const duration = Date.now() - startTime;

    const response = apiResponse.success(
      {
        period: {
          type: period,
          start: periodStart.toISOString(),
          end: new Date().toISOString(),
        },
        summary: {
          totalSyncs: totalLogs,
          successRate: Math.round(successRate * 100) / 100,
          avgDuration: Math.round(avgDuration._avg.duration || 0),
          minDuration: avgDuration._min.duration || 0,
          maxDuration: avgDuration._max.duration || 0,
          totalItemsCreated: totalItems._sum.itemsCreated || 0,
          totalItemsUpdated: totalItems._sum.itemsUpdated || 0,
          totalItemsFailed: totalItems._sum.itemsFailed || 0,
        },
        statusBreakdown: Object.fromEntries(
          statusCounts.map(s => [s.status, s._count.id])
        ),
        platformBreakdown: platformStats.map(p => ({
          platform: platformMap.get(p.platformId || ''),
          syncCount: p._count.id,
          avgDuration: Math.round(p._avg.duration || 0),
          itemsCreated: p._sum.itemsCreated || 0,
          itemsUpdated: p._sum.itemsUpdated || 0,
        })),
        dailyTrends: dailyStats.map(d => ({
          date: d.date,
          total: Number(d.count),
          successful: Number(d.success),
          successRate: Number(d.count) > 0 
            ? Math.round((Number(d.success) / Number(d.count)) * 100) 
            : 100,
        })),
        recentErrors: recentErrors.map(e => ({
          id: e.id,
          platform: e.platform,
          errorCode: e.errorCode,
          errorMessage: e.errorMessage,
          createdAt: e.createdAt,
        })),
      },
      { meta: { requestId, duration } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET analytics failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get analytics', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';