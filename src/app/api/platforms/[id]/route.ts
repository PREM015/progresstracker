// src/app/api/platforms/[id]/route.ts
/**
 * Single Platform API
 * 
 * Comprehensive API for managing individual platforms.
 * Supports public viewing, user connection management, and admin operations.
 * 
 * @route GET    /api/platforms/[id] - Get platform details with connection status
 * @route POST   /api/platforms/[id] - User operations (connect, disconnect, update connection)
 * @route PUT    /api/platforms/[id] - Full platform update (Admin only)
 * @route PATCH  /api/platforms/[id] - Partial platform update (Admin only)
 * @route DELETE /api/platforms/[id] - Delete/deactivate platform (Admin only)
 * @route HEAD   /api/platforms/[id] - Check if platform exists
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withTransaction } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/apiError';
import PlatformService from '@/services/platformService';
import { auditLogService } from '@/services/auditLogService';
import { encrypt, encryptJSON } from '@/lib/encryption';
import { 
  AuditAction, 
  PlatformCategory, 
  AuthType, 
  SyncStatus,
  Prisma,
} from '@prisma/client';
import { getCategoryDisplayName } from '@/types/platform';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMITS = {
  GET: 60,           // 60 requests per minute (public)
  GET_AUTH: 120,     // 120 requests per minute (authenticated)
  POST: 20,          // 20 connection operations per minute
  PUT: 30,           // 30 admin updates per minute
  PATCH: 30,         // 30 admin updates per minute
  DELETE: 10,        // 10 deletes per hour
} as const;

const CACHE_TTL = 300; // 5 minutes cache for platform details

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// =============================================================================
// TYPES
// =============================================================================

interface PlatformDetails {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  description: string | null;
  category: PlatformCategory;
  categoryName: string;
  subcategory: string | null;
  tags: string[];
  
  // Branding
  icon: string | null;
  logo: string | null;
  color: string | null;
  backgroundColor: string | null;
  
  // Authentication
  authType: AuthType;
  supportsAutoSync: boolean;
  supportsOAuth: boolean;
  supportsApiKey: boolean;
  supportsWebhook: boolean;
  requiresCredentials: boolean;
  
  // URLs
  website: string | null;
  apiEndpoint: string | null;
  profileUrlPattern: string | null;
  setupGuideUrl: string | null;
  helpArticleUrl: string | null;
  
  // Status
  isActive: boolean;
  isBeta: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  healthStatus: string | null;
  
  // Stats
  totalUsers: number;
  successRate: number;
  avgSyncDuration: number | null;
  
  // Configuration
  syncInterval: number;
  rateLimit: number | null;
  rateLimitWindow: number | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface UserConnectionStatus {
  isConnected: boolean;
  connection: {
    id: string;
    username: string | null;
    profileUrl: string | null;
    isActive: boolean;
    isVerified: boolean;
    verifiedAt: Date | null;
    connectionStatus: string;
    syncStatus: SyncStatus;
    lastSyncedAt: Date | null;
    lastSyncError: string | null;
    consecutiveFailures: number;
    autoSync: boolean;
    syncPriority: number;
    cachedStats: unknown;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  canConnect: boolean;
  connectionReason?: string;
}

interface PlatformStats {
  totalConnections: number;
  activeConnections: number;
  syncStats: {
    last24Hours: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
    last7Days: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
  };
  activityStats: {
    totalEntries: number;
    totalProblems: number;
    totalCommits: number;
    avgEntriesPerUser: number;
  };
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Admin full update schema
const FullUpdatePlatformSchema = z.object({
  name: z.string().min(2).max(100),
  displayName: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  category: z.nativeEnum(PlatformCategory),
  subcategory: z.string().max(50).optional().nullable(),
  tags: z.array(z.string().max(30)).max(20).default([]),
  
  // Branding
  icon: z.string().url().optional().nullable(),
  logo: z.string().url().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  
  // Authentication
  authType: z.nativeEnum(AuthType),
  supportsAutoSync: z.boolean().default(false),
  supportsOAuth: z.boolean().default(false),
  supportsApiKey: z.boolean().default(false),
  supportsWebhook: z.boolean().default(false),
  requiresCredentials: z.boolean().default(false),
  oauthConfig: z.record(z.unknown()).optional().nullable(),
  apiKeyConfig: z.record(z.unknown()).optional().nullable(),
  
  // URLs
  website: z.string().url().optional().nullable(),
  apiEndpoint: z.string().url().optional().nullable(),
  profileUrlPattern: z.string().optional().nullable(),
  setupGuideUrl: z.string().url().optional().nullable(),
  helpArticleUrl: z.string().url().optional().nullable(),
  
  // Status
  isActive: z.boolean().default(true),
  isBeta: z.boolean().default(false),
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z.string().max(500).optional().nullable(),
  
  // Configuration
  syncInterval: z.number().int().min(15).max(10080).default(1440), // 15min to 7days
  syncPriority: z.number().int().min(0).max(100).default(0),
  rateLimit: z.number().int().min(1).optional().nullable(),
  rateLimitWindow: z.number().int().min(1).optional().nullable(),
  dataPoints: z.record(z.boolean()).optional().nullable(),
  scraperConfig: z.record(z.unknown()).optional().nullable(),
});

// Admin partial update schema
const PartialUpdatePlatformSchema = FullUpdatePlatformSchema.partial();

// User connection operation schema
const ConnectionOperationSchema = z.object({
  action: z.enum(['connect', 'disconnect', 'update', 'verify', 'sync']),
  
  // For connect/update
  username: z.string().min(1).max(100).optional(),
  profileUrl: z.string().url().optional(),
  externalUserId: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.coerce.date().optional(),
  apiKey: z.string().optional(),
  credentials: z.record(z.unknown()).optional(),
  autoSync: z.boolean().optional(),
  syncPriority: z.number().int().min(0).max(10).optional(),
  notifyOnSync: z.boolean().optional(),
  notifyOnError: z.boolean().optional(),
});

// Delete confirmation schema
const DeletePlatformSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Confirmation required for deletion' }),
  }),
  reason: z.string().max(500).optional(),
  migrateConnectionsTo: z.string().cuid().optional(), // Move connections to another platform
  forceDelete: z.boolean().default(false), // Hard delete even with connections
});

// Query parameters schema
const QuerySchema = z.object({
  includeStats: z.coerce.boolean().default(false),
  includeRelated: z.coerce.boolean().default(false),
  includeSyncHistory: z.coerce.boolean().default(false),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
    cacheAge?: number;
    platformSlug?: string;
  }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('X-Request-ID', requestId);

  if (options?.platformSlug) {
    response.headers.set('X-Platform-Slug', options.platformSlug);
  }

  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  if (options?.cacheAge !== undefined && options.cacheAge > 0) {
    response.headers.set(
      'Cache-Control',
      `public, max-age=${options.cacheAge}, stale-while-revalidate=${options.cacheAge * 2}`
    );
  } else {
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

/**
 * Validate platform ID and get platform
 */
