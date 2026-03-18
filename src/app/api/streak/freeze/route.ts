// =============================================================================
// FILE: app/api/streak/freeze/route.ts
// PURPOSE: Use streak freeze to protect streak
// Methods: GET (freeze status), POST (use freeze)
// Auth Required: True
// Rate Limit: 20 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { streakService } from '@/services/streakService';
import { getClientIp, generateRequestId } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const freezeBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `streak-freeze:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

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
// HTTP METHOD HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * GET - Get freeze status and availability
 *
 * Returns available freezes, usage history, and whether freeze can be used today.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const userId = session!.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        streakFreezeCount: true,
        streakFreezeUsedAt: true,
        currentStreak: true,
        lastActivityDate: true,
        timezone: true,
      },
    });

    if (!user) {
      return addHeaders(apiResponse.notFound('User', requestId), requestId, rateLimitResult);
    }

    // Determine if freeze was used today
    const now = new Date();
    const userTimezone = user.timezone || 'UTC';
    let todayStart: Date;
    try {
      const dateStr = now.toLocaleDateString('en-CA', { timeZone: userTimezone });
      const [year, month, day] = dateStr.split('-').map(Number);
      todayStart = new Date(Date.UTC(year, month - 1, day));
    } catch {
      todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
    }

    const usedToday = user.streakFreezeUsedAt
      ? user.streakFreezeUsedAt >= todayStart
      : false;

    // Check if user has activity today
    const hadActivityToday = user.lastActivityDate
      ? user.lastActivityDate >= todayStart
      : false;

    const data = {
      freezesAvailable: user.streakFreezeCount,
      usedToday,
      canUseFreeze: user.streakFreezeCount > 0 && !usedToday && !hadActivityToday && user.currentStreak > 0,
      lastUsedAt: user.streakFreezeUsedAt?.toISOString() || null,
      currentStreak: user.currentStreak,
      hadActivityToday,
    };

    logger.info('GET /streak/freeze completed', {
      userId,
      freezesAvailable: data.freezesAvailable,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /streak/freeze failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get freeze status', requestId), requestId);
  }
}

/**
 * POST - Use a streak freeze
 *
 * Body: { reason?: string }
 * Uses one streak freeze to protect the current streak for today.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const userId = session!.user.id;

    // Parse optional body
    let reason: string | undefined;
    try {
      const body = await request.json();
      const validation = freezeBodySchema.safeParse(body);
      if (validation.success) {
        reason = validation.data.reason;
      }
    } catch {
      // Body is optional, continue without it
    }

    // Attempt to use freeze
    const success = await streakService.useStreakFreeze(userId);

    if (!success) {
      // Determine why it failed
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { streakFreezeCount: true, streakFreezeUsedAt: true, currentStreak: true },
      });

      let message = 'Unable to use streak freeze';
      if (!user || user.currentStreak === 0) {
        message = 'No active streak to protect';
      } else if (user.streakFreezeCount <= 0) {
        message = 'No streak freezes available';
      } else {
        message = 'Streak freeze already used today';
      }

      return addHeaders(
        apiResponse.validationError(message, undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Get updated freeze count
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakFreezeCount: true, currentStreak: true },
    });

    const data = {
      success: true,
      message: 'Streak freeze used successfully',
      freezesRemaining: updatedUser?.streakFreezeCount ?? 0,
      currentStreak: updatedUser?.currentStreak ?? 0,
      reason: reason || null,
    };

    logger.info('POST /streak/freeze completed', {
      userId,
      freezesRemaining: data.freezesRemaining,
      reason,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /streak/freeze failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to use streak freeze', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
