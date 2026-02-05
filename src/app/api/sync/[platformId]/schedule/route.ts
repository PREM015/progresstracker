// =============================================================================
// src/app/api/sync/[platformId]/schedule/route.ts
// =============================================================================
// Description: Manage sync schedule for specific platform
// Methods: GET, PUT, DELETE, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: 60/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SyncScheduler } from '@/services/sync/syncScheduler';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { addMinutes } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/[platformId]/schedule' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, HEAD, OPTIONS',
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

const updateScheduleSchema = z.object({
  enabled: z.boolean(),
  intervalMinutes: z.number().min(60).max(10080).optional(), // 1 hour to 7 days
  nextSyncAt: z.string().datetime().optional(),
  priority: z.number().min(0).max(10).optional(),
  notifyOnSync: z.boolean().optional(),
  notifyOnError: z.boolean().optional(),
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

    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId: session.user.id, platformId } },
      select: { autoSync: true, nextSyncAt: true },
    });

    if (!userPlatform) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Auto-Sync', String(userPlatform.autoSync));
    response.headers.set('X-Next-Sync', userPlatform.nextSyncAt?.toISOString() || 'not-scheduled');
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Platform Schedule
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
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:schedule:platform:${ip}`);
    
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

    // Get platform schedule
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId, platformId } },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            syncInterval: true,
          },
        },
      },
    });

    if (!userPlatform) {
      return addHeaders(
        apiResponse.notFound('Platform connection', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Calculate next sync time if auto-sync enabled
    let estimatedNextSync = userPlatform.nextSyncAt;
    if (userPlatform.autoSync && !estimatedNextSync) {
      const intervalMinutes = userPlatform.platform.syncInterval || 1440;
      estimatedNextSync = addMinutes(userPlatform.lastSyncedAt || new Date(), intervalMinutes);
    }

    const duration = Date.now() - startTime;

    return addHeaders(
      apiResponse.success(
        {
          platform: {
            id: userPlatform.platform.id,
            name: userPlatform.platform.name,
            slug: userPlatform.platform.slug,
            icon: userPlatform.platform.icon,
          },
          schedule: {
            enabled: userPlatform.autoSync,
            intervalMinutes: userPlatform.platform.syncInterval || 1440,
            nextSyncAt: userPlatform.nextSyncAt,
            estimatedNextSync,
            lastSyncedAt: userPlatform.lastSyncedAt,
            priority: userPlatform.syncPriority,
          },
          notifications: {
            onSync: userPlatform.notifyOnSync,
            onError: userPlatform.notifyOnError,
          },
          status: {
            consecutiveFailures: userPlatform.consecutiveFailures,
            isHealthy: userPlatform.consecutiveFailures < 3,
          },
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('GET platform schedule failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get schedule', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update Platform Schedule
// =============================================================================

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { platformId } = await context.params;

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 30, `sync:schedule:put:${ip}`);
    
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
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = updateScheduleSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { enabled, intervalMinutes, nextSyncAt, priority, notifyOnSync, notifyOnError } = validation.data;

    // Verify platform exists
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId, platformId } },
      include: { platform: { select: { name: true } } },
    });

    if (!userPlatform) {
      return addHeaders(
        apiResponse.notFound('Platform connection', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Calculate next sync time
    let calculatedNextSyncAt: Date | null = null;
    if (enabled) {
      if (nextSyncAt) {
        calculatedNextSyncAt = new Date(nextSyncAt);
      } else if (intervalMinutes) {
        calculatedNextSyncAt = addMinutes(new Date(), intervalMinutes);
      }
    }

    // Update schedule
    const updated = await prisma.userPlatform.update({
      where: { userId_platformId: { userId, platformId } },
      data: {
        autoSync: enabled,
        ...(priority !== undefined && { syncPriority: priority }),
        ...(calculatedNextSyncAt && { nextSyncAt: calculatedNextSyncAt }),
        ...(notifyOnSync !== undefined && { notifyOnSync }),
        ...(notifyOnError !== undefined && { notifyOnError }),
      },
    });

    // Use scheduler service if needed
    if (enabled && intervalMinutes) {
      await SyncScheduler.schedule(userId, platformId, userPlatform.id, intervalMinutes);
    } else if (!enabled) {
      await SyncScheduler.unschedule(userPlatform.id);
    }

    const duration = Date.now() - startTime;
    log.info('Platform schedule updated', { userId, platformId, enabled, intervalMinutes, duration });

    return addHeaders(
      apiResponse.success(
        {
          platform: {
            id: platformId,
            name: userPlatform.platform.name,
          },
          schedule: {
            enabled: updated.autoSync,
            intervalMinutes,
            nextSyncAt: updated.nextSyncAt,
            priority: updated.syncPriority,
          },
          notifications: {
            onSync: updated.notifyOnSync,
            onError: updated.notifyOnError,
          },
          message: enabled 
            ? `Auto-sync enabled: Next sync at ${updated.nextSyncAt?.toISOString()}`
            : 'Auto-sync disabled',
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('PUT platform schedule failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update schedule', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Disable Platform Schedule
// =============================================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { platformId } = await context.params;

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 30, `sync:schedule:delete:${ip}`);
    
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

    // Disable schedule
    const userPlatform = await prisma.userPlatform.update({
      where: { userId_platformId: { userId, platformId } },
      data: {
        autoSync: false,
        nextSyncAt: null,
      },
      include: { platform: { select: { name: true } } },
    });

    await SyncScheduler.unschedule(userPlatform.id);

    const duration = Date.now() - startTime;
    log.info('Platform schedule disabled', { userId, platformId, duration });

    return addHeaders(
      apiResponse.success(
        {
          platform: {
            id: platformId,
            name: userPlatform.platform.name,
          },
          disabled: true,
          message: 'Auto-sync schedule has been disabled',
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('DELETE platform schedule failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to disable schedule', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';