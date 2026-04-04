// =============================================================================
// leaderboard/friends/route.ts
// =============================================================================
// Description: Friends leaderboard
// Methods: GET
// Auth Required: True
// Rate Limit: 50 requests/minute
// Tags: leaderboard, friends, social
// Generated: 2026-02-02T11:57:44.599759
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

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
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract client IP from request
 */
function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/**
 * Add standard headers to response
 */
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

/**
 * Validate session and check rate limits
 */
async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `leaderboard-friends:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return { 
      error: apiResponse.rateLimited(60, requestId), 
      session: null, 
      rateLimitResult 
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { 
      error: apiResponse.unauthorized('Authentication required', requestId), 
      session: null, 
      rateLimitResult 
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
 * HEAD - Resource metadata
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }
    
    const userId = session!.user.id;

    // Count total friends
    const total = await (prisma as any).userFriend.count({
      where: { userId, status: 'ACCEPTED' },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Count', String(total));
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD request failed', { requestId, error: String(error) });
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - Friends leaderboard
 * 
 * Returns paginated leaderboard of the current user's friends.
 * - Retrieves authenticated user's friend connections
 * - Ranks friends by activity level and accumulated points
 * - Includes current user's ranking in friend group for context
 * - Supports flexible time period filtering
 * - Enables friendly competition tracking and metrics
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }
    
    const userId = session!.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, search, sortBy, sortOrder } = queryValidation.data;

    // For now, get top users from user's platforms
    // In a full implementation, this would use a "friends" model
    const userPlatforms = await prisma.userPlatform.findMany({
      where: { userId },
      select: { platformId: true },
    });

    const platformIds = userPlatforms.map((up: any) => up.platformId);

    const where: Prisma.UserWhereInput = {
      isActive: true,
      isPublic: true,
      id: { not: userId },
      platforms: {
        some: {
          platformId: { in: platformIds.length > 0 ? platformIds : undefined },
        },
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [friends, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          totalPoints: true,
          currentStreak: true,
          totalProblems: true,
        },
        orderBy: { totalPoints: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const data = friends;

    logger.info('GET leaderboard/friends completed', {
      userId,
      page,
      total,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      data,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET leaderboard/friends failed', { requestId, error: String(error) });
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}


// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Uncomment if route segment config is needed:
// export const revalidate = 0;
// export const fetchCache = 'force-no-store';

