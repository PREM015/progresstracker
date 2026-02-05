// src/app/api/platforms/categories/route.ts
/**
 * Platform Categories API
 *
 * @route GET /api/platforms/categories - Get all categories with platform counts
 * @route HEAD /api/platforms/categories - Check resource availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { cache } from '@/lib/redis';
import { PlatformCategory } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60; // 60 requests per minute (public endpoint)
const CACHE_TTL = 60 * 60; // 1 hour
const CACHE_KEY = 'platforms:categories:v2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
};

// =============================================================================
// TYPES
// =============================================================================

interface CategoryMetadata {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  prismaValue: PlatformCategory;
}

interface CategoryWithCounts extends CategoryMetadata {
  platformCount: number;
  userCount: number;
  avgUsersPerPlatform: number;
}

interface CategoriesResponse {
  categories: CategoryWithCounts[];
  summary: {
    totalCategories: number;
    totalPlatforms: number;
    totalUsers: number;
    avgPlatformsPerCategory: number;
  };
}

// =============================================================================
// CATEGORY METADATA
// =============================================================================

const CATEGORY_METADATA: CategoryMetadata[] = [
  {
    id: 'dsa',
    name: 'DSA & Competitive',
    slug: 'dsa',
    description: 'Data structures, algorithms, and competitive programming',
    icon: 'Code',
    color: '#10B981',
    order: 1,
    prismaValue: 'DSA',
  },
  {
    id: 'git',
    name: 'Version Control',
    slug: 'git',
    description: 'Git hosting and collaboration platforms',
    icon: 'GitBranch',
    color: '#6366F1',
    order: 2,
    prismaValue: 'GIT',
  },
  {
    id: 'learning',
    name: 'Learning',
    slug: 'learning',
    description: 'Online courses and educational platforms',
    icon: 'GraduationCap',
    color: '#F59E0B',
    order: 3,
    prismaValue: 'LEARNING',
  },
  {
    id: 'job',
    name: 'Job Boards',
    slug: 'job',
    description: 'Job search and career platforms',
    icon: 'Briefcase',
    color: '#EF4444',
    order: 4,
    prismaValue: 'JOB',
  },
  {
    id: 'hackathon',
    name: 'Hackathons',
    slug: 'hackathon',
    description: 'Hackathon and competition platforms',
    icon: 'Trophy',
    color: '#8B5CF6',
    order: 5,
    prismaValue: 'HACKATHON',
  },
  {
    id: 'opensource',
    name: 'Open Source',
    slug: 'opensource',
    description: 'Open source contribution programs',
    icon: 'Heart',
    color: '#EC4899',
    order: 6,
    prismaValue: 'OPENSOURCE',
  },
  {
    id: 'company',
    name: 'Company Portals',
    slug: 'company',
    description: 'Direct company career pages',
    icon: 'Building',
    color: '#06B6D4',
    order: 7,
    prismaValue: 'COMPANY',
  },
  {
    id: 'design',
    name: 'Design',
    slug: 'design',
    description: 'Design portfolio and showcase platforms',
    icon: 'Palette',
    color: '#F97316',
    order: 8,
    prismaValue: 'DESIGN',
  },
  {
    id: 'data_science',
    name: 'Data Science',
    slug: 'data-science',
    description: 'Data science and ML platforms',
    icon: 'BarChart',
    color: '#14B8A6',
    order: 9,
    prismaValue: 'DATA_SCIENCE',
  },
  {
    id: 'other',
    name: 'Other',
    slug: 'other',
    description: 'Other platforms',
    icon: 'MoreHorizontal',
    color: '#6B7280',
    order: 10,
    prismaValue: 'OTHER',
  },
];

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

const log = logger.child({ route: 'platforms/categories' });

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
 * HEAD - Check resource availability
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const count = await prisma.platform.count({ where: { isActive: true } });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Categories', String(CATEGORY_METADATA.length));
    response.headers.set('X-Total-Platforms', String(count));

    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET /api/platforms/categories
 * 
 * Get all categories with platform counts
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitKey = `platforms:categories:${ip}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check cache first
    try {
      const cached = await cache.get<CategoriesResponse>(CACHE_KEY);
      if (cached) {
        log.debug('Categories fetched from cache', { requestId });
        
        return addHeaders(
          apiResponse.success(cached, {
            meta: { requestId, cached: true, duration: Date.now() - startTime },
          }),
          requestId,
          rateLimitResult
        );
      }
    } catch (cacheError) {
      log.warn('Cache read failed, continuing without cache', { requestId });
    }

    // Fetch from database
    const [platformCounts, userCounts] = await Promise.all([
      prisma.platform.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: { id: true },
      }),
      prisma.platform.groupBy({
        by: ['category'],
        where: { isActive: true },
        _sum: { totalUsers: true },
      }),
    ]);

    // Merge with category metadata
    const categoriesWithCounts: CategoryWithCounts[] = CATEGORY_METADATA.map((cat) => {
      const platformCount = platformCounts.find(
        (pc) => pc.category === cat.prismaValue
      )?._count.id || 0;

      const userCount = userCounts.find(
        (uc) => uc.category === cat.prismaValue
      )?._sum.totalUsers || 0;

      return {
        ...cat,
        platformCount,
        userCount,
        avgUsersPerPlatform: platformCount > 0 ? Math.round(userCount / platformCount) : 0,
      };
    });

    // Sort by order
    categoriesWithCounts.sort((a, b) => a.order - b.order);

    // Calculate totals
    const totalPlatforms = platformCounts.reduce((sum, pc) => sum + pc._count.id, 0);
    const totalUsers = userCounts.reduce((sum, uc) => sum + (uc._sum.totalUsers || 0), 0);

    const payload: CategoriesResponse = {
      categories: categoriesWithCounts,
      summary: {
        totalCategories: categoriesWithCounts.length,
        totalPlatforms,
        totalUsers,
        avgPlatformsPerCategory: categoriesWithCounts.length > 0
          ? Math.round(totalPlatforms / categoriesWithCounts.length)
          : 0,
      },
    };

    // Cache the result
    try {
      await cache.set(CACHE_KEY, payload, CACHE_TTL);
    } catch (cacheError) {
      log.warn('Cache write failed', { requestId });
    }

    log.info('Categories fetched', {
      requestId,
      categoriesCount: categoriesWithCounts.length,
      totalPlatforms,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(payload, {
        meta: { requestId, cached: false, duration: Date.now() - startTime },
      }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Error fetching categories', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';