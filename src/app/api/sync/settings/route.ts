// =============================================================================
// src/app/api/sync/settings/route.ts
// =============================================================================
// Description: User sync settings management
// Methods: GET, PUT, PATCH, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: GET: 120/min, PUT/PATCH: 30/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/settings' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, HEAD, OPTIONS',
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

const syncSettingsSchema = z.object({
  // Global sync settings
  autoSync: z.boolean().optional(),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly', 'manual']).optional(),
  syncOnLogin: z.boolean().optional(),
  syncInBackground: z.boolean().optional(),
  
  // Notification settings
  notifyOnSyncComplete: z.boolean().optional(),
  notifyOnSyncError: z.boolean().optional(),
  notifyOnNewData: z.boolean().optional(),
  
  // Advanced settings
  maxConcurrentSyncs: z.number().min(1).max(10).optional(),
  retryFailedSyncs: z.boolean().optional(),
  maxRetryAttempts: z.number().min(1).max(10).optional(),
  retryDelayMinutes: z.number().min(5).max(1440).optional(),
  
  // Data settings
  syncHistoryDays: z.number().min(7).max(365).optional(),
  autoCleanupOldData: z.boolean().optional(),
  cleanupAfterDays: z.number().min(30).max(365).optional(),
  
  // Quiet hours
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietHoursTimezone: z.string().optional(),
});

const platformSettingsSchema = z.object({
  platformId: z.string().cuid(),
  autoSync: z.boolean().optional(),
  syncPriority: z.number().min(0).max(10).optional(),
  syncInterval: z.number().min(60).max(10080).optional(), // 1 hour to 7 days
  notifyOnSync: z.boolean().optional(),
  notifyOnError: z.boolean().optional(),
});

const bulkPlatformSettingsSchema = z.object({
  platforms: z.array(platformSettingsSchema).min(1).max(50),
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

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { autoSync: true },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Auto-Sync', String(settings?.autoSync ?? true));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Sync Settings
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 120, `sync:settings:${ip}`);
    
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
    const [userSettings, notificationPrefs, platformSettings] = await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId },
      }),
      prisma.notificationPreferences.findUnique({
        where: { userId },
      }),
      prisma.userPlatform.findMany({
        where: { userId, isActive: true },
        include: {
          platform: {
            select: { id: true, name: true, slug: true, icon: true, syncInterval: true },
          },
        },
      }),
    ]);

    const duration = Date.now() - startTime;

    const response = apiResponse.success(
      {
        global: {
          autoSync: userSettings?.autoSync ?? true,
          syncFrequency: userSettings?.syncFrequency ?? 'daily',
          syncOnLogin: userSettings?.syncOnLogin ?? true,
          syncInBackground: userSettings?.syncInBackground ?? true,
          timezone: userSettings?.timezone ?? 'UTC',
        },
        notifications: {
          syncComplete: notificationPrefs?.syncComplete ?? false,
          syncFailed: notificationPrefs?.syncFailed ?? true,
        },
        advanced: {
          maxConcurrentSyncs: 3, // Default, could be stored in settings
          retryFailedSyncs: true,
          maxRetryAttempts: 3,
          retryDelayMinutes: 60,
        },
        data: {
          syncHistoryDays: userSettings?.dataRetentionDays ?? 365,
          autoCleanupOldData: true,
          cleanupAfterDays: 90,
        },
        quietHours: {
          enabled: notificationPrefs?.quietHoursEnabled ?? false,
          start: notificationPrefs?.quietHoursStart ?? '22:00',
          end: notificationPrefs?.quietHoursEnd ?? '08:00',
          timezone: notificationPrefs?.quietHoursTimezone ?? 'UTC',
        },
        platforms: platformSettings.map(p => ({
          platformId: p.platformId,
          name: p.platform.name,
          slug: p.platform.slug,
          icon: p.platform.icon,
          autoSync: p.autoSync,
          syncPriority: p.syncPriority,
          syncInterval: p.platform.syncInterval || 1440,
          notifyOnSync: p.notifyOnSync,
          notifyOnError: p.notifyOnError,
          lastSyncedAt: p.lastSyncedAt,
          nextSyncAt: p.nextSyncAt,
        })),
      },
      { meta: { requestId, duration } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET settings failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get settings', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update Global Sync Settings
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 30, `sync:settings:put:${ip}`);
    
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

    const validation = syncSettingsSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const settings = validation.data;

    // Update user settings
    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...(settings.autoSync !== undefined && { autoSync: settings.autoSync }),
        ...(settings.syncFrequency && { syncFrequency: settings.syncFrequency }),
        ...(settings.syncOnLogin !== undefined && { syncOnLogin: settings.syncOnLogin }),
        ...(settings.syncInBackground !== undefined && { syncInBackground: settings.syncInBackground }),
        ...(settings.syncHistoryDays !== undefined && { dataRetentionDays: settings.syncHistoryDays }),
      },
      create: {
        userId,
        autoSync: settings.autoSync ?? true,
        syncFrequency: settings.syncFrequency ?? 'daily',
        syncOnLogin: settings.syncOnLogin ?? true,
        syncInBackground: settings.syncInBackground ?? true,
        dataRetentionDays: settings.syncHistoryDays ?? 365,
      },
    });

    // Update notification preferences if provided
    if (settings.notifyOnSyncComplete !== undefined || 
        settings.notifyOnSyncError !== undefined ||
        settings.quietHoursEnabled !== undefined) {
      await prisma.notificationPreferences.upsert({
        where: { userId },
        update: {
          ...(settings.notifyOnSyncComplete !== undefined && { syncComplete: settings.notifyOnSyncComplete }),
          ...(settings.notifyOnSyncError !== undefined && { syncFailed: settings.notifyOnSyncError }),
          ...(settings.quietHoursEnabled !== undefined && { quietHoursEnabled: settings.quietHoursEnabled }),
          ...(settings.quietHoursStart && { quietHoursStart: settings.quietHoursStart }),
          ...(settings.quietHoursEnd && { quietHoursEnd: settings.quietHoursEnd }),
          ...(settings.quietHoursTimezone && { quietHoursTimezone: settings.quietHoursTimezone }),
        },
        create: {
          userId,
          syncComplete: settings.notifyOnSyncComplete ?? false,
          syncFailed: settings.notifyOnSyncError ?? true,
          quietHoursEnabled: settings.quietHoursEnabled ?? false,
          quietHoursStart: settings.quietHoursStart ?? '22:00',
          quietHoursEnd: settings.quietHoursEnd ?? '08:00',
          quietHoursTimezone: settings.quietHoursTimezone ?? 'UTC',
        },
      });
    }

    // Update all platform autoSync if global autoSync changed
    if (settings.autoSync !== undefined) {
      await prisma.userPlatform.updateMany({
        where: { userId, isActive: true },
        data: { autoSync: settings.autoSync },
      });
    }

    const duration = Date.now() - startTime;
    log.info('Sync settings updated', { userId, requestId, duration });

    return addHeaders(
      apiResponse.success(
        { message: 'Settings updated successfully', updated: settings },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('PUT settings failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update settings', requestId), requestId);
  }
}

