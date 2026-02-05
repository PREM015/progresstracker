// =============================================================================
// src/app/api/goals/completed/route.ts
// =============================================================================
// Description: Get completed goals list with achievement details
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
import { GoalStatus, GoalType, Prisma, PlatformCategory } from '@prisma/client';

import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=300', // 5 min cache for completed goals
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const completedQuerySchema = z.object({
 category: z.union([
  z.nativeEnum(PlatformCategory),
  z.array(z.nativeEnum(PlatformCategory)),
]).optional(),


  goalType: z.nativeEnum(GoalType).optional(),
  platformId: z.string().cuid().optional(),
  completedFrom: z.string().datetime().optional(),
  completedTo: z.string().datetime().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  minDaysToComplete: z.coerce.number().int().min(0).optional(),
  maxDaysToComplete: z.coerce.number().int().min(0).optional(),
  sortBy: z.enum(['completedAt', 'createdAt', 'title', 'daysToComplete', 'target']).optional().default('completedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
  includePlatform: z.coerce.boolean().optional().default(true),
  includeStats: z.coerce.boolean().optional().default(true),
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
  const rateLimitKey = `goals-completed:${ip}`;
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

function getDaysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.ceil(Math.abs(date1.getTime() - date2.getTime()) / oneDay);
}

function getCompletionSpeed(daysToComplete: number, deadline: Date | null, completedAt: Date): 'early' | 'on-time' | 'late' {
  if (!deadline) return 'on-time';
  
  if (completedAt < deadline) {
    return 'early';
  } else if (completedAt.toDateString() === deadline.toDateString()) {
    return 'on-time';
  }
  return 'late';
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

    const completedCount = await prisma.goal.count({
      where: {
        userId,
        status: GoalStatus.COMPLETED,
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Completed-Count', String(completedCount));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/completed failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Completed Goals
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
    const { searchParams } = new URL(request.url);

    // Parse params
const rawParams: Record<string, unknown> = {};

    searchParams.forEach((value, key) => {
      if (key === 'category') {
        const existing = rawParams[key];
        if (existing) {
          if (Array.isArray(existing)) {
            existing.push(value);
          } else {
            rawParams[key] = [existing, value];
          }
        } else {
          rawParams[key] = value;
        }
      } else {
        rawParams[key] = value;
      }
    });

    const validation = completedQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid parameters',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;

    // Build where clause
    const where: Prisma.GoalWhereInput = {
      userId,
      status: GoalStatus.COMPLETED,
    };

    // Category filter
    if (params.category) {
      where.category = Array.isArray(params.category)
        ? { in: params.category }
        : params.category;
    }

    // Goal type filter
    if (params.goalType) {
      where.goalType = params.goalType;
    }

    // Platform filter
    if (params.platformId) {
      where.platformId = params.platformId;
    }

    // Completed date filters
    if (params.completedFrom || params.completedTo) {
      where.completedAt = {};
      if (params.completedFrom) {
        where.completedAt.gte = new Date(params.completedFrom);
      }
      if (params.completedTo) {
        where.completedAt.lte = new Date(params.completedTo);
      }
    }

    // Created date filters
    if (params.createdFrom || params.createdTo) {
      where.createdAt = {};
      if (params.createdFrom) {
        where.createdAt.gte = new Date(params.createdFrom);
      }
      if (params.createdTo) {
        where.createdAt.lte = new Date(params.createdTo);
      }
    }

    // Days active filter
    if (params.minDaysToComplete !== undefined || params.maxDaysToComplete !== undefined) {
      where.daysActive = {};
      if (params.minDaysToComplete !== undefined) {
        where.daysActive.gte = params.minDaysToComplete;
      }
      if (params.maxDaysToComplete !== undefined) {
        where.daysActive.lte = params.maxDaysToComplete;
      }
    }

    // Build orderBy
  let orderBy: Prisma.GoalOrderByWithRelationInput;

const sortOrder: Prisma.SortOrder = params.sortOrder;

switch (params.sortBy) {
  case 'daysToComplete':
    orderBy = { daysActive: sortOrder };
    break;
  case 'completedAt':
    orderBy = { completedAt: sortOrder };
    break;
  case 'createdAt':
    orderBy = { createdAt: sortOrder };
    break;
  case 'title':
    orderBy = { title: sortOrder };
    break;
  case 'target':
    orderBy = { target: sortOrder };
    break;
  default:
    orderBy = { completedAt: 'desc' };
}

    // Calculate pagination
    const skip = (params.page! - 1) * params.limit!;

    // Fetch goals
    const [goals, totalCount] = await Promise.all([
      prisma.goal.findMany({
        where,
        orderBy,
        skip,
        take: params.limit,
        include: {
          platform: params.includePlatform ? {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
            },
          } : false,
        },
      }),
      prisma.goal.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / params.limit!);

    // Enhance goals with completion details
    const enhancedGoals = goals.map(goal => {
const daysToComplete = goal.daysActive ?? getDaysBetween(

        new Date(goal.completedAt!),
        new Date(goal.startDate)
      );

      const completionSpeed = getCompletionSpeed(
        daysToComplete,
        goal.deadline,
        new Date(goal.completedAt!)
      );

      // Calculate efficiency (progress per day)
      const efficiency = daysToComplete > 0 
        ? Math.round((100 / daysToComplete) * 100) / 100
        : 100;

      // Check if completed early
      let daysEarly = 0;
      let daysLate = 0;
      if (goal.deadline) {
        const diff = getDaysBetween(new Date(goal.deadline), new Date(goal.completedAt!));
        if (new Date(goal.completedAt!) < new Date(goal.deadline)) {
          daysEarly = diff;
        } else if (new Date(goal.completedAt!) > new Date(goal.deadline)) {
          daysLate = diff;
        }
      }

      return {
        ...goal,
        completionDetails: {
          daysToComplete,
          completionSpeed,
          efficiency,
          daysEarly,
          daysLate,
          startDate: goal.startDate,
          completedAt: goal.completedAt,
          deadline: goal.deadline,
          formattedCompletedAt: goal.completedAt?.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        },
        achievement: {
          finalProgress: goal.progress,
          target: goal.target,
          exceeded: goal.progress > goal.target,
          exceededBy: Math.max(0, goal.progress - goal.target),
        },
      };
    });

    // Calculate comprehensive stats if requested
    let stats = null;
    if (params.includeStats) {
      const allCompleted = await prisma.goal.findMany({
        where: { userId, status: GoalStatus.COMPLETED },
        select: {
          id: true,
          category: true,
          goalType: true,
          daysActive: true,
          target: true,
          progress: true,
          completedAt: true,
          deadline: true,
          startDate: true,
        },
      });

      const totalCompleted = allCompleted.length;

      // Calculate completion time stats
      const completionTimes = allCompleted
        .map(g => g.daysActive ?? 0)

        .filter(d => d > 0);

      const avgCompletionTime = completionTimes.length > 0
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : 0;

      const fastestCompletion = completionTimes.length > 0
        ? Math.min(...completionTimes)
        : 0;

      const slowestCompletion = completionTimes.length > 0
        ? Math.max(...completionTimes)
        : 0;

      // Count by completion speed
      const speedCounts = allCompleted.reduce((acc, goal) => {
        if (goal.deadline && goal.completedAt) {
          const speed = getCompletionSpeed(
            goal.daysActive || 0,
            goal.deadline,
            new Date(goal.completedAt)
          );
          acc[speed] = (acc[speed] || 0) + 1;
        } else {
          acc['on-time'] = (acc['on-time'] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Count by category
      const byCategory = allCompleted.reduce((acc, goal) => {
        acc[goal.category] = (acc[goal.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Count by goal type
      const byType = allCompleted.reduce((acc, goal) => {
        acc[goal.goalType] = (acc[goal.goalType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Count exceeded targets
      const exceededTargets = allCompleted.filter(g => g.progress > g.target).length;

      // Monthly completion trend (last 12 months)
      const monthlyCompletions: Record<string, number> = {};
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        monthlyCompletions[key] = 0;
      }

      allCompleted.forEach(goal => {
        if (goal.completedAt) {
          const date = new Date(goal.completedAt);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyCompletions[key] !== undefined) {
            monthlyCompletions[key]++;
          }
        }
      });

      stats = {
        totalCompleted,
        completionTime: {
          average: avgCompletionTime,
          fastest: fastestCompletion,
          slowest: slowestCompletion,
        },
        bySpeed: {
          early: speedCounts['early'] || 0,
          onTime: speedCounts['on-time'] || 0,
          late: speedCounts['late'] || 0,
        },
        byCategory,
        byType,
        exceededTargets,
        exceededPercentage: totalCompleted > 0
          ? Math.round((exceededTargets / totalCompleted) * 100)
          : 0,
        monthlyTrend: monthlyCompletions,
      };
    }

    // Get recent completions
    const recentCompletions = enhancedGoals
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 5)
      .map(g => ({
        goalId: g.id,
        title: g.title,
        completedAt: g.completedAt,
        daysToComplete: g.completionDetails.daysToComplete,
        completionSpeed: g.completionDetails.completionSpeed,
      }));

    // Get achievements/records
    const records = {
      fastestCompletion: enhancedGoals.length > 0
        ? enhancedGoals.reduce((min, g) =>
            g.completionDetails.daysToComplete < min.completionDetails.daysToComplete ? g : min
          )
        : null,
      mostExceeded: enhancedGoals.length > 0
        ? enhancedGoals.reduce((max, g) =>
            g.achievement.exceededBy > max.achievement.exceededBy ? g : max
          )
        : null,
    };

    logger.info('GET /api/goals/completed completed', {
      userId,
      count: enhancedGoals.length,
      totalCompleted: totalCount,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        goals: enhancedGoals,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: totalCount,
          totalPages,
          hasNext: params.page! < totalPages,
          hasPrev: params.page! > 1,
        },
        stats,
        recentCompletions,
        records: records.fastestCompletion || records.mostExceeded ? {
          fastestCompletion: records.fastestCompletion ? {
            goalId: records.fastestCompletion.id,
            title: records.fastestCompletion.title,
            daysToComplete: records.fastestCompletion.completionDetails.daysToComplete,
          } : null,
          mostExceeded: records.mostExceeded && records.mostExceeded.achievement.exceededBy > 0 ? {
            goalId: records.mostExceeded.id,
            title: records.mostExceeded.title,
            exceededBy: records.mostExceeded.achievement.exceededBy,
          } : null,
        } : null,
      },
      {  }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/completed failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to get completed goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';