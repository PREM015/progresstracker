/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/analytics/goals/route.ts
// =============================================================================
// Goals Analytics
// =============================================================================
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

import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { differenceInDays } from 'date-fns';
import { GoalStatus } from '@/types';

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
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'FAILED', 'ARCHIVED', 'CANCELLED', 'DRAFT', 'ALL']).default('ALL'),
  includeProgress: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
  includeStats: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
  includeHistory: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
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

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `analytics-goals:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const [total, active, completed] = await Promise.all([
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.goal.count({ where: { userId, status: 'COMPLETED' } }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Goals', String(total));
    response.headers.set('X-Active-Goals', String(active));
    response.headers.set('X-Completed-Goals', String(completed));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/goals failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryValidation = querySchema.safeParse({
      status: searchParams.get('status') || 'ALL',
      includeProgress: searchParams.get('includeProgress'),
      includeStats: searchParams.get('includeStats'),
      includeHistory: searchParams.get('includeHistory'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;

    // Build where clause
    const where: any = { userId };
    if (params.status !== 'ALL') {
      where.status = params.status as GoalStatus;
    }

    // Fetch goals
    const goals = await prisma.goal.findMany({
      where,
      include: {
        platform: {
          select: { name: true, icon: true, color: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Calculate stats
    const stats = {
      total: goals.length,
      byStatus: {
        active: goals.filter((g: { status: string; }) => g.status === 'ACTIVE').length,
        completed: goals.filter((g: { status: string; }) => g.status === 'COMPLETED').length,
        paused: goals.filter((g: { status: string; }) => g.status === 'PAUSED').length,
        failed: goals.filter((g: { status: string; }) => g.status === 'FAILED').length,
        draft: goals.filter((g: { status: string; }) => g.status === 'DRAFT').length,
        archived: goals.filter((g: { status: string; }) => g.status === 'ARCHIVED').length,
        cancelled: goals.filter((g: { status: string; }) => g.status === 'CANCELLED').length,
      },
      avgProgress: goals.length > 0
        ? Math.round(goals.reduce((sum: any, g: { progress: any; }) => sum + g.progress, 0) / goals.length)
        : 0,
      completionRate: goals.length > 0
        ? Math.round((goals.filter((g: { status: string; }) => g.status === 'COMPLETED').length / goals.length) * 100)
        : 0,
      onTrack: goals.filter((g: { status: string; progress: number; }) => g.status === 'ACTIVE' && g.progress >= 50).length,
      atRisk: goals.filter((g: any) => {
        if (g.status !== 'ACTIVE' || !g.deadline) return false;
        const daysLeft = differenceInDays(new Date(g.deadline), new Date());
        return daysLeft <= 7 && g.progress < 80;
      }).length,
      overdue: goals.filter((g: any) => {
        if (g.status !== 'ACTIVE' || !g.deadline) return false;
        return new Date(g.deadline) < new Date();
      }).length,
    };

    // Progress breakdown
    const progressBreakdown = {
      notStarted: goals.filter((g: { progress: number; }) => g.progress === 0).length,
      started: goals.filter((g: { progress: number; }) => g.progress > 0 && g.progress < 25).length,
      inProgress: goals.filter((g: { progress: number; }) => g.progress >= 25 && g.progress < 75).length,
      almostDone: goals.filter((g: { progress: number; }) => g.progress >= 75 && g.progress < 100).length,
      completed: goals.filter((g: { progress: number; }) => g.progress === 100).length,
    };

    // Format goals
    const formattedGoals = goals.map((goal: any) => {
      const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
      const isOverdue = daysLeft !== null && daysLeft < 0;
      const isAtRisk = daysLeft !== null && daysLeft <= 7 && goal.progress < 80;

      return {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        progress: goal.progress,
        progressPercentage: goal.progressPercentage,
        target: goal.target,
        category: goal.category,
        goalType: goal.goalType,
        metric: goal.metric,
        platform: goal.platform ? {
          name: goal.platform.name,
          icon: goal.platform.icon,
          color: goal.platform.color,
        } : null,
        deadline: goal.deadline?.toString() || null,
        startDate: goal.startDate.toISOString(),
        completedAt: goal.completedAt?.toISOString() || null,
        daysLeft,
        isOverdue,
        isAtRisk,
        daysActive: goal.daysActive,
        avgDailyProgress: goal.avgDailyProgress,
        createdAt: goal.createdAt.toISOString(),
      };
    });

    // Get history if requested
    let history = null;
    if (params.includeHistory) {
      const completedGoals = await prisma.goal.findMany({
        where: { userId, status: 'COMPLETED' },
        select: {
          id: true,
          title: true,
          completedAt: true,
          target: true,
          category: true,
        },
        orderBy: { completedAt: 'desc' },
        take: 20,
      });

      history = completedGoals.map((g: any) => ({
        id: g.id,
        title: g.title,
        completedAt: g.completedAt?.toISOString(),
        target: g.target,
        category: g.category,
      }));
    }

    // Build response
    const response = {
      goals: formattedGoals,
      stats: params.includeStats ? stats : undefined,
      progressBreakdown: params.includeStats ? progressBreakdown : undefined,
      history,
    };

    logger.info('Goals analytics fetched', {
      userId,
      goalCount: goals.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/goals failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch goals analytics', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';