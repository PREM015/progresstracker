// src/app/api/platforms/connect/route.ts
/**
 * Platform Connection API
 *
 * @route GET /api/platforms/connect - Get user's platform connections
 * @route POST /api/platforms/connect - Connect a platform
 * @route PUT /api/platforms/connect - Update a platform connection
 * @route DELETE /api/platforms/connect - Disconnect a platform
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
  ValidationError,
  NotFoundError,
  ConflictError,
} from '@/lib/apiError';
import PlatformService from '@/services/platformService';
import { stripeService } from '@/services/stripeService';
import auditLogService from '@/services/auditLogService';
import { SyncService } from '@/services/syncService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMITS = {
  GET: 100,
  POST: 10, // 10 connections per hour
  PUT: 30,
  DELETE: 10,
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, private',
};

const log = logger.child({ route: 'platforms/connect' });

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const ConnectPlatformSchema = z.object({
  platformId: z.string().min(1, 'Platform ID is required'),
  username: z
    .string()
    .min(1, 'Username is required')
    .max(100, 'Username too long')
    .optional(),
  profileUrl: z.string().url('Invalid URL format').optional(),
  externalUserId: z.string().max(100).optional(),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().min(1).optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  apiKey: z.string().min(1).optional(),
  credentials: z.record(z.unknown()).optional(),
  autoSync: z.boolean().default(true),
  notifyOnSync: z.boolean().default(false),
  notifyOnError: z.boolean().default(true),
});

const UpdateConnectionSchema = z.object({
  platformId: z.string().min(1, 'Platform ID is required'),
  username: z.string().min(1).max(100).optional(),
  profileUrl: z.string().url().optional(),
  autoSync: z.boolean().optional(),
  syncPriority: z.number().int().min(0).max(10).optional(),
  notifyOnSync: z.boolean().optional(),
  notifyOnError: z.boolean().optional(),
});

const QuerySchema = z.object({
  platformId: z.string().cuid().optional(),
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
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new UnauthorizedError('Authentication required');
  }

  return session;
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
 * GET /api/platforms/connect
 * 
 * Get user's platform connections
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await validateSession(request, requestId);
    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:connect:get:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.GET, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const queryValidation = QuerySchema.safeParse(searchParams);

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Invalid query parameters',
          queryValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    const { platformId } = queryValidation.data;

    if (platformId) {
      // Get specific connection
      const connection = await prisma.userPlatform.findUnique({
        where: {
          userId_platformId: { userId, platformId },
        },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              slug: true,
              displayName: true,
              icon: true,
              color: true,
              category: true,
              supportsAutoSync: true,
              authType: true,
            },
          },
        },
      });

      if (!connection) {
        throw new NotFoundError('Platform connection');
      }

      return addHeaders(
        apiResponse.success({ connection }, { meta: { requestId } }),
        requestId,
        rateLimitResult
      );
    }

    // Get all connections
    const connections = await prisma.userPlatform.findMany({
      where: { userId },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            displayName: true,
            icon: true,
            color: true,
            category: true,
            supportsAutoSync: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { lastSyncedAt: 'desc' }],
    });

    log.info('Connections retrieved', {
      userId,
      count: connections.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          connections,
          count: connections.length,
        },
        { meta: { requestId } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Error getting connections', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * POST /api/platforms/connect
 * 
 * Connect a new platform
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await validateSession(request, requestId);
    const userId = session.user.id;

    // Rate limiting (stricter for POST)
    const rateLimitKey = `platforms:connect:post:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.POST, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60 * 60, requestId), // 1 hour
        requestId,
        rateLimitResult
      );
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate
    const validation = ConnectPlatformSchema.safeParse(body);
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

    const data = validation.data;

    // Validate platform exists
    const platform = await PlatformService.getPlatformById(data.platformId);

    if (!platform) {
      throw new NotFoundError('Platform');
    }

    if (!platform.isActive) {
      throw new ValidationError('Platform is currently unavailable');
    }

    // Check maintenance mode (safeguard)
    if ((platform as any).maintenanceMode) {
      throw new ValidationError(`${platform.name} is under maintenance`);
    }

    // Relaxed token requirement for OAuth platforms (allow username fallback for scraping)
    if (platform.authType === 'oauth' && !data.accessToken && !data.username) {
      throw new ValidationError('Access token or username required for OAuth platforms');
    }

    if (platform.authType === 'api_key' && !data.apiKey) {
      throw new ValidationError('API key required for this platform');
    }

    if (
      (platform.authType === 'scraping' || platform.authType === 'manual') &&
      !data.username &&
      platform.requiresCredentials
    ) {
      throw new ValidationError('Username required for this platform');
    }

    // Connect platform
    const { connection, scraperStatus } = await PlatformService.connectPlatform(
      userId,
      data.platformId,
      data.username,
      data.accessToken,
      {
        userId,
        platformId: data.platformId,
        username: data.username,
        profileUrl: data.profileUrl,
        externalUserId: data.externalUserId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : undefined,
        apiKey: data.apiKey,
        credentials: data.credentials,
        autoSync: data.autoSync && platform.supportsAutoSync,
      }
    );

    // Initial Sync
    let syncResult = null;
    if (scraperStatus.hasAutoSync) {
      try {
        syncResult = await SyncService.syncPlatform(userId, connection.platformId, {
          triggeredBy: 'manual',
        });
      } catch (syncError) {
        log.error('Initial sync failed', { userId, platformId: data.platformId }, syncError);
      }
    }

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'CREATE',
      category: 'platform',
      entityType: 'user_platform',
      entityId: connection.id,
      description: `Connected platform: ${platform.name}`,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
    });

    log.info('Platform connected', {
      userId,
      platformId: data.platformId,
      platformName: platform.name,
      connectionId: connection.id,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.created(
        {
          connection: {
            id: connection.id,
            platformId: connection.platformId,
            platform: {
              id: platform.id,
              name: platform.name,
              slug: platform.slug,
            },
            username: connection.username,
            profileUrl: connection.profileUrl,
            isActive: connection.isActive,
            isVerified: connection.isVerified,
            connectionStatus: connection.connectionStatus,
            syncStatus: connection.syncStatus,
            autoSync: connection.autoSync,
            createdAt: connection.createdAt,
          },
        },
        {
          requestId,
          message: syncResult?.success
            ? `Successfully connected ${platform.name} and fetched latest data.`
            : scraperStatus.isImplemented
              ? `Connected ${platform.name}. Initial data sync is pending.`
              : `Connected ${platform.name}. Note: Automated sync is not yet available for this platform (Manual tracking only).`
        }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Error connecting platform', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * PUT /api/platforms/connect
 * 
 * Update platform connection
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await validateSession(request, requestId);
    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:connect:put:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.PUT, rateLimitKey);

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
    const validation = UpdateConnectionSchema.safeParse(body);
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

    const data = validation.data;

    // Check if connection exists
    const existingConnection = await prisma.userPlatform.findFirst({
      where: {
        userId,
        OR: [
          { platformId: data.platformId },
          { platform: { slug: data.platformId } }
        ]
      },
      include: {
        platform: {
          select: { name: true },
        },
      },
    });

    if (!existingConnection) {
      throw new NotFoundError('Platform connection');
    }

    // Update connection
    const connection = await prisma.userPlatform.update({
      where: { id: existingConnection.id },
      data: {
        username: data.username ?? existingConnection.username,
        profileUrl: data.profileUrl ?? existingConnection.profileUrl,
        autoSync: data.autoSync ?? existingConnection.autoSync,
        syncPriority: data.syncPriority ?? existingConnection.syncPriority,
        notifyOnSync: data.notifyOnSync ?? existingConnection.notifyOnSync,
        notifyOnError: data.notifyOnError ?? existingConnection.notifyOnError,
        updatedAt: new Date(),
      },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            category: true,
          },
        },
      },
    });

    log.info('Platform connection updated', {
      userId,
      platformId: data.platformId,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        { connection },
        { meta: { requestId, message: 'Connection updated successfully' } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Error updating connection', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * DELETE /api/platforms/connect
 * 
 * Disconnect a platform
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await validateSession(request, requestId);
    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:connect:delete:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.DELETE, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60 * 60, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Get platformId from query
    const platformId = request.nextUrl.searchParams.get('platformId');

    if (!platformId) {
      return addHeaders(
        apiResponse.validationError(
          'Platform ID is required',
          [{ field: 'platformId', message: 'Required query parameter' }],
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Check if connection exists
    const connection = await prisma.userPlatform.findFirst({
      where: {
        userId,
        OR: [
          { platformId },
          { platform: { slug: platformId } }
        ]
      },
      include: {
        platform: {
          select: { name: true },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    // Delete connection using service (handles cleanup)
    await PlatformService.disconnectPlatform(userId, connection.platformId);

    // Update subscription platform count
    await stripeService.decrementPlatformCount(userId);

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'DELETE',
      category: 'platform',
      entityType: 'user_platform',
      entityId: connection.id,
      description: `Disconnected platform: ${connection.platform.name}`,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
    });

    log.info('Platform disconnected', {
      userId,
      platformId,
      platformName: connection.platform.name,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        { disconnected: true, platformId },
        { meta: { requestId, message: 'Platform disconnected successfully' } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Error disconnecting platform', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';