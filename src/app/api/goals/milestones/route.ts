// =============================================================================
// src/app/api/goals/milestones/route.ts
// =============================================================================
// Description: Milestone management for all goals
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
import { Prisma, GoalStatus } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { auditLogService } from '@/services/auditLogService';

// =============================================================================
// TYPES
// =============================================================================

interface Milestone {
  value: number;
  label: string;
  reached: boolean;
  reachedAt?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const MAX_MILESTONES_PER_GOAL = 10;

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

const querySchema = z.object({
  reached: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).optional(),
  pending: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).optional(),
  goalId: z.string().cuid().optional(),
  status: z.nativeEnum(GoalStatus).optional(),
});

const milestoneSchema = z.object({
  value: z.number().min(0).max(100),
  label: z.string().min(1).max(100),
  reached: z.boolean().optional().default(false),
  reachedAt: z.string().datetime().optional(),
});

const createMilestonesSchema = z.object({
  goalId: z.string().cuid('Invalid goal ID'),
  milestones: z.array(milestoneSchema).min(1).max(MAX_MILESTONES_PER_GOAL),
  replaceExisting: z.boolean().default(false),
  autoUpdateReached: z.boolean().default(true),
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
  const rateLimitKey = `goals-milestones:${ip}`;
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

function parseMilestones(data: unknown): Milestone[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Milestone[];
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Milestone[];
    } catch {
      return [];
    }
  }
  return [];
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

    const goalsWithMilestones = await prisma.goal.count({
      where: {
        userId,
        milestones: { not: Prisma.JsonNull },
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Goals-With-Milestones', String(goalsWithMilestones));
    response.headers.set('X-Max-Milestones-Per-Goal', String(MAX_MILESTONES_PER_GOAL));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/milestones failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get All Milestones Across Goals
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

    // Build where clause
    const where: Prisma.GoalWhereInput = {
      userId,
      milestones: { not: Prisma.JsonNull },
    };

    if (params.goalId) {
      where.id = params.goalId;
    }

    if (params.status) {
      where.status = params.status;
    }

    // Fetch goals with milestones
    const goals = await prisma.goal.findMany({
      where,
      select: {
        id: true,
        title: true,
        progress: true,
        target: true,
        progressPercentage: true,
        status: true,
        milestones: true,
        platform: {
          select: { name: true, icon: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Process milestones
    interface MilestoneWithGoal extends Milestone {
      goalId: string;
      goalTitle: string;
      goalProgress: number;
      goalStatus: GoalStatus;
      platformName?: string;
    }

    const allMilestones: MilestoneWithGoal[] = [];
    let totalMilestones = 0;
    let reachedMilestones = 0;
    let pendingMilestones = 0;

    for (const goal of goals) {
      const milestones = parseMilestones(goal.milestones);
      if (!Array.isArray(milestones)) continue;

      for (const milestone of milestones) {
        totalMilestones++;

        const milestoneData: MilestoneWithGoal = {
          ...milestone,
          goalId: goal.id,
          goalTitle: goal.title,
          goalProgress: goal.progressPercentage,
          goalStatus: goal.status,
          platformName: goal.platform?.name,
        };

        if (milestone.reached) {
          reachedMilestones++;
          if (!params.pending) {
            allMilestones.push(milestoneData);
          }
        } else {
          pendingMilestones++;
          if (!params.reached) {
            allMilestones.push(milestoneData);
          }
        }
      }
    }

    // Sort milestones
    allMilestones.sort((a, b) => {
      if (a.reached && !b.reached) return 1;
      if (!a.reached && b.reached) return -1;
      return a.value - b.value;
    });

    // Get upcoming milestones (next to be reached)
    const upcomingMilestones = allMilestones
      .filter((m) => !m.reached)
      .sort((a, b) => {
        const aDistance = a.value - a.goalProgress;
        const bDistance = b.value - b.goalProgress;
        return aDistance - bDistance;
      })
      .slice(0, 5);

    // Recently reached milestones
    const recentlyReached = allMilestones
      .filter((m) => m.reached && m.reachedAt)
      .sort((a, b) => new Date(b.reachedAt!).getTime() - new Date(a.reachedAt!).getTime())
      .slice(0, 5);

    const stats = {
      total: totalMilestones,
      reached: reachedMilestones,
      pending: pendingMilestones,
      completionRate: totalMilestones > 0
        ? Math.round((reachedMilestones / totalMilestones) * 100)
        : 0,
      goalsWithMilestones: goals.length,
    };

    logger.info('GET /api/goals/milestones completed', {
      userId,
      total: allMilestones.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        milestones: allMilestones,
        stats,
        upcoming: upcomingMilestones,
        recentlyReached,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/milestones failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch milestones', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Create/Update Milestones for a Goal
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

    const validation = createMilestonesSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid milestone data',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { goalId, milestones, replaceExisting, autoUpdateReached } = validation.data;

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      select: {
        id: true,
        title: true,
        progressPercentage: true,
        milestones: true,
      },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Sort milestones by value
    const sortedMilestones = [...milestones].sort((a, b) => a.value - b.value);

    // Auto-update reached status based on current progress
    const now = new Date().toISOString();
    const updatedMilestones: Milestone[] = sortedMilestones.map((m) => {
      const shouldBeReached = autoUpdateReached && goal.progressPercentage >= m.value;
      return {
        value: m.value,
        label: m.label,
        reached: shouldBeReached || m.reached,
        reachedAt: shouldBeReached && !m.reachedAt ? now : m.reachedAt,
      };
    });

    // Merge with existing if not replacing
    let finalMilestones: Milestone[] = updatedMilestones;

    if (!replaceExisting && goal.milestones) {
      const existingMilestones = parseMilestones(goal.milestones);
      const existingValues = new Set(existingMilestones.map((m) => m.value));
      const newMilestones = updatedMilestones.filter((m) => !existingValues.has(m.value));

      finalMilestones = [...existingMilestones, ...newMilestones]
        .sort((a, b) => a.value - b.value)
        .slice(0, MAX_MILESTONES_PER_GOAL);
    }

    // Update goal with milestones
    await prisma.goal.update({
      where: { id: goalId },
      data: {
        milestones: finalMilestones as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      entityId: goalId,
      description: `Updated milestones for goal: ${goal.title}`,
      oldValue: { milestones: goal.milestones },
      newValue: { milestones: finalMilestones },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/milestones completed', {
      userId,
      goalId,
      milestonesCount: finalMilestones.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        milestones: finalMilestones,
        goal: {
          id: goal.id,
          title: goal.title,
          progressPercentage: goal.progressPercentage,
        },
        message: `${finalMilestones.length} milestones set for goal`,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/milestones failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to create milestones', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';