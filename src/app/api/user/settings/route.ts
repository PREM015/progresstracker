// src/app/api/user/settings/route.ts
// =============================================================================
// USER SETTINGS ROUTES
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { cache } from '@/lib/redis';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UserService } from '@/services/userService';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const settingsSchema = z.object({
  // Appearance
  theme: z.enum(['light', 'dark', 'system']).optional(),
  accentColor: z.string().max(20).optional(),
  compactMode: z.boolean().optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  reducedMotion: z.boolean().optional(),
  highContrast: z.boolean().optional(),

  // Localization
  language: z.string().min(2).max(5).optional(),
  timezone: z.string().max(50).optional(),
  dateFormat: z.string().max(20).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  weekStartsOn: z.number().min(0).max(6).optional(),
  numberFormat: z.string().max(10).optional(),

  // Sync
  autoSync: z.boolean().optional(),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'manual']).optional(),
  syncOnLogin: z.boolean().optional(),
  syncInBackground: z.boolean().optional(),

  // Privacy
  publicProfile: z.boolean().optional(),
  showInLeaderboard: z.boolean().optional(),
  allowAnalytics: z.boolean().optional(),
  allowCookies: z.boolean().optional(),

  // Dashboard
  dashboardLayout: z.record(z.unknown()).nullable().optional(),
  defaultDateRange: z.string().max(10).optional(),
  showWelcomeBanner: z.boolean().optional(),

  // Features
  keyboardShortcuts: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),

  // Data
  dataRetentionDays: z.number().min(30).max(3650).optional(),
});

const resetSchema = z.object({
  action: z.literal('reset'),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
    };
  }

  return { error: null, session, rateLimitResult };
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session!.user.id },
      select: { id: true, updatedAt: true },
    });

    if (!settings) {
      return addHeaders(new NextResponse(null, { status: 404 }), requestId);
    }

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'Last-Modified': settings.updatedAt.toUTCString(),
        'ETag': `"settings-${settings.id}"`,
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD settings failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get user settings
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    // Cache-first: try Redis before DB
    const cacheKey = `settings:${userId}`;
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      logger.debug('Settings served from cache', { userId, requestId });
      const response = apiResponse.success(cached, {
        meta: { requestId, source: 'cache' },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      });
      return addHeaders(response, requestId);
    }

    logger.debug('Fetching user settings from DB', { userId, requestId });

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        theme: true,
        accentColor: true,
        compactMode: true,
        fontSize: true,
        reducedMotion: true,
        highContrast: true,
        language: true,
        timezone: true,
        dateFormat: true,
        timeFormat: true,
        weekStartsOn: true,
        numberFormat: true,
        autoSync: true,
        syncFrequency: true,
        syncOnLogin: true,
        syncInBackground: true,
        publicProfile: true,
        showInLeaderboard: true,
        allowAnalytics: true,
        allowCookies: true,
        dashboardLayout: true,
        defaultDateRange: true,
        showWelcomeBanner: true,
        keyboardShortcuts: true,
        soundEffects: true,
        desktopNotifications: true,
        dataRetentionDays: true,
        updatedAt: true,
      },
    });

    // Create default settings if not exist
    if (!settings) {
      logger.info('Creating default settings', { userId, requestId });
      settings = await prisma.userSettings.create({
        data: { userId },
      });
    }

    // Cache for 10 minutes
    await cache.set(cacheKey, settings, 600);

    logger.info('Settings fetched', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(settings, {
      meta: { requestId },
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('GET settings failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch settings', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update all settings
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Settings validation failed', { userId, requestId, errors: validation.error.errors });
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const settings = await UserService.updateSettings(userId, validation.data);

    // Invalidate cache
    await cache.del(`settings:${userId}`);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SETTINGS_CHANGE',
        category: 'user',
        entityType: 'settings',
        entityId: settings.id,
        description: 'Settings updated',
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Settings updated', {
      userId,
      requestId,
      duration: Date.now() - startTime,
      fields: Object.keys(validation.data),

    });

    const response = apiResponse.success(settings, {
      meta: { requestId },
      message: 'Settings updated successfully',
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('PUT settings failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update settings', requestId), requestId);
  }
}

// =============================================================================
// PATCH - Partial settings update
// =============================================================================

import { Prisma } from '@prisma/client';

// helper: JSON value Prisma ke liye safe cast
const toJsonValue = (v: unknown): Prisma.InputJsonValue | undefined => {
  if (v === undefined) return undefined;
  return v as Prisma.InputJsonValue;
};

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    // ✅ type-safe parsing
    const parsed = settingsSchema.partial().safeParse(body);

    if (!parsed.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', parsed.error.errors, requestId),
        requestId
      );
    }

    const data = parsed.data; // ✅ fully typed now


    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        timezone: data.timezone,
        theme: data.theme,
        accentColor: data.accentColor,
        compactMode: data.compactMode,
        fontSize: data.fontSize,
        dashboardLayout: (data.dashboardLayout ?? {}) as Prisma.JsonObject,
        dataRetentionDays: data.dataRetentionDays,
        updatedAt: new Date(),
      },
      update: {
        timezone: data.timezone,
        theme: data.theme,
        accentColor: data.accentColor,
        compactMode: data.compactMode,
        fontSize: data.fontSize,

        // JSON fields
        dashboardLayout:
          data.dashboardLayout === undefined ? undefined : toJsonValue(data.dashboardLayout),


        dataRetentionDays: data.dataRetentionDays,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    await cache.del(`settings:${userId}`);

    logger.info('Settings patched', {
      userId,
      requestId,
      duration: Date.now() - startTime,
      fields: Object.keys(data),
    });

    const response = apiResponse.success(settings, {
      meta: { requestId },
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('PATCH settings failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update settings', requestId), requestId);
  }
}

// =============================================================================
// POST - Reset settings to default
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    const validation = resetSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid action. Use { "action": "reset" }', undefined, requestId),
        requestId
      );
    }

    logger.info('Resetting settings to default', { userId, requestId });

    // Delete and recreate with defaults
    await prisma.userSettings.deleteMany({ where: { userId } });
    await cache.del(`settings:${userId}`);

    const settings = await prisma.userSettings.create({
      data: { userId },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SETTINGS_CHANGE',
        category: 'user',
        description: 'Settings reset to default',
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Settings reset', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(settings, {
      meta: { requestId },
      message: 'Settings reset to default',
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('POST settings failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to reset settings', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';