async function getPlatformOrThrow(id: string) {
  const platform = await prisma.platform.findUnique({
    where: { id },
  });

  if (!platform) {
    throw new NotFoundError('Platform');
  }

  return platform;
}

/**
 * Check if user can connect to platform
 */
async function checkConnectionEligibility(
  userId: string,
  platformId: string
): Promise<{ canConnect: boolean; reason?: string }> {
  // Check if already connected
  const existing = await prisma.userPlatform.findUnique({
    where: {
      userId_platformId: { userId, platformId },
    },
  });

  if (existing) {
    return { canConnect: false, reason: 'Already connected to this platform' };
  }

  // Check subscription limits
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      platformLimit: true,
      currentPlatformCount: true,
    },
  });

  const limit = subscription?.platformLimit || 5;
  const current = subscription?.currentPlatformCount || 0;

  if (current >= limit) {
    return { 
      canConnect: false, 
      reason: `Platform limit reached (${current}/${limit}). Upgrade for more.` 
    };
  }

  return { canConnect: true };
}

/**
 * Get platform statistics
 */
async function getPlatformStats(platformId: string): Promise<PlatformStats> {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalConnections,
    activeConnections,
    syncs24h,
    syncs7d,
    activityStats,
  ] = await Promise.all([
    prisma.userPlatform.count({
      where: { platformId },
    }),
    prisma.userPlatform.count({
      where: { platformId, isActive: true },
    }),
    prisma.syncLog.groupBy({
      by: ['status'],
      where: {
        platformId,
        createdAt: { gte: last24Hours },
      },
      _count: true,
    }),
    prisma.syncLog.groupBy({
      by: ['status'],
      where: {
        platformId,
        createdAt: { gte: last7Days },
      },
      _count: true,
    }),
    prisma.trackerEntry.aggregate({
      where: { platformId },
      _count: true,
      _sum: {
        problemsSolved: true,
        commits: true,
      },
    }),
  ]);

  const calc24h = {
    total: syncs24h.reduce((sum, s) => sum + s._count, 0),
    successful: syncs24h.find(s => s.status === 'SUCCESS')?._count || 0,
    failed: syncs24h.find(s => s.status === 'FAILED')?._count || 0,
  };

  const calc7d = {
    total: syncs7d.reduce((sum, s) => sum + s._count, 0),
    successful: syncs7d.find(s => s.status === 'SUCCESS')?._count || 0,
    failed: syncs7d.find(s => s.status === 'FAILED')?._count || 0,
  };

  return {
    totalConnections,
    activeConnections,
    syncStats: {
      last24Hours: {
        ...calc24h,
        successRate: calc24h.total > 0 
          ? Math.round((calc24h.successful / calc24h.total) * 100 * 100) / 100 
          : 100,
      },
      last7Days: {
        ...calc7d,
        successRate: calc7d.total > 0 
          ? Math.round((calc7d.successful / calc7d.total) * 100 * 100) / 100 
          : 100,
      },
    },
    activityStats: {
      totalEntries: activityStats._count,
      totalProblems: activityStats._sum.problemsSolved || 0,
      totalCommits: activityStats._sum.commits || 0,
      avgEntriesPerUser: activeConnections > 0 
        ? Math.round((activityStats._count / activeConnections) * 100) / 100 
        : 0,
    },
  };
}

