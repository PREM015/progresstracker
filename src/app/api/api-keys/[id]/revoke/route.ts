// src/app/api/api-keys/[id]/revoke/route.ts
// =============================================================================
// Revoke API Key
// =============================================================================
// Methods: POST, OPTIONS
// Auth Required: Yes
// Rate Limit: 20 requests/minute
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

const RATE_LIMIT = 20;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
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

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `api-keys-revoke:${ip}`;
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

/**
 * POST - Revoke/Deactivate API key
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

    let body: unknown = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is acceptable
    }

    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { reason, permanent } = validation.data;

    // Check if key exists
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existingKey) {
      return addHeaders(apiResponse.notFound('API key', requestId), requestId, rateLimitResult);
    }

    if (!existingKey.isActive) {
      return addHeaders(
        apiResponse.validationError('API key is already revoked', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    if (permanent) {
      // Permanently delete the key
      await prisma.apiKey.delete({ where: { id } });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'API_KEY_DELETE' as AuditAction,
          category: 'security',
          entityType: 'api_key',
          entityId: id,
          description: `Permanently revoked and deleted API key: ${existingKey.name}${reason ? ` (Reason: ${reason})` : ''}`,
          oldValue: existingKey as unknown as Prisma.InputJsonValue,
          ipAddress: ip,
          requestId,
        },
      });

      logger.info('API key permanently revoked and deleted', {
        userId,
        keyId: id,
        keyPrefix: existingKey.keyPrefix,
        reason,
        requestId,
        duration: Date.now() - startTime,
      });

      return addHeaders(
        apiResponse.success({
          message: 'API key permanently revoked and deleted',
          id,
          name: existingKey.name,
          permanent: true,
          revokedAt: new Date().toISOString(),
        }, { meta: { requestId } }),
        requestId,
        rateLimitResult
      );
    }

    // Soft revoke - just deactivate
    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: {
        isActive: false,
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
        description: `Revoked API key: ${existingKey.name}${reason ? ` (Reason: ${reason})` : ''}`,
        changes: { isActive: false, reason } as Prisma.InputJsonValue,
        ipAddress: ip,
        requestId,
      },
    });

    logger.info('API key revoked', {
      userId,
      keyId: id,
      keyPrefix: existingKey.keyPrefix,
      reason,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({
        message: 'API key revoked successfully',
        apiKey: {
          id: updatedKey.id,
          name: updatedKey.name,
          keyPrefix: updatedKey.keyPrefix,
          isActive: updatedKey.isActive,
          updatedAt: updatedKey.updatedAt.toISOString(),
        },
        permanent: false,
        revokedAt: new Date().toISOString(),
        canReactivate: true,
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST api-keys/[id]/revoke failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to revoke API key', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';