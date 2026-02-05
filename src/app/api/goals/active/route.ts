// =============================================================================
// src/app/api/goals/active/route.ts
// =============================================================================
// Description: Get all active (non-completed) goals
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalStatus, PlatformCategory, GoalType, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=30',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  category: z.nativeEnum(PlatformCategory).optional(),
  type: z.nativeEnum(GoalType).optional(),
  platformId: z.string().cuid().optional(),
  sortBy: z.enum(['createdAt', 'deadline', 'progress', 'title']).default('deadline'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  includePaused: z.coerce.boolean().default(false),
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
  const rateLimitKey = `goals-active:${ip}`;
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

function calculateProgressPercentage(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100 * 10) / 10);
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

    const count = await prisma.goal.count({
      where: {
        userId,
        status: { in: [GoalStatus.ACTIVE, GoalStatus.PAUSED] },
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Count', String(count));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/active failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Active Goals
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
      category: searchParams.get('category') || undefined,
      type: searchParams.get('type') || undefined,
      platformId: searchParams.get('platformId') || undefined,
      sortBy: searchParams.get('sortBy') || 'deadline',
      sortOrder: searchParams.get('sortOrder') || 'asc',
      limit: searchParams.get('limit'),
      includePaused: searchParams.get('includePaused'),
    });

    if (!queryValidation.success) {
      const response = apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { category, type, platformId, sortBy, sortOrder, limit, includePaused } =
      queryValidation.data;

    // Build where clause
    const where: Prisma.GoalWhereInput = {
      userId,
      status: includePaused
        ? { in: [GoalStatus.ACTIVE, GoalStatus.PAUSED] }
        : GoalStatus.ACTIVE,
    };

    if (category) {
      where.category = category;
    }

    if (type) {
      where.goalType = type;
    }

    if (platformId) {
      where.platformId = platformId;
    }

    // Build orderBy - handle null deadlines
    let orderBy: Prisma.GoalOrderByWithRelationInput[];
    if (sortBy === 'deadline') {
      // Goals with deadlines first, then by deadline date
      orderBy = [
        { deadline: sortOrder === 'asc' ? { sort: 'asc', nulls: 'last' } : { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ];
    } else {
      orderBy = [{ [sortBy]: sortOrder }];
    }

    // Fetch goals
    const goals = await prisma.goal.findMany({
      where,
      orderBy,
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
        reminders: {
          where: { isActive: true },
          select: {
            id: true,
            frequency: true,
            time: true,
            nextSendAt: true,
          },
        },
        _count: {
          select: { reminders: true },
        },
      },
    });

    // Calculate progress info for each goal
    const now = new Date();
    const goalsWithProgress = goals.map((goal) => {
      const progress = goal.progress;
      const target = goal.target;
      const percentage = calculateProgressPercentage(progress, target);
      const remaining = Math.max(0, target - progress);

      const startDate = new Date(goal.startDate);
      const daysElapsed = Math.max(
        1,
        Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      const avgPerDay = progress / daysElapsed;

      let daysLeft: number | undefined;
      let onTrack = true;
      let isOverdue = false;

      if (goal.deadline) {
        const deadline = new Date(goal.deadline);
        daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        isOverdue = daysLeft < 0;

        if (daysLeft > 0 && remaining > 0) {
          const requiredPerDay = remaining / daysLeft;
          onTrack = avgPerDay >= requiredPerDay;
        } else if (daysLeft <= 0 && remaining > 0) {
          onTrack = false;
        }
      }

      return {
        ...goal,
        progressInfo: {
          current: progress,
          target,
          percentage,
          remaining,
          daysElapsed,
          daysLeft: daysLeft !== undefined ? Math.max(0, daysLeft) : undefined,
          avgPerDay: Math.round(avgPerDay * 100) / 100,
          onTrack,
          isOverdue,
        },
      };
    });

    // Summary stats
    const summary = {
      total: goalsWithProgress.length,
      active: goalsWithProgress.filter((g) => g.status === GoalStatus.ACTIVE).length,
      paused: goalsWithProgress.filter((g) => g.status === GoalStatus.PAUSED).length,
      onTrack: goalsWithProgress.filter((g) => g.progressInfo.onTrack).length,
      atRisk: goalsWithProgress.filter((g) => !g.progressInfo.onTrack && !g.progressInfo.isOverdue).length,
      overdue: goalsWithProgress.filter((g) => g.progressInfo.isOverdue).length,
      withDeadline: goalsWithProgress.filter((g) => g.deadline).length,
      withReminders: goalsWithProgress.filter((g) => g.reminderEnabled).length,
    };

    logger.info('GET /api/goals/active completed', {
      userId,
      count: goalsWithProgress.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        goals: goalsWithProgress,
        summary,
      },
      {  }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/active failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch active goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';