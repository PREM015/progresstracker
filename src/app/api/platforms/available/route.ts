// src/app/api/platforms/available/route.ts
/**
 * Available Platforms API
 * 
 * Provides discovery of platforms that users can connect to their account.
 * Includes smart recommendations, filtering, search, and comparison features.
 * 
 * @route GET  /api/platforms/available - Get available platforms with filtering
 * @route POST /api/platforms/available - Get personalized recommendations
 * @route HEAD /api/platforms/available - Quick count of available platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, paginationArgs, buildPaginationResponse } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError } from '@/lib/apiError';
import { PlatformCategory, AuthType, Prisma } from '@prisma/client';
import { getCategoryDisplayName, CategoryMap, PlatformCategoryId } from '@/types/platform';




// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMITS = {
  GET: 60,   // 60 requests per minute
  POST: 30,  // 30 recommendation requests per minute
} as const;

const CACHE_TTL = 300; // 5 minutes cache for platform list

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Default sort options
const SORT_OPTIONS = {
  NAME: 'name',
  POPULARITY: 'popularity',
  CATEGORY: 'category',
  RECENT: 'recent',
  RECOMMENDED: 'recommended',
} as const;

// =============================================================================
// TYPES
// =============================================================================

interface PlatformWithStats {
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
  
  // Capabilities
  authType: AuthType;
  supportsAutoSync: boolean;
  supportsOAuth: boolean;
  supportsApiKey: boolean;
  requiresCredentials: boolean;
  
  // URLs
  website: string | null;
  setupGuideUrl: string | null;
  helpArticleUrl: string | null;
  
  // Stats
  totalUsers: number;
  popularity: number;
  successRate: number;
  
  // Status
  isActive: boolean;
  isBeta: boolean;
  maintenanceMode: boolean;
  
  // Recommendation
  recommendationScore?: number;
  similarPlatforms?: string[];
}

interface CategoryGroup {
  category: PlatformCategory;
  categoryId: PlatformCategoryId;
  displayName: string;
  icon?: string;
  platforms: PlatformWithStats[];
  count: number;
}

interface RecommendationResult {
  platform: PlatformWithStats;
  score: number;
  reasons: string[];
  similarTo?: string[];
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const AvailableQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  
  // Filtering
  category: z.string().optional(),
  categories: z.string().optional(), // Comma-separated
  authType: z.nativeEnum(AuthType).optional(),
  supportsAutoSync: z.coerce.boolean().optional(),
  supportsOAuth: z.coerce.boolean().optional(),
  tags: z.string().optional(), // Comma-separated
  
  // Search
  search: z.string().min(1).max(100).optional(),
  
  // Sorting
  sortBy: z.enum([
    SORT_OPTIONS.NAME,
    SORT_OPTIONS.POPULARITY,
    SORT_OPTIONS.CATEGORY,
    SORT_OPTIONS.RECENT,
  ]).default(SORT_OPTIONS.NAME),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  
  // Display options
  includeBeta: z.coerce.boolean().default(false),
  groupByCategory: z.coerce.boolean().default(false),
  includeStats: z.coerce.boolean().default(true),
  
  // Special filters
  popular: z.coerce.boolean().optional(), // Only show popular platforms
  recommended: z.coerce.boolean().optional(), // Show recommended first
});

const RecommendationSchema = z.object({
  limit: z.number().int().min(1).max(20).default(5),
  categories: z.array(z.nativeEnum(PlatformCategory)).optional(),
  excludePlatformIds: z.array(z.string().cuid()).optional(),
  includeReason: z.boolean().default(true),
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
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
    cacheAge?: number;
  }
): NextResponse {
  // Security and CORS headers
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('X-Request-ID', requestId);

  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  if (options?.cacheAge !== undefined) {
    response.headers.set(
      'Cache-Control',
      `public, max-age=${options.cacheAge}, stale-while-revalidate=${options.cacheAge * 2}`
    );
    response.headers.set('X-Cache-TTL', String(options.cacheAge));
  }

  return response;
}

/**
 * Parse comma-separated values
 */
function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(v => v.trim()).filter(Boolean);
}

/**
 * Normalize category to Prisma enum
 */
function normalizeCategory(category: string): PlatformCategory | null {
  const upperCategory = category.toUpperCase();
  if (Object.values(PlatformCategory).includes(upperCategory as PlatformCategory)) {
    return upperCategory as PlatformCategory;
  }
  
const mapped = CategoryMap[category.toLowerCase() as PlatformCategoryId];

  return mapped || null;
}

/**
 * Calculate platform popularity score
 */
