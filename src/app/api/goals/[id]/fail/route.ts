// =============================================================================
// src/app/api/goals/[id]/fail/route.ts
// =============================================================================
// Description: Mark a goal as failed
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

const failBodySchema = z.object({
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  failedAt: z.string().datetime().optional(),
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
  const rateLimitKey = `goals-fail:${ip}`;
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

    const canFail = goal.status === GoalStatus.ACTIVE || goal.status === GoalStatus.PAUSED;

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Can-Fail', String(canFail));
    response.headers.set('X-Current-Status', goal.status);

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/[id]/fail failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Mark Goal as Failed
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
    let bodyData: z.infer<typeof failBodySchema> = {};
    try {
      const rawBody = await request.text();
      if (rawBody) {
        bodyData = JSON.parse(rawBody);
      }
    } catch {
      // No body or invalid JSON, continue with defaults
    }

    const validation = failBodySchema.safeParse(bodyData);
    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const data = validation.data || {};

    // Verify ownership and current status
    const existing = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Check if goal can be failed
    if (existing.status === GoalStatus.FAILED) {
      const response = apiResponse.validationError(
        'Goal is already marked as failed',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    if (existing.status === GoalStatus.COMPLETED) {
      const response = apiResponse.validationError(
        'Cannot fail a completed goal',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    if (existing.status === GoalStatus.CANCELLED || existing.status === GoalStatus.ARCHIVED) {
      const response = apiResponse.validationError(
        `Cannot fail a ${existing.status.toLowerCase()} goal`,
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Calculate final stats
    const daysElapsed = Math.max(
      1,
      Math.ceil(
        (new Date().getTime() - new Date(existing.startDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    // Update goal
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        status: GoalStatus.FAILED,
        failedAt: data.failedAt ? new Date(data.failedAt) : new Date(),
        daysActive: daysElapsed,
        updatedAt: new Date(),
      },
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

    // Disable associated reminders
    await prisma.goalReminder.updateMany({
      where: { goalId: id },
      data: { isActive: false },
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      entityId: goal.id,
      description: `Marked goal as failed: ${goal.title}${data.reason ? ` - Reason: ${data.reason}` : ''}`,
      oldValue: { status: existing.status, progress: existing.progress },
      newValue: { 
        status: GoalStatus.FAILED, 
        reason: data.reason,
        notes: data.notes,
        finalProgress: existing.progress,
        finalPercentage: existing.progressPercentage,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/[id]/fail completed', {
      userId,
      goalId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        goal,
        failureInfo: {
          reason: data.reason,
          notes: data.notes,
          failedAt: goal.failedAt,
          finalProgress: existing.progress,
          finalPercentage: existing.progressPercentage,
          daysActive: daysElapsed,
        },
      },
      { message: 'Goal marked as failed' }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/[id]/fail failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to mark goal as failed', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';