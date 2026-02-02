// src/app/api/admin/maintenance/route.ts
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
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

const querySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  upcoming: z.coerce.boolean().optional(),
  past: z.coerce.boolean().optional(),
});

const createSchema = z.object({
  title: z.string().min(5).max(300),
  message: z.string().min(10).max(2000),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isActive: z.boolean().default(false),
  affectedServices: z.array(z.string().max(100)).default([]),
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
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-maintenance:${ip}`);

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

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return new NextResponse(null, { status: 403 });
    }

    const now = new Date();
    const [total, active, upcoming] = await Promise.all([
      prisma.maintenanceWindow.count(),
      prisma.maintenanceWindow.count({ where: { isActive: true } }),
      prisma.maintenanceWindow.count({
        where: { startTime: { gte: now }, isActive: false },
      }),
    ]);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Count': String(total),
        'X-Active-Count': String(active),
        'X-Upcoming-Count': String(upcoming),
      },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD admin maintenance failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - List maintenance windows
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      isActive: searchParams.get('isActive') !== null ? searchParams.get('isActive') : undefined,
      upcoming: searchParams.get('upcoming') !== null ? searchParams.get('upcoming') : undefined,
      past: searchParams.get('past') !== null ? searchParams.get('past') : undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { isActive, upcoming, past } = queryValidation.data;

    const now = new Date();
    const where: Prisma.MaintenanceWindowWhereInput = {};

    if (isActive !== undefined) where.isActive = isActive;

    if (upcoming === true) {
      where.startTime = { gte: now };
    }

    if (past === true) {
      where.endTime = { lt: now };
    }

    const windows = await prisma.maintenanceWindow.findMany({
      where,
      orderBy: { startTime: 'desc' },
    });

    logger.info('Maintenance windows fetched', {
      total: windows.length,
      filters: { isActive, upcoming, past },
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { windows, total: windows.length },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin maintenance failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch maintenance windows', requestId), requestId);
  }
}

// =============================================================================
// POST - Create maintenance window
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
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

    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end <= start) {
      return addHeaders(
        apiResponse.validationError('End time must be after start time', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const window = await prisma.maintenanceWindow.create({
      data: {
        title: data.title,
        message: data.message,
        startTime: start,
        endTime: end,
        isActive: data.isActive,
        affectedServices: data.affectedServices,
        createdBy: userId,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE' as AuditAction,
        category: 'admin',
        entityType: 'maintenanceWindow',
        entityId: window.id,
        description: `Created maintenance window: ${window.title}`,
        newValue: window as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Maintenance window created', {
      windowId: window.id,
      adminId: userId,
      startTime: start,
      endTime: end,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(window, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST admin maintenance failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to create maintenance window', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';