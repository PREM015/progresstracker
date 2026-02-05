// =============================================================================
// src/app/api/goals/[id]/progress/route.ts
// =============================================================================
// Description: Goal progress management
// Methods: GET, POST, PUT, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 60 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
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

interface GoalBestDay {
  date: string;
  progress: number;
}

interface ProgressHistoryEntry {
  date: string;
  progress: number;
  change: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS, HEAD',
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

const updateProgressSchema = z.object({
  progress: z.number().int().min(0).optional(),
  increment: z.number().int().optional(),
  note: z.string().max(500).optional(),
});

const setProgressSchema = z.object({
  progress: z.number().int().min(0),
  note: z.string().max(500).optional(),
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
  const rateLimitKey = `goals-progress:${ip}`;
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

function calculateProgressPercentage(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100 * 10) / 10);
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
      select: { 
        id: true, 
        progress: true, 
        target: true, 
        progressPercentage: true,
        status: true,
      },
    });

    if (!goal) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Progress', String(goal.progress));
    response.headers.set('X-Target', String(goal.target));
    response.headers.set('X-Percentage', String(goal.progressPercentage));
    response.headers.set('X-Status', goal.status);

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/[id]/progress failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Progress Details
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
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Calculate progress info
    const progress = goal.progress;
    const target = goal.target;
    const percentage = calculateProgressPercentage(progress, target);
    const remaining = Math.max(0, target - progress);
    const isComplete = progress >= target;

    const startDate = new Date(goal.startDate);
    const now = new Date();
    const daysElapsed = Math.max(
      1,
      Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const avgPerDay = progress / daysElapsed;

    let daysLeft: number | undefined;
    let requiredPerDay: number | undefined;
    let projectedCompletion: Date | undefined;
    let onTrack = true;

    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      daysLeft = Math.max(
        0,
        Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      if (daysLeft > 0 && remaining > 0) {
        requiredPerDay = remaining / daysLeft;
        onTrack = avgPerDay >= requiredPerDay;
        
        if (avgPerDay > 0) {
          const daysNeeded = remaining / avgPerDay;
          projectedCompletion = new Date(now.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
        }
      }
    }

    // Parse milestones and best day
    const milestones = parseJsonField<GoalMilestone[]>(goal.milestones) || [];
    const bestDay = parseJsonField<GoalBestDay>(goal.bestDay);

    const progressInfo = {
      current: progress,
      target,
      percentage,
      remaining,
      isComplete,
      daysElapsed,
      daysLeft,
      avgPerDay: Math.round(avgPerDay * 100) / 100,
      requiredPerDay: requiredPerDay ? Math.round(requiredPerDay * 100) / 100 : undefined,
      projectedCompletion,
      onTrack,
      milestones,
      bestDay,
      daysActive: goal.daysActive,
      avgDailyProgress: goal.avgDailyProgress,
    };

    logger.info('GET /api/goals/[id]/progress completed', {
      userId,
      goalId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(progressInfo, { });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/[id]/progress failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch progress', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Increment Progress
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

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = apiResponse.validationError('Invalid JSON body', undefined, requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Validate body
    const validation = updateProgressSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { progress, increment, note } = validation.data;

    // Verify ownership and get current state
    const existing = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    if (existing.status !== GoalStatus.ACTIVE) {
      const response = apiResponse.validationError(
        'Can only update progress on active goals',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Calculate new progress
    let newProgress: number;

    if (typeof increment === 'number') {
      newProgress = Math.max(0, existing.progress + increment);
    } else if (typeof progress === 'number') {
      newProgress = progress;
    } else {
      // Default increment by 1
      newProgress = existing.progress + 1;
    }

    const percentage = calculateProgressPercentage(newProgress, existing.target);
    const isNowComplete = newProgress >= existing.target;

    // Update milestones
    const milestones = parseJsonField<GoalMilestone[]>(existing.milestones) || [];
    const now = new Date().toISOString();
    const newlyReachedMilestones: GoalMilestone[] = [];

    for (const milestone of milestones) {
      const milestoneValue = (milestone.value / 100) * existing.target;
      if (newProgress >= milestoneValue && !milestone.reached) {
        milestone.reached = true;
        milestone.reachedAt = now;
        newlyReachedMilestones.push(milestone);
      }
    }

    // Track best day
    const today = new Date().toISOString().split('T')[0];
    const dailyProgress = newProgress - existing.progress;
    let bestDay = parseJsonField<GoalBestDay>(existing.bestDay);
    if (!bestDay || dailyProgress > bestDay.progress) {
      bestDay = { date: today, progress: dailyProgress };
    }

    // Calculate days active and avg daily progress
    const daysElapsed = Math.max(
      1,
      Math.ceil(
        (new Date().getTime() - new Date(existing.startDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    const avgDailyProgress = newProgress / daysElapsed;

    // Update goal
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        progress: newProgress,
        progressPercentage: percentage,
        status: isNowComplete ? GoalStatus.COMPLETED : existing.status,
        completedAt: isNowComplete ? new Date() : null,
        milestones: milestones as unknown as Prisma.InputJsonValue,
        bestDay: bestDay as unknown as Prisma.InputJsonValue,
        daysActive: daysElapsed,
        avgDailyProgress: Math.round(avgDailyProgress * 100) / 100,
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

    // Check achievements if completed
    if (isNowComplete) {
      await AchievementService.checkGoalAchievements(userId).catch((err) => {
        logger.error('Failed to check goal achievements', { userId }, err);
      });

      await NotificationService.notifyGoalCompleted(userId, {
        title: goal.title,
        id: goal.id,
      }).catch((err) => {
        logger.error('Failed to send goal completed notification', { userId }, err);
      });
    }

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      entityId: goal.id,
      description: `Updated progress for goal: ${goal.title} (${existing.progress} → ${newProgress})`,
      oldValue: { progress: existing.progress },
      newValue: { progress: newProgress, note },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/[id]/progress completed', {
      userId,
      goalId: id,
      oldProgress: existing.progress,
      newProgress,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        goal,
        progressInfo: {
          previous: existing.progress,
          current: newProgress,
          change: newProgress - existing.progress,
          percentage,
          isComplete: isNowComplete,
          newlyReachedMilestones,
        },
      },
      {  }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/[id]/progress failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to update progress', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// PUT - Set Absolute Progress
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

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = apiResponse.validationError('Invalid JSON body', undefined, requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Validate body
    const validation = setProgressSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { progress: newProgress, note } = validation.data;

    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    if (existing.status !== GoalStatus.ACTIVE) {
      const response = apiResponse.validationError(
        'Can only update progress on active goals',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const percentage = calculateProgressPercentage(newProgress, existing.target);
    const isNowComplete = newProgress >= existing.target;

    // Update milestones
    const milestones = parseJsonField<GoalMilestone[]>(existing.milestones) || [];
    const now = new Date().toISOString();

    for (const milestone of milestones) {
      const milestoneValue = (milestone.value / 100) * existing.target;
      if (newProgress >= milestoneValue && !milestone.reached) {
        milestone.reached = true;
        milestone.reachedAt = now;
      }
    }

    // Calculate days active and avg daily progress
    const daysElapsed = Math.max(
      1,
      Math.ceil(
        (new Date().getTime() - new Date(existing.startDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    const avgDailyProgress = newProgress / daysElapsed;

    // Update goal
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        progress: newProgress,
        progressPercentage: percentage,
        status: isNowComplete ? GoalStatus.COMPLETED : existing.status,
        completedAt: isNowComplete ? new Date() : null,
        milestones: milestones as unknown as Prisma.InputJsonValue,
        daysActive: daysElapsed,
        avgDailyProgress: Math.round(avgDailyProgress * 100) / 100,
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

    // Check achievements if completed
    if (isNowComplete) {
      await AchievementService.checkGoalAchievements(userId).catch((err) => {
        logger.error('Failed to check goal achievements', { userId }, err);
      });

      await NotificationService.notifyGoalCompleted(userId, {
        title: goal.title,
        id: goal.id,
      }).catch((err) => {
        logger.error('Failed to send goal completed notification', { userId }, err);
      });
    }

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      entityId: goal.id,
      description: `Set progress for goal: ${goal.title} to ${newProgress}`,
      oldValue: { progress: existing.progress },
      newValue: { progress: newProgress, note },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('PUT /api/goals/[id]/progress completed', {
      userId,
      goalId: id,
      oldProgress: existing.progress,
      newProgress,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(goal, {});
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT /api/goals/[id]/progress failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to set progress', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';