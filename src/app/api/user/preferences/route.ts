// src/app/api/user/preferences/route.ts
// =============================================================================
// USER PREFERENCES ROUTES (Privacy & Localization)
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
// SCHEMAS
// =============================================================================

const privacySchema = z.object({
  isPublic: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  showGoals: z.boolean().optional(),
  showPlatforms: z.boolean().optional(),
  showStreak: z.boolean().optional(),
});

const localizationSchema = z.object({
  language: z.string().min(2).max(5).optional(),
  timezone: z.string().max(50).optional(),
  dateFormat: z.string().max(20).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
});

const preferencesSchema = z.object({
  type: z.enum(['privacy', 'localization', 'all']),
  data: z.record(z.unknown()),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'private, max-age=60',
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { updatedAt: true },
    });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'Last-Modified': user?.updatedAt?.toUTCString() || '',
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD preferences failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get user preferences
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferredLanguage: true,
        timezone: true,
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
      },
    });

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    logger.info('Preferences fetched', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        user,
        settings,
      },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('GET preferences failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch preferences', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update preferences
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

    const { userPreferences, settingsPreferences } = body as {
      userPreferences?: Record<string, unknown>;
      settingsPreferences?: Record<string, unknown>;
    };

    // Update user preferences
    if (userPreferences) {
      const privacyValidation = privacySchema.merge(localizationSchema).safeParse(userPreferences);
      
      if (!privacyValidation.success) {
        return addHeaders(
          apiResponse.validationError('Invalid user preferences', privacyValidation.error.errors, requestId),
          requestId
        );
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          preferredLanguage: userPreferences.preferredLanguage as string | undefined,
          timezone: userPreferences.timezone as string | undefined,
          isPublic: userPreferences.isPublic as boolean | undefined,
          showEmail: userPreferences.showEmail as boolean | undefined,
          showLocation: userPreferences.showLocation as boolean | undefined,
          showActivity: userPreferences.showActivity as boolean | undefined,
          showAchievements: userPreferences.showAchievements as boolean | undefined,
          showGoals: userPreferences.showGoals as boolean | undefined,
          showPlatforms: userPreferences.showPlatforms as boolean | undefined,
          showStreak: userPreferences.showStreak as boolean | undefined,
          updatedAt: new Date(),
        },
      });
    }

    // Update settings preferences
    if (settingsPreferences) {
      await prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          ...settingsPreferences,
        },
        update: {
          ...settingsPreferences,
          updatedAt: new Date(),
        },
      });
    }

    // Fetch updated data
    const [user, settings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          preferredLanguage: true,
          timezone: true,
          isPublic: true,
          showEmail: true,
          showLocation: true,
          showActivity: true,
          showAchievements: true,
          showGoals: true,
          showPlatforms: true,
          showStreak: true,
        },
      }),
      prisma.userSettings.findUnique({
        where: { userId },
      }),
    ]);

    logger.info('Preferences updated', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { user, settings },
      {
        meta: { requestId },
        message: 'Preferences updated successfully',
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('PUT preferences failed', { requestId }, error);
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

    const validation = preferencesSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { type, data } = validation.data;

    if (type === 'privacy') {
      const privacyValidation = privacySchema.safeParse(data);
      if (!privacyValidation.success) {
        return addHeaders(
          apiResponse.validationError('Invalid privacy data', privacyValidation.error.errors, requestId),
          requestId
        );
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          ...privacyValidation.data,
          updatedAt: new Date(),
        },
      });
    } else if (type === 'localization') {
      const localizationValidation = localizationSchema.safeParse(data);
      if (!localizationValidation.success) {
        return addHeaders(
          apiResponse.validationError('Invalid localization data', localizationValidation.error.errors, requestId),
          requestId
        );
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          preferredLanguage: localizationValidation.data.language,
          timezone: localizationValidation.data.timezone,
          updatedAt: new Date(),
        },
      });

      await prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          language: localizationValidation.data.language,
          timezone: localizationValidation.data.timezone,
          dateFormat: localizationValidation.data.dateFormat,
          timeFormat: localizationValidation.data.timeFormat,
        },
        update: {
          language: localizationValidation.data.language,
          timezone: localizationValidation.data.timezone,
          dateFormat: localizationValidation.data.dateFormat,
          timeFormat: localizationValidation.data.timeFormat,
          updatedAt: new Date(),
        },
      });
    }

    logger.info('Preferences patched', {
      userId,
      type,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: 'Preferences updated' },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('PATCH preferences failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update preferences', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';