// =============================================================================
// FILE: app/api/tracker/compare/route.ts
// PURPOSE: Compare tracker stats between two periods
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
import { parseISO, isValid } from 'date-fns';

const RATE_LIMIT = 30;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=300',
};

const querySchema = z.object({
  period1Start: z.string().refine((val) => isValid(parseISO(val)), { message: "Invalid date" }),
  period1End: z.string().refine((val) => isValid(parseISO(val)), { message: "Invalid date" }),
  period2Start: z.string().refine((val) => isValid(parseISO(val)), { message: "Invalid date" }),
  period2End: z.string().refine((val) => isValid(parseISO(val)), { message: "Invalid date" }),
  platformId: z.string().optional(),
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
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-compare:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(30, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    
    const queryValidation = querySchema.safeParse({
      period1Start: searchParams.get('period1Start'),
      period1End: searchParams.get('period1End'),
      period2Start: searchParams.get('period2Start'),
      period2End: searchParams.get('period2End'),
      platformId: searchParams.get('platformId') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { period1Start, period1End, period2Start, period2End, platformId } = queryValidation.data;

    // Utilize existing StatsService comparison functionality
    const comparison = await StatsService.comparePeriods(
      userId,
      { start: parseISO(period1Start), end: parseISO(period1End) },
      { start: parseISO(period2Start), end: parseISO(period2End) },
      platformId
    );

    logger.info('GET /tracker/compare completed', {
      userId,
      platformId,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success({ comparison }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /tracker/compare failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to compare periods', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
