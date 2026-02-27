// src/app/api/api-keys/route.ts
// =============================================================================
// API Keys Management - List & Create
// =============================================================================
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma, AuditAction } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const MAX_API_KEYS_PER_USER = 10;
const API_KEY_PREFIX = 'pk_';
const VALID_SCOPES = ['read', 'write', 'delete', 'admin'] as const;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const getQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
  sortBy: z.enum(['createdAt', 'lastUsedAt', 'name', 'usageCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(100).optional(),
});

const createBodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500).optional(),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1, 'At least one scope required').default(['read']),
  rateLimit: z.number().int().min(1).max(10000).default(100),
  rateLimitWindow: z.number().int().min(1).max(3600).default(60),
  allowedIps: z.array(z.string().ip()).max(20).default([]),
  allowedOrigins: z.array(z.string().url()).max(20).default([]),
  expiresAt: z.string().datetime().optional().nullable(),
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
  const rateLimitKey = `api-keys:${ip}`;
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

function generateApiKey(): string {
  return `${API_KEY_PREFIX}${nanoid(32)}`;
}

async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 12);
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * HEAD - Resource metadata
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const [total, active] = await Promise.all([
      prisma.apiKey.count({ where: { userId } }),
      prisma.apiKey.count({ where: { userId, isActive: true } }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Keys', String(total));
    response.headers.set('X-Active-Keys', String(active));
    response.headers.set('X-Max-Keys', String(MAX_API_KEYS_PER_USER));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD api-keys failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - List all API keys for the authenticated user
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

    // Parse query parameters
    const queryValidation = getQuerySchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      isActive: searchParams.get('isActive') || 'all',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      search: searchParams.get('search'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;
    const skip = (params.page - 1) * params.limit;

    // Build where clause
    const where: Prisma.ApiKeyWhereInput = { userId };

    if (params.isActive !== 'all') {
      where.isActive = params.isActive === 'true';
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { keyPrefix: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Fetch API keys
    const [apiKeys, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          keyPrefix: true,
          scopes: true,
          rateLimit: true,
          rateLimitWindow: true,
          allowedIps: true,
          allowedOrigins: true,
          isActive: true,
          expiresAt: true,
          lastUsedAt: true,
          lastUsedIp: true,
          usageCount: true,
          usageCountDaily: true,
          usageResetAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { [params.sortBy]: params.sortOrder },
        skip,
        take: params.limit,
      }),
      prisma.apiKey.count({ where }),
    ]);

    // Transform response
    const formattedKeys = apiKeys.map(key => ({
      ...key,
      expiresAt: key.expiresAt?.toISOString() || null,
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
      usageResetAt: key.usageResetAt?.toISOString() || null,
      createdAt: key.createdAt.toISOString(),
      updatedAt: key.updatedAt.toISOString(),
      isExpired: key.expiresAt ? new Date(key.expiresAt) < new Date() : false,
    }));

    logger.info('API keys listed', {
      userId,
      count: apiKeys.length,
      total,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.paginated(formattedKeys, {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
        hasNextPage: params.page * params.limit < total,
        hasPreviousPage: params.page > 1,
      }, {
        meta: {
          requestId,
          maxKeys: MAX_API_KEYS_PER_USER,
          remainingSlots: Math.max(0, MAX_API_KEYS_PER_USER - total),
        },
      }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET api-keys failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch API keys', requestId), requestId);
  }
}

/**
 * POST - Create a new API key
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const ip = getClientIp(request);

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

    const validation = createBodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;

    // Check API key limit
    const existingCount = await prisma.apiKey.count({ where: { userId } });

    if (existingCount >= MAX_API_KEYS_PER_USER) {
      return addHeaders(
        apiResponse.forbidden(`Maximum API key limit reached (${MAX_API_KEYS_PER_USER} keys per user)`, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check for duplicate name
    const existingName = await prisma.apiKey.findFirst({
      where: { userId, name: data.name },
    });

    if (existingName) {
      return addHeaders(
        apiResponse.validationError('An API key with this name already exists', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Generate and hash API key
    const apiKey = generateApiKey();
    const keyPrefix = apiKey.substring(0, 12);
    const keyHash = await hashApiKey(apiKey);

    // Create API key
    const newApiKey = await prisma.apiKey.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
        keyHash,
        keyPrefix,
        scopes: data.scopes,
        rateLimit: data.rateLimit,
        rateLimitWindow: data.rateLimitWindow,
        allowedIps: data.allowedIps,
        allowedOrigins: data.allowedOrigins,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: true,
        usageCount: 0,
        usageCountDaily: 0,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'API_KEY_CREATE' as AuditAction,
        category: 'security',
        entityType: 'api_key',
        entityId: newApiKey.id,
        description: `Created API key: ${data.name}`,
        ipAddress: ip,
        requestId,
      },
    });

    logger.info('API key created', {
      userId,
      keyId: newApiKey.id,
      keyPrefix,
      scopes: data.scopes,
      requestId,
      duration: Date.now() - startTime,
    });

    // Return full key ONLY ONCE
    return addHeaders(
      apiResponse.created({
        apiKey: {
          id: newApiKey.id,
          name: newApiKey.name,
          description: newApiKey.description,
          keyPrefix: newApiKey.keyPrefix,
          scopes: newApiKey.scopes,
          rateLimit: newApiKey.rateLimit,
          rateLimitWindow: newApiKey.rateLimitWindow,
          allowedIps: newApiKey.allowedIps,
          allowedOrigins: newApiKey.allowedOrigins,
          expiresAt: newApiKey.expiresAt?.toISOString() || null,
          isActive: newApiKey.isActive,
          createdAt: newApiKey.createdAt.toISOString(),
        },
        key: apiKey, // ⚠️ SHOWN ONLY ONCE - User must save this!
        warning: '⚠️ Save this API key now! You will not be able to see it again.',
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST api-keys failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to create API key', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';