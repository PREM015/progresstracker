// src/app/api/admin/feature-flags/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SubscriptionTier, Prisma, AuditAction } from '@prisma/client';
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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  enabled: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'key']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createSchema = z.object({
  key: z.string().min(2).max(100).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  isEnabled: z.boolean().default(false),
  enabledForAll: z.boolean().default(false),
  enabledUserIds: z.array(z.string().cuid()).default([]),
  enabledTiers: z.array(z.nativeEnum(SubscriptionTier)).default([]),
  enabledPercentage: z.number().int().min(0).max(100).default(0),
  metadata: z.record(z.unknown()).optional(),
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
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-flags:${ip}`);

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

    const [total, enabled, disabled] = await Promise.all([
      prisma.featureFlag.count(),
      prisma.featureFlag.count({ where: { isEnabled: true } }),
      prisma.featureFlag.count({ where: { isEnabled: false } }),
    ]);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Count': String(total),
        'X-Enabled-Count': String(enabled),
        'X-Disabled-Count': String(disabled),
      },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD admin feature flags failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - List feature flags
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
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') || undefined,
      enabled: searchParams.get('enabled') !== null ? searchParams.get('enabled') : undefined,
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

    const { page, limit, search, enabled, sortBy, sortOrder } = queryValidation.data;

    const where: Prisma.FeatureFlagWhereInput = {};

    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (enabled !== undefined) where.isEnabled = enabled;

    const [flags, total] = await Promise.all([
      prisma.featureFlag.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.featureFlag.count({ where }),
    ]);

    logger.info('Feature flags fetched', {
      total,
      page,
      filters: { enabled },
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      flags,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin feature flags failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch feature flags', requestId), requestId);
  }
}

// =============================================================================
// POST - Create feature flag
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

    // Check if key exists
    const existing = await prisma.featureFlag.findUnique({ where: { key: data.key } });

    if (existing) {
      return addHeaders(
        apiResponse.validationError('Feature flag with this key already exists', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const flag = await prisma.featureFlag.create({ data: data as any });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE' as AuditAction,
        category: 'admin',
        entityType: 'featureFlag',
        entityId: flag.id,
        description: `Created feature flag: ${flag.key}`,
        newValue: flag as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Feature flag created', {
      flagId: flag.id,
      key: flag.key,
      adminId: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(flag, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST admin feature flag failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to create feature flag', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';