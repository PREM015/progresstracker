// =============================================================================
// src/app/api/goals/[id]/share/route.ts
// =============================================================================
// Description: Share/unshare a specific goal
// Methods: GET, POST, DELETE, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
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

const RATE_LIMIT = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, HEAD',
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
  const rateLimitKey = `goals-share-id:${ip}`;
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

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
      select: { id: true, isPublic: true, shareCode: true },
    });

    if (!goal) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Is-Shared', String(goal.isPublic));
    response.headers.set('X-Has-Share-Code', String(!!goal.shareCode));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/[id]/share failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Share Status
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

    // Fetch goal
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        isPublic: true,
        shareCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    const shareInfo = {
      goalId: goal.id,
      title: goal.title,
      isPublic: goal.isPublic,
      shareCode: goal.shareCode,
      shareUrl: goal.shareCode
        ? `${process.env.NEXT_PUBLIC_APP_URL}/share/goal/${goal.shareCode}`
        : null,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };

    logger.info('GET /api/goals/[id]/share completed', {
      userId,
      goalId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(shareInfo, {  });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/[id]/share failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to get share status', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Share Goal (Make Public)
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

    // Fetch goal
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { id: true, title: true, isPublic: true, shareCode: true },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // If already shared, return existing share info
    if (goal.isPublic && goal.shareCode) {
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/goal/${goal.shareCode}`;

      const response = apiResponse.success(
        {
          goalId: goal.id,
          title: goal.title,
          shareCode: goal.shareCode,
          shareUrl,
          isPublic: true,
          alreadyShared: true,
        },
        { message: 'Goal is already shared' }
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Generate share code and make public
    const shareCode = generateShareCode();

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        isPublic: true,
        shareCode,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        shareCode: true,
        isPublic: true,
      },
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/goal/${shareCode}`;

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      entityId: id,
      description: `Shared goal: ${updatedGoal.title}`,
      newValue: { shareCode, isPublic: true },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/[id]/share completed', {
      userId,
      goalId: id,
      shareCode,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        goalId: updatedGoal.id,
        title: updatedGoal.title,
        shareCode: updatedGoal.shareCode,
        shareUrl,
        isPublic: true,
      },
      {message: 'Goal shared successfully' }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/[id]/share failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to share goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// DELETE - Unshare Goal (Make Private)
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

    // Fetch goal
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { id: true, title: true, isPublic: true, shareCode: true },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // If not shared, return success
    if (!goal.isPublic) {
      const response = apiResponse.success(
        {
          goalId: goal.id,
          title: goal.title,
          isPublic: false,
          alreadyPrivate: true,
        },
        { message: 'Goal is already private' }
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Make private
    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        isPublic: false,
        shareCode: null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        isPublic: true,
      },
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      entityId: id,
      description: `Unshared goal: ${updatedGoal.title}`,
      oldValue: { shareCode: goal.shareCode, isPublic: true },
      newValue: { isPublic: false },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('DELETE /api/goals/[id]/share completed', {
      userId,
      goalId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        goalId: updatedGoal.id,
        title: updatedGoal.title,
        isPublic: false,
      },
      {message: 'Goal is now private' }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE /api/goals/[id]/share failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to unshare goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';