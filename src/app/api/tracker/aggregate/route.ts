// =============================================================================
// FILE: app/api/tracker/aggregate/route.ts
// PURPOSE: Aggregate tracker data sums and averages
// Methods: GET
// Auth Required: True
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';
import { parseISO, isValid } from 'date-fns';

const RATE_LIMIT = 30;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const querySchema = z.object({
  startDate: z.string().refine((val) => isValid(parseISO(val)), { message: "Invalid startDate" }).optional(),
  endDate: z.string().refine((val) => isValid(parseISO(val)), { message: "Invalid endDate" }).optional(),
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
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-aggregate:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(30, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    
    const queryValidation = querySchema.safeParse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      platformId: searchParams.get('platformId') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { startDate, endDate, platformId } = queryValidation.data;

    const where: any = { userId };
    if (startDate && endDate) {
      where.date = { gte: parseISO(startDate), lte: parseISO(endDate) };
    } else if (startDate) {
      where.date = { gte: parseISO(startDate) };
    } else if (endDate) {
      where.date = { lte: parseISO(endDate) };
    }
    
    if (platformId) {
      where.platformId = platformId;
    }

    const aggregations = await prisma.trackerEntry.aggregate({
      where,
      _sum: {
        problemsSolved: true,
        problemsAttempted: true,
        commits: true,
        pullRequests: true,
        timeSpent: true,
      },
      _avg: {
        problemsSolved: true,
        commits: true,
        timeSpent: true,
      },
      _count: {
        id: true,
      }
    });

    logger.info('GET /tracker/aggregate completed', {
      userId,
      count: aggregations._count.id,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success({ aggregations }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /tracker/aggregate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to aggregate data', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
