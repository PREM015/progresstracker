// =============================================================================
// src/app/api/goals/[id]/stats/route.ts
// =============================================================================
// Description: Get statistics for a specific goal
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

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
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
  const rateLimitKey = `goals-stats:${ip}`;
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

function calculateProgressPercentage(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100 * 10) / 10);
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
      select: { id: true, updatedAt: true },
    });

    if (!goal) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Last-Modified', goal.updatedAt.toUTCString());

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/[id]/stats failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Goal Statistics
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

    // Fetch goal with reminders
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        reminders: {
          select: {
            id: true,
            isActive: true,
            sendCount: true,
          },
        },
      },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Calculate time-based stats
    const now = new Date();
    const startDate = new Date(goal.startDate);
    const daysElapsed = Math.max(
      1,
      Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    let daysLeft: number | null = null;
    let totalDays: number | null = null;
    let percentTimeElapsed: number | null = null;

    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      daysLeft = Math.max(
        0,
        Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
      totalDays = Math.ceil(
        (deadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      percentTimeElapsed = totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 100;
    }

    // Progress stats
    const progress = goal.progress;
    const target = goal.target;
    const percentage = calculateProgressPercentage(progress, target);
    const remaining = Math.max(0, target - progress);
    const avgPerDay = progress / daysElapsed;

    // Projection
    let projectedCompletion: Date | null = null;
    let projectedDaysNeeded: number | null = null;
    let onTrack = true;

    if (avgPerDay > 0 && remaining > 0) {
      projectedDaysNeeded = Math.ceil(remaining / avgPerDay);
      projectedCompletion = new Date(now.getTime() + projectedDaysNeeded * 24 * 60 * 60 * 1000);

      if (goal.deadline) {
        onTrack = projectedCompletion <= new Date(goal.deadline);
      }
    }

    // Required pace
    let requiredPerDay: number | null = null;
    if (daysLeft !== null && daysLeft > 0 && remaining > 0) {
      requiredPerDay = remaining / daysLeft;
    }

    // Parse JSON fields
    const milestones = parseJsonField<GoalMilestone[]>(goal.milestones) || [];
    const bestDay = parseJsonField<GoalBestDay>(goal.bestDay);

    // Milestone stats
    const milestonesReached = milestones.filter((m) => m.reached).length;
    const totalMilestones = milestones.length;
    const nextMilestone = milestones.find((m) => !m.reached);

    // Reminder stats
    const activeReminders = goal.reminders.filter((r) => r.isActive).length;
    const totalRemindersSent = goal.reminders.reduce((sum, r) => sum + r.sendCount, 0);

    const stats = {
      goal: {
        id: goal.id,
        title: goal.title,
        status: goal.status,
        category: goal.category,
        goalType: goal.goalType,
        metric: goal.metric,
        platform: goal.platform,
      },
      progress: {
        current: progress,
        target,
        remaining,
        percentage,
        isComplete: progress >= target,
      },
      time: {
        startDate: goal.startDate,
        deadline: goal.deadline,
        daysElapsed,
        daysLeft,
        totalDays,
        percentTimeElapsed,
        completedAt: goal.completedAt,
      },
      pace: {
        avgPerDay: Math.round(avgPerDay * 100) / 100,
        requiredPerDay: requiredPerDay ? Math.round(requiredPerDay * 100) / 100 : null,
        onTrack,
        projectedCompletion,
        projectedDaysNeeded,
      },
      milestones: {
        reached: milestonesReached,
        total: totalMilestones,
        percentage: totalMilestones > 0
          ? Math.round((milestonesReached / totalMilestones) * 100)
          : 0,
        next: nextMilestone,
        all: milestones,
      },
      activity: {
        daysActive: goal.daysActive,
        avgDailyProgress: goal.avgDailyProgress,
        bestDay,
        currentStreak: goal.currentStreakDays,
        requiredStreak: goal.requiredStreakDays,
      },
      reminders: {
        enabled: goal.reminderEnabled,
        active: activeReminders,
        total: goal.reminders.length,
        totalSent: totalRemindersSent,
      },
      metadata: {
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
        isPublic: goal.isPublic,
        shareCode: goal.shareCode,
      },
    };

    logger.info('GET /api/goals/[id]/stats completed', {
      userId,
      goalId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(stats, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/[id]/stats failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch goal stats', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
