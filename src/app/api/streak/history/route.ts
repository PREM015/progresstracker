// =============================================================================
// FILE: app/api/streak/history/route.ts
// PURPOSE: Get user's streak history
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
import { streakService } from '@/services/streakService';
import { getClientIp, generateRequestId } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sortBy: z.enum(['startDate', 'length', 'endDate']).default('endDate'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

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
  const rateLimitKey = `streak-history:${ip}`;
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
 * GET - Get streak history with pagination
 *
 * Query: page, limit, sortBy (startDate|length|endDate), order (asc|desc)
 * Returns: past streaks, current streak if active, and summary stats
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const userId = session!.user.id;

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      order: searchParams.get('order') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, sortBy, order } = queryValidation.data;
    const skip = (page - 1) * limit;

    // Fetch streak history with pagination
    const [streaks, total] = await Promise.all([
      prisma.streakHistory.findMany({
        where: { userId },
        orderBy: { [sortBy]: order },
        take: limit,
        skip,
      }),
      prisma.streakHistory.count({ where: { userId } }),
    ]);

    // Get summary stats across all history
    const summaryStats = await prisma.streakHistory.aggregate({
      where: { userId },
      _avg: { length: true },
      _max: { length: true },
      _sum: { totalProblems: true, totalCommits: true },
      _count: { _all: true },
    });

    // Get current streak info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        streakStartDate: true,
        lastActivityDate: true,
      },
    });

    const totalPages = Math.ceil(total / limit);

    const data = {
      streaks: streaks.map((streak) => ({
        id: streak.id,
        startDate: streak.startDate.toISOString(),
        endDate: streak.endDate.toISOString(),
        length: streak.length,
        endReason: streak.endReason,
        totalProblems: streak.totalProblems,
        totalCommits: streak.totalCommits,
        isActive: streak.isActive,
        isCurrent: streak.isCurrent,
      })),
      currentStreak: user
        ? {
            length: user.currentStreak,
            startDate: user.streakStartDate?.toISOString() || null,
            lastActivityDate: user.lastActivityDate?.toISOString() || null,
            isActive: user.currentStreak > 0,
          }
        : null,
      summary: {
        totalStreaks: summaryStats._count._all,
        averageLength: Math.round(summaryStats._avg.length || 0),
        longestEver: user?.longestStreak || summaryStats._max.length || 0,
        totalProblems: summaryStats._sum.totalProblems || 0,
        totalCommits: summaryStats._sum.totalCommits || 0,
      },
    };

    logger.info('GET /streak/history completed', {
      userId,
      page,
      total,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.paginated(
      data.streaks,
      {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      {
        meta: {
          requestId,
          currentStreak: data.currentStreak as unknown as string,
          summary: data.summary as unknown as string,
        },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /streak/history failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch streak history', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
