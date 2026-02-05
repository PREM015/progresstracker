// =============================================================================
// src/app/api/goals/reminders/route.ts
// =============================================================================
// Description: Get all goal reminders for user
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { NotificationChannel, GoalStatus, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { goalReminderService } from '@/services/goalReminderService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const MAX_TOTAL_REMINDERS = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
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

const querySchema = z.object({
  activeOnly: z.coerce.boolean().default(true),
  goalId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const createReminderSchema = z.object({
  goalId: z.string().cuid('Invalid goal ID'),
  frequency: z.enum(['daily', 'weekdays', 'weekly', 'custom']),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  timezone: z.string().default('UTC'),
  days: z.array(z.number().int().min(0).max(6)).optional().default([]),
  channel: z.nativeEnum(NotificationChannel).optional().default(NotificationChannel.IN_APP),
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
  const rateLimitKey = `goals-reminders:${ip}`;
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
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const [total, active] = await Promise.all([
      prisma.goalReminder.count({ where: { userId } }),
      prisma.goalReminder.count({ where: { userId, isActive: true } }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Reminders', String(total));
    response.headers.set('X-Active-Reminders', String(active));
    response.headers.set('X-Max-Reminders', String(MAX_TOTAL_REMINDERS));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/reminders failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get All User Reminders
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      activeOnly: searchParams.get('activeOnly'),
      goalId: searchParams.get('goalId') || undefined,
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    if (!queryValidation.success) {
      const response = apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { activeOnly, goalId, page, limit } = queryValidation.data;

    // Build where clause
    const where: Prisma.GoalReminderWhereInput = { userId };

    if (activeOnly) {
      where.isActive = true;
    }

    if (goalId) {
      where.goalId = goalId;
    }

    // Fetch reminders with goal info
    const [reminders, total] = await Promise.all([
      prisma.goalReminder.findMany({
        where,
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              status: true,
              progress: true,
              target: true,
              progressPercentage: true,
              deadline: true,
            },
          },
        },
        orderBy: [{ isActive: 'desc' }, { nextSendAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.goalReminder.count({ where }),
    ]);

    // Get stats
    const stats = {
      total,
      active: reminders.filter((r) => r.isActive).length,
      byFrequency: {
        daily: reminders.filter((r) => r.frequency === 'daily').length,
        weekdays: reminders.filter((r) => r.frequency === 'weekdays').length,
        weekly: reminders.filter((r) => r.frequency === 'weekly').length,
        custom: reminders.filter((r) => r.frequency === 'custom').length,
      },
      byChannel: {
        inApp: reminders.filter((r) => r.channel === NotificationChannel.IN_APP).length,
        email: reminders.filter((r) => r.channel === NotificationChannel.EMAIL).length,
        push: reminders.filter((r) => r.channel === NotificationChannel.PUSH).length,
      },
      totalSent: reminders.reduce((sum, r) => sum + r.sendCount, 0),
    };

    // Get upcoming reminders (next 24 hours)
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcoming = reminders
      .filter((r) => r.isActive && r.nextSendAt && r.nextSendAt <= next24Hours)
      .map((r) => ({
        id: r.id,
        goalId: r.goalId,
        goalTitle: r.goal.title,
        nextSendAt: r.nextSendAt,
        channel: r.channel,
      }));

    logger.info('GET /api/goals/reminders completed', {
      userId,
      count: reminders.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      reminders,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      {
        meta: {
          requestId,
          stats,
          upcoming,
        },
      }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/reminders failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch reminders', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Create New Reminder
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = apiResponse.validationError('Invalid JSON body', undefined, requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Validate body
    const validation = createReminderSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const data = validation.data;

    // Check total reminder limit
    const totalReminders = await prisma.goalReminder.count({ where: { userId } });

    if (totalReminders >= MAX_TOTAL_REMINDERS) {
      const response = apiResponse.validationError(
        `Maximum ${MAX_TOTAL_REMINDERS} reminders allowed`,
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Verify goal ownership and status
    const goal = await prisma.goal.findFirst({
      where: { id: data.goalId, userId },
      select: { id: true, title: true, status: true },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    if (goal.status !== GoalStatus.ACTIVE && goal.status !== GoalStatus.PAUSED) {
      const response = apiResponse.validationError(
        'Can only add reminders to active or paused goals',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Check reminder limit per goal (5)
    const goalReminderCount = await prisma.goalReminder.count({
      where: { goalId: data.goalId },
    });

    if (goalReminderCount >= 5) {
      const response = apiResponse.validationError(
        'Maximum 5 reminders per goal allowed',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Create reminder
    const reminder = await goalReminderService.create({
      goalId: data.goalId,
      userId,
      frequency: data.frequency,
      time: data.time,
      timezone: data.timezone,
      days: data.days,
      channel: data.channel,
    });

    // Enable reminders on goal
    await prisma.goal.update({
      where: { id: data.goalId },
      data: { reminderEnabled: true },
    });

    logger.info('POST /api/goals/reminders completed', {
      userId,
      goalId: data.goalId,
      reminderId: reminder.id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(
      {
        reminder,
        goal: { id: goal.id, title: goal.title },
      },
      { requestId }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/reminders failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to create reminder', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';