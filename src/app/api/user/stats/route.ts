// src/app/api/user/stats/route.ts
// =============================================================================
// USER STATISTICS ROUTES
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UserService } from '@/services/userService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'private, max-age=60',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
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
      select: { totalPoints: true, currentStreak: true },
    });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Points': String(user?.totalPoints || 0),
        'X-Current-Streak': String(user?.currentStreak || 0),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD stats failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get user statistics
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    const stats = await UserService.getUserStats(userId);

    logger.info('User stats fetched', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(stats, {
      meta: { requestId },
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('GET stats failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch stats', requestId), requestId);
  }
}

// =============================================================================
// POST - Recalculate/refresh statistics
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    logger.info('Recalculating user stats', { userId, requestId });

    // Recalculate totals
    await UserService.updateUserTotals(userId);

    // Fetch fresh stats
    const stats = await UserService.getUserStats(userId);

    logger.info('User stats recalculated', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(stats, {
      meta: { requestId },
      message: 'Statistics recalculated successfully',
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('POST stats recalculate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to recalculate stats', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';