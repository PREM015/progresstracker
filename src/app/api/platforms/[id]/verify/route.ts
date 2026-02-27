// src/app/api/platforms/[id]/verify/route.ts
/**
 * Platform Verification API
 * 
 * Verifies platform connection by testing credentials.
 * 
 * @route GET  /api/platforms/[id]/verify - Get verification status
 * @route POST /api/platforms/[id]/verify - Trigger verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '@/lib/apiError';
import PlatformService from '@/services/platformService';
import { auditLogService } from '@/services/auditLogService';
import { decrypt, decryptJSON } from '@/lib/encryption';
import { AuditAction } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20; // 20 per minute

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const VerifyOptionsSchema = z.object({
  forceRevalidate: z.boolean().default(false),
  testCredentials: z.record(z.unknown()).optional(),
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

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
    verified?: boolean;
  }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('X-Request-ID', requestId);

  if (options?.verified !== undefined) {
    response.headers.set('X-Verified', String(options.verified));
  }

  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  return response;
}

/**
 * Test platform credentials
 */
async function testPlatformCredentials(
  platformSlug: string,
  credentials: Record<string, unknown>
): Promise<{ success: boolean; error?: string; profile?: Record<string, unknown> }> {
  try {
    // Dynamic import to avoid circular dependencies
    const { getScraperForPlatform } = await import('@/services/scrapers');
    
    const scraper = getScraperForPlatform(platformSlug);
    
    if (!scraper) {
      // No scraper - assume valid if we have credentials
      if (credentials.username || credentials.accessToken || credentials.apiKey) {
        return { success: true };
      }
      return { success: false, error: 'No credentials provided' };
    }

    const result = await scraper.fetchData(credentials as any);
    
    if (result.success) {
      return {
        success: true,
        profile: result.metadata as Record<string, unknown>,
      };
    }

    return { success: false, error: result.error || 'Verification failed' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:verify:get:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Get connection
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: {
            name: true,
            slug: true,
            authType: true,
            requiresCredentials: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    logger.info('Verification status fetched', {
      requestId,
      userId,
      platformId,
      isVerified: connection.isVerified,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          platform: {
            id: platformId,
            name: connection.platform.name,
            slug: connection.platform.slug,
            authType: connection.platform.authType,
            requiresCredentials: connection.platform.requiresCredentials,
          },
          verification: {
            isVerified: connection.isVerified,
            verifiedAt: connection.verifiedAt,
            connectionStatus: connection.connectionStatus,
            hasCredentials: !!(connection.accessToken || connection.apiKey || connection.credentials),
            hasUsername: !!connection.username,
          },
        },
        {
          meta: { requestId, duration: Date.now() - startTime },
        }
      ),
      requestId,
      { rateLimitResult, verified: connection.isVerified }
    );
  } catch (error) {
    logger.error('GET /api/platforms/[id]/verify failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting
    const rateLimitKey = `platforms:verify:post:${userId}:${platformId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse options
    let options = { forceRevalidate: false };
    try {
      const body = await request.json();
      const validation = VerifyOptionsSchema.safeParse(body);
      if (validation.success) {
        options = validation.data;
      }
    } catch {
      // Use defaults
    }

    // Get connection
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: {
            name: true,
            slug: true,
            isActive: true,
            maintenanceMode: true,
            authType: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    if (!connection.platform.isActive || connection.platform.maintenanceMode) {
      throw new ValidationError(`${connection.platform.name} is currently unavailable`);
    }

    // Check if already verified and not forcing revalidation
    if (connection.isVerified && !options.forceRevalidate) {
      return addHeaders(
        apiResponse.success(
          {
            verified: true,
            message: 'Connection already verified',
            verifiedAt: connection.verifiedAt,
            cached: true,
          },
          { meta: { requestId } }
        ),
        requestId,
        { rateLimitResult, verified: true }
      );
    }

    // Build credentials for testing
    const credentials: Record<string, unknown> = {
      username: connection.username,
    };

    if (connection.accessToken) {
      try {
        credentials.accessToken = decrypt(connection.accessToken);
      } catch {
        credentials.accessToken = connection.accessToken;
      }
    }

    if (connection.apiKey) {
      try {
        credentials.apiKey = decrypt(connection.apiKey);
      } catch {
        credentials.apiKey = connection.apiKey;
      }
    }

    if (connection.credentials) {
      try {
        const decrypted = decryptJSON(connection.credentials as string);
        Object.assign(credentials, decrypted);
      } catch {
        if (typeof connection.credentials === 'object') {
          Object.assign(credentials, connection.credentials);
        }
      }
    }

    // Test credentials
    const testResult = await testPlatformCredentials(
      connection.platform.slug,
      credentials
    );

    // Update connection based on result
    if (testResult.success) {
      await PlatformService.verifyConnection(userId, platformId);

      if (testResult.profile) {
        await PlatformService.updateCachedStats(userId, platformId, testResult.profile);
      }
    } else {
      await prisma.userPlatform.update({
        where: {
          userId_platformId: { userId, platformId },
        },
        data: {
          isVerified: false,
          connectionStatus: 'error',
          connectionError: testResult.error,
          updatedAt: new Date(),
        },
      });
    }

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.UPDATE,
      category: 'platform',
      entityType: 'user_platform',
      entityId: connection.id,
      description: testResult.success
        ? `Verified connection to ${connection.platform.name}`
        : `Verification failed for ${connection.platform.name}: ${testResult.error}`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      status: testResult.success ? 'success' : 'failure',
    });

    logger.info('Platform verification completed', {
      requestId,
      userId,
      platformId,
      platformSlug: connection.platform.slug,
      verified: testResult.success,
      duration: Date.now() - startTime,
    });

    if (!testResult.success) {
      return addHeaders(
        apiResponse.error(
          {
            message: testResult.error || 'Verification failed',
            statusCode: 400,
            code: 'VERIFICATION_FAILED',
          },
          requestId
        ),
        requestId,
        { rateLimitResult, verified: false }
      );
    }

    return addHeaders(
      apiResponse.success(
        {
          verified: true,
          platform: {
            id: platformId,
            name: connection.platform.name,
            slug: connection.platform.slug,
          },
          verifiedAt: new Date(),
          profile: testResult.profile,
          message: 'Connection verified successfully',
        },
        {
          meta: { requestId, duration: Date.now() - startTime },
        }
      ),
      requestId,
      { rateLimitResult, verified: true }
    );
  } catch (error) {
    logger.error('POST /api/platforms/[id]/verify failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';