function calculatePopularity(platform: {
  totalUsers: number;
  successRate: number;
  createdAt: Date;
}): number {
  const userScore = Math.log(platform.totalUsers + 1) * 10;
  const successScore = platform.successRate / 10;
  const ageScore = Math.max(0, 10 - (Date.now() - platform.createdAt.getTime()) / (365 * 24 * 60 * 60 * 1000));
  
  return Math.round(userScore + successScore + ageScore);
}

/**
 * Calculate recommendation score based on user activity
 */
async function calculateRecommendationScore(
  userId: string,
  platformId: string,
  userCategories: Map<PlatformCategory, number>
): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let score = 0;

  // Get platform details
  const platform = await prisma.platform.findUnique({
    where: { id: platformId },
    select: {
      category: true,
      totalUsers: true,
      successRate: true,
      tags: true,
    },
  });

  if (!platform) {
    return { score: 0, reasons: [] };
  }

  // Category match (highest weight)
  const categoryActivity = userCategories.get(platform.category) || 0;
  if (categoryActivity > 0) {
    score += 50;
    reasons.push(`You're active in ${getCategoryDisplayName(platform.category)}`);
  }

  // Popularity (medium weight)
  if (platform.totalUsers > 1000) {
    score += 20;
    reasons.push('Popular among users');
  }

  // Success rate (medium weight)
  if (platform.successRate > 95) {
    score += 15;
    reasons.push('High reliability');
  }

  // Related tags
  const userPlatforms = await prisma.userPlatform.findMany({
    where: { userId },
    include: {
      platform: {
        select: { tags: true },
      },
    },
  });

  const userTags = new Set(
    userPlatforms.flatMap(up => up.platform.tags)
  );

  const matchingTags = platform.tags.filter(tag => userTags.has(tag));
  if (matchingTags.length > 0) {
    score += matchingTags.length * 5;
    reasons.push(`Related to your interests: ${matchingTags.join(', ')}`);
  }

  return { score, reasons };
}

/**
 * Group platforms by category
 */
