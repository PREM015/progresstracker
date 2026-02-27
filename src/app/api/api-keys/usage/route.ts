// src/app/api/api-keys/usage/route.ts
// =============================================================================
// All API Keys Usage Summary
// =============================================================================
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, startOfDay } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
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

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
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
  const rateLimitKey = `api-keys-usage-summary:${ip}`;
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

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: { usageCount: true },
    });

    const totalUsage = apiKeys.reduce((sum, k) => sum + k.usageCount, 0);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Keys', String(apiKeys.length));
    response.headers.set('X-Total-Usage', String(totalUsage));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD api-keys/usage failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - Get usage summary for all API keys
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const { searchParams } = new URL(request.url);

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
    const endDate = new Date();
    const startDate = startOfDay(subDays(endDate, days));

    // Get all API keys
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        usageCount: true,
        usageCountDaily: true,
        lastUsedAt: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { usageCount: 'desc' },
    });

    // Calculate totals
    const totalUsage = apiKeys.reduce((sum, k) => sum + k.usageCount, 0);
    const todayUsage = apiKeys.reduce((sum, k) => sum + k.usageCountDaily, 0);
    const activeKeys = apiKeys.filter(k => k.isActive).length;
    const expiredKeys = apiKeys.filter(k => k.expiresAt && new Date(k.expiresAt) < new Date()).length;

    // Per-key usage breakdown
    const keyUsage = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      isActive: key.isActive,
      isExpired: key.expiresAt ? new Date(key.expiresAt) < new Date() : false,
      usage: {
        total: key.usageCount,
        today: key.usageCountDaily,
        percentage: totalUsage > 0 ? Math.round((key.usageCount / totalUsage) * 100) : 0,
      },
      rateLimit: {
        limit: key.rateLimit,
        remaining: Math.max(0, key.rateLimit - key.usageCountDaily),
        percentage: key.rateLimit > 0 ? Math.round((key.usageCountDaily / key.rateLimit) * 100) : 0,
      },
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
      createdAt: key.createdAt.toISOString(),
    }));

    // Find most and least used keys
    const mostUsedKey = keyUsage.length > 0 ? keyUsage[0] : null;
    const leastUsedKey = keyUsage.length > 0 ? keyUsage[keyUsage.length - 1] : null;

    // Build response
    const usage = {
      summary: {
        totalKeys: apiKeys.length,
        activeKeys,
        expiredKeys,
        inactiveKeys: apiKeys.length - activeKeys,
        totalUsage,
        todayUsage,
        avgUsagePerKey: apiKeys.length > 0 ? Math.round(totalUsage / apiKeys.length) : 0,
      },
      topKeys: keyUsage.slice(0, 5),
      allKeys: keyUsage,
      insights: {
        mostUsed: mostUsedKey ? { name: mostUsedKey.name, usage: mostUsedKey.usage.total } : null,
        leastUsed: leastUsedKey ? { name: leastUsedKey.name, usage: leastUsedKey.usage.total } : null,
        keysAtRateLimit: keyUsage.filter(k => k.rateLimit.percentage >= 90).length,
        keysNearExpiry: apiKeys.filter(k => {
          if (!k.expiresAt) return false;
          const daysToExpiry = Math.ceil((new Date(k.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return daysToExpiry > 0 && daysToExpiry <= 7;
        }).length,
        unusedKeys: keyUsage.filter(k => k.usage.total === 0).length,
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    logger.info('API keys usage summary fetched', {
      userId,
      keyCount: apiKeys.length,
      totalUsage,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(usage, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET api-keys/usage failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch usage summary', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';