// =============================================================================
// src/app/api/goals/search/route.ts
// =============================================================================
// Description: Advanced search with filters for goals
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 60 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalStatus, GoalType, GoalMetric, PlatformCategory, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;
const MAX_RESULTS = 100;
const DEFAULT_LIMIT = 20;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const searchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z.union([
    z.nativeEnum(GoalStatus),
    z.array(z.nativeEnum(GoalStatus)),
    z.string().transform((val) => val.split(',').filter(Boolean) as GoalStatus[]),
  ]).optional(),
  type: z.union([
    z.nativeEnum(GoalType),
    z.array(z.nativeEnum(GoalType)),
    z.string().transform((val) => val.split(',').filter(Boolean) as GoalType[]),
  ]).optional(),
  metric: z.union([
    z.nativeEnum(GoalMetric),
    z.array(z.nativeEnum(GoalMetric)),
    z.string().transform((val) => val.split(',').filter(Boolean) as GoalMetric[]),
  ]).optional(),
  category: z.union([
    z.nativeEnum(PlatformCategory),
    z.array(z.nativeEnum(PlatformCategory)),
    z.string().transform((val) => val.split(',').filter(Boolean) as PlatformCategory[]),
  ]).optional(),
  platformId: z.string().cuid().optional(),
  isPublic: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).optional(),
  hasDeadline: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).optional(),
  isOverdue: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).optional(),
  minProgress: z.coerce.number().min(0).max(100).optional(),
  maxProgress: z.coerce.number().min(0).max(100).optional(),
  startDateFrom: z.string().datetime().optional(),
  startDateTo: z.string().datetime().optional(),
  deadlineFrom: z.string().datetime().optional(),
  deadlineTo: z.string().datetime().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  sortBy: z.enum([
    'createdAt', 
    'updatedAt', 
    'deadline', 
    'progress', 
    'progressPercentage',
    'title',
    'startDate',
  ]).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_RESULTS).default(DEFAULT_LIMIT),
});

const searchBodySchema = searchQuerySchema;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

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