function groupByCategory(platforms: PlatformWithStats[]): CategoryGroup[] {
  const groups = new Map<PlatformCategory, PlatformWithStats[]>();

  for (const platform of platforms) {
    const existing = groups.get(platform.category) || [];
    existing.push(platform);
    groups.set(platform.category, existing);
  }

  return Array.from(groups.entries()).map(([category, platforms]) => ({
    category,
    categoryId: Object.entries(  CategoryMap, ).find(([, val]) => val === category)?.[0] as PlatformCategoryId,
    displayName: getCategoryDisplayName(category),
    platforms,
    count: platforms.length,
  })).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Find similar platforms based on category and tags
 */
async function findSimilarPlatforms(
  platformId: string,
  limit: number = 3
): Promise<string[]> {
  const platform = await prisma.platform.findUnique({
    where: { id: platformId },
    select: {
      category: true,
      tags: true,
    },
  });

  if (!platform) return [];

  const similar = await prisma.platform.findMany({
    where: {
      id: { not: platformId },
      isActive: true,
      OR: [
        { category: platform.category },
        { tags: { hasSome: platform.tags } },
      ],
    },
    select: { id: true },
    take: limit,
  });

  return similar.map(p => p.id);
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
 * HEAD - Quick count check
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    logger.info('HEAD /api/platforms/available', { request });

    // Authentication
    const session = await getServerSession(authOptions);
    
    let availableCount: number;
    
    if (session?.user?.id) {
      // Count platforms not connected
      const connectedCount = await prisma.userPlatform.count({
        where: { userId: session.user.id },
      });
      
      const totalCount = await prisma.platform.count({
        where: { isActive: true },
      });
      
      availableCount = totalCount - connectedCount;
    } else {
      // Count all active platforms for non-authenticated
      availableCount = await prisma.platform.count({
        where: { isActive: true },
      });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Available-Count', String(availableCount));

    return addHeaders(response, requestId, { cacheAge: CACHE_TTL });
  } catch (error) {
    logger.error('HEAD /api/platforms/available failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET /api/platforms/available
 * 
 * Get available platforms with advanced filtering, search, and sorting
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication (optional - public endpoint with enhanced features for auth users)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const isAuthenticated = !!userId;

    // Rate limiting
    const rateLimitKey = isAuthenticated 
      ? `platforms:available:${userId}`
      : `platforms:available:${request.headers.get('x-forwarded-for') || 'anon'}`;
    
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.GET, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = AvailableQuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      category: searchParams.get('category') || undefined,
      categories: searchParams.get('categories') || undefined,
      authType: searchParams.get('authType') || undefined,
      supportsAutoSync: searchParams.get('supportsAutoSync') || undefined,
      supportsOAuth: searchParams.get('supportsOAuth') || undefined,
      tags: searchParams.get('tags') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
      includeBeta: searchParams.get('includeBeta') || undefined,
      groupByCategory: searchParams.get('groupByCategory') || undefined,
      includeStats: searchParams.get('includeStats') || undefined,
      popular: searchParams.get('popular') || undefined,
      recommended: searchParams.get('recommended') || undefined,
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

    const query = queryValidation.data;

    // Get connected platform IDs if authenticated
    let connectedPlatformIds: string[] = [];
    const userCategories = new Map<PlatformCategory, number>();

    if (isAuthenticated) {
      const connected = await prisma.userPlatform.findMany({
        where: { userId },
        select: {
          platformId: true,
          platform: {
            select: { category: true },
          },
        },
      });

      connectedPlatformIds = connected.map(p => p.platformId);

      // Count user's activity by category
      const categoryStats = await prisma.trackerEntry.groupBy({
        by: ['category'],
        where: {
          userId,
          category: { not: null },
        },
        _count: true,
      });

      for (const stat of categoryStats) {
        if (stat.category) {
          userCategories.set(stat.category, stat._count);
        }
      }
    }

    // Build where clause
    const where: Prisma.PlatformWhereInput = {
      isActive: true,
      id: connectedPlatformIds.length > 0 
        ? { notIn: connectedPlatformIds }
        : undefined,
    };

    if (!query.includeBeta) {
      where.isBeta = false;
    }

    // Category filter
    if (query.category) {
      const normalized = normalizeCategory(query.category);
      if (normalized) {
        where.category = normalized;
      }
    }

    // Multiple categories
    if (query.categories) {
      const categoryList = parseCommaSeparated(query.categories)
        .map(normalizeCategory)
        .filter(Boolean) as PlatformCategory[];
      
      if (categoryList.length > 0) {
        where.category = { in: categoryList };
      }
    }

    // Auth type
    if (query.authType) {
      where.authType = query.authType;
    }

    // Capabilities
    if (query.supportsAutoSync !== undefined) {
      where.supportsAutoSync = query.supportsAutoSync;
    }

    if (query.supportsOAuth !== undefined) {
      where.supportsOAuth = query.supportsOAuth;
    }

    // Tags
    if (query.tags) {
      const tagList = parseCommaSeparated(query.tags);
      if (tagList.length > 0) {
        where.tags = { hasSome: tagList };
      }
    }

    // Search
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search.toLowerCase() } },
      ];
    }

    // Popular filter
    if (query.popular) {
      where.totalUsers = { gte: 100 };
    }

    // Build order by
    let orderBy: Prisma.PlatformOrderByWithRelationInput | Prisma.PlatformOrderByWithRelationInput[];

    if (query.sortBy === SORT_OPTIONS.POPULARITY) {
      orderBy = { totalUsers: query.sortOrder };
    } else if (query.sortBy === SORT_OPTIONS.CATEGORY) {
      orderBy = [
        { category: query.sortOrder },
        { name: 'asc' },
      ];
    } else if (query.sortBy === SORT_OPTIONS.RECENT) {
      orderBy = { createdAt: 'desc' };
    } else {
      orderBy = { name: query.sortOrder };
    }

    // Fetch platforms
    const [platforms, total] = await Promise.all([
      prisma.platform.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          displayName: true,
          description: true,
          category: true,
          subcategory: true,
          tags: true,
          icon: true,
          logo: true,
          color: true,
          authType: true,
          supportsAutoSync: true,
          supportsOAuth: true,
          supportsApiKey: true,
          requiresCredentials: true,
          website: true,
          setupGuideUrl: true,
          helpArticleUrl: true,
          totalUsers: true,
          successRate: true,
          isActive: true,
          isBeta: true,
          maintenanceMode: true,
          createdAt: true,
        },
        orderBy,
        ...paginationArgs(query.page, query.limit),
      }),
      prisma.platform.count({ where }),
    ]);

    // Transform and enhance platforms
    let enhancedPlatforms: PlatformWithStats[] = await Promise.all(
      platforms.map(async (platform) => {
        const popularity = calculatePopularity({
          totalUsers: platform.totalUsers,
          successRate: platform.successRate,
          createdAt: platform.createdAt,
        });

        let recommendationScore: number | undefined;
        let similarPlatforms: string[] | undefined;

        if (isAuthenticated && query.recommended) {
          const rec = await calculateRecommendationScore(
            userId!,
            platform.id,
            userCategories
          );
          recommendationScore = rec.score;
        }

        if (query.includeStats) {
          similarPlatforms = await findSimilarPlatforms(platform.id);
        }

        return {
          ...platform,
          categoryName: getCategoryDisplayName(platform.category),
          popularity,
          recommendationScore,
          similarPlatforms,
        };
      })
    );

    // Sort by recommendation if requested
    if (query.recommended && isAuthenticated) {
      enhancedPlatforms = enhancedPlatforms.sort(
        (a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0)
      );
    }

    // Build response
    const responseData: Record<string, unknown> = {
      platforms: enhancedPlatforms,
      summary: {
        total,
        available: enhancedPlatforms.length,
        connected: connectedPlatformIds.length,
        autoSyncable: enhancedPlatforms.filter(p => p.supportsAutoSync).length,
        requiresAuth: enhancedPlatforms.filter(p => p.requiresCredentials).length,
      },
    };

    // Add grouping if requested
    if (query.groupByCategory) {
      responseData.byCategory = groupByCategory(enhancedPlatforms);
    }

    // Add pagination
    const paginationResponse = buildPaginationResponse(
      enhancedPlatforms,
      total,
      query.page,
      query.limit
    );

    responseData.pagination = paginationResponse.pagination;

    logger.info('Available platforms fetched', {
      userId,
      requestId,
      total,
      available: enhancedPlatforms.length,
      connected: connectedPlatformIds.length,
      filtered: !!query.search || !!query.category,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(responseData, {
        meta: {
          requestId,
          duration: Date.now() - startTime,
          cached: false,
        },
      }),
      requestId,
      {
        rateLimitResult,
        cacheAge: query.search || query.recommended ? 0 : CACHE_TTL,
      }
    );
  } catch (error) {
    logger.error('GET /api/platforms/available failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * POST /api/platforms/available
 * 
 * Get personalized platform recommendations
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication required for recommendations
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required for recommendations');
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:available:post:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.POST, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validation = RecommendationSchema.safeParse(body);
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

    const { limit, categories, excludePlatformIds, includeReason } = validation.data;

    // Get user's connected platforms
    const connected = await prisma.userPlatform.findMany({
      where: { userId },
      include: {
        platform: {
          select: {
            category: true,
            tags: true,
          },
        },
      },
    });

    const connectedIds = connected.map(c => c.platformId);
    const excludeIds = [...connectedIds, ...(excludePlatformIds || [])];

    // Analyze user's activity
    const categoryActivity = await prisma.trackerEntry.groupBy({
      by: ['category'],
      where: {
        userId,
        category: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
    });

    const userCategories = new Map(
      categoryActivity
        .filter(stat => stat.category)
        .map(stat => [stat.category!, stat._count])
    );

    // Build where clause for candidates
    const where: Prisma.PlatformWhereInput = {
      isActive: true,
      isBeta: false,
      maintenanceMode: false,
      id: { notIn: excludeIds },
    };

    if (categories && categories.length > 0) {
      where.category = { in: categories };
    }

    // Get candidate platforms
    const candidates = await prisma.platform.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        displayName: true,
        description: true,
        category: true,
        subcategory: true,
        tags: true,
        icon: true,
        logo: true,
        color: true,
        authType: true,
        supportsAutoSync: true,
        supportsOAuth: true,
        supportsApiKey: true,
        requiresCredentials: true,
        website: true,
        setupGuideUrl: true,
        helpArticleUrl: true,
        totalUsers: true,
        successRate: true,
        isActive: true,
        isBeta: true,
        maintenanceMode: true,
        createdAt: true,
      },
      take: limit * 3, // Get more candidates to filter down
    });

    // Calculate scores for all candidates
    const recommendations: RecommendationResult[] = await Promise.all(
      candidates.map(async (platform) => {
        const { score, reasons } = await calculateRecommendationScore(
          userId,
          platform.id,
          userCategories
        );

        const similar = await findSimilarPlatforms(platform.id, 2);

        return {
          platform: {
            ...platform,
            categoryName: getCategoryDisplayName(platform.category),
            popularity: calculatePopularity({
              totalUsers: platform.totalUsers,
              successRate: platform.successRate,
              createdAt: platform.createdAt,
            }),
          },
          score,
          reasons: includeReason ? reasons : [],
          similarTo: similar.length > 0 ? similar : undefined,
        };
      })
    );

    // Sort by score and take top N
    const topRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    logger.info('Platform recommendations generated', {
      userId,
      requestId,
      candidateCount: candidates.length,
      recommendationCount: topRecommendations.length,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          recommendations: topRecommendations,
          basedOn: {
            connectedPlatforms: connected.length,
            topCategories: Array.from(userCategories.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([cat]) => ({
                category: cat,
                name: getCategoryDisplayName(cat),
              })),
          },
        },
        {
          meta: {
            requestId,
            duration: Date.now() - startTime,
          },
        }
      ),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('POST /api/platforms/available failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';