// src/app/api/platforms/refresh-token/route.ts
/**
 * Platform Token Refresh API
 *
 * @route POST /api/platforms/refresh-token - Refresh OAuth tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, ValidationError, NotFoundError } from '@/lib/apiError';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { encrypt, encryptJSON } from '@/lib/encryption';
import type { Prisma } from '@prisma/client';

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
  'Cache-Control': 'no-store, private',
};

const log = logger.child({ route: 'platforms/refresh-token' });

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const RefreshTokenSchema = z.object({
  platformId: z.string().cuid('Invalid platform ID'),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
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

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * POST /api/platforms/refresh-token
 *
 * Refresh OAuth tokens for a platform connection
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:refresh-token:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate
    const validation = RefreshTokenSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Validation failed',
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    const { platformId, accessToken, refreshToken, expiresAt } = validation.data;

    // Check if connection exists
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: {
            name: true,
            authType: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    if (connection.platform.authType !== 'OAUTH') {
      throw new ValidationError('Token refresh is only available for OAuth platforms');
    }

    // Encrypt tokens
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : undefined;

    // Build credentials JSON
    const credentialsData = {
      access_token: accessToken,
      refresh_token: refreshToken ?? connection.refreshToken ?? '',
      expires_at: expiresAt ?? null,
      updated_at: new Date().toISOString(),
    };

    // Update connection
    const updateData: Prisma.UserPlatformUpdateInput = {
      accessToken: encryptedAccessToken,
      tokenExpiresAt: expiresAt ? new Date(expiresAt) : undefined,
      connectionStatus: 'connected',
      connectionError: null,
      updatedAt: new Date(),
      credentials: encryptJSON(credentialsData) as unknown as Prisma.InputJsonValue,
    };

    if (encryptedRefreshToken) {
      updateData.refreshToken = encryptedRefreshToken;
    }

    const updated = await prisma.userPlatform.update({
      where: {
        userId_platformId: { userId, platformId },
      },
      data: updateData,
      select: {
        id: true,
        platformId: true,
        tokenExpiresAt: true,
        connectionStatus: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        category: 'platform',
        entityType: 'user_platform',
        entityId: connection.id,
        description: `Refreshed OAuth tokens for ${connection.platform.name}`,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    log.info('Platform tokens refreshed', {
      userId,
      platformId,
      platformName: connection.platform.name,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          refreshed: true,
          platform: {
            id: platformId,
            name: connection.platform.name,
          },
          tokenExpiresAt: updated.tokenExpiresAt,
          connectionStatus: updated.connectionStatus,
          updatedAt: updated.updatedAt,
        },
        { meta: { requestId, message: 'Tokens refreshed successfully' } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Error refreshing tokens', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';