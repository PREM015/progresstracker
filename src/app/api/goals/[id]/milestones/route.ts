// =============================================================================
// src/app/api/goals/[id]/milestones/route.ts
// =============================================================================
// Description: Goal-specific milestones management
// Methods: GET, PUT, PATCH, DELETE, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 30 requests/minute
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
import { auditLogService } from '@/services/auditLogService';

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
const MAX_MILESTONES = 10;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS, HEAD',
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

const idSchema = z.string().cuid('Invalid goal ID format');

const milestoneSchema = z.object({
  value: z.number().min(0).max(100),
  label: z.string().min(1).max(100),
  reached: z.boolean().optional(),
  reachedAt: z.string().datetime().optional(),
});

const updateMilestonesSchema = z.object({
  milestones: z.array(milestoneSchema).min(1).max(MAX_MILESTONES),
  autoUpdate: z.boolean().default(true),
});

const patchMilestoneSchema = z.object({
  value: z.number().min(0).max(100),
  label: z.string().min(1).max(100).optional(),
  reached: z.boolean().optional(),
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
  const rateLimitKey = `goal-milestones:${ip}`;
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

export async function HEAD(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { id } = await context.params;
    const userId = session!.user.id;

    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { milestones: true },
    });

    if (!goal) {
      return new NextResponse(null, { status: 404 });
    }

    const milestones = parseMilestones(goal.milestones);
    const reached = milestones.filter((m) => m.reached).length;

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Milestones', String(milestones.length));
    response.headers.set('X-Reached-Milestones', String(reached));
    response.headers.set('X-Pending-Milestones', String(milestones.length - reached));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/[id]/milestones failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Goal Milestones
// =============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { id } = await context.params;
    const userId = session!.user.id;

    // Validate ID
    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      const response = apiResponse.validationError(
        'Invalid goal ID',
        idValidation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Get goal with milestones
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        progress: true,
        target: true,
        progressPercentage: true,
        milestones: true,
        status: true,
      },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    const milestones = parseMilestones(goal.milestones);

    // Calculate stats
    const stats = {
      total: milestones.length,
      reached: milestones.filter((m) => m.reached).length,
      pending: milestones.filter((m) => !m.reached).length,
      nextMilestone: milestones.find((m) => !m.reached),
      lastReached: milestones
        .filter((m) => m.reached && m.reachedAt)
        .sort((a, b) => new Date(b.reachedAt!).getTime() - new Date(a.reachedAt!).getTime())[0],
    };

    logger.info('GET /api/goals/[id]/milestones completed', {
      userId,
      goalId: id,
      milestonesCount: milestones.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        goal: {
          id: goal.id,
          title: goal.title,
          progress: goal.progressPercentage,
          status: goal.status,
        },
        milestones,
        stats,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/[id]/milestones failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch milestones', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// PUT - Replace All Milestones
// =============================================================================

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { id } = await context.params;
    const userId = session!.user.id;

    // Validate ID
    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      const response = apiResponse.validationError(
        'Invalid goal ID',
        idValidation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Parse body
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

    const validation = updateMilestonesSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid milestone data',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { milestones, autoUpdate } = validation.data;

    // Get goal
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { progressPercentage: true, milestones: true, title: true },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Sort and update milestones
    const now = new Date().toISOString();
    const updatedMilestones: Milestone[] = milestones
      .sort((a, b) => a.value - b.value)
      .map((m) => ({
        value: m.value,
        label: m.label,
        reached: autoUpdate ? goal.progressPercentage >= m.value : (m.reached ?? false),
        reachedAt: autoUpdate && goal.progressPercentage >= m.value && !m.reachedAt
          ? now
          : m.reachedAt,
      }));

    // Update goal
    await prisma.goal.update({
      where: { id },
      data: {
        milestones: updatedMilestones as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    // Audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      entityId: id,
      description: `Replaced milestones for goal: ${goal.title}`,
      oldValue: { milestones: goal.milestones },
      newValue: { milestones: updatedMilestones },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('PUT /api/goals/[id]/milestones completed', {
      userId,
      goalId: id,
      milestonesCount: updatedMilestones.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        milestones: updatedMilestones,
        message: 'Milestones updated successfully',
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT /api/goals/[id]/milestones failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to update milestones', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// PATCH - Update Single Milestone
// =============================================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { id } = await context.params;
    const userId = session!.user.id;

    // Parse body
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

    const validation = patchMilestoneSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid milestone data',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { value, label, reached } = validation.data;

    // Get goal
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { milestones: true, title: true },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    const milestones = parseMilestones(goal.milestones);

    if (!Array.isArray(milestones) || milestones.length === 0) {
      const response = apiResponse.validationError(
        'Goal has no milestones',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Find and update milestone
    const milestoneIndex = milestones.findIndex((m) => m.value === value);

    if (milestoneIndex === -1) {
      const response = apiResponse.notFound('Milestone', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    if (label !== undefined) {
      milestones[milestoneIndex].label = label;
    }

    if (reached !== undefined) {
      milestones[milestoneIndex].reached = reached;
      if (reached && !milestones[milestoneIndex].reachedAt) {
        milestones[milestoneIndex].reachedAt = new Date().toISOString();
      }
    }

    // Update goal
    await prisma.goal.update({
      where: { id },
      data: {
        milestones: milestones as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    logger.info('PATCH /api/goals/[id]/milestones completed', {
      userId,
      goalId: id,
      milestoneValue: value,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        milestone: milestones[milestoneIndex],
        message: 'Milestone updated successfully',
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PATCH /api/goals/[id]/milestones failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to update milestone', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// DELETE - Remove All Milestones
// =============================================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { id } = await context.params;
    const userId = session!.user.id;

    // Update goal to remove milestones
    const result = await prisma.goal.updateMany({
      where: { id, userId },
      data: {
        milestones: Prisma.JsonNull,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      entityId: id,
      description: 'Removed all milestones from goal',
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('DELETE /api/goals/[id]/milestones completed', {
      userId,
      goalId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: 'Milestones removed successfully' },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE /api/goals/[id]/milestones failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to remove milestones', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';