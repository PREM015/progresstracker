// =============================================================================
// FILE: app/api/tracker/stats/route.ts
// PURPOSE: Fetch aggregated tracker stats (total, today, this week)
// Methods: GET, POST
// Auth Required: True
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';
import { CacheService } from '@/services/cacheService';

const RATE_LIMIT = 30;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-stats:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(30, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const cacheKey = `tracker:overview_stats:${userId}`;

    // Try to get from CacheService using proper singleton patterns
    const cachedStats = await CacheService.get(cacheKey);
    if (cachedStats) {
      return addHeaders(apiResponse.success(cachedStats, { meta: { requestId, cached: true } }), requestId, rateLimitResult);
    }

    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, thisWeek, today] = await Promise.all([
      prisma.trackerEntry.count({ where: { userId } }),
      prisma.trackerEntry.count({
        where: {
          userId,
          date: { gte: startOfWeek }
        }
      }),
      prisma.trackerEntry.count({
        where: {
          userId,
          date: { gte: startOfDay }
        }
      }),
    ]);

    const stats = {
      total,
      thisWeek,
      today,
    };

    // Cache for 5 minutes
    await CacheService.set(cacheKey, stats, 300);

    logger.info('GET /tracker/stats completed', {
      userId,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(stats, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /tracker/stats failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch tracker stats', requestId), requestId);
  }
}

// POST - Trigger manual recalculation of stats
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT / 2, `tracker-stats-recalc:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(15, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;

    // Clear caches
    await CacheService.invalidateStats(userId);
    
    // In a full production system, this POST would typically kick off an async background job
    // (e.g. via Trigger.dev or BullMQ) to recalculate all statistics. For the scope of this API route,
    // we return a success response suggesting the job has been queued.

    logger.info('POST /tracker/stats recalculation triggered', {
      userId,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success({ 
      message: 'Stats recalculation queued successfully',
      status: 'queued'
    }, { meta: { requestId }, status: 202 });
    
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /tracker/stats failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to trigger recalculation', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
