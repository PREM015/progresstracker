// src/app/api/api-keys/validate/route.ts
// =============================================================================
// Validate API Key
// =============================================================================
// Methods: POST, OPTIONS
// Auth Required: No (validates the key itself)
// Rate Limit: 100 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import bcrypt from 'bcryptjs';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
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

const bodySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  requiredScopes: z.array(z.enum(['read', 'write', 'delete', 'admin'])).optional(),
  checkOrigin: z.string().url().optional(),
  checkIp: z.string().ip().optional(),
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

async function checkRateLimit(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `api-keys-validate:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), rateLimitResult };
  }

  return { error: null, rateLimitResult };
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * POST - Validate an API key
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error: rateLimitError, rateLimitResult } = await checkRateLimit(request, requestId);

    if (rateLimitError) {
      return addHeaders(rateLimitError, requestId, rateLimitResult);
    }

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

    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { apiKey, requiredScopes, checkOrigin, checkIp } = validation.data;

    // Extract key prefix for lookup
    const keyPrefix = apiKey.substring(0, 12);

    // Find potential keys by prefix
    const potentialKeys = await prisma.apiKey.findMany({
      where: { keyPrefix },
      select: {
        id: true,
        keyHash: true,
        name: true,
        scopes: true,
        rateLimit: true,
        rateLimitWindow: true,
        allowedIps: true,
        allowedOrigins: true,
        isActive: true,
        expiresAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            isBanned: true,
          },
        },
      },
    });

    if (potentialKeys.length === 0) {
      logger.warn('API key validation failed: key not found', {
        keyPrefix,
        ip,
        requestId,
      });

      return addHeaders(
        apiResponse.unauthorized('Invalid API key', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Find matching key by hash comparison
    let matchedKey = null;
    for (const key of potentialKeys) {
      const isMatch = await bcrypt.compare(apiKey, key.keyHash);
      if (isMatch) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      logger.warn('API key validation failed: hash mismatch', {
        keyPrefix,
        ip,
        requestId,
      });

      return addHeaders(
        apiResponse.unauthorized('Invalid API key', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Validation checks
    const validationErrors: string[] = [];

    // Check if key is active
    if (!matchedKey.isActive) {
      validationErrors.push('API key is revoked or inactive');
    }

    // Check if key is expired
    if (matchedKey.expiresAt && new Date(matchedKey.expiresAt) < new Date()) {
      validationErrors.push('API key has expired');
    }

    // Check if user is active
    if (!matchedKey.user.isActive || matchedKey.user.isBanned) {
      validationErrors.push('User account is inactive or banned');
    }

    // Check required scopes
    if (requiredScopes && requiredScopes.length > 0) {
      const keyScopes = matchedKey.scopes as string[];
      const missingScopes = requiredScopes.filter(scope => !keyScopes.includes(scope));
      if (missingScopes.length > 0) {
        validationErrors.push(`Missing required scopes: ${missingScopes.join(', ')}`);
      }
    }

    // Check allowed origins
    if (checkOrigin && matchedKey.allowedOrigins.length > 0) {
      if (!matchedKey.allowedOrigins.includes(checkOrigin)) {
        validationErrors.push('Origin not allowed for this API key');
      }
    }

    // Check allowed IPs
    if (checkIp && matchedKey.allowedIps.length > 0) {
      if (!matchedKey.allowedIps.includes(checkIp)) {
        validationErrors.push('IP address not allowed for this API key');
      }
    }

    // If there are validation errors
    if (validationErrors.length > 0) {
      logger.warn('API key validation failed', {
        keyId: matchedKey.id,
        errors: validationErrors,
        ip,
        requestId,
      });

      return addHeaders(
        apiResponse.success({
          valid: false,
          errors: validationErrors,
          apiKey: {
            id: matchedKey.id,
            name: matchedKey.name,
            isActive: matchedKey.isActive,
            isExpired: matchedKey.expiresAt ? new Date(matchedKey.expiresAt) < new Date() : false,
          },
        }, { meta: { requestId } }),
        requestId,
        rateLimitResult
      );
    }

    // Update usage tracking
    await prisma.apiKey.update({
      where: { id: matchedKey.id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: ip,
        usageCount: { increment: 1 },
        usageCountDaily: { increment: 1 },
      },
    });

    logger.info('API key validated successfully', {
      keyId: matchedKey.id,
      userId: matchedKey.userId,
      ip,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({
        valid: true,
        apiKey: {
          id: matchedKey.id,
          name: matchedKey.name,
          scopes: matchedKey.scopes,
          rateLimit: matchedKey.rateLimit,
          rateLimitWindow: matchedKey.rateLimitWindow,
        },
        user: {
          id: matchedKey.user.id,
          email: matchedKey.user.email,
        },
        expiresAt: matchedKey.expiresAt?.toISOString() || null,
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST api-keys/validate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to validate API key', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';