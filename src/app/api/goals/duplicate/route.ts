// =============================================================================
// src/app/api/goals/duplicate/route.ts
// =============================================================================
// Description: Duplicate an existing goal
// Methods: POST, OPTIONS
// Auth Required: Yes
// Rate Limit: 20 requests/minute
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

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;
const MAX_GOALS_PER_USER = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

const duplicateSchema = z.object({
  goalId: z.string().cuid('Invalid goal ID'),
  options: z
    .object({
      title: z.string().min(1).max(200).optional(),
      resetProgress: z.boolean().default(true),
      resetDeadline: z.boolean().default(true),
      newDeadline: z.string().datetime().optional(),
      deadlineOffsetDays: z.number().int().min(1).max(365).optional(),
      copyReminders: z.boolean().default(false),
      setActive: z.boolean().default(true),
    })
    .optional()
    .default({}),
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
  const rateLimitKey = `goals-duplicate:${ip}`;
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
// POST - Duplicate Goal
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
    const validation = duplicateSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { goalId, options } = validation.data;

    // Check goal limit
    const existingCount = await prisma.goal.count({
      where: { userId, status: { notIn: [GoalStatus.ARCHIVED, GoalStatus.CANCELLED] } },
    });

    if (existingCount >= MAX_GOALS_PER_USER) {
      const response = apiResponse.validationError(
        `Maximum ${MAX_GOALS_PER_USER} active goals allowed`,
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Fetch original goal
    const original = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: {
        reminders: options.copyReminders ? true : false,
      },
    });

    if (!original) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Calculate new deadline
    let newDeadline: Date | null = null;
    if (!options.resetDeadline && original.deadline) {
      newDeadline = original.deadline;
    } else if (options.newDeadline) {
      newDeadline = new Date(options.newDeadline);
    } else if (options.deadlineOffsetDays && original.deadline) {
      // Calculate offset from original deadline duration
      const originalDuration = original.deadline.getTime() - original.startDate.getTime();
      newDeadline = new Date(Date.now() + originalDuration);
    } else if (options.deadlineOffsetDays) {
      newDeadline = new Date();
      newDeadline.setDate(newDeadline.getDate() + options.deadlineOffsetDays);
    }

    // Create default milestones
    const milestones = [
      { value: 25, label: '25%', reached: false },
      { value: 50, label: '50%', reached: false },
      { value: 75, label: '75%', reached: false },
      { value: 100, label: '100%', reached: false },
    ];

    // Create duplicated goal
    const duplicatedGoal = await prisma.goal.create({
      data: {
        userId,
        title: options.title || `${original.title} (Copy)`,
        description: original.description,
        category: original.category,
        goalType: original.goalType,
        metric: original.metric,
        customMetric: original.customMetric,
        target: original.target,
        unit: original.unit,
        progress: options.resetProgress ? 0 : original.progress,
        progressPercentage: options.resetProgress ? 0 : original.progressPercentage,
        startDate: new Date(),
        endDate: null,
        deadline: newDeadline,
        status: options.setActive ? GoalStatus.ACTIVE : GoalStatus.DRAFT,
        platformId: original.platformId,
        requiredStreakDays: original.requiredStreakDays,
        currentStreakDays: 0,
        reminderEnabled: options.copyReminders && original.reminderEnabled,
        isPublic: false, // Always private on duplicate
        shareCode: null,
        color: original.color,
        icon: original.icon,
        milestones: milestones as unknown as Prisma.InputJsonValue,
        daysActive: 0,
        avgDailyProgress: 0,
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

    // Copy reminders if requested
    if (options.copyReminders && original.reminders && original.reminders.length > 0) {
      const reminderData = original.reminders.map((reminder) => ({
        goalId: duplicatedGoal.id,
        userId,
        frequency: reminder.frequency,
        time: reminder.time,
        timezone: reminder.timezone,
        days: reminder.days,
        channel: reminder.channel,
        isActive: true,
        sendCount: 0,
      }));

      await prisma.goalReminder.createMany({
        data: reminderData,
      });

      // Update goal to enable reminders
      await prisma.goal.update({
        where: { id: duplicatedGoal.id },
        data: { reminderEnabled: true },
      });
    }

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'CREATE',
      category: 'goals',
      entityType: 'goal',
      entityId: duplicatedGoal.id,
      description: `Duplicated goal: ${original.title} → ${duplicatedGoal.title}`,
      newValue: {
        originalId: original.id,
        newId: duplicatedGoal.id,
        options,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/duplicate completed', {
      userId,
      originalId: original.id,
      newId: duplicatedGoal.id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(
      {
        goal: duplicatedGoal,
        original: {
          id: original.id,
          title: original.title,
        },
      },
      { requestId, message: 'Goal duplicated successfully' }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/duplicate failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to duplicate goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';