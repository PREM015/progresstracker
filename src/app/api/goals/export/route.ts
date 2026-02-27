// =============================================================================
// src/app/api/goals/export/route.ts
// =============================================================================
// Description: Export goals to CSV/JSON formats
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 10 requests/minute
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

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 10;
const MAX_EXPORT_SIZE = 1000;

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

const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  status: z.nativeEnum(GoalStatus).optional(),
  includeArchived: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).default(false),
  includeCompleted: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).default(true),
  includeFailed: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).default(true),
  includeReminders: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).default(false),
  includePlatform: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true'),
  ]).default(true),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

const exportBodySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  goalIds: z.array(z.string().cuid()).max(MAX_EXPORT_SIZE).optional(),
  status: z.array(z.nativeEnum(GoalStatus)).optional(),
  includeArchived: z.boolean().default(false),
  includeCompleted: z.boolean().default(true),
  includeFailed: z.boolean().default(true),
  includeReminders: z.boolean().default(false),
  includePlatform: z.boolean().default(true),
  includeMilestones: z.boolean().default(true),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  fields: z.array(z.string()).optional(),
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
  const rateLimitKey = `goals-export:${ip}`;
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

function escapeCSVField(field: unknown): string {
  if (field === null || field === undefined) {
    return '';
  }
  
  const str = String(field);
  
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const headerRow = headers.map(escapeCSVField).join(',');
  
  const dataRows = data.map((row) => {
    return headers.map((header) => escapeCSVField(row[header])).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

function formatGoalForExport(
  goal: Prisma.GoalGetPayload<{
    include: {
      platform: { select: { name: true; slug: true } };
      reminders: boolean;
    };
  }>,
  includeReminders: boolean,
  includePlatform: boolean
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    goalType: goal.goalType,
    metric: goal.metric,
    customMetric: goal.customMetric,
    target: goal.target,
    progress: goal.progress,
    progressPercentage: goal.progressPercentage,
    unit: goal.unit,
    status: goal.status,
    startDate: goal.startDate?.toISOString(),
    deadline: goal.deadline?.toISOString(),
    completedAt: goal.completedAt?.toISOString(),
    failedAt: goal.failedAt?.toISOString(),
    isPublic: goal.isPublic,
    daysActive: goal.daysActive,
    avgDailyProgress: goal.avgDailyProgress,
    currentStreakDays: goal.currentStreakDays,
    color: goal.color,
    icon: goal.icon,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };

  if (includePlatform && goal.platform) {
    base.platformName = goal.platform.name;
    base.platformSlug = goal.platform.slug;
  }

  if (includeReminders && goal.reminders) {
    base.remindersCount = goal.reminders.length;
    base.reminderEnabled = goal.reminderEnabled;
  }

  return base;
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

    const totalGoals = await prisma.goal.count({ where: { userId } });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Goals', String(totalGoals));
    response.headers.set('X-Max-Export-Size', String(MAX_EXPORT_SIZE));
    response.headers.set('X-Supported-Formats', 'json,csv');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/export failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Export Goals with Query Parameters
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
    const queryParams: Record<string, unknown> = {};

    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const validation = exportQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid export parameters',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;

    // Build where clause
    const where: Prisma.GoalWhereInput = { userId };
    const statusFilter: GoalStatus[] = [];

    if (params.status) {
      statusFilter.push(params.status);
    } else {
      statusFilter.push(GoalStatus.ACTIVE, GoalStatus.PAUSED, GoalStatus.DRAFT);
      
      if (params.includeCompleted) {
        statusFilter.push(GoalStatus.COMPLETED);
      }
      if (params.includeFailed) {
        statusFilter.push(GoalStatus.FAILED);
      }
      if (params.includeArchived) {
        statusFilter.push(GoalStatus.ARCHIVED, GoalStatus.CANCELLED);
      }
    }

    where.status = { in: statusFilter };

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }

    // Fetch goals
    const goals = await prisma.goal.findMany({
      where,
      include: {
        platform: params.includePlatform ? {
          select: { name: true, slug: true },
        } : false,
        reminders: params.includeReminders,
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_SIZE,
    });

    // Format data
    const exportData = goals.map((goal) =>
      formatGoalForExport(
        goal as Prisma.GoalGetPayload<{
          include: {
            platform: { select: { name: true; slug: true } };
            reminders: boolean;
          };
        }>,
        params.includeReminders,
        params.includePlatform
      )
    );

    // Create audit log
    await auditLogService.create({
      userId,
      action:'EXPORT_DATA',
      category: 'goals',
      entityType: 'goal',
      description: `Exported ${exportData.length} goals as ${params.format.toUpperCase()}`,
      newValue: {
        format: params.format,
        count: exportData.length,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('GET /api/goals/export completed', {
      userId,
      format: params.format,
      count: exportData.length,
      requestId,
      duration: Date.now() - startTime,
    });

    // Return based on format
    if (params.format === 'csv') {
      const csv = convertToCSV(exportData);
      const filename = `goals_export_${new Date().toISOString().split('T')[0]}.csv`;

      const response = new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
      return addHeaders(response, requestId, rateLimitResult);
    } else {
      const json = JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalCount: exportData.length,
        goals: exportData,
      }, null, 2);

      const filename = `goals_export_${new Date().toISOString().split('T')[0]}.json`;

      const response = new NextResponse(json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
      return addHeaders(response, requestId, rateLimitResult);
    }
  } catch (error) {
    logger.error('GET /api/goals/export failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to export goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Export Goals with Advanced Options
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
      const response = apiResponse.validationError(
        'Invalid JSON body',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const validation = exportBodySchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid export parameters',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;

    // Build where clause
    const where: Prisma.GoalWhereInput = { userId };

    if (params.goalIds && params.goalIds.length > 0) {
      where.id = { in: params.goalIds };
    } else {
      const statusFilter: GoalStatus[] = [];

      if (params.status && params.status.length > 0) {
        statusFilter.push(...params.status);
      } else {
        statusFilter.push(GoalStatus.ACTIVE, GoalStatus.PAUSED, GoalStatus.DRAFT);
        
        if (params.includeCompleted) {
          statusFilter.push(GoalStatus.COMPLETED);
        }
        if (params.includeFailed) {
          statusFilter.push(GoalStatus.FAILED);
        }
        if (params.includeArchived) {
          statusFilter.push(GoalStatus.ARCHIVED, GoalStatus.CANCELLED);
        }
      }

      where.status = { in: statusFilter };
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }

    // Fetch goals
    const goals = await prisma.goal.findMany({
      where,
      include: {
        platform: params.includePlatform ? {
          select: { name: true, slug: true },
        } : false,
        reminders: params.includeReminders,
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_SIZE,
    });

    // Format data
    let exportData = goals.map((goal) =>
      formatGoalForExport(
        goal as Prisma.GoalGetPayload<{
          include: {
            platform: { select: { name: true; slug: true } };
            reminders: boolean;
          };
        }>,
        params.includeReminders,
        params.includePlatform
      )
    );

    // Filter fields if specified
    if (params.fields && params.fields.length > 0) {
      exportData = exportData.map((item) => {
        const filtered: Record<string, unknown> = {};
        for (const field of params.fields!) {
          if (field in item) {
            filtered[field] = item[field];
          }
        }
        return filtered;
      });
    }

    // Include milestones if requested
    if (params.includeMilestones) {
      const goalsWithMilestones = await prisma.goal.findMany({
        where: { id: { in: goals.map((g) => g.id) } },
        select: { id: true, milestones: true },
      });

      const milestonesMap = new Map(
        goalsWithMilestones.map((g) => [g.id, g.milestones])
      );

      exportData = exportData.map((item) => ({
        ...item,
        milestones: milestonesMap.get(item.id as string),
      }));
    }

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'EXPORT_DATA',
      category: 'goals',
      entityType: 'goal',
      description: `Exported ${exportData.length} goals as ${params.format.toUpperCase()}`,
      newValue: {
        format: params.format,
        count: exportData.length,
        hasGoalIds: !!params.goalIds,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/export completed', {
      userId,
      format: params.format,
      count: exportData.length,
      requestId,
      duration: Date.now() - startTime,
    });

    // Return based on format
    if (params.format === 'csv') {
      const csv = convertToCSV(exportData);
      const filename = `goals_export_${new Date().toISOString().split('T')[0]}.csv`;

      const response = new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
      return addHeaders(response, requestId, rateLimitResult);
    } else {
      const json = JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalCount: exportData.length,
        goals: exportData,
      }, null, 2);

      const filename = `goals_export_${new Date().toISOString().split('T')[0]}.json`;

      const response = new NextResponse(json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
      return addHeaders(response, requestId, rateLimitResult);
    }
  } catch (error) {
    logger.error('POST /api/goals/export failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to export goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';