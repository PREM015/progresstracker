// =============================================================================
// src/app/api/sync/history/route.ts
// =============================================================================
// Description: Sync history with filtering and pagination
// Methods: GET, DELETE, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: 60/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SyncService } from '@/services/syncService';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus, Prisma } from '@prisma/client';

// =============================================================================
// CONSTANTS & TYPES
// =============================================================================

const log = logger.child({ route: 'api/sync/history' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  platformId: z.string().cuid().optional(),
  status: z.nativeEnum(SyncStatus).optional(),
  triggeredBy: z.enum(['manual', 'scheduled', 'webhook', 'system']).optional(),
  hasError: z.coerce.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'duration', 'itemsCreated']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const deleteSchema = z.object({
  olderThan: z.string().datetime().optional(),
  status: z.nativeEnum(SyncStatus).optional(),
  keepLast: z.coerce.number().min(0).max(100).default(10),
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

    const totalLogs = await prisma.syncLog.count({
      where: { userId: session.user.id },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Count', String(totalLogs));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Sync History with Filters
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:history:${ip}`);
    
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

    // Parse and validate query
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      platformId: searchParams.get('platformId'),
      status: searchParams.get('status'),
      triggeredBy: searchParams.get('triggeredBy'),
      hasError: searchParams.get('hasError'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const {
      page,
      limit,
      platformId,
      status,
      triggeredBy,
      hasError,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = queryValidation.data;

    // Build where clause
    const where: Prisma.SyncLogWhereInput = { userId };

    if (platformId) where.platformId = platformId;
    if (status) where.status = status;
    if (triggeredBy) where.triggeredBy = triggeredBy;
    if (hasError !== undefined) where.hasError = hasError;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Build order by
    const orderBy: Prisma.SyncLogOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute query with pagination
    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
            },
          },
        },
      }),
      prisma.syncLog.count({ where }),
    ]);

    // Get aggregate stats
    const aggregateStats = await prisma.syncLog.aggregate({
      where: { userId },
      _avg: { duration: true },
      _sum: { itemsCreated: true, itemsUpdated: true },
      _count: { id: true },
    });

    const statusCounts = await prisma.syncLog.groupBy({
      by: ['status'],
      where: { userId },
      _count: { id: true },
    });

    const totalPages = Math.ceil(total / limit);
    const duration = Date.now() - startTime;

    log.debug('Sync history retrieved', { userId, requestId, page, limit, total, duration });

    const response = apiResponse.paginated(
      logs.map((l) => ({
        id: l.id,
        platform: l.platform,
        status: l.status,
        triggeredBy: l.triggeredBy,
        startedAt: l.startedAt,
        completedAt: l.completedAt,
        duration: l.duration,
        itemsFound: l.itemsFound,
        itemsCreated: l.itemsCreated,
        itemsUpdated: l.itemsUpdated,
        itemsSkipped: l.itemsSkipped,
        itemsFailed: l.itemsFailed,
        hasError: l.hasError,
        errorCode: l.errorCode,
        errorMessage: l.errorMessage,
        attemptNumber: l.attemptNumber,
      })),
      {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      {
        meta: {
          requestId,
          duration,
          stats: {
            totalLogs: aggregateStats._count.id,
            avgDuration: Math.round(aggregateStats._avg.duration || 0),
            totalItemsCreated: aggregateStats._sum.itemsCreated || 0,
            totalItemsUpdated: aggregateStats._sum.itemsUpdated || 0,
            statusBreakdown: Object.fromEntries(
              statusCounts.map((s) => [s.status, s._count.id])
            ),
          },
        },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET sync history failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get sync history', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Clear Sync History
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 10, `sync:history:delete:${ip}`);
    
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

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validation = deleteSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { olderThan, status, keepLast } = validation.data;

    // Build where clause
    const where: Prisma.SyncLogWhereInput = { userId };

    if (olderThan) {
      where.createdAt = { lt: new Date(olderThan) };
    }

    if (status) {
      where.status = status;
    }

    // Get IDs to keep (most recent)
    const logsToKeep = await prisma.syncLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: keepLast,
      select: { id: true },
    });

    const idsToKeep = logsToKeep.map((l) => l.id);

    // Delete logs
    const deleteResult = await prisma.syncLog.deleteMany({
      where: {
        ...where,
        id: { notIn: idsToKeep },
      },
    });

    const duration = Date.now() - startTime;
    log.info('Sync history cleared', { userId, requestId, deletedCount: deleteResult.count, duration });

    const response = apiResponse.success(
      {
        deletedCount: deleteResult.count,
        keptCount: idsToKeep.length,
      },
      { meta: { requestId, duration }, message: `Deleted ${deleteResult.count} sync logs` }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('DELETE sync history failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to clear sync history', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';