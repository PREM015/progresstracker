// =============================================================================
// FILE: app/api/tracker/daily/route.ts
// PURPOSE: Get tracker entries and stats for a specific day
// Methods: GET
// Auth Required: True
// Rate Limit: 60 requests/minute
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
import { startOfDay, endOfDay, parseISO, isValid } from 'date-fns';

const RATE_LIMIT = 60;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const querySchema = z.object({
  date: z.string().refine((val) => isValid(parseISO(val)), {
    message: "Invalid date format. Use ISO string (e.g. 2024-01-01)",
  }).optional(),
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
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-daily:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    
    const queryValidation = querySchema.safeParse({
      date: searchParams.get('date') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const targetDate = queryValidation.data.date 
      ? parseISO(queryValidation.data.date) 
      : new Date();

    const startDate = startOfDay(targetDate);
    const endDate = endOfDay(targetDate);

    // Fetch entries for the day
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        platform: {
          select: { id: true, name: true, icon: true, color: true },
        },
        customPlatform: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch daily aggregated stats if available
    const dailyStats = await prisma.dailyStats.findFirst({
      where: {
        userId,
        date: startDate, // dailyStats dates are typically stored at start of day
      },
    });

    logger.info('GET /tracker/daily completed', {
      userId,
      date: startDate.toISOString(),
      entriesCount: entries.length,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success({ 
      date: startDate.toISOString(),
      entries,
      stats: dailyStats,
    }, { meta: { requestId } });
    
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /tracker/daily failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch daily tracker data', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
