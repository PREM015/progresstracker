// =============================================================================
// src/app/api/goals/route.ts
// =============================================================================
// Description: Main goals CRUD operations
// Methods: GET, POST, PUT, DELETE, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import {
  GoalStatus,
  GoalType,
  GoalMetric,
  PlatformCategory,
  Prisma,
} from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { auditLogService } from '@/services/auditLogService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;
const MAX_GOALS_PER_USER = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

import {
  querySchema,
  createGoalSchema,
  bulkUpdateSchema,
} from '@/lib/validations/goal';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number; reset: number }
): NextResponse {
  // Security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Request tracking
  response.headers.set('X-Request-ID', requestId);

  // Rate limit headers
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));
  }

  return response;
}

async function validateRequest(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `goals:${ip}`;
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
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Get count for headers
    const count = await prisma.goal.count({
      where: { userId },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Count', String(count));
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - List Goals with Filtering & Pagination
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      category: searchParams.get('category') || undefined,
      platformId: searchParams.get('platformId') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      includeArchived: searchParams.get('includeArchived'),
    });

    if (!queryValidation.success) {
      const response = apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const {
      page,
      limit,
      status,
      type,
      category,
      platformId,
      search,
      sortBy,
      sortOrder,
      includeArchived,
      startDate,
      endDate,
    } = queryValidation.data;

    // Build where clause
    const where: Prisma.GoalWhereInput = { userId };

    if (status) {
      where.status = status;
    } else if (!includeArchived) {
      where.status = { notIn: [GoalStatus.ARCHIVED, GoalStatus.CANCELLED] };
    }

    if (type) {
      where.goalType = type;
    }

    if (category) {
      where.category = category;
    }

    if (platformId) {
      where.platformId = platformId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate) {
      where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, lte: new Date(endDate) };
    }

    // Execute query with pagination
    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
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
          reminders: {
            where: { isActive: true },
            select: {
              id: true,
              frequency: true,
              time: true,
              nextSendAt: true,
            },
          },
          _count: {
            select: { reminders: true },
          },
        },
      }),
      prisma.goal.count({ where }),
    ]);

    // Calculate stats
    const allGoals = await prisma.goal.findMany({
      where: { userId },
      select: { status: true },
    });

    const stats = {
      total: allGoals.length,
      active: allGoals.filter((g) => g.status === GoalStatus.ACTIVE).length,
      completed: allGoals.filter((g) => g.status === GoalStatus.COMPLETED).length,
      failed: allGoals.filter((g) => g.status === GoalStatus.FAILED).length,
      paused: allGoals.filter((g) => g.status === GoalStatus.PAUSED).length,
      archived: allGoals.filter((g) => g.status === GoalStatus.ARCHIVED).length,
    };

    logger.info('GET /api/goals completed', {
      userId,
      page,
      limit,
      total,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      goals,
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
          executionTime: Date.now() - startTime,
        },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Create New Goal
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
    const validation = createGoalSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const data = validation.data;

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

    // Validate platform if provided
    if (data.platformId) {
      const platform = await prisma.platform.findUnique({
        where: { id: data.platformId },
        select: { id: true },
      });

      if (!platform) {
        const response = apiResponse.notFound('Platform', requestId);
        return addHeaders(response, requestId, rateLimitResult);
      }
    }

    // Generate share code if public
    const shareCode = data.isPublic ? generateShareCode() : null;

    // Create default milestones
    const milestones = [
      { value: 25, label: '25%', reached: false },
      { value: 50, label: '50%', reached: false },
      { value: 75, label: '75%', reached: false },
      { value: 100, label: '100%', reached: false },
    ];

    // Create goal
    const goal = await prisma.goal.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        category: data.category,
        goalType: data.goalType,
        metric: data.metric,
        customMetric: data.customMetric || null,
        target: data.target,
        unit: data.unit || null,
        progress: 0,
        progressPercentage: 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: GoalStatus.ACTIVE,
        platformId: data.platformId || null,
        requiredStreakDays: data.requiredStreakDays || null,
        currentStreakDays: 0,
        reminderEnabled: data.reminderEnabled,
        isPublic: data.isPublic,
        shareCode,
        color: data.color || null,
        icon: data.icon || null,
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

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'CREATE',
      category: 'goals',
      entityType: 'goal',
      entityId: goal.id,
      description: `Created goal: ${goal.title}`,
      newValue: { title: goal.title, target: goal.target, category: goal.category },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals completed', {
      userId,
      goalId: goal.id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(goal, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to create goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// PUT - Bulk Update Goals
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
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
    const validation = bulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { ids, data } = validation.data;

    // Verify ownership of all goals
    const existingGoals = await prisma.goal.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: { id: true, title: true },
    });

    if (existingGoals.length !== ids.length) {
      const response = apiResponse.forbidden(
        'Some goals not found or not owned by you',
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Build update data
    const updateData: Prisma.GoalUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === GoalStatus.COMPLETED) {
        updateData.completedAt = new Date();
      }
      if (data.status === GoalStatus.FAILED) {
        updateData.failedAt = new Date();
      }
    }

    if (data.reminderEnabled !== undefined) {
      updateData.reminderEnabled = data.reminderEnabled;
    }

    if (data.isPublic !== undefined) {
      updateData.isPublic = data.isPublic;
    }

    // Perform bulk update
    const result = await prisma.goal.updateMany({
      where: {
        id: { in: ids },
        userId,
      },
      data: updateData,
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      description: `Bulk updated ${result.count} goals`,
      newValue: { ids, changes: data },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('PUT /api/goals (bulk) completed', {
      userId,
      count: result.count,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { updated: result.count, ids },
      { message: `${result.count} goals updated successfully` }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT /api/goals failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to update goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// DELETE - Bulk Delete Goals
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Get IDs from query params or body
    const { searchParams } = new URL(request.url);
    let ids: string[] = [];

    const idParam = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (idParam) {
      ids = [idParam];
    } else if (idsParam) {
      ids = idsParam.split(',').filter(Boolean);
    } else {
      // Try to get from body
      try {
        const body = await request.json();
        if (Array.isArray(body.ids)) {
          ids = body.ids;
        } else if (body.id) {
          ids = [body.id];
        }
      } catch {
        // No body, check if single id in URL
      }
    }

    if (ids.length === 0) {
      const response = apiResponse.validationError(
        'At least one goal ID is required',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Validate IDs
    const invalidIds = ids.filter((id) => !id.match(/^c[a-z0-9]{24}$/));
    if (invalidIds.length > 0) {
      const response = apiResponse.validationError(
        'Invalid goal IDs provided',
        invalidIds.map((id) => ({ field: 'id', message: `Invalid ID: ${id}` })),
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Verify ownership
    const existingGoals = await prisma.goal.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: { id: true, title: true },
    });

    if (existingGoals.length === 0) {
      const response = apiResponse.notFound('Goals', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Delete related reminders first
    await prisma.goalReminder.deleteMany({
      where: {
        goalId: { in: existingGoals.map((g) => g.id) },
      },
    });

    // Delete goals
    const result = await prisma.goal.deleteMany({
      where: {
        id: { in: existingGoals.map((g) => g.id) },
        userId,
      },
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'DELETE',
      category: 'goals',
      entityType: 'goal',
      description: `Deleted ${result.count} goals`,
      oldValue: { goals: existingGoals },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('DELETE /api/goals completed', {
      userId,
      count: result.count,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { deleted: result.count, ids: existingGoals.map((g) => g.id) },
      { message: `${result.count} goals deleted successfully` }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE /api/goals failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to delete goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;