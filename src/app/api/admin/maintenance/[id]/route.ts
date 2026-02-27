// src/app/api/admin/maintenance/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma, AuditAction } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const updateSchema = z.object({
  title: z.string().min(5).max(300).optional(),
  message: z.string().min(10).max(2000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  affectedServices: z.array(z.string().max(100)).optional(),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: { limit: number; remaining: number }): NextResponse {
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

async function validateAdminSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-maintenance-detail:${ip}`);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

  if (!isAdmin) {
    return { error: apiResponse.forbidden('Admin access required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// GET - Get single maintenance window
// =============================================================================

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const window = await prisma.maintenanceWindow.findUnique({ where: { id } });

    if (!window) {
      return addHeaders(apiResponse.notFound('Maintenance window', requestId), requestId, rateLimitResult);
    }

    logger.info('Maintenance window fetched', {
      windowId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(window, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin maintenance window failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch maintenance window', requestId), requestId);
  }
}

// =============================================================================
// PUT/PATCH - Update maintenance window
// =============================================================================

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const currentWindow = await prisma.maintenanceWindow.findUnique({ where: { id } });

    if (!currentWindow) {
      return addHeaders(apiResponse.notFound('Maintenance window', requestId), requestId, rateLimitResult);
    }

    const data = validation.data;

    // Validate dates if provided
    if (data.startTime || data.endTime) {
      const start = data.startTime ? new Date(data.startTime) : currentWindow.startTime;
      const end = data.endTime ? new Date(data.endTime) : currentWindow.endTime;

      if (end <= start) {
        return addHeaders(
          apiResponse.validationError('End time must be after start time', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }
    }

    const updated = await prisma.maintenanceWindow.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.message !== undefined && { message: data.message }),
        ...(data.startTime !== undefined && { startTime: new Date(data.startTime) }),
        ...(data.endTime !== undefined && { endTime: new Date(data.endTime) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.affectedServices !== undefined && { affectedServices: data.affectedServices }),
        updatedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE' as AuditAction,
        category: 'admin',
        entityType: 'maintenanceWindow',
        entityId: id,
        description: `Updated maintenance window: ${updated.title}`,
        oldValue: currentWindow as unknown as Prisma.InputJsonValue,
        newValue: updated as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Maintenance window updated', {
      windowId: id,
      adminId: userId,
      changes: Object.keys(data),
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT admin maintenance window failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update maintenance window', requestId), requestId);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return PUT(request, context);
}

// =============================================================================
// DELETE - Delete maintenance window
// =============================================================================

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const window = await prisma.maintenanceWindow.findUnique({ where: { id } });

    if (!window) {
      return addHeaders(apiResponse.notFound('Maintenance window', requestId), requestId, rateLimitResult);
    }

    await prisma.maintenanceWindow.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE' as AuditAction,
        category: 'admin',
        entityType: 'maintenanceWindow',
        entityId: id,
        description: `Deleted maintenance window: ${window.title}`,
        oldValue: window as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Maintenance window deleted', {
      windowId: id,
      adminId: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success({ message: 'Maintenance window deleted' }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE admin maintenance window failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete maintenance window', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';