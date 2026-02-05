// src/app/api/platforms/verify/route.ts
/**
 * Platform Verification API
 * 
 * Verifies platform connection by testing credentials and updating status.
 * 
 * @route POST /api/platforms/verify - Verify platform connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, ValidationError, NotFoundError } from '@/lib/apiError';
import PlatformService from '@/services/platformService';
import { decrypt, decryptJSON } from '@/lib/encryption';
import { ScraperFactory } from '@/services/scrapers';
import type { ScraperCredentials } from '@/services/scrapers/types';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20; // 20 requests per minute

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

const VerifyPlatformSchema = z.object({
  platformId: z.string().cuid('Invalid platform ID'),
  forceRevalidate: z.boolean().optional().default(false),
});

// =============================================================================
// TYPES
// =============================================================================

interface VerificationResult {
  verified: boolean;
  platform: {
    id: string;
    name: string;
    slug: string;
  };
  connection: {
    username: string | null;
    profileUrl: string | null;
    connectionStatus: string;
    isVerified: boolean;
    verifiedAt: Date | null;
  };
  profile?: {
    displayName?: string;
    avatar?: string;
    stats?: Record<string, unknown>;
  };
  message: string;
}

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

/**
 * Build scraper credentials from UserPlatform connection
 */
function buildScraperCredentials(
  connection: {
    username: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    apiKey: string | null;
    credentials: unknown;
    externalUserId: string | null;
  }
): ScraperCredentials {
  const credentials: ScraperCredentials = {};

  if (connection.username) {
    credentials.username = connection.username;
  }

  if (connection.accessToken) {
    try {
      credentials.accessToken = decrypt(connection.accessToken);
    } catch {
      credentials.accessToken = connection.accessToken;
    }
  }

  if (connection.refreshToken) {
    try {
      credentials.refreshToken = decrypt(connection.refreshToken);
    } catch {
      credentials.refreshToken = connection.refreshToken;
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
      // If decryption fails, try to use as-is if it's an object
      if (typeof connection.credentials === 'object') {
        Object.assign(credentials, connection.credentials);
      }
    }
  }

  if (connection.externalUserId) {
    credentials.userId = connection.externalUserId;
  }

  return credentials;
}

/**
 * Test platform connection by attempting to fetch data
 */
async function testPlatformConnection(
  platformSlug: string,
  credentials: ScraperCredentials
): Promise<{
  success: boolean;
  error?: string;
  profile?: {
    displayName?: string;
    avatar?: string;
    stats?: Record<string, unknown>;
  };
}> {
  try {
  const scraper = await ScraperFactory.getOrLoadScraper(platformSlug);


    if (!scraper) {
      // Platform doesn't have a scraper - assume connection is valid if we have credentials
      if (credentials.username || credentials.accessToken || credentials.apiKey) {
        return { success: true };
      }
      return { 
        success: false, 
        error: 'No credentials provided for verification' 
      };
    }

    // Try to fetch data - this validates the credentials work
    const result = await scraper.fetchData(credentials);

    if (result.success) {
      return {
        success: true,
        profile: {
          displayName: result.metadata?.displayName as string | undefined,
          avatar: result.metadata?.avatar as string | undefined,
          stats: result.metadata?.stats as Record<string, unknown> | undefined,
        },
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to verify connection',
    };
  } catch (error) {
    logger.error('Platform connection test failed', { platformSlug }, error);
    
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('not found') || error.message.includes('404')) {
        return { success: false, error: 'User not found on platform' };
      }
      if (error.message.includes('unauthorized') || error.message.includes('401')) {
        return { success: false, error: 'Invalid credentials' };
      }
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return { success: false, error: 'Platform rate limit reached, try again later' };
      }
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Connection verification failed' };
  }
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
 * POST /api/platforms/verify
 * 
 * Verify platform connection by testing credentials
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitKey = `platforms:verify:${ip}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = VerifyPlatformSchema.safeParse(body);
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

    const { platformId, forceRevalidate } = validation.data;

    // Get platform connection with platform details
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            displayName: true,
            authType: true,
            supportsAutoSync: true,
            isActive: true,
            maintenanceMode: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    if (!connection.platform.isActive) {
      return addHeaders(
        apiResponse.error(
          {
            message: 'Platform is currently unavailable',
            statusCode: 503,
            code: 'PLATFORM_UNAVAILABLE',
          },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    if (connection.platform.maintenanceMode) {
      return addHeaders(
        apiResponse.error(
          {
            message: 'Platform is under maintenance',
            statusCode: 503,
            code: 'PLATFORM_MAINTENANCE',
          },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Check if already verified and not forcing revalidation
    if (connection.isVerified && !forceRevalidate) {
      const result: VerificationResult = {
        verified: true,
        platform: {
          id: connection.platform.id,
          name: connection.platform.displayName || connection.platform.name,
          slug: connection.platform.slug,
        },
        connection: {
          username: connection.username,
          profileUrl: connection.profileUrl,
          connectionStatus: connection.connectionStatus,
          isVerified: connection.isVerified,
          verifiedAt: connection.verifiedAt,
        },
        message: 'Platform connection already verified',
      };

      logger.info('Platform already verified', {
        userId,
        platformId,
        platformSlug: connection.platform.slug,
        requestId,
      });

      return addHeaders(
        apiResponse.success(result, {
          meta: { requestId, cached: true },
        }),
        requestId,
        rateLimitResult
      );
    }

    // Build credentials for testing
    const credentials = buildScraperCredentials({
      username: connection.username,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      apiKey: connection.apiKey,
      credentials: connection.credentials,
      externalUserId: connection.externalUserId,
    });

    // Test the connection
    const testResult = await testPlatformConnection(
      connection.platform.slug,
      credentials
    );

    if (!testResult.success) {
      // Update connection status to error
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

      logger.warn('Platform verification failed', {
        userId,
        platformId,
        platformSlug: connection.platform.slug,
        error: testResult.error,
        requestId,
        duration: Date.now() - startTime,
      });

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
        rateLimitResult
      );
    }

    // Verification successful - update the connection
    const updatedConnection = await PlatformService.verifyConnection(userId, platformId);

    // Update cached stats if profile data returned
    if (testResult.profile?.stats) {
      await PlatformService.updateCachedStats(userId, platformId, testResult.profile.stats);
    }

    // Schedule initial sync if auto-sync is enabled
    if (connection.autoSync && connection.platform.supportsAutoSync) {
      await PlatformService.scheduleNextSync(userId, platformId, 1); // Schedule for 1 minute
      
      logger.info('Scheduled initial sync after verification', {
        userId,
        platformId,
        platformSlug: connection.platform.slug,
      });
    }

    const result: VerificationResult = {
      verified: true,
      platform: {
        id: connection.platform.id,
        name: connection.platform.displayName || connection.platform.name,
        slug: connection.platform.slug,
      },
      connection: {
        username: connection.username,
        profileUrl: connection.profileUrl,
        connectionStatus: updatedConnection.connectionStatus,
        isVerified: updatedConnection.isVerified,
        verifiedAt: updatedConnection.verifiedAt,
      },
      profile: testResult.profile,
      message: 'Platform connection verified successfully',
    };

    logger.info('Platform verified successfully', {
      userId,
      platformId,
      platformSlug: connection.platform.slug,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(result, {
        meta: {
          requestId,
          duration: Date.now() - startTime,
        },
      }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST /api/platforms/verify failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';