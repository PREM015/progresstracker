// =============================================================================
// src/app/api/goals/check-deadlines/route.ts
// =============================================================================
// Description: Check and process goal deadlines (notifications/auto-fail)
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes (Admin/Cron for POST)
// Rate Limit: 10 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalStatus } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { NotificationService } from '@/services/notificationService';
import { addDays, differenceInHours } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 10;
const AUTO_FAIL_DAYS_OVERDUE = 14;
const AUTO_FAIL_MIN_PROGRESS = 10;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-Cron-Secret',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const postBodySchema = z.object({
  autoFailEnabled: z.boolean().default(true),
  autoFailDaysOverdue: z.number().int().min(1).max(90).default(AUTO_FAIL_DAYS_OVERDUE),
  autoFailMinProgress: z.number().min(0).max(100).default(AUTO_FAIL_MIN_PROGRESS),
  sendNotifications: z.boolean().default(true),
  dryRun: z.boolean().default(false),
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
  const rateLimitKey = `check-deadlines:${ip}`;
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

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const now = new Date();
    const next24Hours = addDays(now, 1);

    const [expiringSoon, overdue] = await Promise.all([
      prisma.goal.count({
        where: {
          status: GoalStatus.ACTIVE,
          deadline: {
            gte: now,
            lte: next24Hours,
          },
        },
      }),
      prisma.goal.count({
        where: {
          status: GoalStatus.ACTIVE,
          deadline: { lt: now },
        },
      }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Expiring-Soon', String(expiringSoon));
    response.headers.set('X-Overdue', String(overdue));
    response.headers.set('X-Check-Time', now.toISOString());

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD /api/goals/check-deadlines failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Check Deadlines for Current User
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const now = new Date();
    const next24Hours = addDays(now, 1);
    const next7Days = addDays(now, 7);

    // Fetch goals with deadlines
    const [expiredGoals, expiringSoon, expiringThisWeek] = await Promise.all([
      // Already expired
      prisma.goal.findMany({
        where: {
          userId,
          status: GoalStatus.ACTIVE,
          deadline: { lt: now },
        },
        select: {
          id: true,
          title: true,
          deadline: true,
          progress: true,
          target: true,
          progressPercentage: true,
          avgDailyProgress: true,
        },
        orderBy: { deadline: 'asc' },
      }),
      // Expiring in 24 hours
      prisma.goal.findMany({
        where: {
          userId,
          status: GoalStatus.ACTIVE,
          deadline: {
            gte: now,
            lte: next24Hours,
          },
        },
        select: {
          id: true,
          title: true,
          deadline: true,
          progress: true,
          target: true,
          progressPercentage: true,
          avgDailyProgress: true,
        },
        orderBy: { deadline: 'asc' },
      }),
      // Expiring this week
      prisma.goal.findMany({
        where: {
          userId,
          status: GoalStatus.ACTIVE,
          deadline: {
            gt: next24Hours,
            lte: next7Days,
          },
        },
        select: {
          id: true,
          title: true,
          deadline: true,
          progress: true,
          target: true,
          progressPercentage: true,
          avgDailyProgress: true,
        },
        orderBy: { deadline: 'asc' },
      }),
    ]);

    // Process each category
    const processGoal = (goal: typeof expiredGoals[0], isOverdue: boolean = false) => {
      const hoursLeft = isOverdue
        ? -differenceInHours(now, goal.deadline!)
        : differenceInHours(goal.deadline!, now);

      const remaining = goal.target - goal.progress;
      const canComplete = goal.avgDailyProgress > 0 && !isOverdue
        ? remaining / goal.avgDailyProgress <= hoursLeft / 24
        : false;

      return {
        ...goal,
        hoursLeft: isOverdue ? 0 : hoursLeft,
        hoursOverdue: isOverdue ? -hoursLeft : 0,
        remaining,
        canComplete,
        atRisk: !canComplete && goal.progressPercentage < 90,
        recommendation: isOverdue
          ? goal.progressPercentage >= 90
            ? 'Complete now or extend deadline'
            : goal.progressPercentage >= 50
              ? 'Extend deadline'
              : 'Consider archiving'
          : canComplete
            ? 'On track'
            : 'Increase daily effort',
      };
    };

    const result = {
      expired: expiredGoals.map((g) => processGoal(g, true)),
      expiringSoon: expiringSoon.map((g) => processGoal(g, false)),
      expiringThisWeek: expiringThisWeek.map((g) => processGoal(g, false)),
      summary: {
        expired: expiredGoals.length,
        urgent: expiringSoon.length,
        upcoming: expiringThisWeek.length,
        atRisk: [
          ...expiredGoals.map((g) => processGoal(g, true)),
          ...expiringSoon.map((g) => processGoal(g, false)),
          ...expiringThisWeek.map((g) => processGoal(g, false)),
        ].filter((g) => g.atRisk).length,
        canComplete: expiringSoon.filter((g) => processGoal(g, false).canComplete).length,
      },
      checkTime: now.toISOString(),
    };

    logger.info('GET /api/goals/check-deadlines completed', {
      userId,
      expired: result.summary.expired,
      urgent: result.summary.urgent,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(result, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/check-deadlines failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to check deadlines', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Process Deadline Checks (Admin/Cron)
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Check for cron secret or admin access
    const cronSecret = request.headers.get('x-cron-secret');
    const isValidCron = cronSecret === process.env.CRON_SECRET;

    if (!isValidCron) {
      const session = await getServerSession(authOptions);

      if (!session?.user?.isAdmin) {
        const response = apiResponse.forbidden('Admin or cron access required', requestId);
        return addHeaders(response, requestId);
      }
    }

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

    const validation = postBodySchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid request data',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId);
    }

    const params = validation.data;
    const now = new Date();
    const next24Hours = addDays(now, 1);

    // Find goals expiring soon
    const expiringSoonGoals = await prisma.goal.findMany({
      where: {
        status: GoalStatus.ACTIVE,
        deadline: {
          gte: now,
          lte: next24Hours,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Send notifications
    const notifications = [];

    if (params.sendNotifications && !params.dryRun) {
      for (const goal of expiringSoonGoals) {
        try {
          const hoursLeft = differenceInHours(goal.deadline!, now);

          const notification = await NotificationService.createNotification(
            goal.userId,
            {
              type: 'GOAL_REMINDER',
              title: '⏰ Goal Deadline Approaching!',
              message: `Your goal "${goal.title}" is due in ${hoursLeft} hours. You're at ${goal.progressPercentage}% completion.`,
              actionUrl: `/goals/${goal.id}`,
              actionLabel: 'View Goal',
              priority: hoursLeft <= 6 ? 'URGENT' : 'HIGH',
            }
          );
          notifications.push({ goalId: goal.id, notificationId: notification.id });
        } catch (notifError) {
          logger.error('Failed to send deadline notification', { goalId: goal.id }, notifError);
        }
      }
    }

    // Auto-fail overdue goals if enabled
    let autoFailedCount = 0;

    if (params.autoFailEnabled && !params.dryRun) {
      const overdueThreshold = addDays(now, -params.autoFailDaysOverdue);

      const result = await prisma.goal.updateMany({
        where: {
          status: GoalStatus.ACTIVE,
          deadline: { lt: overdueThreshold },
          progressPercentage: { lt: params.autoFailMinProgress },
        },
        data: {
          status: GoalStatus.FAILED,
          failedAt: now,
          updatedAt: now,
        },
      });

      autoFailedCount = result.count;

      // Disable reminders for auto-failed goals
      if (autoFailedCount > 0) {
        await prisma.goalReminder.updateMany({
          where: {
            goal: {
              status: GoalStatus.FAILED,
              failedAt: now,
            },
          },
          data: { isActive: false },
        });
      }
    }

    // Count goals that would be auto-failed (for dry run)
    let wouldAutoFail = 0;
    if (params.dryRun && params.autoFailEnabled) {
      const overdueThreshold = addDays(now, -params.autoFailDaysOverdue);

      wouldAutoFail = await prisma.goal.count({
        where: {
          status: GoalStatus.ACTIVE,
          deadline: { lt: overdueThreshold },
          progressPercentage: { lt: params.autoFailMinProgress },
        },
      });
    }

    logger.info('POST /api/goals/check-deadlines completed', {
      notificationsSent: notifications.length,
      autoFailed: autoFailedCount,
      wouldAutoFail,
      dryRun: params.dryRun,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        processed: expiringSoonGoals.length,
        notificationsSent: params.dryRun ? 0 : notifications.length,
        autoFailed: params.dryRun ? 0 : autoFailedCount,
        wouldAutoFail: params.dryRun ? wouldAutoFail : undefined,
        dryRun: params.dryRun,
        timestamp: now.toISOString(),
        config: {
          autoFailEnabled: params.autoFailEnabled,
          autoFailDaysOverdue: params.autoFailDaysOverdue,
          autoFailMinProgress: params.autoFailMinProgress,
          sendNotifications: params.sendNotifications,
        },
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('POST /api/goals/check-deadlines failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to process deadline checks', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';