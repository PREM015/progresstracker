// =============================================================================
// src/app/api/sync/[platformId]/reset/route.ts
// =============================================================================
// Description: Reset platform sync state and data
// Methods: POST, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: 5/hour
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { syncRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/[platformId]/reset' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, HEAD, OPTIONS',
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

const resetOptionsSchema = z.object({
  clearData: z.boolean().default(false),          // Delete all tracker entries
  clearLogs: z.boolean().default(true),           // Delete sync logs
  clearCache: z.boolean().default(true),          // Clear cached stats
  resetConnection: z.boolean().default(false),    // Reset connection credentials
  resetSchedule: z.boolean().default(false),      // Reset auto-sync schedule
  keepRecentDays: z.number().min(0).max(365).optional(), // Keep data from last N days
  confirmation: z.literal('RESET').optional(),     // Required for destructive operations
});

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
  params: Promise<{ platformId: string }>;
}

interface ResetResult {
  entriesDeleted: number;
  logsDeleted: number;
  connectionReset: boolean;
  scheduleReset: boolean;
  cacheCleared: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `reset_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
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

    const [entryCount, logCount] = await Promise.all([
      prisma.trackerEntry.count({
        where: { userId: session.user.id, platformId },
      }),
      prisma.syncLog.count({
        where: { userId: session.user.id, platformId },
      }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Entry-Count', String(entryCount));
    response.headers.set('X-Log-Count', String(logCount));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Reset Platform
// =============================================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { platformId } = await context.params;

    // Very strict rate limit for reset operations
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(syncRateLimiter, 5, `sync:reset:${ip}`);
    
    if (!rateLimitResult.success) {
      log.warn('Reset rate limit exceeded', { ip, requestId });
      return addHeaders(apiResponse.rateLimited(3600, requestId), requestId, rateLimitResult);
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

    const validation = resetOptionsSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const {
      clearData,
      clearLogs,
      clearCache,
      resetConnection,
      resetSchedule,
      keepRecentDays,
      confirmation,
    } = validation.data;

    // Require confirmation for destructive operations
    if ((clearData || resetConnection) && confirmation !== 'RESET') {
      return addHeaders(
        apiResponse.error(
          {
            message: 'Confirmation required for destructive operations. Please include confirmation: "RESET"',
            statusCode: 400,
            code: 'CONFIRMATION_REQUIRED',
          },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Verify platform connection
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId, platformId } },
      include: { platform: { select: { name: true, slug: true } } },
    });

    if (!userPlatform) {
      return addHeaders(
        apiResponse.notFound('Platform connection', requestId),
        requestId,
        rateLimitResult
      );
    }

    log.info('Platform reset initiated', {
      userId,
      platformId,
      clearData,
      clearLogs,
      clearCache,
      resetConnection,
      resetSchedule,
      requestId,
    });

    const result: ResetResult = {
      entriesDeleted: 0,
      logsDeleted: 0,
      connectionReset: false,
      scheduleReset: false,
      cacheCleared: false,
    };

    // Start transaction for consistency
    await prisma.$transaction(async (tx) => {
      // Clear tracker entries if requested
      if (clearData) {
        const dateFilter = keepRecentDays
          ? { lt: new Date(Date.now() - keepRecentDays * 24 * 60 * 60 * 1000) }
          : {};

        const deleteResult = await tx.trackerEntry.deleteMany({
          where: {
            userId,
            platformId,
            ...(keepRecentDays ? { date: dateFilter } : {}),
          },
        });
        result.entriesDeleted = deleteResult.count;
      }

      // Clear sync logs if requested
      if (clearLogs) {
        const deleteResult = await tx.syncLog.deleteMany({
          where: { userId, platformId },
        });
        result.logsDeleted = deleteResult.count;
      }

      // Clear cache and reset sync state
      const updateData: Record<string, unknown> = {
        syncStatus: SyncStatus.IDLE,
        consecutiveFailures: 0,
        lastSyncError: null,
        syncAttempts: 0,
      };

      if (clearCache) {
        updateData.cachedStats = null;
        updateData.statsUpdatedAt = null;
        updateData.platformData = null;
        result.cacheCleared = true;
      }

      if (resetConnection) {
        updateData.credentials = null;
        updateData.accessToken = null;
        updateData.refreshToken = null;
        updateData.apiKey = null;
        updateData.tokenExpiresAt = null;
        updateData.connectionStatus = 'disconnected';
        updateData.isVerified = false;
        result.connectionReset = true;
      }

      if (resetSchedule) {
        updateData.autoSync = false;
        updateData.nextSyncAt = null;
        updateData.syncPriority = 0;
        result.scheduleReset = true;
      }

      // Update user platform
      await tx.userPlatform.update({
        where: { userId_platformId: { userId, platformId } },
        data: updateData,
      });
    });

    const duration = Date.now() - startTime;
    log.info('Platform reset completed', {
      userId,
      platformId,
      result,
      duration,
    });

    return addHeaders(
      apiResponse.success(
        {
          success: true,
          platform: {
            id: platformId,
            name: userPlatform.platform.name,
            slug: userPlatform.platform.slug,
          },
          result,
          message: `Platform reset completed successfully`,
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Platform reset failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to reset platform', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';