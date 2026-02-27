
// =============================================================================
// src/app/api/goals/[id]/route.ts
// =============================================================================
// Description: Manage individual goals
// Methods: GET, PATCH, PUT, DELETE
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { idSchema, updateGoalSchema } from '@/lib/validations/goal';
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

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
};

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

async function validateRequest(request: NextRequest, requestId: string, context: RouteContext) {
  const ip = getClientIp(request);
  const rateLimitKey = `goals:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      id: null,
      rateLimitResult,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      id: null,
      rateLimitResult,
    };
  }

  const { id } = await context.params;
  const idValidation = idSchema.safeParse(id);

  if (!idValidation.success) {
    return {
      error: apiResponse.validationError('Invalid goal ID', idValidation.error.errors, requestId),
      session,
      id: null,
      rateLimitResult,
    };
  }

  return { error: null, session, id, rateLimitResult };
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
// GET - Get Goal Details
// =============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, id, rateLimitResult } = await validateRequest(request, requestId, context);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const goal = await prisma.goal.findFirst({
      where: { id: id!, userId },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    const response = apiResponse.success(goal, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/[id] failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// PATCH - Update Goal
// =============================================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, id, rateLimitResult } = await validateRequest(request, requestId, context);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const body = await request.json();

    // Validate request body
    const validation = updateGoalSchema.safeParse(body);
    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid update data',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const data = validation.data;

    // Check if goal exists
    const existingGoal = await prisma.goal.findFirst({
      where: { id: id!, userId },
    });

    if (!existingGoal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Update goal
    const updatedGoal = await prisma.goal.update({
      where: { id: id! },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    try {
      await auditLogService.create({
        userId,
        action: 'UPDATE',
        category: 'goals',
        entityType: 'goal',
        entityId: id!,
        description: `Updated goal: ${existingGoal.title}`,
        oldValue: existingGoal as any,
        newValue: updatedGoal as any,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
        requestId,
      });
    } catch (logError) {
      logger.error('Failed to create audit log', { requestId }, logError);
    }

    const response = apiResponse.success(updatedGoal, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PATCH /api/goals/[id] failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to update goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// PUT - Update Goal (Alias to PATCH)
// =============================================================================

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return PATCH(request, context);
}

// =============================================================================
// DELETE - Delete Goal
// =============================================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, id, rateLimitResult } = await validateRequest(request, requestId, context);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Check if goal exists
    const existingGoal = await prisma.goal.findFirst({
      where: { id: id!, userId },
    });

    if (!existingGoal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Delete goal
    await prisma.goal.delete({
      where: { id: id! },
    });

    // Create audit log
    try {
      await auditLogService.create({
        userId,
        action: 'DELETE',
        category: 'goals',
        entityType: 'goal',
        entityId: id!,
        description: `Deleted goal: ${existingGoal.title}`,
        oldValue: existingGoal as any,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
        requestId,
      });
    } catch (logError) {
      logger.error('Failed to create audit log', { requestId }, logError);
    }

    const response = apiResponse.success({ success: true, id }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE /api/goals/[id] failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to delete goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';