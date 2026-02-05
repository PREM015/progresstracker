// src/app/api/platforms/connected/route.ts
/**
 * Connected Platforms API
 *
 * @route GET /api/platforms/connected - Get user's connected platforms with details
 * @route HEAD /api/platforms/connected - Get connection count
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError } from '@/lib/apiError';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import PlatformService from '@/services/platformService';
import type { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, no-cache',
};

const log = logger.child({ route: 'platforms/connected' });

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const QuerySchema = z.object({
  activeOnly: z.coerce.boolean().default(false),
  includeCustom: z.coerce.boolean().default(true),
  category: z.string().optional(),
  syncStatus: z
    .enum([
      'IDLE',
      'PENDING',
      'IN_PROGRESS',
      'SUCCESS',
      'PARTIAL',
      'FAILED',
      'CANCELLED',
      'RATE_LIMITED',
    ])
    .optional(),
  sortBy: z.enum(['name', 'lastSynced', 'createdAt', 'syncStatus']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
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

type ConnectionWithPlatform = {
  id: string;
  platformId: string;
  platform: {
    id: string;
    name: string;
    slug: string;
    displayName: string | null;
    category: string;
    icon: string | null;
    color: string | null;
    supportsAutoSync: boolean;
  };
  username: string | null;
  profileUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
  connectionStatus: string;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  nextSyncAt: Date | null;
  autoSync: boolean;
  cachedStats: unknown;
  statsUpdatedAt: Date | null;
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
};

function sortConnections(
  connections: ConnectionWithPlatform[],
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): ConnectionWithPlatform[] {
  return [...connections].sort((a, b) => {
    let aValue: string | Date | null;
    let bValue: string | Date | null;

    switch (sortBy) {
      case 'name':
        aValue = a.platform.name;
        bValue = b.platform.name;
        break;
      case 'lastSynced':
        aValue = a.lastSyncedAt;
        bValue = b.lastSyncedAt;
        break;
      case 'createdAt':
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
      case 'syncStatus':
        aValue = a.syncStatus;
        bValue = b.syncStatus;
        break;
      default:
        aValue = a.platform.name;
        bValue = b.platform.name;
    }

    if (aValue === null) return 1;
    if (bValue === null) return -1;
    if (aValue === bValue) return 0;

    const comparison = aValue < bValue ? -1 : 1;
    return sortOrder === 'asc' ? comparison : -comparison;
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
 * HEAD - Get connection count
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const stats = await PlatformService.getConnectionStats(session.user.id);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Connections', String(stats.connected));
    response.headers.set('X-Total-Available', String(stats.total));

    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET /api/platforms/connected
 *
 * Get user's connected platforms with filtering and sorting
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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
    const rateLimitKey = `platforms:connected:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Parse and validate query parameters
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

    const query = queryValidation.data;

    // Get connected platforms
    const { connections, customPlatforms } = await PlatformService.getUserConnectedPlatforms(
      userId,
      {
        activeOnly: query.activeOnly,
        includeCustom: query.includeCustom,
      }
    );

    // Type assertion for connections
    let filteredConnections = connections as unknown as ConnectionWithPlatform[];

    // Filter by category
    if (query.category) {
      const categoryUpper = query.category.toUpperCase();
      filteredConnections = filteredConnections.filter(
        (c) => c.platform.category === categoryUpper
      );
    }

    // Filter by sync status
    if (query.syncStatus) {
      filteredConnections = filteredConnections.filter(
        (c) => c.syncStatus === query.syncStatus
      );
    }

    // Sort connections
    filteredConnections = sortConnections(
      filteredConnections,
      query.sortBy,
      query.sortOrder
    );

    // Format response
    const formattedConnections = filteredConnections.map((conn) => ({
      id: conn.id,
      platformId: conn.platformId,
      platform: {
        id: conn.platform.id,
        name: conn.platform.name,
        slug: conn.platform.slug,
        displayName: conn.platform.displayName,
        category: conn.platform.category,
        icon: conn.platform.icon,
        color: conn.platform.color,
        supportsAutoSync: conn.platform.supportsAutoSync,
      },
      username: conn.username,
      profileUrl: conn.profileUrl,
      isActive: conn.isActive,
      isVerified: conn.isVerified,
      verifiedAt: conn.verifiedAt,
      connectionStatus: conn.connectionStatus,
      syncStatus: conn.syncStatus,
      lastSyncedAt: conn.lastSyncedAt,
      lastSyncError: conn.lastSyncError,
      nextSyncAt: conn.nextSyncAt,
      autoSync: conn.autoSync,
      cachedStats: conn.cachedStats,
      statsUpdatedAt: conn.statsUpdatedAt,
      consecutiveFailures: conn.consecutiveFailures,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));

    // Get connection stats
    const stats = await PlatformService.getConnectionStats(userId);

    log.info('Connected platforms fetched', {
      userId,
      count: formattedConnections.length,
      customCount: customPlatforms.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          connections: formattedConnections,
          customPlatforms: query.includeCustom ? customPlatforms : [],
          stats,
          summary: {
            total: formattedConnections.length + customPlatforms.length,
            standard: formattedConnections.length,
            custom: customPlatforms.length,
            active: formattedConnections.filter((c) => c.isActive).length,
            syncing: formattedConnections.filter((c) => c.syncStatus === 'IN_PROGRESS').length,
            failing: formattedConnections.filter((c) => c.consecutiveFailures >= 3).length,
          },
        },
        { meta: { requestId, duration: Date.now() - startTime } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Error fetching connected platforms', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';