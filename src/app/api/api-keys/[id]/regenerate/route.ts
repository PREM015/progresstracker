// src/app/api/api-keys/[id]/regenerate/route.ts
// =============================================================================
// Regenerate API Key
// =============================================================================
// Methods: POST, OPTIONS
// Auth Required: Yes
// Rate Limit: 10 requests/minute
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

const RATE_LIMIT = 10;
const API_KEY_PREFIX = 'pk_';

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
  confirmRegenerate: z.boolean().refine(v => v === true, {
    message: 'You must confirm regeneration by setting confirmRegenerate to true',
  }),
  resetUsageStats: z.boolean().optional().default(false),
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
  const rateLimitKey = `api-keys-regenerate:${ip}`;
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
 * POST - Regenerate API key (creates new key, invalidates old one)
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

    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { resetUsageStats } = validation.data;

    // Check if key exists
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existingKey) {
      return addHeaders(apiResponse.notFound('API key', requestId), requestId, rateLimitResult);
    }

    // Generate new key
    const newApiKey = generateApiKey();
    const newKeyPrefix = newApiKey.substring(0, 12);
    const newKeyHash = await hashApiKey(newApiKey);

    // Update API key with new credentials
    const updateData: Prisma.ApiKeyUpdateInput = {
      keyHash: newKeyHash,
      keyPrefix: newKeyPrefix,
      updatedAt: new Date(),
    };

    if (resetUsageStats) {
      updateData.usageCount = 0;
      updateData.usageCountDaily = 0;
      updateData.usageResetAt = new Date();
      updateData.lastUsedAt = null;
      updateData.lastUsedIp = null;
    }

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
        description: `Regenerated API key: ${existingKey.name}`,
        changes: { regenerated: true, resetUsageStats } as Prisma.InputJsonValue,
        ipAddress: ip,
        requestId,
      },
    });

    logger.info('API key regenerated', {
      userId,
      keyId: id,
      oldKeyPrefix: existingKey.keyPrefix,
      newKeyPrefix,
      resetUsageStats,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({
        apiKey: {
          id: updatedKey.id,
          name: updatedKey.name,
          keyPrefix: updatedKey.keyPrefix,
          scopes: updatedKey.scopes,
          isActive: updatedKey.isActive,
          updatedAt: updatedKey.updatedAt.toISOString(),
        },
        key: newApiKey, // ⚠️ SHOWN ONLY ONCE
        warning: '⚠️ Save this new API key now! The old key is now invalid and you will not be able to see this new key again.',
        regeneratedAt: new Date().toISOString(),
        usageStatsReset: resetUsageStats,
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST api-keys/[id]/regenerate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to regenerate API key', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';