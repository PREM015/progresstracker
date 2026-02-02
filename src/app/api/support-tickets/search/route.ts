// src/app/api/support-tickets/search/route.ts
// =============================================================================
// ADVANCED TICKET SEARCH API
// Methods: GET, POST, OPTIONS
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { TicketStatus, TicketPriority, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION
// =============================================================================

const searchSchema = z.object({
  query: z.string().min(1).max(200).optional(),
  status: z.array(z.nativeEnum(TicketStatus)).optional(),
  priority: z.array(z.nativeEnum(TicketPriority)).optional(),
  category: z.array(z.string().max(50)).optional(),
  assignedTo: z.string().cuid().nullable().optional(),
  unassigned: z.boolean().optional(),
  hasRating: z.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'ticketNumber', 'satisfactionRating']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: { limit: number; remaining: number }): NextResponse {
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

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// GET - Search with Query Params
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-search:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    // Parse query params
    const { searchParams } = new URL(request.url);

    const searchData = {
      query: searchParams.get('query') || undefined,
      status: searchParams.getAll('status').length > 0 ? searchParams.getAll('status') : undefined,
      priority: searchParams.getAll('priority').length > 0 ? searchParams.getAll('priority') : undefined,
      category: searchParams.getAll('category').length > 0 ? searchParams.getAll('category') : undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      unassigned: searchParams.get('unassigned') === 'true' ? true : undefined,
      hasRating: searchParams.get('hasRating') === 'true' ? true : searchParams.get('hasRating') === 'false' ? false : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    return executeSearch(searchData, userId, isAdmin, requestId, rateLimitResult, startTime);
  } catch (error) {
    logger.error('GET search failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Search failed', requestId), requestId);
  }
}

// =============================================================================
// POST - Search with Body (for complex queries)
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-search:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    return executeSearch(body, userId, isAdmin, requestId, rateLimitResult, startTime);
  } catch (error) {
    logger.error('POST search failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Search failed', requestId), requestId);
  }
}

// =============================================================================
// SEARCH EXECUTOR
// =============================================================================

async function executeSearch(
  searchData: unknown,
  userId: string,
  isAdmin: boolean,
  requestId: string,
  rateLimitResult: { limit: number; remaining: number },
  startTime: number
): Promise<NextResponse> {
  const validation = searchSchema.safeParse(searchData);

  if (!validation.success) {
    return addHeaders(
      apiResponse.validationError('Invalid search parameters', validation.error.errors, requestId),
      requestId,
      rateLimitResult
    );
  }

  const {
    query,
    status,
    priority,
    category,
    assignedTo,
    unassigned,
    hasRating,
    dateFrom,
    dateTo,
    page,
    limit,
    sortBy,
    sortOrder,
  } = validation.data;

  // Build where clause
  const where: Prisma.SupportTicketWhereInput = isAdmin ? {} : { userId };

  // Text search
  if (query) {
    where.OR = [
      { subject: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { ticketNumber: { contains: query, mode: 'insensitive' } },
      { resolution: { contains: query, mode: 'insensitive' } },
    ];
  }

  // Status filter
  if (status && status.length > 0) {
    where.status = { in: status };
  }

  // Priority filter
  if (priority && priority.length > 0) {
    where.priority = { in: priority };
  }

  // Category filter
  if (category && category.length > 0) {
    where.category = { in: category };
  }

  // Assignment filter (admin only)
  if (isAdmin) {
    if (unassigned) {
      where.assignedTo = null;
    } else if (assignedTo) {
      where.assignedTo = assignedTo;
    }
  }

  // Rating filter
  if (hasRating !== undefined) {
    where.satisfactionRating = hasRating ? { not: null } : null;
  }

  // Date range
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  // Execute search
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: { select: { replies: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Get facets for filtering UI
  const facets = await Promise.all([
    prisma.supportTicket.groupBy({
      by: ['status'],
      where: isAdmin ? {} : { userId },
      _count: { id: true },
    }),
    prisma.supportTicket.groupBy({
      by: ['priority'],
      where: isAdmin ? {} : { userId },
      _count: { id: true },
    }),
    prisma.supportTicket.groupBy({
      by: ['category'],
      where: isAdmin ? {} : { userId },
      _count: { id: true },
    }),
  ]);

  logger.info('Search executed', {
    userId,
    isAdmin,
    query,
    resultCount: tickets.length,
    total,
    requestId,
    duration: Date.now() - startTime,
  });

  const response = apiResponse.success(
    {
      results: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      facets: {
        status: facets[0].reduce((acc, f) => ({ ...acc, [f.status]: f._count.id }), {}),
        priority: facets[1].reduce((acc, f) => ({ ...acc, [f.priority]: f._count.id }), {}),
        category: facets[2].reduce((acc, f) => ({ ...acc, [f.category]: f._count.id }), {}),
      },
      query: validation.data,
    },
    { meta: { requestId, searchTime: Date.now() - startTime } }
  );

  return addHeaders(response, requestId, rateLimitResult);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';