// =============================================================================
// PATCH - Update Platform-Specific Settings
// =============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 30, `sync:settings:patch:${ip}`);
    
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

    // Check if bulk or single update
    const isBulk = Array.isArray((body as Record<string, unknown>).platforms);

    if (isBulk) {
      const validation = bulkPlatformSettingsSchema.safeParse(body);
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

          await prisma.userPlatform.update({
            where: { userId_platformId: { userId, platformId: platformConfig.platformId } },
            data: {
              ...(platformConfig.autoSync !== undefined && { autoSync: platformConfig.autoSync }),
              ...(platformConfig.syncPriority !== undefined && { syncPriority: platformConfig.syncPriority }),
              ...(platformConfig.notifyOnSync !== undefined && { notifyOnSync: platformConfig.notifyOnSync }),
              ...(platformConfig.notifyOnError !== undefined && { notifyOnError: platformConfig.notifyOnError }),
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
      log.info('Platform settings updated', { userId, requestId, results, duration });

      return addHeaders(
        apiResponse.success(
          {
            updated: results.filter(r => r.updated).length,
            failed: results.filter(r => !r.updated).length,
            results,
          },
          { meta: { requestId, duration } }
        ),
        requestId,
        rateLimitResult
      );
    } else {
      const validation = platformSettingsSchema.safeParse(body);
      if (!validation.success) {
        return addHeaders(
          apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
          requestId,
          rateLimitResult
        );
      }

      const platformConfig = validation.data;

      const userPlatform = await prisma.userPlatform.findUnique({
        where: { userId_platformId: { userId, platformId: platformConfig.platformId } },
      });

      if (!userPlatform) {
        return addHeaders(
          apiResponse.notFound('Platform connection', requestId),
          requestId,
          rateLimitResult
        );
      }

      await prisma.userPlatform.update({
        where: { userId_platformId: { userId, platformId: platformConfig.platformId } },
        data: {
          ...(platformConfig.autoSync !== undefined && { autoSync: platformConfig.autoSync }),
          ...(platformConfig.syncPriority !== undefined && { syncPriority: platformConfig.syncPriority }),
          ...(platformConfig.notifyOnSync !== undefined && { notifyOnSync: platformConfig.notifyOnSync }),
          ...(platformConfig.notifyOnError !== undefined && { notifyOnError: platformConfig.notifyOnError }),
        },
      });

      const duration = Date.now() - startTime;
      log.info('Platform settings updated', { userId, platformId: platformConfig.platformId, requestId, duration });

      return addHeaders(
        apiResponse.success(
          { message: 'Platform settings updated', platformId: platformConfig.platformId },
          { meta: { requestId, duration } }
        ),
        requestId,
        rateLimitResult
      );
    }
  } catch (error) {
    log.error('PATCH settings failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update platform settings', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';