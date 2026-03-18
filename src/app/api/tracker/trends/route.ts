// =============================================================================
// FILE: app/api/tracker/trends/route.ts
// PURPOSE: Get trend data for tracker metrics
// Methods: GET
// Auth Required: True
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';
import { StatsService } from '@/services/statsService';
import { subDays, startOfDay, endOfDay } from 'date-fns';

const RATE_LIMIT = 30;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=300',
};

const querySchema = z.object({
  metric: z.enum(['problemsSolved', 'commits', 'timeSpent']).default('problemsSolved'),
  days: z.coerce.number().int().min(7).max(90).default(30),
});

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
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-trends:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    
    const queryValidation = querySchema.safeParse({
      metric: searchParams.get('metric') || undefined,
      days: searchParams.get('days') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { metric, days } = queryValidation.data;
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const metricMap: Record<string, 'problems' | 'time' | 'commits' | 'pullRequests' | 'points'> = {
      problemsSolved: 'problems',
      commits: 'commits',
      timeSpent: 'time',
    };
    const mappedMetric = metricMap[metric] || 'problems';

    const trendData = await StatsService.getTrendData(userId, startDate, endDate, mappedMetric);

    logger.info('GET /tracker/trends completed', {
      userId,
      metric,
      days,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success({ trend: trendData }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /tracker/trends failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch trend data', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
