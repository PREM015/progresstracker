// =============================================================================
// src/app/api/sync/logs/route.ts
// =============================================================================
// Description: Detailed sync logs with search and export
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

const log = logger.child({ route: 'api/sync/logs' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
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

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  syncLogId: z.string().cuid().optional(),
  platformId: z.string().cuid().optional(),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  search: z.string().max(200).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  format: z.enum(['json', 'text']).default('json'),
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
// GET - Sync Logs
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:logs:${ip}`);
    
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
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      syncLogId: searchParams.get('syncLogId'),
      platformId: searchParams.get('platformId'),
      level: searchParams.get('level'),
      search: searchParams.get('search'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      format: searchParams.get('format'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, syncLogId, platformId, search, dateFrom, dateTo, format } = queryValidation.data;

    // Build where clause
    const where: Prisma.SyncLogWhereInput = { userId };

    if (syncLogId) where.id = syncLogId;
    if (platformId) where.platformId = platformId;

    if (search) {
      where.OR = [
        { errorMessage: { contains: search, mode: 'insensitive' } },
        { triggerSource: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Fetch logs
    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          platform: {
            select: { name: true, slug: true, icon: true },
          },
          userPlatform: {
            select: { username: true },
          },
        },
      }),
      prisma.syncLog.count({ where }),
    ]);

    // Format response based on format param
    if (format === 'text') {
      const textLogs = logs
        .map((l) => {
          const timestamp = l.startedAt.toISOString();
          const platform = l.platform?.name || 'Unknown';
          const status = l.status;
          const duration = l.duration ? `${l.duration}ms` : 'N/A';
          const items = `created:${l.itemsCreated} updated:${l.itemsUpdated} failed:${l.itemsFailed}`;
          const error = l.hasError ? `ERROR: ${l.errorMessage}` : '';
          
          return `[${timestamp}] [${platform}] [${status}] Duration: ${duration} | Items: ${items} ${error}`;
        })
        .join('\n');

      const textResponse = new NextResponse(textLogs, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'X-Request-ID': requestId,
        },
      });
      
      return addHeaders(textResponse, requestId, rateLimitResult);
    }

    const totalPages = Math.ceil(total / limit);
    const duration = Date.now() - startTime;

    const response = apiResponse.paginated(
      logs.map((l) => ({
        id: l.id,
        platform: l.platform,
        username: l.userPlatform?.username,
        status: l.status,
        triggeredBy: l.triggeredBy,
        triggerSource: l.triggerSource,
        startedAt: l.startedAt,
        completedAt: l.completedAt,
        duration: l.duration,
        items: {
          found: l.itemsFound,
          created: l.itemsCreated,
          updated: l.itemsUpdated,
          skipped: l.itemsSkipped,
          failed: l.itemsFailed,
        },
        error: l.hasError
          ? {
              code: l.errorCode,
              message: l.errorMessage,
            }
          : null,
        retry: {
          attemptNumber: l.attemptNumber,
          maxAttempts: l.maxAttempts,
          nextRetryAt: l.nextRetryAt,
        },
        logEntries: l.logEntries,
      })),
      {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      { meta: { requestId, duration } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET sync logs failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get sync logs', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';