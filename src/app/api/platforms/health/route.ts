// src/app/api/platforms/health/route.ts
/**
 * Platform Health Check API
 * 
 * Public endpoint to check health status of all platforms.
 * Supports filtering, caching, and detailed metrics.
 * 
 * @route GET /api/platforms/health - Get health status of all platforms
 * @route HEAD /api/platforms/health - Quick availability check
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { PlatformCategory, SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT_PUBLIC = 30; // 30 requests per minute for public
const RATE_LIMIT_AUTH = 60; // 60 requests per minute for authenticated users
const CACHE_TTL_SECONDS = 60; // Cache health data for 1 minute

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Health thresholds
const HEALTH_THRESHOLDS = {
  HEALTHY_MIN_SUCCESS_RATE: 95,
  DEGRADED_MIN_SUCCESS_RATE: 80,
  STALE_HEALTH_CHECK_HOURS: 24,
} as const;

// =============================================================================
// TYPES
// =============================================================================

interface PlatformHealthStatus {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  category: PlatformCategory;
  status: 'healthy' | 'degraded' | 'down' | 'maintenance' | 'unknown';
  statusMessage: string | null;
  successRate: number;
  lastHealthCheck: Date | null;
  isStale: boolean;
  totalUsers: number;
  avgSyncDuration: number | null;
}

interface HealthSummary {
  healthy: number;
  degraded: number;
  down: number;
  maintenance: number;
  unknown: number;
  total: number;
  percentage: number;
  overallStatus: 'healthy' | 'degraded' | 'down';
}

interface SyncStatistics {
  total: number;
  successful: number;
  failed: number;
  partial: number;
  inProgress: number;
  successRate: number;
  avgDuration: number | null;
}

interface CategoryHealth {
  category: PlatformCategory;
  displayName: string;
  platformCount: number;
  healthyCount: number;
  percentage: number;
}

interface HealthCheckResponse {
  platforms: PlatformHealthStatus[];
  summary: HealthSummary;
  syncStats: SyncStatistics;
  categoryHealth: CategoryHealth[];
  lastUpdated: string;
  cacheAge: number;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const QuerySchema = z.object({
  category: z.nativeEnum(PlatformCategory).optional(),
  status: z.enum(['healthy', 'degraded', 'down', 'maintenance', 'unknown']).optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
  detailed: z.coerce.boolean().optional().default(false),
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
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
    cacheMaxAge?: number;
  }
): NextResponse {
  // Security and CORS headers
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  response.headers.set('X-Request-ID', requestId);

  // Rate limit headers
  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  // Cache headers for public endpoint
  if (options?.cacheMaxAge) {
    response.headers.set(
      'Cache-Control',
      `public, max-age=${options.cacheMaxAge}, stale-while-revalidate=${options.cacheMaxAge * 2}`
    );
  }

  return response;
}

/**
 * Determine platform status from health data
 */
function determinePlatformStatus(platform: {
  healthStatus: string | null;
  maintenanceMode: boolean;
  successRate: number;
  lastHealthCheck: Date | null;
}): 'healthy' | 'degraded' | 'down' | 'maintenance' | 'unknown' {
  if (platform.maintenanceMode) {
    return 'maintenance';
  }

  if (platform.healthStatus === 'down' || platform.successRate < HEALTH_THRESHOLDS.DEGRADED_MIN_SUCCESS_RATE) {
    return 'down';
  }

  if (platform.healthStatus === 'degraded' || platform.successRate < HEALTH_THRESHOLDS.HEALTHY_MIN_SUCCESS_RATE) {
    return 'degraded';
  }

  if (platform.healthStatus === 'healthy' && platform.successRate >= HEALTH_THRESHOLDS.HEALTHY_MIN_SUCCESS_RATE) {
    return 'healthy';
  }

  if (!platform.healthStatus || platform.healthStatus === 'unknown') {
    return 'unknown';
  }

  return 'healthy';
}

/**
 * Check if health check data is stale
 */
function isHealthCheckStale(lastCheck: Date | null): boolean {
  if (!lastCheck) return true;
  
  const staleThreshold = new Date(
    Date.now() - HEALTH_THRESHOLDS.STALE_HEALTH_CHECK_HOURS * 60 * 60 * 1000
  );
  
  return lastCheck < staleThreshold;
}

/**
 * Get category display name
 */
