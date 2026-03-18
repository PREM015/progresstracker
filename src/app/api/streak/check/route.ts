// =============================================================================
// FILE: app/api/streak/check/route.ts
// PURPOSE: Check and update streak status
// Methods: GET (status check), POST (trigger streak check/record activity)
// Auth Required: True
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { streakService } from '@/services/streakService';
import { getClientIp, generateRequestId } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

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
  const rateLimitKey = `streak-check:${ip}`;
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
 * GET - Get streak status without updating
 *
 * Returns current streak info and whether user needs to log activity today.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const userId = session!.user.id;

    const streakInfo = await streakService.getStreakInfo(userId);

    const data = {
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      hadActivityToday: streakInfo.hadActivityToday,
      isAtRisk: streakInfo.isAtRisk,
      hoursUntilMidnight: Math.round(streakInfo.hoursUntilMidnight * 10) / 10,
      lastActivityDate: streakInfo.lastActivityDate?.toISOString() || null,
      streakStartDate: streakInfo.streakStartDate?.toISOString() || null,
      status: streakInfo.hadActivityToday
        ? 'safe'
        : streakInfo.isAtRisk
        ? 'at_risk'
        : streakInfo.currentStreak > 0
        ? 'pending'
        : 'inactive',
    };

    logger.info('GET /streak/check completed', {
      userId,
      status: data.status,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /streak/check failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to check streak status', requestId), requestId);
  }
}

/**
 * POST - Manually trigger streak check / record activity
 *
 * Records that the user was active today and updates streak accordingly.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const userId = session!.user.id;

    // Record activity and update streak
    const result = await streakService.recordActivity(userId);

    const data = {
      success: result.success,
      currentStreak: result.newStreak,
      streakBroken: result.streakBroken,
      milestoneReached: result.milestoneReached || null,
      message: result.message,
    };

    logger.info('POST /streak/check completed', {
      userId,
      newStreak: result.newStreak,
      streakBroken: result.streakBroken,
      milestoneReached: result.milestoneReached,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /streak/check failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update streak', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
