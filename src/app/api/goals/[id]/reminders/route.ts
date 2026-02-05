// =============================================================================
// src/app/api/goals/[id]/reminders/route.ts
// =============================================================================
// Description: Goal reminders management
// Methods: GET, POST, PUT, DELETE, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { NotificationChannel } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { goalReminderService } from '@/services/goalReminderService';

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
const MAX_REMINDERS_PER_GOAL = 5;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
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

const idSchema = z.string().cuid('Invalid ID format');

const createReminderSchema = z.object({
  frequency: z.enum(['daily', 'weekdays', 'weekly', 'custom']),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  timezone: z.string().default('UTC'),
  days: z.array(z.number().int().min(0).max(6)).optional().default([]),
  channel: z.nativeEnum(NotificationChannel).optional().default(NotificationChannel.IN_APP),
});

const updateReminderSchema = z.object({
  reminderId: z.string().cuid(),
  frequency: z.enum(['daily', 'weekdays', 'weekly', 'custom']).optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  timezone: z.string().optional(),
  days: z.array(z.number().int().min(0).max(6)).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  isActive: z.boolean().optional(),
});

const deleteReminderSchema = z.object({
  reminderId: z.string().cuid().optional(),
  deleteAll: z.boolean().optional().default(false),
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
      select: { id: true, reminderEnabled: true },
    });

    if (!goal) {
      return new NextResponse(null, { status: 404 });
    }

    const reminderCount = await prisma.goalReminder.count({
      where: { goalId: id, userId },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Reminder-Count', String(reminderCount));
    response.headers.set('X-Reminders-Enabled', String(goal.reminderEnabled));
    response.headers.set('X-Max-Reminders', String(MAX_REMINDERS_PER_GOAL));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/[id]/reminders failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - List Reminders for Goal
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

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { id: true, title: true, reminderEnabled: true },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Fetch reminders
    const reminders = await goalReminderService.getByGoal(id, userId);

    logger.info('GET /api/goals/[id]/reminders completed', {
      userId,
      goalId: id,
      count: reminders.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        goal: { id: goal.id, title: goal.title, reminderEnabled: goal.reminderEnabled },
        reminders,
        count: reminders.length,
        maxAllowed: MAX_REMINDERS_PER_GOAL,
      },
      {  }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/[id]/reminders failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch reminders', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Create Reminder
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

    // Validate goal ID
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

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { id: true, title: true },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Check reminder limit
    const existingCount = await prisma.goalReminder.count({
      where: { goalId: id, userId },
    });

    if (existingCount >= MAX_REMINDERS_PER_GOAL) {
      const response = apiResponse.validationError(
        `Maximum ${MAX_REMINDERS_PER_GOAL} reminders allowed per goal`,
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Create reminder
    const reminder = await goalReminderService.create({
      goalId: id,
      userId,
      frequency: data.frequency,
      time: data.time,
      timezone: data.timezone,
      days: data.days,
      channel: data.channel,
    });

    // Enable reminders on goal if not already enabled
    await prisma.goal.update({
      where: { id },
      data: { reminderEnabled: true },
    });

    logger.info('POST /api/goals/[id]/reminders completed', {
      userId,
      goalId: id,
      reminderId: reminder.id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(reminder, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/[id]/reminders failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to create reminder', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// PUT - Update Reminder
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

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = apiResponse.validationError('Invalid JSON body', undefined, requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Validate body
    const validation = updateReminderSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { reminderId, ...updateData } = validation.data;

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Update reminder
    const reminder = await goalReminderService.update(reminderId, userId, updateData);

    logger.info('PUT /api/goals/[id]/reminders completed', {
      userId,
      goalId: id,
      reminderId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(reminder, {  });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT /api/goals/[id]/reminders failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to update reminder', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// DELETE - Delete Reminder(s)
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

    // Get parameters from URL or body
    const { searchParams } = new URL(request.url);
    let reminderId = searchParams.get('reminderId');
    let deleteAll = searchParams.get('deleteAll') === 'true';

    // Try to get from body if not in URL
    if (!reminderId && !deleteAll) {
      try {
        const body = await request.json();
        const validation = deleteReminderSchema.safeParse(body);
        if (validation.success) {
          reminderId = validation.data.reminderId || null;
          deleteAll = validation.data.deleteAll || false;
        }
      } catch {
        // No body, continue
      }
    }

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    let deletedCount = 0;

    if (deleteAll) {
      // Delete all reminders for this goal
      const result = await prisma.goalReminder.deleteMany({
        where: { goalId: id, userId },
      });
      deletedCount = result.count;

      // Disable reminders on goal
      await prisma.goal.update({
        where: { id },
        data: { reminderEnabled: false },
      });
    } else if (reminderId) {
      // Delete specific reminder
      await goalReminderService.delete(reminderId, userId);
      deletedCount = 1;

      // Check if any reminders left
      const remainingCount = await prisma.goalReminder.count({
        where: { goalId: id, userId },
      });

      if (remainingCount === 0) {
        await prisma.goal.update({
          where: { id },
          data: { reminderEnabled: false },
        });
      }
    } else {
      const response = apiResponse.validationError(
        'Either reminderId or deleteAll=true is required',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    logger.info('DELETE /api/goals/[id]/reminders completed', {
      userId,
      goalId: id,
      deletedCount,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { deleted: deletedCount },
      { message: `${deletedCount} reminder(s) deleted` }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE /api/goals/[id]/reminders failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to delete reminder', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';