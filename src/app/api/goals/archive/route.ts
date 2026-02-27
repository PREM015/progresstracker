// =============================================================================
// src/app/api/goals/archive/route.ts
// =============================================================================
// Description: Archive goals and get archived goals
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalStatus, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { auditLogService } from '@/services/auditLogService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
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
  sortBy: z.enum(['createdAt', 'updatedAt', 'completedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['ARCHIVED', 'COMPLETED', 'FAILED', 'CANCELLED', 'all']).default('ARCHIVED'),
});

const archiveBodySchema = z.object({
  goalIds: z.array(z.string().cuid()).min(1).max(50),
});

const unarchiveBodySchema = z.object({
  goalIds: z.array(z.string().cuid()).min(1).max(50),
  setStatus: z.nativeEnum(GoalStatus).optional().default(GoalStatus.ACTIVE),
});

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
  const rateLimitKey = `goals-archive:${ip}`;
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

    const [archived, completed, failed, cancelled] = await Promise.all([
      prisma.goal.count({ where: { userId, status: GoalStatus.ARCHIVED } }),
      prisma.goal.count({ where: { userId, status: GoalStatus.COMPLETED } }),
      prisma.goal.count({ where: { userId, status: GoalStatus.FAILED } }),
      prisma.goal.count({ where: { userId, status: GoalStatus.CANCELLED } }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Archived-Count', String(archived));
    response.headers.set('X-Completed-Count', String(completed));
    response.headers.set('X-Failed-Count', String(failed));
    response.headers.set('X-Cancelled-Count', String(cancelled));
    response.headers.set('X-Total-Inactive', String(archived + completed + failed + cancelled));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/archive failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Archived/Inactive Goals
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
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy') || 'updatedAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      status: searchParams.get('status') || 'ARCHIVED',
    });

    if (!queryValidation.success) {
      const response = apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { page, limit, sortBy, sortOrder, status } = queryValidation.data;

    // Build where clause
    const where: Prisma.GoalWhereInput = { userId };

    if (status === 'all') {
      where.status = {
        in: [GoalStatus.ARCHIVED, GoalStatus.COMPLETED, GoalStatus.FAILED, GoalStatus.CANCELLED],
      };
    } else {
      where.status = status as GoalStatus;
    }

    // Fetch goals
    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
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
        },
      }),
      prisma.goal.count({ where }),
    ]);

    // Get counts by status
    const statusCounts = await prisma.goal.groupBy({
      by: ['status'],
      where: {
        userId,
        status: {
          in: [GoalStatus.ARCHIVED, GoalStatus.COMPLETED, GoalStatus.FAILED, GoalStatus.CANCELLED],
        },
      },
      _count: true,
    });

    const counts = {
      archived: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    statusCounts.forEach((item) => {
      const key = item.status.toLowerCase() as keyof typeof counts;
      if (key in counts) {
        counts[key] = item._count;
      }
    });

    logger.info('GET /api/goals/archive completed', {
      userId,
      count: goals.length,
      total,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      goals,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      {
        meta: {
          requestId,
          counts,
        },
      }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/archive failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch archived goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Archive Goals or Unarchive Goals
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
      const response = apiResponse.validationError('Invalid JSON body', undefined, requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Determine action from URL or body
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || (body as Record<string, unknown>)?.action || 'archive';

    if (action === 'unarchive') {
      // Unarchive goals
      const validation = unarchiveBodySchema.safeParse(body);

      if (!validation.success) {
        const response = apiResponse.validationError(
          'Validation failed',
          validation.error.errors,
          requestId
        );
        return addHeaders(response, requestId, rateLimitResult);
      }

      const { goalIds, setStatus } = validation.data;

      // Verify ownership
      const existingGoals = await prisma.goal.findMany({
        where: {
          id: { in: goalIds },
          userId,
          status: GoalStatus.ARCHIVED,
        },
        select: { id: true, title: true },
      });

      if (existingGoals.length === 0) {
        const response = apiResponse.notFound('Archived goals', requestId);
        return addHeaders(response, requestId, rateLimitResult);
      }

      // Unarchive goals
      const result = await prisma.goal.updateMany({
        where: {
          id: { in: existingGoals.map((g) => g.id) },
          userId,
        },
        data: {
          status: setStatus,
          updatedAt: new Date(),
        },
      });

      // Create audit log
      await auditLogService.create({
        userId,
        action: 'UPDATE',
        category: 'goals',
        entityType: 'goal',
        description: `Unarchived ${result.count} goals`,
        newValue: { goalIds: existingGoals.map((g) => g.id), setStatus },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
        requestId,
      });

      logger.info('POST /api/goals/archive (unarchive) completed', {
        userId,
        count: result.count,
        requestId,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success(
        { unarchived: result.count, ids: existingGoals.map((g) => g.id) },
        {  message: `${result.count} goals unarchived` }
      );
      return addHeaders(response, requestId, rateLimitResult);
    } else {
      // Archive goals
      const validation = archiveBodySchema.safeParse(body);

      if (!validation.success) {
        const response = apiResponse.validationError(
          'Validation failed',
          validation.error.errors,
          requestId
        );
        return addHeaders(response, requestId, rateLimitResult);
      }

      const { goalIds } = validation.data;

      // Verify ownership and current status
      const existingGoals = await prisma.goal.findMany({
        where: {
          id: { in: goalIds },
          userId,
          status: { notIn: [GoalStatus.ARCHIVED] },
        },
        select: { id: true, title: true, status: true },
      });

      if (existingGoals.length === 0) {
        const response = apiResponse.validationError(
          'No valid goals to archive',
          undefined,
          requestId
        );
        return addHeaders(response, requestId, rateLimitResult);
      }

      // Archive goals
      const result = await prisma.goal.updateMany({
        where: {
          id: { in: existingGoals.map((g) => g.id) },
          userId,
        },
        data: {
          status: GoalStatus.ARCHIVED,
          updatedAt: new Date(),
        },
      });

      // Disable reminders for archived goals
      await prisma.goalReminder.updateMany({
        where: {
          goalId: { in: existingGoals.map((g) => g.id) },
        },
        data: { isActive: false },
      });

      // Create audit log
      await auditLogService.create({
        userId,
        action: 'UPDATE',
        category: 'goals',
        entityType: 'goal',
        description: `Archived ${result.count} goals`,
        oldValue: { goals: existingGoals },
        newValue: { status: GoalStatus.ARCHIVED },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
        requestId,
      });

      logger.info('POST /api/goals/archive completed', {
        userId,
        count: result.count,
        requestId,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success(
        { archived: result.count, ids: existingGoals.map((g) => g.id) },
        {  message: `${result.count} goals archived` }
      );
      return addHeaders(response, requestId, rateLimitResult);
    }
  } catch (error) {
    logger.error('POST /api/goals/archive failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to archive goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';