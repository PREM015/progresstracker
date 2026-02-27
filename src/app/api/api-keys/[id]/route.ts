// src/app/api/api-keys/[id]/route.ts
// =============================================================================
// API Key - Single Key Operations
// =============================================================================
// Methods: GET, PUT, PATCH, DELETE, OPTIONS, HEAD
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

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const VALID_SCOPES = ['read', 'write', 'delete', 'admin'] as const;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const paramsSchema = z.object({
  id: z.string().cuid('Invalid API key ID'),
});

const updateBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1).optional(),
  rateLimit: z.number().int().min(1).max(10000).optional(),
  rateLimitWindow: z.number().int().min(1).max(3600).optional(),
  allowedIps: z.array(z.string().ip()).max(20).optional(),
  allowedOrigins: z.array(z.string().url()).max(20).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const fullUpdateBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1),
  rateLimit: z.number().int().min(1).max(10000),
  rateLimitWindow: z.number().int().min(1).max(3600),
  allowedIps: z.array(z.string().ip()).max(20),
  allowedOrigins: z.array(z.string().url()).max(20),
  isActive: z.boolean(),
  expiresAt: z.string().datetime().optional().nullable(),
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
  const rateLimitKey = `api-keys-id:${ip}`;
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
      select: { id: true, isActive: true, usageCount: true },
    });

    if (!apiKey) {
      return addHeaders(new NextResponse(null, { status: 404 }), requestId, rateLimitResult);
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Key-Active', String(apiKey.isActive));
    response.headers.set('X-Usage-Count', String(apiKey.usageCount));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD api-keys/[id] failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - Get single API key details
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

    // Validate ID format
    const paramsValidation = paramsSchema.safeParse({ id });
    if (!paramsValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid API key ID', paramsValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId },
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
    });

    if (!apiKey) {
      return addHeaders(apiResponse.notFound('API key', requestId), requestId, rateLimitResult);
    }

    logger.info('API key fetched', {
      userId,
      keyId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({
        ...apiKey,
        expiresAt: apiKey.expiresAt?.toISOString() || null,
        lastUsedAt: apiKey.lastUsedAt?.toISOString() || null,
        usageResetAt: apiKey.usageResetAt?.toISOString() || null,
        createdAt: apiKey.createdAt.toISOString(),
        updatedAt: apiKey.updatedAt.toISOString(),
        isExpired: apiKey.expiresAt ? new Date(apiKey.expiresAt) < new Date() : false,
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET api-keys/[id] failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch API key', requestId), requestId);
  }
}

/**
 * PUT - Full update of API key
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const ip = getClientIp(request);

    // Validate ID
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

    const validation = fullUpdateBodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;

    // Check if key exists and belongs to user
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existingKey) {
      return addHeaders(apiResponse.notFound('API key', requestId), requestId, rateLimitResult);
    }

    // Check for duplicate name (excluding current key)
    if (data.name !== existingKey.name) {
      const duplicateName = await prisma.apiKey.findFirst({
        where: { userId, name: data.name, id: { not: id } },
      });

      if (duplicateName) {
        return addHeaders(
          apiResponse.validationError('An API key with this name already exists', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }
    }

    // Update API key
    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        scopes: data.scopes,
        rateLimit: data.rateLimit,
        rateLimitWindow: data.rateLimitWindow,
        allowedIps: data.allowedIps,
        allowedOrigins: data.allowedOrigins,
        isActive: data.isActive,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        updatedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE' as AuditAction,
        category: 'security',
        entityType: 'api_key',
        entityId: id,
        description: `Updated API key: ${data.name}`,
        oldValue: existingKey as unknown as Prisma.InputJsonValue,
        newValue: updatedKey as unknown as Prisma.InputJsonValue,
        ipAddress: ip,
        requestId,
      },
    });

    logger.info('API key updated (PUT)', {
      userId,
      keyId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({
        ...updatedKey,
        expiresAt: updatedKey.expiresAt?.toISOString() || null,
        createdAt: updatedKey.createdAt.toISOString(),
        updatedAt: updatedKey.updatedAt.toISOString(),
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('PUT api-keys/[id] failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update API key', requestId), requestId);
  }
}

/**
 * PATCH - Partial update of API key
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const ip = getClientIp(request);

    // Validate ID
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

    const validation = updateBodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;

    // Check if key exists
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existingKey) {
      return addHeaders(apiResponse.notFound('API key', requestId), requestId, rateLimitResult);
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== existingKey.name) {
      const duplicateName = await prisma.apiKey.findFirst({
        where: { userId, name: data.name, id: { not: id } },
      });

      if (duplicateName) {
        return addHeaders(
          apiResponse.validationError('An API key with this name already exists', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }
    }

    // Build update data
    const updateData: Prisma.ApiKeyUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.scopes !== undefined) updateData.scopes = data.scopes;
    if (data.rateLimit !== undefined) updateData.rateLimit = data.rateLimit;
    if (data.rateLimitWindow !== undefined) updateData.rateLimitWindow = data.rateLimitWindow;
    if (data.allowedIps !== undefined) updateData.allowedIps = data.allowedIps;
    if (data.allowedOrigins !== undefined) updateData.allowedOrigins = data.allowedOrigins;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    // Update API key
    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE' as AuditAction,
        category: 'security',
        entityType: 'api_key',
        entityId: id,
        description: `Partially updated API key: ${updatedKey.name}`,
        changes: data as unknown as Prisma.InputJsonValue,
        ipAddress: ip,
        requestId,
      },
    });

    logger.info('API key updated (PATCH)', {
      userId,
      keyId: id,
      changes: Object.keys(data),
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({
        id: updatedKey.id,
        name: updatedKey.name,
        description: updatedKey.description,
        keyPrefix: updatedKey.keyPrefix,
        scopes: updatedKey.scopes,
        rateLimit: updatedKey.rateLimit,
        rateLimitWindow: updatedKey.rateLimitWindow,
        allowedIps: updatedKey.allowedIps,
        allowedOrigins: updatedKey.allowedOrigins,
        isActive: updatedKey.isActive,
        expiresAt: updatedKey.expiresAt?.toISOString() || null,
        updatedAt: updatedKey.updatedAt.toISOString(),
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('PATCH api-keys/[id] failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update API key', requestId), requestId);
  }
}

/**
 * DELETE - Delete API key
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const ip = getClientIp(request);

    // Validate ID
    const paramsValidation = paramsSchema.safeParse({ id });
    if (!paramsValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid API key ID', paramsValidation.error.errors, requestId),
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

    // Delete API key
    await prisma.apiKey.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'API_KEY_DELETE' as AuditAction,
        category: 'security',
        entityType: 'api_key',
        entityId: id,
        description: `Deleted API key: ${existingKey.name}`,
        oldValue: existingKey as unknown as Prisma.InputJsonValue,
        ipAddress: ip,
        requestId,
      },
    });

    logger.info('API key deleted', {
      userId,
      keyId: id,
      keyPrefix: existingKey.keyPrefix,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({
        message: 'API key deleted successfully',
        id,
        name: existingKey.name,
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('DELETE api-keys/[id] failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete API key', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';