// =============================================================================
// src/app/api/goals/auto-update/route.ts
// =============================================================================
// Description: Auto-update goals from tracker entries
// Methods: POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 10 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalStatus, GoalType, GoalMetric, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { auditLogService } from '@/services/auditLogService';
import { AchievementService } from '@/services/achievementService';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 10;

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

const autoUpdateSchema = z.object({
  goalIds: z.array(z.string().cuid()).optional(),
  goalTypes: z.array(z.nativeEnum(GoalType)).optional(),
  forceUpdate: z.boolean().default(false),
  checkAchievements: z.boolean().default(true),
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
  const rateLimitKey = `goals-auto-update:${ip}`;
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

interface DateRange {
  start: Date;
  end: Date;
}

function getDateRangeForGoalType(goalType: GoalType, now: Date): DateRange | null {
  switch (goalType) {
    case GoalType.DAILY:
      return { start: startOfDay(now), end: endOfDay(now) };
    case GoalType.WEEKLY:
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case GoalType.MONTHLY:
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case GoalType.QUARTERLY:
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case GoalType.YEARLY:
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return null;
  }
}

function calculateProgressFromEntries(
  entries: Prisma.TrackerEntryGetPayload<Record<string, never>>[],
  metric: GoalMetric
): number {
  return entries.reduce((sum, entry) => {
    switch (metric) {
      case GoalMetric.PROBLEMS_SOLVED:
        return sum + (entry.problemsSolved || 0);
      case GoalMetric.COMMITS:
        return sum + (entry.commits || 0);
      case GoalMetric.PULL_REQUESTS:
        return sum + (entry.pullRequests || 0);
      case GoalMetric.TIME_SPENT:
        return sum + (entry.timeSpent || 0);
      case GoalMetric.PROJECTS_COMPLETED:
        return sum + (entry.projectsCompleted || 0);
      case GoalMetric.COURSES_COMPLETED:
        return sum + (entry.coursesCompleted || 0);
      case GoalMetric.CERTIFICATIONS:
        return sum + (entry.certificationsEarned || 0);
      case GoalMetric.APPLICATIONS_SUBMITTED:
        return sum + (entry.applicationsSubmitted || 0);
      case GoalMetric.CONTESTS_PARTICIPATED:
        return sum + (entry.contestsParticipated || 0);
      default:
        return sum;
    }
  }, 0);
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

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const autoUpdateableGoals = await prisma.goal.count({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
        goalType: {
          in: [GoalType.DAILY, GoalType.WEEKLY, GoalType.MONTHLY, GoalType.QUARTERLY, GoalType.YEARLY],
        },
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Auto-Updateable-Goals', String(autoUpdateableGoals));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/auto-update failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Auto-Update Goals from Tracker Entries
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
    let body: unknown = {};
    try {
      const rawBody = await request.text();
      if (rawBody) {
        body = JSON.parse(rawBody);
      }
    } catch {
      // Use defaults
    }

    const validation = autoUpdateSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid request data',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;
    const now = new Date();

    // Build where clause for goals
    const where: Prisma.GoalWhereInput = {
      userId,
      status: GoalStatus.ACTIVE,
    };

    if (params.goalIds && params.goalIds.length > 0) {
      where.id = { in: params.goalIds };
    }

    if (params.goalTypes && params.goalTypes.length > 0) {
      where.goalType = { in: params.goalTypes };
    } else {
      // Default to time-based goals that can be auto-updated
      where.goalType = {
        in: [GoalType.DAILY, GoalType.WEEKLY, GoalType.MONTHLY, GoalType.QUARTERLY, GoalType.YEARLY],
      };
    }

    // Get goals to update
    const goals = await prisma.goal.findMany({
      where,
      include: {
        platform: {
          select: { id: true, name: true },
        },
      },
    });

    if (goals.length === 0) {
      const response = apiResponse.success(
        {
          checked: 0,
          updated: 0,
          completed: 0,
          updates: [],
          message: 'No goals found to auto-update',
        },
        { meta: { requestId } }
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    interface UpdateResult {
      goalId: string;
      title: string;
      metric: GoalMetric;
      platform: string | null;
      oldProgress: number;
      newProgress: number;
      target: number;
      completed: boolean;
      skipped: boolean;
      skipReason?: string;
    }

    const updates: UpdateResult[] = [];
    const completedGoals: string[] = [];

    for (const goal of goals) {
      // Get date range for the goal type
      const dateRange = getDateRangeForGoalType(goal.goalType, now);

      if (!dateRange) {
        updates.push({
          goalId: goal.id,
          title: goal.title,
          metric: goal.metric,
          platform: goal.platform?.name || null,
          oldProgress: goal.progress,
          newProgress: goal.progress,
          target: goal.target,
          completed: false,
          skipped: true,
          skipReason: 'Unsupported goal type for auto-update',
        });
        continue;
      }

      // Fetch tracker entries for the period
      const entryWhere: Prisma.TrackerEntryWhereInput = {
        userId,
        date: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      };

      // Filter by platform if goal has one
      if (goal.platformId) {
        entryWhere.platformId = goal.platformId;
      }

      const entries = await prisma.trackerEntry.findMany({
        where: entryWhere,
      });

      // Calculate new progress
      const newProgress = calculateProgressFromEntries(entries, goal.metric);

      // Skip if no change and not forcing update
      if (newProgress === goal.progress && !params.forceUpdate) {
        updates.push({
          goalId: goal.id,
          title: goal.title,
          metric: goal.metric,
          platform: goal.platform?.name || null,
          oldProgress: goal.progress,
          newProgress,
          target: goal.target,
          completed: false,
          skipped: true,
          skipReason: 'No change in progress',
        });
        continue;
      }

      // Calculate new percentage and check completion
      const newPercentage = calculateProgressPercentage(newProgress, goal.target);
      const isNowComplete = newProgress >= goal.target;
      const wasComplete = goal.progress >= goal.target;

      // Update goal
      await prisma.goal.update({
        where: { id: goal.id },
        data: {
          progress: newProgress,
          progressPercentage: newPercentage,
          status: isNowComplete && !wasComplete ? GoalStatus.COMPLETED : goal.status,
          completedAt: isNowComplete && !wasComplete ? now : goal.completedAt,
          updatedAt: now,
        },
      });

      updates.push({
        goalId: goal.id,
        title: goal.title,
        metric: goal.metric,
        platform: goal.platform?.name || null,
        oldProgress: goal.progress,
        newProgress,
        target: goal.target,
        completed: isNowComplete && !wasComplete,
        skipped: false,
      });

      if (isNowComplete && !wasComplete) {
        completedGoals.push(goal.id);
      }
    }

    // Check achievements if any goals were completed
    if (params.checkAchievements && completedGoals.length > 0) {
      try {
        await AchievementService.checkGoalAchievements(userId);
      } catch (achError) {
        logger.error('Failed to check achievements', { userId }, achError);
      }
    }

    // Create audit log
    const updatedCount = updates.filter((u) => !u.skipped).length;
    if (updatedCount > 0) {
      await auditLogService.create({
        userId,
        action: 'UPDATE',
        category: 'goals',
        entityType: 'goal',
        description: `Auto-updated ${updatedCount} goals from tracker entries`,
        newValue: {
          updated: updatedCount,
          completed: completedGoals.length,
          goalIds: updates.filter((u) => !u.skipped).map((u) => u.goalId),
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
        requestId,
      });
    }

    logger.info('POST /api/goals/auto-update completed', {
      userId,
      checked: goals.length,
      updated: updatedCount,
      completed: completedGoals.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        checked: goals.length,
        updated: updatedCount,
        skipped: updates.filter((u) => u.skipped).length,
        completed: completedGoals.length,
        updates,
        completedGoalIds: completedGoals,
        message: `${updatedCount} goals updated from tracker entries${completedGoals.length > 0 ? `, ${completedGoals.length} completed!` : ''}`,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/auto-update failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to auto-update goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';