function getCategoryDisplayName(category: PlatformCategory): string {
  const displayNames: Record<PlatformCategory, string> = {
    DSA: 'Data Structures & Algorithms',
    JOB: 'Job Boards',
    GIT: 'Version Control',
    LEARNING: 'Learning Platforms',
    HACKATHON: 'Hackathons',
    OPENSOURCE: 'Open Source',
    COMPANY: 'Company Portals',
    DESIGN: 'Design',
    DATA_SCIENCE: 'Data Science',
    OTHER: 'Other',
  };
  return displayNames[category] ?? category;
}

/**
 * Determine overall system status from summary
 */
function determineOverallStatus(summary: Omit<HealthSummary, 'overallStatus'>): 'healthy' | 'degraded' | 'down' {
  const { healthy, degraded, down, total } = summary;
  
  if (total === 0) return 'healthy';
  
  const downPercentage = (down / total) * 100;
  const degradedPercentage = ((degraded + down) / total) * 100;
  
  if (downPercentage >= 50) return 'down';
  if (degradedPercentage >= 30 || downPercentage >= 10) return 'degraded';
  
  return 'healthy';
}

// =============================================================================
// DATA FETCHING
// =============================================================================

/**
 * Fetch platform health data
 */
async function fetchPlatformHealth(options: {
  category?: PlatformCategory;
  includeInactive: boolean;
}): Promise<PlatformHealthStatus[]> {
  const where: Record<string, unknown> = {};
  
  if (!options.includeInactive) {
    where.isActive = true;
  }
  
  if (options.category) {
    where.category = options.category;
  }

  const platforms = await prisma.platform.findMany({
    where,
    select: {
      id: true,
      slug: true,
      name: true,
      displayName: true,
      category: true,
      healthStatus: true,
      healthMessage: true,
      lastHealthCheck: true,
      maintenanceMode: true,
      maintenanceMessage: true,
      successRate: true,
      totalUsers: true,
      avgSyncDuration: true,
      isActive: true,
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
  });

  return platforms.map((platform) => {
    const status = determinePlatformStatus({
      healthStatus: platform.healthStatus,
      maintenanceMode: platform.maintenanceMode,
      successRate: platform.successRate,
      lastHealthCheck: platform.lastHealthCheck,
    });

    const statusMessage = platform.maintenanceMode
      ? platform.maintenanceMessage
      : platform.healthMessage;

    return {
      id: platform.id,
      slug: platform.slug,
      name: platform.name,
      displayName: platform.displayName,
      category: platform.category,
      status,
      statusMessage,
      successRate: Math.round(platform.successRate * 100) / 100,
      lastHealthCheck: platform.lastHealthCheck,
      isStale: isHealthCheckStale(platform.lastHealthCheck),
      totalUsers: platform.totalUsers,
      avgSyncDuration: platform.avgSyncDuration,
    };
  });
}

/**
 * Calculate health summary from platforms
 */
function calculateHealthSummary(platforms: PlatformHealthStatus[]): HealthSummary {
  const counts = {
    healthy: 0,
    degraded: 0,
    down: 0,
    maintenance: 0,
    unknown: 0,
  };

  for (const platform of platforms) {
    counts[platform.status]++;
  }

  const total = platforms.length;
  const percentage = total > 0 
    ? Math.round((counts.healthy / total) * 100) 
    : 100;

  const summaryWithoutOverall = {
    ...counts,
    total,
    percentage,
  };

  return {
    ...summaryWithoutOverall,
    overallStatus: determineOverallStatus(summaryWithoutOverall),
  };
}

/**
 * Fetch sync statistics for last 24 hours
 */
async function fetchSyncStatistics(): Promise<SyncStatistics> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [statusCounts, avgDuration] = await Promise.all([
    prisma.syncLog.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: since },
      },
      _count: true,
    }),
    prisma.syncLog.aggregate({
      where: {
        createdAt: { gte: since },
        status: 'SUCCESS',
        duration: { not: null },
      },
      _avg: { duration: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  let total = 0;

  for (const item of statusCounts) {
    counts[item.status] = item._count;
    total += item._count;
  }

  const successful = counts[SyncStatus.SUCCESS] || 0;
  const failed = counts[SyncStatus.FAILED] || 0;
  const partial = counts[SyncStatus.PARTIAL] || 0;
  const inProgress = counts[SyncStatus.IN_PROGRESS] || 0;

  return {
    total,
    successful,
    failed,
    partial,
    inProgress,
    successRate: total > 0 ? Math.round((successful / total) * 100 * 100) / 100 : 100,
    avgDuration: avgDuration._avg.duration 
      ? Math.round(avgDuration._avg.duration) 
      : null,
  };
}

/**
 * Calculate health by category
 */
function calculateCategoryHealth(platforms: PlatformHealthStatus[]): CategoryHealth[] {
  const categoryMap = new Map<PlatformCategory, { total: number; healthy: number }>();

  for (const platform of platforms) {
    const existing = categoryMap.get(platform.category) || { total: 0, healthy: 0 };
    existing.total++;
    if (platform.status === 'healthy') {
      existing.healthy++;
    }
    categoryMap.set(platform.category, existing);
  }

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      displayName: getCategoryDisplayName(category),
      platformCount: data.total,
      healthyCount: data.healthy,
      percentage: data.total > 0 
        ? Math.round((data.healthy / data.total) * 100) 
        : 100,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
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
 * HEAD - Quick availability check
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    // Quick database connectivity check
    const count = await prisma.platform.count({
      where: { isActive: true },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Platform-Count', String(count));
    response.headers.set('X-Health-Status', 'ok');
    
    return addHeaders(response, requestId, { cacheMaxAge: 30 });
  } catch (error) {
    logger.error('Health HEAD check failed', { requestId }, error);
    
    const response = new NextResponse(null, { status: 503 });
    response.headers.set('X-Health-Status', 'error');
    
    return addHeaders(response, requestId);
  }
}

/**
 * GET /api/platforms/health
 * 
 * Get health status of all platforms with optional filtering.
 * 
 * Query Parameters:
 * - category: Filter by platform category
 * - status: Filter by health status
 * - includeInactive: Include inactive platforms (default: false)
 * - detailed: Include detailed metrics (default: false, requires auth)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Check for authenticated user (for detailed metrics)
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session?.user?.id;
    const isAdmin = session?.user?.role === 'admin';

    // Rate limiting
    const ip = getClientIp(request);
    const rateLimit = isAuthenticated ? RATE_LIMIT_AUTH : RATE_LIMIT_PUBLIC;
    const rateLimitKey = `platforms:health:${isAuthenticated ? session.user.id : ip}`;
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
      category: searchParams.get('category') || undefined,
      status: searchParams.get('status') || undefined,
      includeInactive: searchParams.get('includeInactive') || undefined,
      detailed: searchParams.get('detailed') || undefined,
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

    const { category, status, includeInactive, detailed } = queryValidation.data;

    // Only allow inactive platforms for admins
    const shouldIncludeInactive = includeInactive && isAdmin;

    // Fetch data in parallel
    const [platforms, syncStats] = await Promise.all([
      fetchPlatformHealth({
        category,
        includeInactive: shouldIncludeInactive,
      }),
      fetchSyncStatistics(),
    ]);

    // Filter by status if specified
    const filteredPlatforms = status
      ? platforms.filter((p) => p.status === status)
      : platforms;

    // Calculate summaries
    const summary = calculateHealthSummary(filteredPlatforms);
    const categoryHealth = calculateCategoryHealth(filteredPlatforms);

    // Build response
    const response: HealthCheckResponse = {
      platforms: filteredPlatforms,
      summary,
      syncStats,
      categoryHealth,
      lastUpdated: new Date().toISOString(),
      cacheAge: 0,
    };

    // Add detailed metrics for authenticated users
    const responseData = detailed && isAuthenticated
      ? response
      : {
          ...response,
          // Simplified response for public
          platforms: response.platforms.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            displayName: p.displayName,
            category: p.category,
            status: p.status,
            statusMessage: p.statusMessage,
          })),
        };

    logger.info('Platform health check completed', {
      requestId,
      category,
      status,
      platformCount: filteredPlatforms.length,
      healthyCount: summary.healthy,
      overallStatus: summary.overallStatus,
      isAuthenticated,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(responseData, {
        meta: {
          requestId,
          duration: Date.now() - startTime,
          filtered: !!(category || status),
        },
      }),
      requestId,
      {
        rateLimitResult,
        cacheMaxAge: CACHE_TTL_SECONDS,
      }
    );
  } catch (error) {
    logger.error('GET /api/platforms/health failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';