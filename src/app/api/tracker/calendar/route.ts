// =============================================================================
// FILE: app/api/tracker/calendar/route.ts
// PURPOSE: Calendar / Heatmap view data for tracker entries
// Methods: GET
// Auth Required: True
// Rate Limit: 50 requests/minute
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

const RATE_LIMIT = 50;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
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
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-calendar:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    
    const queryValidation = querySchema.safeParse({
      year: searchParams.get('year') || new Date().getFullYear(),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid year', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { year } = queryValidation.data;

    // Use existing StatsService getHeatmapData
    const heatmap = await StatsService.getHeatmapData(userId, { year: year || new Date().getFullYear() });

    logger.info('GET /tracker/calendar completed', {
      userId,
      year: year || new Date().getFullYear(),
      duration: Date.now() - startTime,
      requestId,
    });

    // Provide simplified output suitable for a calendar view
    const response = apiResponse.success({
      year: year || new Date().getFullYear(),
      heatmap, // array of { date, count, level }
    }, { meta: { requestId } });
    
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /tracker/calendar failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch calendar data', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
