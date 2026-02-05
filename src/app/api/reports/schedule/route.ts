/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// api/reports/schedule/route.ts
// =============================================================================
// Description: Manage scheduled reports (CRUD operations)
// Methods: GET, POST, PUT, DELETE, OPTIONS
// Auth Required: Yes
// Rate Limit: 20 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { PlatformCategory, AuditAction } from '@prisma/client';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  isActive: z.coerce.boolean().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  sortBy: z.enum(['createdAt', 'nextRunAt', 'name', 'frequency']).default('nextRunAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const createScheduleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  
  // Schedule configuration
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  dayOfWeek: z.number().int().min(0).max(6).optional(), // 0=Sunday, for weekly
  dayOfMonth: z.number().int().min(1).max(31).optional(), // for monthly
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  timezone: z.string().default('UTC'),
  
  // Report configuration
  reportConfig: z.object({
    type: z.enum(['weekly', 'monthly', 'yearly', 'custom']).default('weekly'),
    includeCharts: z.boolean().default(true),
    includeComparisons: z.boolean().default(true),
    includeInsights: z.boolean().default(true),
    includePlatformBreakdown: z.boolean().default(true),
    
    // For custom reports
    relativeDateRange: z.enum([
      'last_7_days', 'last_30_days', 'last_90_days', 
      'last_week', 'last_month', 'last_quarter'
    ]).default('last_7_days'),
    
    // Filters
    platforms: z.array(z.string()).default([]),
    categories: z.array(z.nativeEnum(PlatformCategory)).default([]),
  }),
  
  // Delivery configuration
  deliveryMethod: z.enum(['email', 'download']).default('email'),
  emailTo: z.string().email().optional(),
  emailSubject: z.string().max(200).optional(),
  
  // Status
  isActive: z.boolean().default(true),
});

const updateScheduleSchema = createScheduleSchema.partial().extend({
  id: z.string().cuid()
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateNextRunTime(frequency: string, dayOfWeek?: number, dayOfMonth?: number, time?: string, timezone = 'UTC') {
  const now = new Date();
  const [hours, minutes] = (time || '09:00').split(':').map(Number);
  
  const nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);
  
  switch (frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
      
    case 'weekly':
      const targetDay = dayOfWeek ?? 1; // Default to Monday
      const currentDay = nextRun.getDay();
      let daysUntilTarget = targetDay - currentDay;
      
      if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextRun <= now)) {
        daysUntilTarget += 7;
      }
      
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;
      
    case 'monthly':
      const targetDate = dayOfMonth ?? 1; // Default to 1st of month
      nextRun.setDate(targetDate);
      
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(targetDate);
      }
      break;
  }
  
  return nextRun;
}

