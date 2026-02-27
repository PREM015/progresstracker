// =============================================================================
// src/app/api/goals/share/route.ts
// =============================================================================
// Description: Share goals publicly
// Methods: GET, POST, DELETE, OPTIONS, HEAD
// Auth Required: Yes (for POST/DELETE), No (for GET with shareCode)
// Rate Limit: 30 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  'Cache-Control': 'public, max-age=300',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const shareCodeSchema = z.string().min(8).max(20);

const shareGoalSchema = z.object({
  goalId: z.string().cuid('Invalid goal ID'),
});

const unshareGoalSchema = z.object({
  goalId: z.string().cuid('Invalid goal ID'),
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

async function checkRateLimit(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `goals-share:${ip}`;
  return await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);
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

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const rateLimitResult = await checkRateLimit(request, requestId);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const shareCode = searchParams.get('code');

    if (!shareCode) {
      return new NextResponse(null, { status: 400 });
    }

    const goal = await prisma.goal.findUnique({
      where: { shareCode },
      select: { id: true, isPublic: true, updatedAt: true },
    });

    if (!goal || !goal.isPublic) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Last-Modified', goal.updatedAt.toUTCString());

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/share failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Shared Goal (Public)
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const rateLimitResult = await checkRateLimit(request, requestId);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const shareCode = searchParams.get('code');

    // If no share code, return user's shared goals (requires auth)
    if (!shareCode) {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        const response = apiResponse.unauthorized('Authentication required', requestId);
        return addHeaders(response, requestId, rateLimitResult);
      }

      const userId = session.user.id;

      const sharedGoals = await prisma.goal.findMany({
        where: {
          userId,
          isPublic: true,
          shareCode: { not: null },
        },
        select: {
          id: true,
          title: true,
          shareCode: true,
          progress: true,
          target: true,
          progressPercentage: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const goalsWithLinks = sharedGoals.map((goal) => ({
        ...goal,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/share/goal/${goal.shareCode}`,
      }));

      logger.info('GET /api/goals/share (list) completed', {
        userId,
        count: sharedGoals.length,
        requestId,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success(
        { goals: goalsWithLinks, count: goalsWithLinks.length },
        {  }
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Validate share code
    const codeValidation = shareCodeSchema.safeParse(shareCode);
    if (!codeValidation.success) {
      const response = apiResponse.validationError('Invalid share code', undefined, requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Fetch shared goal
    const goal = await prisma.goal.findUnique({
      where: { shareCode },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
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

    if (!goal || !goal.isPublic) {
      const response = apiResponse.notFound('Shared goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Calculate progress info
    const now = new Date();
    const startDate = new Date(goal.startDate);
    const daysElapsed = Math.max(
      1,
      Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    let daysLeft: number | undefined;
    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      daysLeft = Math.max(
        0,
        Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
    }

    const sharedGoal = {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      category: goal.category,
      goalType: goal.goalType,
      metric: goal.metric,
      progress: goal.progress,
      target: goal.target,
      progressPercentage: goal.progressPercentage,
      unit: goal.unit,
      status: goal.status,
      startDate: goal.startDate,
      deadline: goal.deadline,
      completedAt: goal.completedAt,
      daysElapsed,
      daysLeft,
      daysActive: goal.daysActive,
      avgDailyProgress: goal.avgDailyProgress,
      color: goal.color,
      icon: goal.icon,
      platform: goal.platform,
      user: {
        name: goal.user.name,
        username: goal.user.username,
        image: goal.user.image,
      },
      createdAt: goal.createdAt,
    };

    logger.info('GET /api/goals/share (public) completed', {
      shareCode,
      goalId: goal.id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(sharedGoal, {  });
    response.headers.set('Cache-Control', 'public, max-age=300');
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/share failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch shared goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Share a Goal (Make Public)
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const rateLimitResult = await checkRateLimit(request, requestId);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      const response = apiResponse.unauthorized('Authentication required', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    const userId = session.user.id;

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = apiResponse.validationError('Invalid JSON body', undefined, requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Validate body
    const validation = shareGoalSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { goalId } = validation.data;

    // Verify ownership
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
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
      where: { id: goalId },
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
      entityId: goalId,
      description: `Shared goal: ${updatedGoal.title}`,
      newValue: { shareCode, isPublic: true },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/share completed', {
      userId,
      goalId,
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
    logger.error('POST /api/goals/share failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to share goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// DELETE - Unshare a Goal (Make Private)
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const rateLimitResult = await checkRateLimit(request, requestId);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      const response = apiResponse.unauthorized('Authentication required', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    const userId = session.user.id;

    // Get goalId from query params or body
    const { searchParams } = new URL(request.url);
    let goalId = searchParams.get('goalId');

    if (!goalId) {
      try {
        const body = await request.json();
        const validation = unshareGoalSchema.safeParse(body);
        if (validation.success) {
          goalId = validation.data.goalId;
        }
      } catch {
        // No body
      }
    }

    if (!goalId) {
      const response = apiResponse.validationError('Goal ID is required', undefined, requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Verify ownership
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
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
      where: { id: goalId },
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
      entityId: goalId,
      description: `Unshared goal: ${updatedGoal.title}`,
      oldValue: { shareCode: goal.shareCode, isPublic: true },
      newValue: { isPublic: false },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('DELETE /api/goals/share completed', {
      userId,
      goalId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        goalId: updatedGoal.id,
        title: updatedGoal.title,
        isPublic: false,
      },
      {  message: 'Goal is now private' }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE /api/goals/share failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to unshare goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';