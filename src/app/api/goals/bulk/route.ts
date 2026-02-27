// =============================================================================
// src/app/api/goals/bulk/route.ts
// =============================================================================
// Description: Bulk operations on goals (update, delete, archive)
// Methods: POST, PUT, DELETE, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 20 requests/minute
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

const RATE_LIMIT = 20;
const MAX_BULK_ITEMS = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS, HEAD',
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

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(MAX_BULK_ITEMS),
  action: z.enum(['update', 'archive', 'unarchive', 'pause', 'resume', 'complete', 'fail', 'cancel']),
  data: z.object({
    status: z.nativeEnum(GoalStatus).optional(),
    reminderEnabled: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  }).optional(),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(MAX_BULK_ITEMS),
  permanent: z.boolean().optional().default(false),
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
  const rateLimitKey = `goals-bulk:${ip}`;
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

    const totalGoals = await prisma.goal.count({ where: { userId } });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Goals', String(totalGoals));
    response.headers.set('X-Max-Bulk-Items', String(MAX_BULK_ITEMS));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/bulk failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST / PUT - Bulk Update Goals
// =============================================================================

async function handleBulkUpdate(
  request: NextRequest,
  requestId: string,
  startTime: number
): Promise<NextResponse> {
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

    const { ids, action, data } = validation.data;

    // Verify ownership of all goals
    const existingGoals = await prisma.goal.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: { id: true, title: true, status: true },
    });

    if (existingGoals.length === 0) {
      const response = apiResponse.notFound('Goals', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    const foundIds = existingGoals.map((g) => g.id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));

    // Build update data based on action
    const updateData: Prisma.GoalUpdateInput = {
      updatedAt: new Date(),
    };

    switch (action) {
      case 'archive':
        updateData.status = GoalStatus.ARCHIVED;
        break;
      case 'unarchive':
        updateData.status = GoalStatus.ACTIVE;
        break;
      case 'pause':
        updateData.status = GoalStatus.PAUSED;
        break;
      case 'resume':
        updateData.status = GoalStatus.ACTIVE;
        break;
      case 'complete':
        updateData.status = GoalStatus.COMPLETED;
        updateData.completedAt = new Date();
        break;
      case 'fail':
        updateData.status = GoalStatus.FAILED;
        updateData.failedAt = new Date();
        break;
      case 'cancel':
        updateData.status = GoalStatus.CANCELLED;
        break;
      case 'update':
        if (data?.status) updateData.status = data.status;
        if (data?.reminderEnabled !== undefined) updateData.reminderEnabled = data.reminderEnabled;
        if (data?.isPublic !== undefined) updateData.isPublic = data.isPublic;
        break;
    }

    // Perform bulk update
    const result = await prisma.goal.updateMany({
      where: {
        id: { in: foundIds },
        userId,
      },
      data: updateData,
    });

    // Handle reminders for certain actions
    if (['archive', 'complete', 'fail', 'cancel'].includes(action)) {
      await prisma.goalReminder.updateMany({
        where: { goalId: { in: foundIds } },
        data: { isActive: false },
      });
    }

    if (action === 'resume' || action === 'unarchive') {
      await prisma.goalReminder.updateMany({
        where: { goalId: { in: foundIds } },
        data: { isActive: true },
      });
    }

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      description: `Bulk ${action} on ${result.count} goals`,
      newValue: { action, ids: foundIds, data },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('Bulk update completed', {
      userId,
      action,
      count: result.count,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        action,
        updated: result.count,
        ids: foundIds,
        notFound: notFoundIds,
        errors: notFoundIds.length > 0 ? [{ message: `${notFoundIds.length} goals not found` }] : [],
      },
      {  message: `${result.count} goals updated successfully` }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('Bulk update failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to update goals', requestId);
    return addHeaders(response, requestId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  return handleBulkUpdate(request, requestId, startTime);
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  return handleBulkUpdate(request, requestId, startTime);
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

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      // Try query params
      const { searchParams } = new URL(request.url);
      const idsParam = searchParams.get('ids');
      if (idsParam) {
        body = { ids: idsParam.split(','), permanent: searchParams.get('permanent') === 'true' };
      } else {
        const response = apiResponse.validationError('Invalid request body', undefined, requestId);
        return addHeaders(response, requestId, rateLimitResult);
      }
    }

    // Validate body
    const validation = bulkDeleteSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { ids, permanent } = validation.data;

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

    const foundIds = existingGoals.map((g) => g.id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));

    let deletedCount = 0;

    if (permanent) {
      // Delete reminders first
      await prisma.goalReminder.deleteMany({
        where: { goalId: { in: foundIds } },
      });

      // Permanently delete goals
      const result = await prisma.goal.deleteMany({
        where: {
          id: { in: foundIds },
          userId,
        },
      });
      deletedCount = result.count;
    } else {
      // Soft delete (archive + cancel)
      const result = await prisma.goal.updateMany({
        where: {
          id: { in: foundIds },
          userId,
        },
        data: {
          status: GoalStatus.CANCELLED,
          updatedAt: new Date(),
        },
      });
      deletedCount = result.count;

      // Disable reminders
      await prisma.goalReminder.updateMany({
        where: { goalId: { in: foundIds } },
        data: { isActive: false },
      });
    }

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'DELETE',
      category: 'goals',
      entityType: 'goal',
      description: `Bulk ${permanent ? 'permanently ' : ''}deleted ${deletedCount} goals`,
      oldValue: { goals: existingGoals },
      newValue: { permanent, ids: foundIds },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('Bulk delete completed', {
      userId,
      permanent,
      count: deletedCount,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        deleted: deletedCount,
        permanent,
        ids: foundIds,
        notFound: notFoundIds,
      },
      { message: `${deletedCount} goals ${permanent ? 'permanently ' : ''}deleted` }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('Bulk delete failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to delete goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';