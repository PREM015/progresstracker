// =============================================================================
// src/app/api/goals/[id]/complete/route.ts
// =============================================================================
// Description: Mark goal as complete
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
import { GoalStatus, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { auditLogService } from '@/services/auditLogService';
import { AchievementService } from '@/services/achievementService';
import { NotificationService } from '@/services/notificationService';

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface GoalMilestone {
  value: number;
  label: string;
  reached: boolean;
  reachedAt?: string;
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

const completeBodySchema = z.object({
  notes: z.string().max(1000).optional(),
  completedAt: z.string().datetime().optional(),
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
  const rateLimitKey = `goals-complete:${ip}`;
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

function parseJsonField<T>(field: unknown): T | null {
  if (!field) return null;
  if (typeof field === 'object') return field as T;
  try {
    return JSON.parse(field as string) as T;
  } catch {
    return null;
  }
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

    const canComplete = goal.status === GoalStatus.ACTIVE;

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Can-Complete', String(canComplete));
    response.headers.set('X-Current-Status', goal.status);

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/[id]/complete failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Complete Goal
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
    let bodyData: z.infer<typeof completeBodySchema> = {};
    try {
      const rawBody = await request.text();
      if (rawBody) {
        bodyData = JSON.parse(rawBody);
      }
    } catch {
      // No body or invalid JSON, continue with defaults
    }

    const validation = completeBodySchema.safeParse(bodyData);
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

    // Check if goal can be completed
    if (existing.status === GoalStatus.COMPLETED) {
      const response = apiResponse.validationError(
        'Goal is already completed',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    if (existing.status === GoalStatus.CANCELLED || existing.status === GoalStatus.ARCHIVED) {
      const response = apiResponse.validationError(
        'Cannot complete a cancelled or archived goal',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Mark all milestones as reached
    const milestones = parseJsonField<GoalMilestone[]>(existing.milestones) || [];
    const now = new Date().toISOString();
    for (const milestone of milestones) {
      if (!milestone.reached) {
        milestone.reached = true;
        milestone.reachedAt = now;
      }
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
        status: GoalStatus.COMPLETED,
        progress: existing.target,
        progressPercentage: 100,
        completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
        milestones: milestones as unknown as Prisma.InputJsonValue,
        daysActive: daysElapsed,
        avgDailyProgress: Math.round((existing.target / daysElapsed) * 100) / 100,
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

    // Check achievements
    await AchievementService.checkGoalAchievements(userId).catch((err) => {
      logger.error('Failed to check goal achievements', { userId }, err);
    });

    // Send notification
    await NotificationService.notifyGoalCompleted(userId, {
      title: goal.title,
      id: goal.id,
    }).catch((err) => {
      logger.error('Failed to send goal completed notification', { userId }, err);
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      entityId: goal.id,
      description: `Completed goal: ${goal.title}`,
      oldValue: { status: existing.status, progress: existing.progress },
      newValue: { status: GoalStatus.COMPLETED, progress: goal.target },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/[id]/complete completed', {
      userId,
      goalId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(goal, {
    
      message: 'Goal completed successfully! 🎉',
    });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/[id]/complete failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to complete goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';