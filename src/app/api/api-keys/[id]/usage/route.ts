// src/app/api/api-keys/[id]/usage/route.ts
// =============================================================================
// API Key Usage Statistics
// =============================================================================
// Methods: GET, POST (reset), OPTIONS, HEAD
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
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, startOfDay, format, eachDayOfInterval } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const paramsSchema = z.object({
  id: z.string().cuid('Invalid API key ID'),
});

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

const resetBodySchema = z.object({
  confirm: z.boolean().refine(v => v === true, {
    message: 'You must confirm reset by setting confirm to true',
  }),
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

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `api-keys-usage:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function HEAD(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId },
      select: { usageCount: true, usageCountDaily: true },
    });

    if (!apiKey) {
      return addHeaders(new NextResponse(null, { status: 404 }), requestId, rateLimitResult);
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Usage', String(apiKey.usageCount));
    response.headers.set('X-Daily-Usage', String(apiKey.usageCountDaily));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD api-keys/[id]/usage failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - Get usage statistics for API key
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const { searchParams } = new URL(request.url);

    // Validate params
    const paramsValidation = paramsSchema.safeParse({ id });
    if (!paramsValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid API key ID', paramsValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const queryValidation = querySchema.safeParse({
      days: searchParams.get('days') || '30',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { days } = queryValidation.data;

    // Get API key
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        rateLimit: true,
        rateLimitWindow: true,
        usageCount: true,
        usageCountDaily: true,
        usageResetAt: true,
        lastUsedAt: true,
        lastUsedIp: true,
        createdAt: true,
        isActive: true,
      },
    });

    if (!apiKey) {
      return addHeaders(apiResponse.notFound('API key', requestId), requestId, rateLimitResult);
    }

    // Get audit logs for usage history (simulated daily usage)
    // In production, you'd have a separate usage tracking table
    const endDate = new Date();
    const startDate = startOfDay(subDays(endDate, days));

    // For now, we'll simulate usage data based on audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'api_key',
        entityId: id,
        action: 'READ',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Generate daily usage data
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyUsage = allDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayLogs = auditLogs.filter(log => 
        format(log.createdAt, 'yyyy-MM-dd') === dateStr
      );

      return {
        date: dateStr,
        requests: dayLogs.length,
      };
    });

    // Calculate statistics
    const totalRequests = dailyUsage.reduce((sum, d) => sum + d.requests, 0);
    const avgRequestsPerDay = days > 0 ? Math.round(totalRequests / days) : 0;
    const maxRequestsDay = dailyUsage.reduce((max, d) => d.requests > max.requests ? d : max, dailyUsage[0]);
    const activeDays = dailyUsage.filter(d => d.requests > 0).length;

    // Rate limit status
    const now = new Date();
    const windowStart = new Date(now.getTime() - apiKey.rateLimitWindow * 1000);
    const remainingRequests = Math.max(0, apiKey.rateLimit - apiKey.usageCountDaily);
    const resetTime = apiKey.usageResetAt 
      ? new Date(apiKey.usageResetAt.getTime() + apiKey.rateLimitWindow * 1000)
      : null;

    const usage = {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        isActive: apiKey.isActive,
      },
      totals: {
        allTime: apiKey.usageCount,
        today: apiKey.usageCountDaily,
        period: totalRequests,
      },
      rateLimit: {
        limit: apiKey.rateLimit,
        window: apiKey.rateLimitWindow,
        remaining: remainingRequests,
        resetAt: resetTime?.toISOString() || null,
        percentage: apiKey.rateLimit > 0 
          ? Math.round((apiKey.usageCountDaily / apiKey.rateLimit) * 100)
          : 0,
      },
      lastUsed: {
        at: apiKey.lastUsedAt?.toISOString() || null,
        ip: apiKey.lastUsedIp,
      },
      statistics: {
        avgRequestsPerDay,
        maxRequestsInDay: maxRequestsDay?.requests || 0,
        maxRequestsDate: maxRequestsDay?.date || null,
        activeDays,
        totalDays: days,
        activityRate: Math.round((activeDays / days) * 100),
      },
      daily: dailyUsage,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    logger.info('API key usage fetched', {
      userId,
      keyId: id,
      days,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(usage, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET api-keys/[id]/usage failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch usage statistics', requestId), requestId);
  }
}

/**
 * POST - Reset usage statistics
 */
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Validate params
    const paramsValidation = paramsSchema.safeParse({ id });
    if (!paramsValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid API key ID', paramsValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

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

    const validation = resetBodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check if key exists
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existingKey) {
      return addHeaders(apiResponse.notFound('API key', requestId), requestId, rateLimitResult);
    }

    // Reset usage stats
    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: {
        usageCount: 0,
        usageCountDaily: 0,
        usageResetAt: new Date(),
        lastUsedAt: null,
        lastUsedIp: null,
        updatedAt: new Date(),
      },
    });

    logger.info('API key usage reset', {
      userId,
      keyId: id,
      previousUsage: existingKey.usageCount,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({
        message: 'Usage statistics reset successfully',
        apiKey: {
          id: updatedKey.id,
          name: updatedKey.name,
          usageCount: updatedKey.usageCount,
          usageCountDaily: updatedKey.usageCountDaily,
          usageResetAt: updatedKey.usageResetAt?.toISOString(),
        },
        resetAt: new Date().toISOString(),
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST api-keys/[id]/usage failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to reset usage statistics', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';