async function validateRequest(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `goals-search:${ip}`;
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

function buildWhereClause(
  userId: string,
  params: z.infer<typeof searchQuerySchema>
): Prisma.GoalWhereInput {
  const where: Prisma.GoalWhereInput = { userId };
  const now = new Date();

  // Text search
  if (params.q && params.q.trim()) {
    const searchTerm = params.q.trim();
    where.OR = [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { customMetric: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  // Status filter
  if (params.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    where.status = { in: statuses };
  }

  // Type filter
  if (params.type) {
    const types = Array.isArray(params.type) ? params.type : [params.type];
    where.goalType = { in: types };
  }

  // Metric filter
  if (params.metric) {
    const metrics = Array.isArray(params.metric) ? params.metric : [params.metric];
    where.metric = { in: metrics };
  }

  // Category filter
  if (params.category) {
    const categories = Array.isArray(params.category) ? params.category : [params.category];
    where.category = { in: categories };
  }

  // Platform filter
  if (params.platformId) {
    where.platformId = params.platformId;
  }

  // Public filter
  if (params.isPublic !== undefined) {
    where.isPublic = params.isPublic;
  }

  // Deadline filter
  if (params.hasDeadline !== undefined) {
    where.deadline = params.hasDeadline ? { not: null } : null;
  }

  // Overdue filter
  if (params.isOverdue === true) {
    where.AND = [
      { deadline: { lt: now } },
      { status: GoalStatus.ACTIVE },
    ];
  }

  // Progress range filter
  if (params.minProgress !== undefined || params.maxProgress !== undefined) {
    where.progressPercentage = {};
    if (params.minProgress !== undefined) {
      where.progressPercentage.gte = params.minProgress;
    }
    if (params.maxProgress !== undefined) {
      where.progressPercentage.lte = params.maxProgress;
    }
  }

  // Start date filter
  if (params.startDateFrom || params.startDateTo) {
    where.startDate = {};
    if (params.startDateFrom) {
      where.startDate.gte = new Date(params.startDateFrom);
    }
    if (params.startDateTo) {
      where.startDate.lte = new Date(params.startDateTo);
    }
  }

  // Deadline range filter
  if (params.deadlineFrom || params.deadlineTo) {
    if (!where.deadline || typeof where.deadline === 'object') {
      where.deadline = where.deadline || {};
    }
    if (typeof where.deadline === 'object' && where.deadline !== null) {
      if (params.deadlineFrom) {
        (where.deadline as Prisma.DateTimeNullableFilter).gte = new Date(params.deadlineFrom);
      }
      if (params.deadlineTo) {
        (where.deadline as Prisma.DateTimeNullableFilter).lte = new Date(params.deadlineTo);
      }
    }
  }

  // Created date filter
  if (params.createdFrom || params.createdTo) {
    where.createdAt = {};
    if (params.createdFrom) {
      where.createdAt.gte = new Date(params.createdFrom);
    }
    if (params.createdTo) {
      where.createdAt.lte = new Date(params.createdTo);
    }
  }

  return where;
}

async function executeSearch(
  userId: string,
  params: z.infer<typeof searchQuerySchema>,
  requestId: string
) {
  const where = buildWhereClause(userId, params);
  const skip = (params.page - 1) * params.limit;

  const [goals, total] = await Promise.all([
    prisma.goal.findMany({
      where,
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
        _count: {
          select: {
            reminders: true,
          },
        },
      },
      orderBy: { [params.sortBy]: params.sortOrder },
      skip,
      take: params.limit,
    }),
    prisma.goal.count({ where }),
  ]);

  // Get facets for filtering UI
  const [statusCounts, typeCounts, categoryCounts, platformCounts] = await Promise.all([
    prisma.goal.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    }),
    prisma.goal.groupBy({
      by: ['goalType'],
      where: { userId },
      _count: true,
    }),
    prisma.goal.groupBy({
      by: ['category'],
      where: { userId },
      _count: true,
    }),
    prisma.goal.groupBy({
      by: ['platformId'],
      where: { userId, platformId: { not: null } },
      _count: true,
    }),
  ]);

  const facets = {
    status: statusCounts.map((s) => ({ value: s.status, count: s._count })),
    type: typeCounts.map((t) => ({ value: t.goalType, count: t._count })),
    category: categoryCounts.map((c) => ({ value: c.category, count: c._count })),
    platform: platformCounts.map((p) => ({ value: p.platformId, count: p._count })),
  };

  const totalPages = Math.ceil(total / params.limit);

  return {
    goals,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1,
    },
    facets,
    searchParams: {
      q: params.q,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    },
  };
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 204 });
  return addHeaders(response, requestId);
}

// =============================================================================
// HEAD - Resource Metadata
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const [total, active, completed] = await Promise.all([
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: GoalStatus.ACTIVE } }),
      prisma.goal.count({ where: { userId, status: GoalStatus.COMPLETED } }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Goals', String(total));
    response.headers.set('X-Active-Goals', String(active));
    response.headers.set('X-Completed-Goals', String(completed));
    response.headers.set('X-Max-Results', String(MAX_RESULTS));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/search failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Search Goals with Query Parameters
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, unknown> = {};

    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const validation = searchQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid search parameters',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;

    // Execute search
    const result = await executeSearch(userId, params, requestId);

    logger.info('GET /api/goals/search completed', {
      userId,
      query: params.q,
      results: result.goals.length,
      total: result.pagination.total,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      result.goals,
      result.pagination,
      {
        meta: {
          requestId,
          facets: result.facets,
          searchParams: result.searchParams,
          executionTime: Date.now() - startTime,
        },
      }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/search failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to search goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Advanced Search with Body
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = apiResponse.validationError(
        'Invalid JSON body',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const validation = searchBodySchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid search parameters',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;

    // Execute search
    const result = await executeSearch(userId, params, requestId);

    logger.info('POST /api/goals/search completed', {
      userId,
      query: params.q,
      results: result.goals.length,
      total: result.pagination.total,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      result.goals,
      result.pagination,
      {
        meta: {
          requestId,
          facets: result.facets,
          searchParams: result.searchParams,
          executionTime: Date.now() - startTime,
        },
      }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/search failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to search goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';