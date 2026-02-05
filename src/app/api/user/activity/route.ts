// src/app/api/user/activity/route.ts
// =============================================================================
// USER ACTIVITY LOG ROUTES
// =============================================================================
// Description: Get user's activity log and audit trail
// Methods: GET, OPTIONS, HEAD
// Auth Required: True
// Rate Limit: 50 requests/minute
// =============================================================================

/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
  'Vary': 'Authorization',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  category: z.string().optional(),
  entityType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'action', 'category']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
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

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `user-activity:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded for activity', { ip, requestId });
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
      ip,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
      ip,
    };
  }

  return { error: null, session, rateLimitResult, ip };
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

export async function HEAD(_request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {

      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const count = await prisma.auditLog.count({
      where: { userId: session.user.id },
    });

    const latestActivity = await prisma.auditLog.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Count': String(count),
        'X-Latest-Activity': latestActivity?.createdAt?.toISOString() || '',
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD activity failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get User's Activity Log
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const validation = await validateSession(request, requestId);

    if (validation.error) {
      return addHeaders(validation.error, requestId, validation.rateLimitResult);
    }

    const { session, rateLimitResult, ip } = validation;
    const userId = session!.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      action: searchParams.get('action') || undefined,
      category: searchParams.get('category') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, action, category, entityType, startDate, endDate, sortBy, sortOrder } =
      queryValidation.data;

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {
      userId,
    };

    if (action) {
      where.action = action as Prisma.AuditLogWhereInput['action'];
    }

    if (category) {
      where.category = category;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Execute queries
    const [activities, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          category: true,
          entityType: true,
          entityId: true,
          description: true,
          ipAddress: true,
          country: true,
          city: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Format activities for response
    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      category: activity.category,
      entityType: activity.entityType,
      entityId: activity.entityId,
      description: activity.description,
      location: activity.city && activity.country 
        ? `${activity.city}, ${activity.country}` 
        : activity.country || null,
      ipAddress: activity.ipAddress ? maskIpAddress(activity.ipAddress) : null,
      status: activity.status,
      createdAt: activity.createdAt,
    }));

    // Calculate activity stats - properly typed
    const todayCountPromise = prisma.auditLog.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const weekCountPromise = prisma.auditLog.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    const topActionsPromise = prisma.auditLog.groupBy({
      by: ['action'],
      where: { userId },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 5,
    });

    const [todayCount, weekCount, topActions] = await Promise.all([
      todayCountPromise,
      weekCountPromise,
      topActionsPromise,
    ]);

    logger.info('Activity log fetched', {
      userId,
      page,
      total,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      formattedActivities,
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
          stats: {
            today: todayCount,
            thisWeek: weekCount,
            topActions: topActions.map((a) => ({
              action: a.action,
              count: a._count.action,
            })),
          },
        },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET activity failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch activity log', requestId), requestId);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function maskIpAddress(ip: string): string {
  if (!ip) return '';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  if (ip.includes(':')) {
    const ipv6Parts = ip.split(':');
    return `${ipv6Parts.slice(0, 3).join(':')}:***`;
  }
  return ip;
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';