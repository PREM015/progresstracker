/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// src/app/api/sync/conflicts/route.ts
// =============================================================================
// Description: Sync conflict detection and resolution
// Methods: GET, POST, DELETE, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: 60/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { ConflictResolver, ConflictStrategy } from '@/services/sync/conflictResolver';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/conflicts' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, HEAD, OPTIONS',
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
  platformId: z.string().cuid().optional(),
  status: z.enum(['pending', 'resolved', 'ignored']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const resolveConflictSchema = z.object({
  conflictId: z.string().cuid(),
  strategy: z.enum(['server_wins', 'client_wins', 'merge', 'latest_wins']),
  customResolution: z.record(z.unknown()).optional(),
});

const bulkResolveSchema = z.object({
  conflictIds: z.array(z.string().cuid()).min(1).max(50),
  strategy: z.enum(['server_wins', 'client_wins', 'merge', 'latest_wins']),
});

const dismissSchema = z.object({
  conflictIds: z.array(z.string().cuid()).min(1).max(50),
  dismissAll: z.boolean().default(false),
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

// Simulated conflict storage (in production, use a dedicated table)
interface StoredConflict {
  id: string;
  userId: string;
  platformId: string;
  entryId: string;
  field: string;
  serverValue: unknown;
  clientValue: unknown;
  serverModified: Date;
  clientModified: Date;
  status: 'pending' | 'resolved' | 'ignored';
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: unknown;
  createdAt: Date;
}

// In-memory storage for demo (use database in production)
const conflictStore = new Map<string, StoredConflict>();

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

    const pendingCount = Array.from(conflictStore.values())
      .filter(c => c.userId === session.user.id && c.status === 'pending').length;

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Pending-Conflicts', String(pendingCount));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Conflicts
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:conflicts:${ip}`);
    
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
      platformId: searchParams.get('platformId'),
      status: searchParams.get('status'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { platformId, status, page, limit } = queryValidation.data;

    // Filter conflicts
    let conflicts = Array.from(conflictStore.values())
      .filter(c => c.userId === userId);

    if (platformId) {
      conflicts = conflicts.filter(c => c.platformId === platformId);
    }

    if (status) {
      conflicts = conflicts.filter(c => c.status === status);
    }

    // Sort by creation date (newest first)
    conflicts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const total = conflicts.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedConflicts = conflicts.slice((page - 1) * limit, page * limit);

    // Get platform details
    const platformIds = [...new Set(paginatedConflicts.map(c => c.platformId))];
    const platforms = await prisma.platform.findMany({
      where: { id: { in: platformIds } },
      select: { id: true, name: true, slug: true, icon: true },
    });
    const platformMap = new Map(platforms.map(p => [p.id, p]));

    const duration = Date.now() - startTime;

    const response = apiResponse.paginated(
      paginatedConflicts.map(c => ({
        id: c.id,
        platform: platformMap.get(c.platformId),
        entryId: c.entryId,
        field: c.field,
        serverValue: c.serverValue,
        clientValue: c.clientValue,
        serverModified: c.serverModified,
        clientModified: c.clientModified,
        status: c.status,
        resolvedAt: c.resolvedAt,
        resolution: c.resolution,
        createdAt: c.createdAt,
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
    log.error('GET conflicts failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get conflicts', requestId), requestId);
  }
}

// =============================================================================
// POST - Resolve Conflicts
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 30, `sync:conflicts:resolve:${ip}`);
    
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
    let body: unknown;
    
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check if bulk or single resolve
    const isBulk = Array.isArray((body as Record<string, unknown>).conflictIds);

    if (isBulk) {
      const validation = bulkResolveSchema.safeParse(body);
      if (!validation.success) {
        return addHeaders(
          apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
          requestId,
          rateLimitResult
        );
      }

      const { conflictIds, strategy } = validation.data;
      const results: Array<{ conflictId: string; resolved: boolean; error?: string }> = [];

      for (const conflictId of conflictIds) {
        const conflict = conflictStore.get(conflictId);
        
        if (!conflict || conflict.userId !== userId) {
          results.push({ conflictId, resolved: false, error: 'Conflict not found' });
          continue;
        }

        if (conflict.status !== 'pending') {
          results.push({ conflictId, resolved: false, error: 'Conflict already resolved' });
          continue;
        }

        // Resolve using strategy
        const resolved = ConflictResolver.resolve(
          [{
            field: conflict.field,
            serverValue: conflict.serverValue,
            clientValue: conflict.clientValue,
            lastModified: {
              server: conflict.serverModified,
              client: conflict.clientModified,
            },
          }],
          strategy as ConflictStrategy
        );

        conflict.status = 'resolved';
        conflict.resolvedAt = new Date();
        conflict.resolvedBy = strategy;
        conflict.resolution = resolved;
        conflictStore.set(conflictId, conflict);

        results.push({ conflictId, resolved: true });
      }

      const duration = Date.now() - startTime;

      return addHeaders(
        apiResponse.success(
          {
            resolved: results.filter(r => r.resolved).length,
            failed: results.filter(r => !r.resolved).length,
            results,
          },
          { meta: { requestId, duration } }
        ),
        requestId,
        rateLimitResult
      );
    } else {
      const validation = resolveConflictSchema.safeParse(body);
      if (!validation.success) {
        return addHeaders(
          apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
          requestId,
          rateLimitResult
        );
      }

      const { conflictId, strategy, customResolution } = validation.data;

      const conflict = conflictStore.get(conflictId);
      
      if (!conflict || conflict.userId !== userId) {
        return addHeaders(
          apiResponse.notFound('Conflict', requestId),
          requestId,
          rateLimitResult
        );
      }

      if (conflict.status !== 'pending') {
        return addHeaders(
          apiResponse.error(
            { message: 'Conflict already resolved', statusCode: 409, code: 'ALREADY_RESOLVED' },
            requestId
          ),
          requestId,
          rateLimitResult
        );
      }

      // Use custom resolution if provided, otherwise use strategy
      let resolution: Record<string, unknown>;
      
      if (customResolution) {
        resolution = customResolution;
      } else {
        resolution = ConflictResolver.resolve(
          [{
            field: conflict.field,
            serverValue: conflict.serverValue,
            clientValue: conflict.clientValue,
            lastModified: {
              server: conflict.serverModified,
              client: conflict.clientModified,
            },
          }],
          strategy as ConflictStrategy
        );
      }

      conflict.status = 'resolved';
      conflict.resolvedAt = new Date();
      conflict.resolvedBy = customResolution ? 'custom' : strategy;
      conflict.resolution = resolution;
      conflictStore.set(conflictId, conflict);

      const duration = Date.now() - startTime;
      log.info('Conflict resolved', { userId, conflictId, strategy, duration });

      return addHeaders(
        apiResponse.success(
          {
            conflictId,
            status: 'resolved',
            strategy: customResolution ? 'custom' : strategy,
            resolution,
          },
          { meta: { requestId, duration } }
        ),
        requestId,
        rateLimitResult
      );
    }
  } catch (error) {
    log.error('POST conflicts failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to resolve conflict', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Dismiss Conflicts
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, `sync:conflicts:dismiss:${ip}`);
    
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
    let body: unknown;
    
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = dismissSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { conflictIds, dismissAll } = validation.data;
    let dismissedCount = 0;

    if (dismissAll) {
      // Dismiss all pending conflicts for user
      for (const [id, conflict] of conflictStore) {
        if (conflict.userId === userId && conflict.status === 'pending') {
          conflict.status = 'ignored';
          conflict.resolvedAt = new Date();
          conflictStore.set(id, conflict);
          dismissedCount++;
        }
      }
    } else {
      for (const conflictId of conflictIds) {
        const conflict = conflictStore.get(conflictId);
        if (conflict && conflict.userId === userId && conflict.status === 'pending') {
          conflict.status = 'ignored';
          conflict.resolvedAt = new Date();
          conflictStore.set(conflictId, conflict);
          dismissedCount++;
        }
      }
    }

    const duration = Date.now() - startTime;
    log.info('Conflicts dismissed', { userId, dismissedCount, duration });

    return addHeaders(
      apiResponse.success(
        {
          dismissed: dismissedCount,
          message: `Dismissed ${dismissedCount} conflict(s)`,
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('DELETE conflicts failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to dismiss conflicts', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';