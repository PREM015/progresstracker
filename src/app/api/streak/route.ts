// =============================================================================
// FILE: app/api/streak/route.ts
// PURPOSE: Main streak endpoint - get current streak info
// Methods: GET
// Auth Required: True
// Rate Limit: 60 requests/minute
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

const RATE_LIMIT = 60;
const STREAK_MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365, 500, 1000];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
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
  const rateLimitKey = `streak:${ip}`;
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

function getNextMilestone(currentStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (milestone > currentStreak) return milestone;
  }
  return null;
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
 * HEAD - Resource metadata
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const response = new NextResponse(null, { status: 200 });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /streak failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - Get current user's streak information
 *
 * Returns: currentStreak, longestStreak, streakStartDate, lastActivityDate,
 *          freezesAvailable, freezesUsed, isAtRisk, nextMilestone, hoursUntilMidnight
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const userId = session!.user.id;

    // Get streak info from service
    const streakInfo = await streakService.getStreakInfo(userId);

    // Calculate next milestone
    const nextMilestone = getNextMilestone(streakInfo.currentStreak);

    const data = {
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      streakStartDate: streakInfo.streakStartDate?.toISOString() || null,
      lastActivityDate: streakInfo.lastActivityDate?.toISOString() || null,
      isAtRisk: streakInfo.isAtRisk,
      hadActivityToday: streakInfo.hadActivityToday,
      hoursUntilMidnight: Math.round(streakInfo.hoursUntilMidnight * 10) / 10,
      nextMilestone,
      daysToNextMilestone: nextMilestone ? nextMilestone - streakInfo.currentStreak : null,
    };

    logger.info('GET /streak completed', {
      userId,
      currentStreak: data.currentStreak,
      isAtRisk: data.isAtRisk,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /streak failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch streak info', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
