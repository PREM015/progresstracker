// src/app/api/platforms/[id]/logs/route.ts
/**
 * Platform Logs API
 * 
 * Provides access to sync logs, audit logs, and activity history.
 * 
 * @route GET /api/platforms/[id]/logs - Get platform logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, NotFoundError } from '@/lib/apiError';
import { SyncStatus, Prisma } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const LogsQuerySchema = z.object({
  type: z.enum(['sync', 'audit', 'all']).default('sync'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(SyncStatus).optional(),
  hasError: z.coerce.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

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
  }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('X-Request-ID', requestId);

  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  if (options?.cacheAge) {
    response.headers.set('Cache-Control', `private, max-age=${options.cacheAge}`);
  } else {
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:logs:${userId}:${platformId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = LogsQuerySchema.safeParse({
      type: searchParams.get('type') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      status: searchParams.get('status') || undefined,
      hasError: searchParams.get('hasError') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Invalid query parameters',
          queryValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        { rateLimitResult }
      );
    }

    const query = queryValidation.data;

    // Verify connection exists
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: { name: true, slug: true },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    const offset = (query.page - 1) * query.limit;
    const responseData: Record<string, unknown> = {
      platform: {
        id: platformId,
        name: connection.platform.name,
        slug: connection.platform.slug,
      },
    };

    // Get sync logs
    if (query.type === 'sync' || query.type === 'all') {
      const syncWhere: Prisma.SyncLogWhereInput = {
        userId,
        platformId,
      };

      if (query.status) {
        syncWhere.status = query.status;
      }

      if (query.hasError !== undefined) {
        syncWhere.hasError = query.hasError;
      }

      if (query.startDate || query.endDate) {
        syncWhere.createdAt = {};
        if (query.startDate) syncWhere.createdAt.gte = query.startDate;
        if (query.endDate) syncWhere.createdAt.lte = query.endDate;
      }

      const [syncLogs, syncTotal] = await Promise.all([
        prisma.syncLog.findMany({
          where: syncWhere,
          orderBy: { createdAt: query.sortOrder },
          skip: offset,
          take: query.limit,
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            duration: true,
            itemsFound: true,
            itemsCreated: true,
            itemsUpdated: true,
            itemsSkipped: true,
            itemsFailed: true,
            hasError: true,
            errorCode: true,
            errorMessage: true,
            triggeredBy: true,
            dataFromDate: true,
            dataToDate: true,
            createdAt: true,
          },
        }),
        prisma.syncLog.count({ where: syncWhere }),
      ]);

      responseData.syncLogs = {
        data: syncLogs,
        total: syncTotal,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(syncTotal / query.limit),
      };
    }

    // Get audit logs
    if (query.type === 'audit' || query.type === 'all') {
      const auditWhere: Prisma.AuditLogWhereInput = {
        userId,
        entityId: connection.id,
        entityType: 'user_platform',
      };

      if (query.startDate || query.endDate) {
        auditWhere.createdAt = {};
        if (query.startDate) auditWhere.createdAt.gte = query.startDate;
        if (query.endDate) auditWhere.createdAt.lte = query.endDate;
      }

      const [auditLogs, auditTotal] = await Promise.all([
        prisma.auditLog.findMany({
          where: auditWhere,
          orderBy: { createdAt: query.sortOrder },
          skip: offset,
          take: query.limit,
          select: {
            id: true,
            action: true,
            description: true,
            ipAddress: true,
            country: true,
            changes: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.auditLog.count({ where: auditWhere }),
      ]);

      responseData.auditLogs = {
        data: auditLogs,
        total: auditTotal,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(auditTotal / query.limit),
      };
    }

    logger.info('Platform logs fetched', {
      requestId,
      userId,
      platformId,
      logType: query.type,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(responseData, {
        meta: { requestId, duration: Date.now() - startTime },
      }),
      requestId,
      { rateLimitResult, cacheAge: 30 }
    );
  } catch (error) {
    logger.error('GET /api/platforms/[id]/logs failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';