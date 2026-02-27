// =============================================================================
// src/app/api/goals/upcoming/route.ts
// =============================================================================
// Description: Goals with upcoming deadlines
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 60 requests/minute
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
import { addDays, startOfDay, endOfDay, differenceInDays, differenceInHours } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
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

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(MAX_DAYS).default(DEFAULT_DAYS),
  includeCompleted: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).default(false),
  includePaused: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).default(true),
  urgencyLevel: z.enum(['all', 'critical', 'high', 'medium', 'low']).default('all'),
  sortBy: z.enum(['deadline', 'progress', 'title', 'createdAt']).default('deadline'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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
  const rateLimitKey = `goals-upcoming:${ip}`;
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

type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

function calculateUrgencyLevel(deadline: Date, now: Date): UrgencyLevel {
  const hoursLeft = differenceInHours(deadline, now);
  
  if (hoursLeft <= 24) return 'critical';
  if (hoursLeft <= 72) return 'high';
  if (hoursLeft <= 168) return 'medium'; // 7 days
  return 'low';
}

function calculateRequiredDailyProgress(
  remaining: number,
  daysLeft: number,
  avgDailyProgress: number
): { requiredPerDay: number; onTrack: boolean; deficit: number } {
  if (daysLeft <= 0) {
    return { requiredPerDay: remaining, onTrack: false, deficit: remaining };
  }

  const requiredPerDay = remaining / daysLeft;
  const onTrack = avgDailyProgress >= requiredPerDay;
  const deficit = onTrack ? 0 : requiredPerDay - avgDailyProgress;

  return { requiredPerDay, onTrack, deficit };
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
    const now = new Date();
    const next30Days = addDays(now, 30);

    const upcomingCount = await prisma.goal.count({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
        deadline: {
          gte: now,
          lte: next30Days,
        },
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Upcoming-Goals', String(upcomingCount));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/upcoming failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Goals with Upcoming Deadlines
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

    const validation = querySchema.safeParse(queryParams);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid query parameters',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;

    const now = new Date();
    const endDate = addDays(now, params.days);

    // Build where clause
    const where: Prisma.GoalWhereInput = {
      userId,
      deadline: {
        gte: now,
        lte: endDate,
      },
    };

    // Status filter
    const statusFilter: GoalStatus[] = [GoalStatus.ACTIVE];

    if (params.includePaused) {
      statusFilter.push(GoalStatus.PAUSED);
    }

    if (params.includeCompleted) {
      statusFilter.push(GoalStatus.COMPLETED);
    }

    where.status = { in: statusFilter };

    // Fetch goals
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
        },
        orderBy: { [params.sortBy]: params.sortOrder },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.goal.count({ where }),
    ]);

    // Process goals with deadline info
    const today = startOfDay(now);
    const tomorrow = endOfDay(addDays(today, 1));
    const thisWeek = endOfDay(addDays(today, 7));
    const thisMonth = endOfDay(addDays(today, 30));

    const processedGoals = goals.map((goal) => {
      const deadline = goal.deadline!;
      const daysLeft = Math.max(0, differenceInDays(deadline, now));
      const hoursLeft = Math.max(0, differenceInHours(deadline, now));
      const remaining = Math.max(0, goal.target - goal.progress);
      const urgencyLevel = calculateUrgencyLevel(deadline, now);

      const progressRequired = calculateRequiredDailyProgress(
        remaining,
        daysLeft,
        goal.avgDailyProgress
      );

      return {
        ...goal,
        deadlineInfo: {
          daysLeft,
          hoursLeft,
          isToday: deadline <= tomorrow,
          isTomorrow: deadline > tomorrow && deadline <= addDays(tomorrow, 1),
          isThisWeek: deadline <= thisWeek,
          isThisMonth: deadline <= thisMonth,
          urgencyLevel,
        },
        progressRequired: {
          remaining,
          perDay: Math.round(progressRequired.requiredPerDay * 100) / 100,
          onTrack: progressRequired.onTrack,
          deficit: Math.round(progressRequired.deficit * 100) / 100,
          projectedCompletion: goal.avgDailyProgress > 0
            ? addDays(now, Math.ceil(remaining / goal.avgDailyProgress))
            : null,
        },
      };
    });

    // Filter by urgency level if specified
    let filteredGoals = processedGoals;
    if (params.urgencyLevel !== 'all') {
      filteredGoals = processedGoals.filter(
        (g) => g.deadlineInfo.urgencyLevel === params.urgencyLevel
      );
    }

    // Group by urgency
    const urgencyGroups = {
      critical: filteredGoals.filter((g) => g.deadlineInfo.urgencyLevel === 'critical'),
      high: filteredGoals.filter((g) => g.deadlineInfo.urgencyLevel === 'high'),
      medium: filteredGoals.filter((g) => g.deadlineInfo.urgencyLevel === 'medium'),
      low: filteredGoals.filter((g) => g.deadlineInfo.urgencyLevel === 'low'),
    };

    // Calculate stats
    const stats = {
      total,
      dueToday: processedGoals.filter((g) => g.deadlineInfo.isToday).length,
      dueThisWeek: processedGoals.filter((g) => g.deadlineInfo.isThisWeek).length,
      dueThisMonth: processedGoals.filter((g) => g.deadlineInfo.isThisMonth).length,
      atRisk: processedGoals.filter((g) => !g.progressRequired.onTrack).length,
      onTrack: processedGoals.filter((g) => g.progressRequired.onTrack).length,
      byUrgency: {
        critical: urgencyGroups.critical.length,
        high: urgencyGroups.high.length,
        medium: urgencyGroups.medium.length,
        low: urgencyGroups.low.length,
      },
    };

    const totalPages = Math.ceil(total / params.limit);

    logger.info('GET /api/goals/upcoming completed', {
      userId,
      total,
      days: params.days,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      filteredGoals,
      {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNextPage: params.page < totalPages,
        hasPreviousPage: params.page > 1,
      },
      {
        meta: {
          requestId,
          stats,
          urgencyGroups: {
            critical: urgencyGroups.critical.length,
            high: urgencyGroups.high.length,
            medium: urgencyGroups.medium.length,
            low: urgencyGroups.low.length,
          },
          filters: {
            days: params.days,
            includeCompleted: params.includeCompleted,
            includePaused: params.includePaused,
            urgencyLevel: params.urgencyLevel,
          },
        },
      }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/upcoming failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch upcoming goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';