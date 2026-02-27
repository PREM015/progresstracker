// src/app/api/user/notifications/route.ts
// =============================================================================
// NOTIFICATION PREFERENCES ROUTES
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UserService } from '@/services/userService';

// =============================================================================
// SCHEMAS
// =============================================================================

const notificationPrefsSchema = z.object({
  enabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  emailAddress: z.string().email().nullable().optional(),
  achievementAlerts: z.boolean().optional(),
  goalReminders: z.boolean().optional(),
  goalCompleted: z.boolean().optional(),
  streakAlerts: z.boolean().optional(),
  syncComplete: z.boolean().optional(),
  syncFailed: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  monthlyReport: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  billingAlerts: z.boolean().optional(),
  newFeatures: z.boolean().optional(),
  tips: z.boolean().optional(),
  communityUpdates: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursTimezone: z.string().optional(),
  digestEnabled: z.boolean().optional(),
  digestFrequency: z.enum(['realtime', 'daily', 'weekly']).optional(),
  digestTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  digestDay: z.number().min(0).max(6).optional(),
  dndEnabled: z.boolean().optional(),
  dndUntil: z.string().datetime().nullable().optional(),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
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
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        logger.info('request is ', { request })
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const prefs = await prisma.notificationPreferences.findUnique({
      where: { userId: session.user.id },
      select: { id: true, updatedAt: true },
    });

    const response = new NextResponse(null, {
      status: prefs ? 200 : 404,
      headers: prefs
        ? {
            'Last-Modified': prefs.updatedAt.toUTCString(),
            'ETag': `"notif-${prefs.id}"`,
          }
        : {},
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD notifications failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get notification preferences
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    let preferences = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

  // src/app/api/user/notifications/route.ts (continued)
// =============================================================================

    // Create default preferences if not exist
    if (!preferences) {
      preferences = await prisma.notificationPreferences.create({
        data: { userId },
      });
    }

    logger.info('Notification preferences fetched', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(preferences, {
      meta: { requestId },
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('GET notifications failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch notification preferences', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update notification preferences (full update)
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

    const validation = notificationPrefsSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

 const data = {
  ...validation.data,
  dndUntil: validation.data.dndUntil ? new Date(validation.data.dndUntil) : null,
};

const preferences = await UserService.updateNotificationPreferences(userId, data);


    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SETTINGS_CHANGE',
        category: 'notification',
        description: 'Notification preferences updated',
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Notification preferences updated', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(preferences, {
      meta: { requestId },
      message: 'Notification preferences updated successfully',
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('PUT notifications failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update preferences', requestId), requestId);
  }
}

// =============================================================================
// PATCH - Partial update
// =============================================================================

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

    const validation = notificationPrefsSchema.partial().safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId, ...validation.data },
      update: { ...validation.data, updatedAt: new Date() },
    });

    logger.info('Notification preferences patched', {
      userId,
      requestId,
      fields: Object.keys(validation.data),
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(preferences, {
      meta: { requestId },
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('PATCH notifications failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update preferences', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';