async function validateUserScheduleAccess(userId: string, subscriptionTier?: string) {
  // Check subscription limits for scheduled reports
  const currentSchedules = await prisma.scheduledExport.count({
    where: { userId, isActive: true }
  });
  
  const limits = {
    FREE: 1,
    STARTER: 3,
    PRO: 10,
    TEAM: 25,
    ENTERPRISE: 100
  };
  
  const maxSchedules = limits[subscriptionTier as keyof typeof limits] || limits.FREE;
  
  return {
    canCreate: currentSchedules < maxSchedules,
    currentCount: currentSchedules,
    maxAllowed: maxSchedules,
    remaining: maxSchedules - currentSchedules
  };
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

/**
 * GET - List user's scheduled reports
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      30, 
      `schedule-reports:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      isActive: searchParams.get('isActive'),
      frequency: searchParams.get('frequency'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    if (!queryValidation.success) {
      return apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
    }

    const { page, limit, isActive, frequency, sortBy, sortOrder } = queryValidation.data;

    // Build where clause
    const where: any = { userId: session.user.id };
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (frequency) where.frequency = frequency;

    // Get scheduled exports with pagination
    const [schedules, total] = await Promise.all([
      prisma.scheduledExport.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          frequency: true,
          dayOfWeek: true,
          dayOfMonth: true,
          time: true,
          timezone: true,
          isActive: true,
          lastRunAt: true,
          lastRunStatus: true,
          nextRunAt: true,
          runCount: true,
          failureCount: true,
          createdAt: true,
          updatedAt: true,
          // Include partial report config for display
          format: true,
          deliveryMethod: true,
          emailTo: true,
        }
      }),
      prisma.scheduledExport.count({ where })
    ]);

    // Get user's subscription info for limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscription: {
          select: { tier: true }
        }
      }
    });

    const accessInfo = await validateUserScheduleAccess(
      session.user.id, 
      user?.subscription?.tier
    );

    logger.info('Scheduled reports listed', {
      requestId,
      userId: session.user.id,
      total,
      page
    });

    return apiResponse.paginated(
      schedules,
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
          subscriptionLimits: accessInfo
        }
      }
    );

  } catch (error) {
    logger.error('GET scheduled reports failed', { requestId }, error);
    return apiResponse.internalError('Failed to fetch scheduled reports', requestId);
  }
}

/**
 * POST - Create new scheduled report
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      10, 
      `create-schedule:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(180, requestId);
    }

    // Check subscription limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscription: {
          select: { tier: true }
        }
      }
    });

    const accessInfo = await validateUserScheduleAccess(
      session.user.id, 
      user?.subscription?.tier
    );

    if (!accessInfo.canCreate) {
      return apiResponse.forbidden(
        `Schedule limit reached. You can create ${accessInfo.maxAllowed} scheduled reports with your current plan.`,
        requestId
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validation = createScheduleSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid schedule configuration',
        validation.error.errors,
        requestId
      );
    }

    const data = validation.data;

    // Validate email for email delivery
    if (data.deliveryMethod === 'email' && !data.emailTo) {
      return apiResponse.validationError(
        'Email address required for email delivery',
        [{ path: ['emailTo'], message: 'Required for email delivery' }],
        requestId
      );
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(
      data.frequency,
      data.dayOfWeek,
      data.dayOfMonth,
      data.time,
      data.timezone
    );

    // Create scheduled export
    const schedule = await prisma.scheduledExport.create({
      data: {
        userId: session.user.id,
        name: data.name,
        description: data.description,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        time: data.time,
        timezone: data.timezone,
        format: 'JSON', // Default format
        platforms: data.reportConfig.platforms,
        categories: data.reportConfig.categories,
        relativeDateRange: data.reportConfig.relativeDateRange,
        deliveryMethod: data.deliveryMethod,
        emailTo: data.emailTo,
        emailSubject: data.emailSubject || `${data.name} - Automated Report`,
        isActive: data.isActive,
        nextRunAt,
        runCount: 0,
        failureCount: 0,
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: AuditAction.CREATE,
        category: 'scheduled_reports',
        entityType: 'scheduled_export',
        entityId: schedule.id,
        description: `Created scheduled report: ${data.name}`,
        newValue: {
          name: data.name,
          frequency: data.frequency,
          deliveryMethod: data.deliveryMethod,
          nextRunAt
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Scheduled report created', {
      requestId,
      userId: session.user.id,
      scheduleId: schedule.id,
      frequency: data.frequency,
      nextRunAt
    });

    return apiResponse.created(schedule, { meta: { requestId } });

  } catch (error) {
    logger.error('POST scheduled report failed', { requestId }, error);
    return apiResponse.internalError('Failed to create scheduled report', requestId);
  }
}

/**
 * PUT - Update scheduled report
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      20, 
      `update-schedule:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(120, requestId);
    }

    // Parse request
    const body = await request.json();
    const validation = updateScheduleSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid update data',
        validation.error.errors,
        requestId
      );
    }

    const { id, ...updateData } = validation.data;

    // Check if schedule exists and belongs to user
    const existingSchedule = await prisma.scheduledExport.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingSchedule) {
      return apiResponse.notFound('Scheduled report', requestId);
    }

    // Calculate new next run time if schedule changed
    const nextRunAt = calculateNextRunTime(
  updateData.frequency || existingSchedule.frequency,
  (updateData.dayOfWeek ?? existingSchedule.dayOfWeek) ?? undefined,
  (updateData.dayOfMonth ?? existingSchedule.dayOfMonth) ?? undefined,
  updateData.time || existingSchedule.time,
  updateData.timezone || existingSchedule.timezone
);


    // Update schedule
    const updatedSchedule = await prisma.scheduledExport.update({
      where: { id },
      data: {
        ...updateData,
        nextRunAt,
        // Reset failure count if reactivating
        ...(updateData.isActive === true && { failureCount: 0 })
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: AuditAction.UPDATE,
        category: 'scheduled_reports',
        entityType: 'scheduled_export',
        entityId: id,
        description: `Updated scheduled report: ${existingSchedule.name}`,
        oldValue: existingSchedule,
        newValue: updateData,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Scheduled report updated', {
      requestId,
      userId: session.user.id,
      scheduleId: id,
      changes: Object.keys(updateData)
    });

    return apiResponse.success(updatedSchedule, { meta: { requestId } });

  } catch (error) {
    logger.error('PUT scheduled report failed', { requestId }, error);
    return apiResponse.internalError('Failed to update scheduled report', requestId);
  }
}

/**
 * DELETE - Delete scheduled report
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      15, 
      `delete-schedule:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(180, requestId);
    }

    // Get schedule ID from query or body
    const { searchParams } = new URL(request.url);
    let scheduleId = searchParams.get('id');

    if (!scheduleId) {
      const body = await request.json();
      scheduleId = body.id;
    }

    if (!scheduleId) {
      return apiResponse.validationError(
        'Schedule ID required',
        [{ path: ['id'], message: 'Schedule ID is required' }],
        requestId
      );
    }

    // Check if schedule exists and belongs to user
    const existingSchedule = await prisma.scheduledExport.findFirst({
      where: {
        id: scheduleId,
        userId: session.user.id
      }
    });

    if (!existingSchedule) {
      return apiResponse.notFound('Scheduled report', requestId);
    }

    // Delete the schedule
    await prisma.scheduledExport.delete({
      where: { id: scheduleId }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: AuditAction.DELETE,
        category: 'scheduled_reports',
        entityType: 'scheduled_export',
        entityId: scheduleId,
        description: `Deleted scheduled report: ${existingSchedule.name}`,
        oldValue: existingSchedule,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Scheduled report deleted', {
      requestId,
      userId: session.user.id,
      scheduleId,
      name: existingSchedule.name
    });

    return apiResponse.success(
      { message: 'Scheduled report deleted successfully' },
      { meta: { requestId } }
    );

  } catch (error) {
    logger.error('DELETE scheduled report failed', { requestId }, error);
    return apiResponse.internalError('Failed to delete scheduled report', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';