/**
 * Get related platforms
 */
async function getRelatedPlatforms(
  platformId: string,
  category: PlatformCategory,
  tags: string[],
  limit: number = 5
) {
  return prisma.platform.findMany({
    where: {
      id: { not: platformId },
      isActive: true,
      OR: [
        { category },
        { tags: { hasSome: tags } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      displayName: true,
      category: true,
      icon: true,
      color: true,
      supportsAutoSync: true,
      totalUsers: true,
    },
    orderBy: { totalUsers: 'desc' },
    take: limit,
  });
}

/**
 * Get user's sync history for this platform
 */
async function getUserSyncHistory(
  userId: string,
  platformId: string,
  limit: number = 10
) {
  return prisma.syncLog.findMany({
    where: {
      userId,
      platformId,
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      duration: true,
      itemsCreated: true,
      itemsUpdated: true,
      hasError: true,
      errorMessage: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
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
 * HEAD - Check if platform exists
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const { id } = await params;

  try {
    const platform = await prisma.platform.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        isActive: true,
        maintenanceMode: true,
        updatedAt: true,
      },
    });

    if (!platform) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Platform-Slug', platform.slug);
    response.headers.set('X-Platform-Active', String(platform.isActive));
    response.headers.set('X-Platform-Maintenance', String(platform.maintenanceMode));
    response.headers.set('Last-Modified', platform.updatedAt.toUTCString());

    return addHeaders(response, requestId, {
      platformSlug: platform.slug,
      cacheAge: CACHE_TTL,
    });
  } catch (error) {
    logger.error('HEAD /api/platforms/[id] failed', { requestId, id }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET /api/platforms/[id]
 * 
 * Get detailed platform information with optional connection status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id } = await params;

  try {
    // Authentication (optional)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const isAuthenticated = !!userId;
    const isAdmin = session?.user?.isAdmin || false;

    // Rate limiting
    const ip = getClientIp(request);
    const rateLimit = isAuthenticated ? RATE_LIMITS.GET_AUTH : RATE_LIMITS.GET;
    const rateLimitKey = `platforms:get:${isAuthenticated ? userId : ip}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, rateLimit, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = QuerySchema.safeParse({
      includeStats: searchParams.get('includeStats') || undefined,
      includeRelated: searchParams.get('includeRelated') || undefined,
      includeSyncHistory: searchParams.get('includeSyncHistory') || undefined,
    });

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
        { rateLimitResult }
      );
    }

    const { includeStats, includeRelated, includeSyncHistory } = queryValidation.data;

    // Get platform
    const platform = await prisma.platform.findUnique({
      where: { id },
    });

    if (!platform) {
      throw new NotFoundError('Platform');
    }

    // Build platform details
    const platformDetails: PlatformDetails = {
      ...platform,
      categoryName: getCategoryDisplayName(platform.category),
    };

    // Get user's connection status if authenticated
    let connectionStatus: UserConnectionStatus | null = null;

    if (isAuthenticated) {
      const connection = await prisma.userPlatform.findUnique({
        where: {
          userId_platformId: { userId: userId!, platformId: id },
        },
      });

      const eligibility = connection 
        ? { canConnect: false, reason: 'Already connected' }
        : await checkConnectionEligibility(userId!, id);

      connectionStatus = {
        isConnected: !!connection,
        connection: connection ? {
          id: connection.id,
          username: connection.username,
          profileUrl: connection.profileUrl,
          isActive: connection.isActive,
          isVerified: connection.isVerified,
          verifiedAt: connection.verifiedAt,
          connectionStatus: connection.connectionStatus,
          syncStatus: connection.syncStatus,
          lastSyncedAt: connection.lastSyncedAt,
          lastSyncError: connection.lastSyncError,
          consecutiveFailures: connection.consecutiveFailures,
          autoSync: connection.autoSync,
          syncPriority: connection.syncPriority,
          cachedStats: connection.cachedStats,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
        } : null,
        canConnect: eligibility.canConnect,
        connectionReason: eligibility.reason,
      };
    }

    // Build response data
    const responseData: Record<string, unknown> = {
      platform: platformDetails,
    };

    if (connectionStatus) {
      responseData.connection = connectionStatus;
    }

    // Get stats if requested (admin or includes in query)
    if (includeStats && (isAdmin || isAuthenticated)) {
      responseData.stats = await getPlatformStats(id);
    }

    // Get related platforms if requested
    if (includeRelated) {
      responseData.relatedPlatforms = await getRelatedPlatforms(
        id,
        platform.category,
        platform.tags
      );
    }

    // Get sync history if requested and authenticated
    if (includeSyncHistory && isAuthenticated && connectionStatus?.isConnected) {
      responseData.syncHistory = await getUserSyncHistory(userId!, id);
    }

    logger.info('Platform fetched', {
      requestId,
      platformId: id,
      platformSlug: platform.slug,
      userId,
      hasConnection: connectionStatus?.isConnected,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(responseData, {
        meta: {
          requestId,
          duration: Date.now() - startTime,
        },
      }),
      requestId,
      {
        rateLimitResult,
        platformSlug: platform.slug,
        cacheAge: isAuthenticated ? 0 : CACHE_TTL,
      }
    );
  } catch (error) {
    logger.error('GET /api/platforms/[id] failed', { requestId, id }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * POST /api/platforms/[id]
 * 
 * User connection operations: connect, disconnect, update, verify, sync
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    // Authentication required
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting
    const rateLimitKey = `platforms:post:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.POST, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Validate platform exists
    const platform = await getPlatformOrThrow(platformId);

    if (!platform.isActive) {
      throw new ValidationError('Platform is not available');
    }

    if (platform.maintenanceMode) {
      throw new ValidationError(`${platform.name} is under maintenance: ${platform.maintenanceMessage || 'Please try again later'}`);
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = ConnectionOperationSchema.safeParse(body);
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
        { rateLimitResult }
      );
    }

    const { action, ...data } = validation.data;

    let result: unknown;

    switch (action) {
      case 'connect': {
        // Check eligibility
        const eligibility = await checkConnectionEligibility(userId, platformId);
        if (!eligibility.canConnect) {
          throw new ConflictError(eligibility.reason!);
        }

        // Build profile URL
        let profileUrl = data.profileUrl;
        if (!profileUrl && data.username && platform.profileUrlPattern) {
          profileUrl = platform.profileUrlPattern.replace('{username}', data.username);
        }

        // Encrypt sensitive data
        const encryptedData = {
          accessToken: data.accessToken ? encrypt(data.accessToken) : null,
          refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
          apiKey: data.apiKey ? encrypt(data.apiKey) : null,
          credentials: data.credentials 
            ? encryptJSON(data.credentials) as unknown as Prisma.InputJsonValue
            : Prisma.DbNull,
        };

        // Create connection
        const connection = await prisma.userPlatform.create({
          data: {
            userId,
            platformId,
            username: data.username,
            profileUrl,
            externalUserId: data.externalUserId,
            ...encryptedData,
            tokenExpiresAt: data.tokenExpiresAt,
            isActive: true,
            connectionStatus: 'connected',
            autoSync: data.autoSync ?? platform.supportsAutoSync,
            syncPriority: data.syncPriority ?? 0,
            notifyOnSync: data.notifyOnSync ?? false,
            notifyOnError: data.notifyOnError ?? true,
            syncStatus: 'IDLE',
          },
          include: {
            platform: {
              select: { name: true, slug: true },
            },
          },
        });

        // Update platform stats
        await prisma.platform.update({
          where: { id: platformId },
          data: { totalUsers: { increment: 1 } },
        });

        // Update subscription count
        await prisma.subscription.update({
          where: { userId },
          data: { currentPlatformCount: { increment: 1 } },
        }).catch(() => {});

        // Audit log
        await auditLogService.create({
          userId,
          action: AuditAction.CREATE,
          category: 'platform',
          entityType: 'platform_connection',
          entityId: connection.id,
          description: `Connected to ${platform.name}`,
          ipAddress: ip,
          userAgent: getUserAgent(request),
          requestId,
        });

        result = {
          action: 'connected',
          connectionId: connection.id,
          platform: {
            id: platform.id,
            name: platform.name,
            slug: platform.slug,
          },
          username: connection.username,
          profileUrl: connection.profileUrl,
        };
        break;
      }

      case 'disconnect': {
        const connection = await prisma.userPlatform.findUnique({
          where: {
            userId_platformId: { userId, platformId },
          },
        });

        if (!connection) {
          throw new NotFoundError('Platform connection');
        }

        await withTransaction(async (tx) => {
          await tx.userPlatform.delete({
            where: {
              userId_platformId: { userId, platformId },
            },
          });

          await tx.platform.update({
            where: { id: platformId },
            data: { totalUsers: { decrement: 1 } },
          });

          await tx.subscription.update({
            where: { userId },
            data: { currentPlatformCount: { decrement: 1 } },
          }).catch(() => {});
        });

        await auditLogService.create({
          userId,
          action: AuditAction.DELETE,
          category: 'platform',
          entityType: 'platform_connection',
          entityId: connection.id,
          description: `Disconnected from ${platform.name}`,
          ipAddress: ip,
          userAgent: getUserAgent(request),
          requestId,
        });

        result = {
          action: 'disconnected',
          platform: {
            id: platform.id,
            name: platform.name,
          },
        };
        break;
      }

      case 'update': {
        const connection = await prisma.userPlatform.findUnique({
          where: {
            userId_platformId: { userId, platformId },
          },
        });

        if (!connection) {
          throw new NotFoundError('Platform connection');
        }

        const updateData: Prisma.UserPlatformUpdateInput = {
          updatedAt: new Date(),
        };

        if (data.username !== undefined) updateData.username = data.username;
        if (data.profileUrl !== undefined) updateData.profileUrl = data.profileUrl;
        if (data.autoSync !== undefined) updateData.autoSync = data.autoSync;
        if (data.syncPriority !== undefined) updateData.syncPriority = data.syncPriority;
        if (data.notifyOnSync !== undefined) updateData.notifyOnSync = data.notifyOnSync;
        if (data.notifyOnError !== undefined) updateData.notifyOnError = data.notifyOnError;

        if (data.accessToken) updateData.accessToken = encrypt(data.accessToken);
        if (data.refreshToken) updateData.refreshToken = encrypt(data.refreshToken);
        if (data.apiKey) updateData.apiKey = encrypt(data.apiKey);
        if (data.credentials) {
          updateData.credentials = encryptJSON(data.credentials) as unknown as Prisma.InputJsonValue;
        }

        const updated = await prisma.userPlatform.update({
          where: {
            userId_platformId: { userId, platformId },
          },
          data: updateData,
        });

        result = {
          action: 'updated',
          connectionId: updated.id,
          platform: {
            id: platform.id,
            name: platform.name,
          },
        };
        break;
      }

      case 'verify': {
        const verified = await PlatformService.verifyConnection(userId, platformId);
        result = {
          action: 'verified',
          verified: verified.isVerified,
          verifiedAt: verified.verifiedAt,
        };
        break;
      }

      case 'sync': {
        // Import SyncService dynamically to avoid circular dependency
        const { default: SyncService } = await import('@/services/syncService');
        const syncResult = await SyncService.syncPlatform(userId, platformId, {
          triggeredBy: 'manual',
        });

        result = {
          action: 'synced',
          success: syncResult.success,
          status: syncResult.status,
          entriesAdded: syncResult.entriesAdded,
          entriesUpdated: syncResult.entriesUpdated,
          duration: syncResult.duration,
          error: syncResult.error,
        };
        break;
      }

      default:
        throw new ValidationError(`Unknown action: ${action}`);
    }

    logger.info('Platform operation completed', {
      requestId,
      userId,
      platformId,
      platformSlug: platform.slug,
      action,
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
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('POST /api/platforms/[id] failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * PUT /api/platforms/[id] - Full update (Admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    // Admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!session.user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    const adminId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting
    const rateLimitKey = `platforms:put:${adminId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.PUT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Get existing platform
    const existing = await getPlatformOrThrow(platformId);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = FullUpdatePlatformSchema.safeParse(body);
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
        { rateLimitResult }
      );
    }

    const data = validation.data;

    // Update platform
    const platform = await prisma.platform.update({
      where: { id: platformId },
      data: {
        ...data,
        dataPoints: data.dataPoints as Prisma.InputJsonValue,
        scraperConfig: data.scraperConfig as Prisma.InputJsonValue,
        oauthConfig: data.oauthConfig as Prisma.InputJsonValue,
        apiKeyConfig: data.apiKeyConfig as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    // Audit log
    await auditLogService.create({
      userId: adminId,
      action: AuditAction.UPDATE,
      category: 'admin',
      entityType: 'platform',
      entityId: platform.id,
      description: `Full update of platform "${platform.name}"`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      oldValue: { name: existing.name, isActive: existing.isActive },
      newValue: { name: platform.name, isActive: platform.isActive },
    });

    logger.info('Platform fully updated (admin)', {
      requestId,
      adminId,
      platformId,
      platformSlug: platform.slug,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          ...platform,
          categoryName: getCategoryDisplayName(platform.category),
        },
        {
          meta: {
            requestId,
            message: `Platform "${platform.name}" updated successfully`,
          },
        }
      ),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('PUT /api/platforms/[id] failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * PATCH /api/platforms/[id] - Partial update (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    // Admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!session.user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    const adminId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting
    const rateLimitKey = `platforms:patch:${adminId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.PATCH, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Get existing platform
    const existing = await getPlatformOrThrow(platformId);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = PartialUpdatePlatformSchema.safeParse(body);
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
        { rateLimitResult }
      );
    }

    const data = validation.data;

    // Build update object only with provided fields
    const updateData: Prisma.PlatformUpdateInput = {
      updatedAt: new Date(),
    };

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (['dataPoints', 'scraperConfig', 'oauthConfig', 'apiKeyConfig'].includes(key)) {
          (updateData as Record<string, unknown>)[key] = value as Prisma.InputJsonValue;
        } else {
          (updateData as Record<string, unknown>)[key] = value;
        }
      }
    });

    // Update platform
    const platform = await prisma.platform.update({
      where: { id: platformId },
      data: updateData,
    });

    // Audit log
    await auditLogService.create({
      userId: adminId,
      action: AuditAction.UPDATE,
      category: 'admin',
      entityType: 'platform',
      entityId: platform.id,
      description: `Partial update of platform "${platform.name}"`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      changes: Object.fromEntries(
        Object.entries(data)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, { old: (existing as Record<string, unknown>)[k], new: v }])
      ),
    });

    logger.info('Platform partially updated (admin)', {
      requestId,
      adminId,
      platformId,
      platformSlug: platform.slug,
      updatedFields: Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined),
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          ...platform,
          categoryName: getCategoryDisplayName(platform.category),
        },
        {
          meta: {
            requestId,
            message: `Platform "${platform.name}" updated successfully`,
          },
        }
      ),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('PATCH /api/platforms/[id] failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * DELETE /api/platforms/[id] - Delete platform (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    // Admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!session.user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    const adminId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting (strict)
    const rateLimitKey = `platforms:delete:${adminId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.DELETE, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(3600, requestId), // 1 hour
        requestId,
        { rateLimitResult }
      );
    }

    // Get existing platform
    const platform = await getPlatformOrThrow(platformId);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body - confirmation required');
    }

    const validation = DeletePlatformSchema.safeParse(body);
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
        { rateLimitResult }
      );
    }

    const { reason, migrateConnectionsTo, forceDelete } = validation.data;

    // Get connection count
    const connectionCount = await prisma.userPlatform.count({
      where: { platformId },
    });

    // Get entry count
    const entryCount = await prisma.trackerEntry.count({
      where: { platformId },
    });

    let result: {
      deleted: boolean;
      deactivated: boolean;
      connectionsMigrated?: number;
      reason?: string;
    };

    if (connectionCount > 0 || entryCount > 0) {
      if (migrateConnectionsTo) {
        // Migrate connections to another platform
        const targetPlatform = await prisma.platform.findUnique({
          where: { id: migrateConnectionsTo },
        });

        if (!targetPlatform) {
          throw new NotFoundError('Target platform for migration');
        }

        await withTransaction(async (tx) => {
          // Migrate connections
          await tx.userPlatform.updateMany({
            where: { platformId },
            data: { platformId: migrateConnectionsTo },
          });

          // Migrate entries
          await tx.trackerEntry.updateMany({
            where: { platformId },
            data: { platformId: migrateConnectionsTo },
          });

          // Update target platform stats
          await tx.platform.update({
            where: { id: migrateConnectionsTo },
            data: { totalUsers: { increment: connectionCount } },
          });

          // Delete source platform
          await tx.platform.delete({
            where: { id: platformId },
          });
        });

        result = {
          deleted: true,
          deactivated: false,
          connectionsMigrated: connectionCount,
        };
      } else if (forceDelete) {
        // Force delete with all data
        await withTransaction(async (tx) => {
          await tx.trackerEntry.deleteMany({
            where: { platformId },
          });

          await tx.syncLog.deleteMany({
            where: { platformId },
          });

          await tx.userPlatform.deleteMany({
            where: { platformId },
          });

          await tx.platform.delete({
            where: { id: platformId },
          });
        });

        result = {
          deleted: true,
          deactivated: false,
          reason: 'Force deleted with all associated data',
        };
      } else {
        // Soft delete - deactivate
        await prisma.platform.update({
          where: { id: platformId },
          data: {
            isActive: false,
            maintenanceMode: true,
            maintenanceMessage: reason || 'Platform has been discontinued',
            updatedAt: new Date(),
          },
        });

        result = {
          deleted: false,
          deactivated: true,
          reason: `Platform deactivated (${connectionCount} connections, ${entryCount} entries). Use forceDelete or migrateConnectionsTo for hard delete.`,
        };
      }
    } else {
      // No connections - safe to hard delete
      await prisma.platform.delete({
        where: { id: platformId },
      });

      result = {
        deleted: true,
        deactivated: false,
      };
    }

    // Audit log
    await auditLogService.create({
      userId: adminId,
      action: AuditAction.DELETE,
      category: 'admin',
      entityType: 'platform',
      entityId: platformId,
      description: result.deleted 
        ? `Deleted platform "${platform.name}"${result.connectionsMigrated ? ` (migrated ${result.connectionsMigrated} connections)` : ''}`
        : `Deactivated platform "${platform.name}"`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      oldValue: {
        name: platform.name,
        connectionCount,
        entryCount,
      },
    });

    logger.info('Platform deleted/deactivated (admin)', {
      requestId,
      adminId,
      platformId,
      platformSlug: platform.slug,
      deleted: result.deleted,
      deactivated: result.deactivated,
      connectionCount,
      entryCount,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(result, {
        meta: {
          requestId,
          message: result.deleted 
            ? `Platform "${platform.name}" deleted successfully`
            : `Platform "${platform.name}" deactivated`,
        },
      }),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('DELETE /api/platforms/[id] failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';