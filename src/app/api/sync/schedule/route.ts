// =============================================================================
// src/app/api/sync/schedule/route.ts
// =============================================================================
// Description: Global sync schedule management
// Methods: GET, PUT, PATCH, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: GET: 60/min, PUT/PATCH: 20/min
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

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/schedule' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, HEAD, OPTIONS',
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
  autoSync: z.boolean().optional(),
  syncFrequency: z.enum(['hourly', 'daily', 'weekly', 'manual']).optional(),
  syncTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(), // HH:MM format
  syncDays: z.array(z.number().min(0).max(6)).optional(), // 0-6 for days of week
  timezone: z.string().optional(),
  pauseUntil: z.string().datetime().nullable().optional(),
});

const platformScheduleSchema = z.object({
  platformId: z.string().cuid(),
  enabled: z.boolean(),
  intervalMinutes: z.number().min(60).max(10080).optional(), // 1 hour to 7 days
  priority: z.number().min(0).max(10).optional(),
});

const bulkUpdateSchema = z.object({
  platforms: z.array(platformScheduleSchema).min(1).max(50),
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

// Sync frequency to minutes mapping
const FREQUENCY_TO_MINUTES: Record<string, number> = {
  hourly: 60,
  daily: 1440,
  weekly: 10080,
  manual: 0,
};

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

    const stats = await SyncScheduler.getStats();
    const userSchedules = await SyncScheduler.getUserSchedules(session.user.id);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Scheduled-Platforms', String(userSchedules.filter(s => s.isActive).length));
    response.headers.set('X-Global-Due-Now', String(stats.dueNow));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Schedule Settings
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:schedule:${ip}`);
    
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

    // Get user settings
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        autoSync: true,
        syncFrequency: true,
        timezone: true,
      },
    });

    // Get platform schedules
    const userSchedules = await SyncScheduler.getUserSchedules(userId);

    // Get scheduler stats
    const schedulerStats = await SyncScheduler.getStats();

    // Get connected platforms with schedule info
    const platforms = await prisma.userPlatform.findMany({
      where: { userId, isActive: true },
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

    const duration = Date.now() - startTime;

    const response = apiResponse.success(
      {
        global: {
          autoSync: userSettings?.autoSync ?? true,
          syncFrequency: userSettings?.syncFrequency ?? 'daily',
          timezone: userSettings?.timezone ?? 'UTC',
        },
        stats: {
          totalScheduled: schedulerStats.totalScheduled,
          dueNow: schedulerStats.dueNow,
          nextHour: schedulerStats.nextHour,
          paused: schedulerStats.paused,
        },
        platforms: platforms.map(p => {
          const schedule = userSchedules.find(s => s.platformId === p.platformId);
          return {
            platformId: p.platformId,
            name: p.platform.name,
            slug: p.platform.slug,
            icon: p.platform.icon,
            autoSync: p.autoSync,
            syncInterval: schedule?.syncInterval || p.platform.syncInterval || 1440,
            syncPriority: p.syncPriority,
            nextSyncAt: p.nextSyncAt,
            lastSyncedAt: p.lastSyncedAt,
            isScheduled: schedule?.isActive ?? p.autoSync,
          };
        }),
        nextSync: platforms
          .filter(p => p.autoSync && p.nextSyncAt)
          .sort((a, b) => (a.nextSyncAt?.getTime() || 0) - (b.nextSyncAt?.getTime() || 0))[0]?.nextSyncAt || null,
      },
      { meta: { requestId, duration } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET schedule failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get schedule', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update Global Schedule Settings
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, `sync:schedule:put:${ip}`);
    
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

    const validation = updateScheduleSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { autoSync, syncFrequency, timezone, pauseUntil } = validation.data;

    // Update user settings
    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...(autoSync !== undefined && { autoSync }),
        ...(syncFrequency && { syncFrequency }),
        ...(timezone && { timezone }),
      },
      create: {
        userId,
        autoSync: autoSync ?? true,
        syncFrequency: syncFrequency ?? 'daily',
        timezone: timezone ?? 'UTC',
      },
    });

    // Update all platform schedules if autoSync changed
    if (autoSync !== undefined) {
      await prisma.userPlatform.updateMany({
        where: { userId, isActive: true },
        data: { autoSync },
      });

      // Update next sync times based on frequency
      if (autoSync && syncFrequency) {
        const intervalMinutes = FREQUENCY_TO_MINUTES[syncFrequency] || 1440;
        const nextSyncAt = new Date(Date.now() + intervalMinutes * 60 * 1000);

        await prisma.userPlatform.updateMany({
          where: { userId, isActive: true },
          data: { nextSyncAt },
        });
      }
    }

    // Handle pause
    if (pauseUntil !== undefined) {
      if (pauseUntil) {
        // Pause all syncs until specified time
        await prisma.userPlatform.updateMany({
          where: { userId, isActive: true },
          data: {
            autoSync: false,
            nextSyncAt: new Date(pauseUntil),
          },
        });
      } else {
        // Resume syncs
        const intervalMinutes = FREQUENCY_TO_MINUTES[syncFrequency || 'daily'] || 1440;
        await prisma.userPlatform.updateMany({
          where: { userId, isActive: true },
          data: {
            autoSync: true,
            nextSyncAt: new Date(Date.now() + intervalMinutes * 60 * 1000),
          },
        });
      }
    }

    const duration = Date.now() - startTime;
    log.info('Schedule updated', { userId, requestId, autoSync, syncFrequency, duration });

    const response = apiResponse.success(
      {
        autoSync: autoSync ?? true,
        syncFrequency: syncFrequency ?? 'daily',
        timezone: timezone ?? 'UTC',
        pauseUntil,
        message: 'Schedule settings updated successfully',
      },
      { meta: { requestId, duration } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('PUT schedule failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update schedule', requestId), requestId);
  }
}

// =============================================================================
// PATCH - Update Platform Schedules
// =============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, `sync:schedule:patch:${ip}`);
    
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

    const validation = bulkUpdateSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { platforms } = validation.data;
    const results: Array<{ platformId: string; updated: boolean; error?: string }> = [];

    for (const platformConfig of platforms) {
      try {
        const userPlatform = await prisma.userPlatform.findUnique({
          where: { userId_platformId: { userId, platformId: platformConfig.platformId } },
        });

        if (!userPlatform) {
          results.push({ platformId: platformConfig.platformId, updated: false, error: 'Platform not connected' });
          continue;
        }

        const nextSyncAt = platformConfig.enabled && platformConfig.intervalMinutes
          ? new Date(Date.now() + platformConfig.intervalMinutes * 60 * 1000)
          : null;

        await prisma.userPlatform.update({
          where: { userId_platformId: { userId, platformId: platformConfig.platformId } },
          data: {
            autoSync: platformConfig.enabled,
            syncPriority: platformConfig.priority ?? userPlatform.syncPriority,
            nextSyncAt,
          },
        });

        results.push({ platformId: platformConfig.platformId, updated: true });
      } catch (error) {
        results.push({
          platformId: platformConfig.platformId,
          updated: false,
          error: error instanceof Error ? error.message : 'Update failed',
        });
      }
    }

    const duration = Date.now() - startTime;
    log.info('Platform schedules updated', { userId, requestId, results, duration });

    const response = apiResponse.success(
      {
        updated: results.filter(r => r.updated).length,
        failed: results.filter(r => !r.updated).length,
        results,
      },
      { meta: { requestId, duration } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('PATCH schedule failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update platform schedules', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';