// =============================================================================
// FILE: app/api/tracker/search/route.ts
// PURPOSE: Search tracker entries with filters
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
import { TrackerService } from '@/services/trackerService';
import { startOfDay, endOfDay, parseISO, isValid } from 'date-fns';

const RATE_LIMIT = 50;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  platformId: z.string().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  sortBy: z.string().default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
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
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-search:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    
    // Extract multi-value fields manually before safeParse
    const tags = searchParams.getAll('tags[]');
    const topics = searchParams.getAll('topics[]');

    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      platformId: searchParams.get('platformId'),
      category: searchParams.get('category'),
      source: searchParams.get('source'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid base parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, startDate, endDate, platformId, category, source, sortBy, sortOrder } = queryValidation.data;

    // Use default dates if not provided (last 90 days vs now)
    const effectiveStartDate = startDate && isValid(parseISO(startDate)) 
      ? startOfDay(parseISO(startDate)) 
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
      
    const effectiveEndDate = endDate && isValid(parseISO(endDate))
      ? endOfDay(parseISO(endDate))
      : endOfDay(new Date());

    const result = await TrackerService.getEntries(
      userId,
      effectiveStartDate,
      effectiveEndDate,
      {
        platformId,
        category: category as any,
        source,
        tags: tags.length > 0 ? tags : undefined,
        topics: topics.length > 0 ? topics : undefined,
      },
      {
        page,
        limit,
        sortBy,
        sortOrder,
      }
    );

    logger.info('GET /tracker/search completed', {
      userId,
      count: (result as any).data?.length || 0,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(result, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /tracker/search failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to search entries', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
