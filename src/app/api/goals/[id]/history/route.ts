// =============================================================================
// src/app/api/goals/[id]/history/route.ts
// =============================================================================
// Description: Goal change history from audit logs
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 30 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { AuditAction } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface HistoryChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface HistoryEntry {
  id: string;
  action: AuditAction;
  description: string | null;
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
  changes: HistoryChange[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const idSchema = z.string().cuid('Invalid goal ID format');

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  action: z.nativeEnum(AuditAction).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
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
  const rateLimitKey = `goal-history:${ip}`;
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

function parseChanges(changes: unknown): HistoryChange[] {
  if (!changes || typeof changes !== 'object') return [];

  const result: HistoryChange[] = [];
  const changesObj = changes as Record<string, { old?: unknown; new?: unknown }>;

  for (const [field, value] of Object.entries(changesObj)) {
    if (value && typeof value === 'object') {
      result.push({
        field,
        oldValue: value.old,
        newValue: value.new,
      });
    }
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

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!goal) {
      return new NextResponse(null, { status: 404 });
    }

    const historyCount = await prisma.auditLog.count({
      where: {
        userId,
        entityType: 'goal',
        entityId: id,
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-History-Count', String(historyCount));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/[id]/history failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Goal Change History
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
      select: { id: true, title: true, createdAt: true, status: true },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, unknown> = {};

    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const validation = querySchema.safeParse(queryParams);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid query parameters',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { page, limit, action, from, to } = validation.data;

    // Build where clause
    const where: any = {
      userId,
      entityType: 'goal',
      entityId: id,
    };

    if (action) {
      where.action = action;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    // Fetch audit logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Build history entries
    const history: HistoryEntry[] = logs.map((log) => ({
      id: log.id,
      action: log.action,
      description: log.description,
      timestamp: log.createdAt,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      changes: parseChanges(log.changes),
    }));

    // Add creation event if on first page
    if (page === 1) {
      history.unshift({
        id: `creation-${goal.id}`,
        action: AuditAction.CREATE,
        description: 'Goal created',
        timestamp: goal.createdAt,
        ipAddress: null,
        userAgent: null,
        changes: [],
      });
    }

    // Calculate change frequency
    const now = new Date();
    const changeFrequency = {
      daily: logs.filter((log) => {
        const daysSince = Math.floor(
          (now.getTime() - log.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSince <= 1;
      }).length,
      weekly: logs.filter((log) => {
        const daysSince = Math.floor(
          (now.getTime() - log.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSince <= 7;
      }).length,
      monthly: logs.filter((log) => {
        const daysSince = Math.floor(
          (now.getTime() - log.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSince <= 30;
      }).length,
    };

    // Action breakdown
    const actionBreakdown = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalPages = Math.ceil((total + 1) / limit);

    logger.info('GET /api/goals/[id]/history completed', {
      userId,
      goalId: id,
      historyCount: history.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      history,
      {
        page,
        limit,
        total: total + 1, // Include creation event
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      {
        meta: {
          requestId,
          goal: {
            id: goal.id,
            title: goal.title,
            status: goal.status,
          },
          changeFrequency,
          actionBreakdown,
          totalChanges: total,
        },
      }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/[id]/history failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch history', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';