// =============================================================================
// src/app/api/goals/[id]/unarchive/route.ts
// =============================================================================
// Description: Unarchive a specific goal
// Methods: POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 20 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalStatus } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { auditLogService } from '@/services/auditLogService';

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;
const MAX_ACTIVE_GOALS = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, HEAD',
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

const idSchema = z.string().cuid('Invalid goal ID format');

const unarchiveBodySchema = z.object({
  setStatus: z.nativeEnum(GoalStatus).optional().default(GoalStatus.ACTIVE),
  resetProgress: z.boolean().optional().default(false),
  newDeadline: z.string().datetime().optional(),
  reactivateReminders: z.boolean().optional().default(true),
}).optional();

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
  const rateLimitKey = `goals-unarchive:${ip}`;
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
      select: { id: true, status: true },
    });

    if (!goal) {
      return new NextResponse(null, { status: 404 });
    }

    const canUnarchive = goal.status === GoalStatus.ARCHIVED;

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Can-Unarchive', String(canUnarchive));
    response.headers.set('X-Current-Status', goal.status);

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/[id]/unarchive failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Unarchive Goal
// =============================================================================

export async function POST(
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

    // Parse optional body
  let bodyData: unknown = undefined;

    try {
      const rawBody = await request.text();
      if (rawBody) {
        bodyData = JSON.parse(rawBody);
      }
    } catch {
      // No body or invalid JSON, continue with defaults
    }

    const validation = unarchiveBodySchema.safeParse(bodyData);
    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

const data = validation.data ?? {
  setStatus: GoalStatus.ACTIVE,
  resetProgress: false,
  reactivateReminders: true,
};


    // Verify ownership and current status
    const existing = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Check if goal is archived
    if (existing.status !== GoalStatus.ARCHIVED) {
      const response = apiResponse.validationError(
        'Only archived goals can be unarchived',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Check active goals limit if setting to active
    if (data.setStatus === GoalStatus.ACTIVE) {
      const activeCount = await prisma.goal.count({
        where: {
          userId,
          status: { in: [GoalStatus.ACTIVE, GoalStatus.PAUSED] },
        },
      });

      if (activeCount >= MAX_ACTIVE_GOALS) {
        const response = apiResponse.validationError(
          `Maximum ${MAX_ACTIVE_GOALS} active goals allowed`,
          undefined,
          requestId
        );
        return addHeaders(response, requestId, rateLimitResult);
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: data.setStatus || GoalStatus.ACTIVE,
      updatedAt: new Date(),
    };

    if (data.resetProgress) {
      updateData.progress = 0;
      updateData.progressPercentage = 0;
      updateData.startDate = new Date();
      updateData.completedAt = null;
      updateData.failedAt = null;
    }

    if (data.newDeadline) {
      updateData.deadline = new Date(data.newDeadline);
    }

    // Update goal
    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
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
    });

    // Reactivate reminders if requested
    if (data.reactivateReminders) {
      await prisma.goalReminder.updateMany({
        where: { goalId: id },
        data: { isActive: true },
      });

      // Update goal's reminder flag
      await prisma.goal.update({
        where: { id },
        data: { reminderEnabled: true },
      });
    }

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      entityId: goal.id,
      description: `Unarchived goal: ${goal.title}`,
      oldValue: { status: GoalStatus.ARCHIVED },
      newValue: { 
        status: data.setStatus || GoalStatus.ACTIVE,
        resetProgress: data.resetProgress,
        newDeadline: data.newDeadline,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/[id]/unarchive completed', {
      userId,
      goalId: id,
      newStatus: data.setStatus || GoalStatus.ACTIVE,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(goal, {

      message: 'Goal unarchived successfully',
    });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/[id]/unarchive failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to unarchive goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';