// src/app/api/achievements/search/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, ValidationError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { SearchQuerySchema } from '@/lib/validations/achievement';
import { cache } from '@/lib/redis';
import { z } from 'zod';
import { PlatformCategory, Prisma } from '@prisma/client';

const log = logger.child({ route: 'achievements/search' });

// =============================================================================
// TYPES
// =============================================================================

interface UserAchievementStatus {
  isUnlocked: boolean;
  unlockedAt: Date | null;
  isPinned: boolean;
  progress: number;
}

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: PlatformCategory;
  tier: string;
  icon: string | null;
  color: string | null;
  points: number;
  xpReward: number;
  rarity: string;
  requirementText: string | null;
  totalUnlocked: number;
  highlightedTitle: string;
  highlightedDescription: string;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  isPinned: boolean;
  relevanceScore: number;
}

interface SearchFacets {
  categories: Record<string, number>;
  tiers: Record<string, number>;
  rarities: Record<string, number>;
  unlockStatus: {
    unlocked: number;
    locked: number;
  };
}

interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const ComplexSearchSchema = z.object({
  query: z.string().min(1).max(200).optional(),
  filters: z
    .object({
      categories: z.array(z.nativeEnum(PlatformCategory)).optional(),
      tiers: z
        .array(z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']))
        .optional(),
      rarities: z
        .array(z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']))
        .optional(),
      pointsRange: z
        .object({
          min: z.number().int().min(0).optional(),
          max: z.number().int().max(10000).optional(),
        })
        .optional(),
      xpRange: z
        .object({
          min: z.number().int().min(0).optional(),
          max: z.number().int().max(50000).optional(),
        })
        .optional(),
      isActive: z.boolean().optional(),
      isHidden: z.boolean().optional(),
      isSecret: z.boolean().optional(),
      hasThresholds: z.boolean().optional(),
      requirementType: z
        .enum(['count', 'streak', 'goal', 'platform', 'special'])
        .optional(),
      requirementMetric: z.string().optional(),
    })
    .optional(),
  userFilters: z
    .object({
      unlockStatus: z.enum(['all', 'unlocked', 'locked']).optional(),
      isPinned: z.boolean().optional(),
      progressRange: z
        .object({
          min: z.number().int().min(0).max(100).optional(),
          max: z.number().int().min(0).max(100).optional(),
        })
        .optional(),
    })
    .optional(),
  sort: z
    .object({
      field: z
        .enum([
          'title',
          'points',
          'xpReward',
          'rarity',
          'tier',
          'totalUnlocked',
          'unlockPercentage',
          'createdAt',
          'sortOrder',
        ])
        .default('sortOrder'),
      order: z.enum(['asc', 'desc']).default('asc'),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().min(1).max(100).default(20),
    })
    .optional(),
  includeProgress: z.boolean().default(true),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string): string {
  if (!query || !text) return text;
  const escapedQuery = escapeRegex(query);
  return text.replace(
    new RegExp(`(${escapedQuery})`, 'gi'),
    '<mark>$1</mark>'
  );
}

function calculateRelevanceScore(
  achievement: { title: string; description: string; slug: string },
  query: string
): number {
  if (!query) return 0;

  const queryLower = query.toLowerCase();
  let score = 0;

  // Exact title match
  if (achievement.title.toLowerCase() === queryLower) {
    score += 100;
  }
  // Title starts with query
  else if (achievement.title.toLowerCase().startsWith(queryLower)) {
    score += 75;
  }
  // Title contains query
  else if (achievement.title.toLowerCase().includes(queryLower)) {
    score += 50;
  }

  // Slug match
  if (achievement.slug.toLowerCase().includes(queryLower)) {
    score += 25;
  }

  // Description contains query
  if (achievement.description.toLowerCase().includes(queryLower)) {
    score += 10;
  }

  return score;
}

function getRarityOrder(rarity: string): number {
  const order: Record<string, number> = {
    legendary: 0,
    epic: 1,
    rare: 2,
    uncommon: 3,
    common: 4,
  };
  return order[rarity] ?? 5;
}

// =============================================================================
// GET /api/achievements/search - Simple search achievements
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = token.id as string;
    const isAdmin = token.isAdmin as boolean;

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:search:${userId}`,
      rateLimiters.api
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const queryResult = SearchQuerySchema.safeParse(searchParams);

    if (!queryResult.success) {
      return apiResponse.validationError(
        'Invalid query parameters',
        queryResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const { q, limit, category } = queryResult.data;

    // Sanitize search query
    const searchQuery = q.trim().toLowerCase();

    if (searchQuery.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    // Try cache first
    const cacheKey = `search:${userId}:${searchQuery}:${category || 'all'}:${limit}`;
    const cached = await cache.get<SearchResult[]>(cacheKey);

    if (cached) {
      log.debug('Search served from cache', { userId, query: searchQuery });
      return apiResponse.success(
        {
          query: searchQuery,
          results: cached,
          count: cached.length,
          cached: true,
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Build where clause
    const where: Prisma.AchievementWhereInput = {
      isActive: true,
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { slug: { contains: searchQuery, mode: 'insensitive' } },
        { requirementText: { contains: searchQuery, mode: 'insensitive' } },
      ],
    };

    // Non-admin users can't see hidden/secret achievements
    if (!isAdmin) {
      where.isHidden = false;
      where.isSecret = false;
    }

    if (category) {
      where.category = category;
    }

    // Search achievements
    const achievements = await prisma.achievement.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        tier: true,
        icon: true,
        color: true,
        points: true,
        xpReward: true,
        rarity: true,
        requirementText: true,
        totalUnlocked: true,
      },
      orderBy: [{ tier: 'asc' }, { points: 'asc' }],
      take: limit,
    });

    // Get user's unlocked achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        achievementId: { in: achievements.map((a) => a.id) },
      },
      select: { achievementId: true, unlockedAt: true, isPinned: true },
    });

    const unlockedMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua])
    );

    // Enhance with user status and highlighting
    const results: SearchResult[] = achievements.map((achievement) => {
      const userStatus = unlockedMap.get(achievement.id);
      const relevanceScore = calculateRelevanceScore(achievement, searchQuery);

      return {
        ...achievement,
        highlightedTitle: highlightText(achievement.title, searchQuery),
        highlightedDescription: highlightText(
          achievement.description,
          searchQuery
        ),
        isUnlocked: !!userStatus,
        unlockedAt: userStatus?.unlockedAt || null,
        isPinned: userStatus?.isPinned || false,
        relevanceScore,
      };
    });

    // Sort: by relevance, then unlocked first, then by rarity
    results.sort((a, b) => {
      // First by relevance score
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // Then by unlock status
      if (a.isUnlocked !== b.isUnlocked) {
        return a.isUnlocked ? -1 : 1;
      }
      // Then by rarity
      return getRarityOrder(a.rarity) - getRarityOrder(b.rarity);
    });

    // Get search suggestions if no results
    let suggestions: string[] = [];
    if (results.length === 0) {
      const popularAchievements = await prisma.achievement.findMany({
        where: { isActive: true, isHidden: false },
        select: { title: true },
        orderBy: { totalUnlocked: 'desc' },
        take: 5,
      });
      suggestions = popularAchievements.map((a) => a.title);
    }

    // Cache results for 5 minutes
    if (results.length > 0) {
      await cache.set(cacheKey, results, 300);
    }

    log.info('Achievement search completed', {
      userId,
      query: searchQuery,
      resultsCount: results.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        query: searchQuery,
        results,
        count: results.length,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error searching achievements', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// POST /api/achievements/search - Complex search with body filters
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = token.id as string;
    const isAdmin = token.isAdmin as boolean;

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:search:complex:${userId}`,
      rateLimiters.api
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate
    const validationResult = ComplexSearchSchema.safeParse(body);
    if (!validationResult.success) {
      return apiResponse.validationError(
        'Validation failed',
        validationResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const {
      query,
      filters = {},
      userFilters = {},
      sort = { field: 'sortOrder', order: 'asc' },
      pagination = { page: 1, limit: 20 },
      includeProgress,
    } = validationResult.data;

    // Build where clause
    const where: Prisma.AchievementWhereInput = {
      isActive: filters.isActive ?? true,
    };

    // Non-admin restrictions
    if (!isAdmin) {
      where.isHidden = false;
      where.isSecret = false;
    } else {
      if (filters.isHidden !== undefined) where.isHidden = filters.isHidden;
      if (filters.isSecret !== undefined) where.isSecret = filters.isSecret;
    }

    // Text search
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
        { requirementText: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      where.category = { in: filters.categories };
    }

    // Tier filter
    if (filters.tiers && filters.tiers.length > 0) {
      where.tier = { in: filters.tiers };
    }

    // Rarity filter
    if (filters.rarities && filters.rarities.length > 0) {
      where.rarity = { in: filters.rarities };
    }

    // Points range
    if (filters.pointsRange) {
      const pointsFilter: Prisma.IntFilter = {};
      if (filters.pointsRange.min !== undefined) {
        pointsFilter.gte = filters.pointsRange.min;
      }
      if (filters.pointsRange.max !== undefined) {
        pointsFilter.lte = filters.pointsRange.max;
      }
      if (Object.keys(pointsFilter).length > 0) {
        where.points = pointsFilter;
      }
    }

    // XP range
    if (filters.xpRange) {
      const xpFilter: Prisma.IntFilter = {};
      if (filters.xpRange.min !== undefined) {
        xpFilter.gte = filters.xpRange.min;
      }
      if (filters.xpRange.max !== undefined) {
        xpFilter.lte = filters.xpRange.max;
      }
      if (Object.keys(xpFilter).length > 0) {
        where.xpReward = xpFilter;
      }
    }

    // Has thresholds - FIXED: Use proper JSON filter syntax
    if (filters.hasThresholds !== undefined) {
      if (filters.hasThresholds) {
        // Has thresholds (not null)
        where.thresholds = { not: Prisma.JsonNull };
      } else {
        // No thresholds (is null)
        where.thresholds = { equals: Prisma.JsonNull };
      }
    }

    // Requirement type filter (JSON path query)
    if (filters.requirementType) {
      where.requirement = {
        path: ['type'],
        equals: filters.requirementType,
      };
    }

    // Requirement metric filter
    if (filters.requirementMetric) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          requirement: {
            path: ['metric'],
            equals: filters.requirementMetric,
          },
        },
      ];
    }

    // Fetch achievements
    const skip = (pagination.page - 1) * pagination.limit;
    const orderBy: Prisma.AchievementOrderByWithRelationInput = {
      [sort.field]: sort.order,
    };

    const [achievements, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        orderBy,
        skip,
        take: pagination.limit,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          tier: true,
          icon: true,
          color: true,
          badgeImage: true,
          points: true,
          xpReward: true,
          rarity: true,
          requirement: true,
          requirementText: true,
          thresholds: true,
          isHidden: true,
          isSecret: true,
          totalUnlocked: true,
          unlockPercentage: true,
          sortOrder: true,
          createdAt: true,
        },
      }),
      prisma.achievement.count({ where }),
    ]);

    // Get user's achievement data if needed
    const userAchievementsMap = new Map<string, UserAchievementStatus>();

    if (
      includeProgress ||
      userFilters.unlockStatus ||
      userFilters.isPinned !== undefined
    ) {
      const userAchievements = await prisma.userAchievement.findMany({
        where: {
          userId,
          achievementId: { in: achievements.map((a) => a.id) },
        },
        select: {
          achievementId: true,
          unlockedAt: true,
          isPinned: true,
          progressPercentage: true,
        },
      });

      userAchievements.forEach((ua) => {
        userAchievementsMap.set(ua.achievementId, {
          isUnlocked: true,
          unlockedAt: ua.unlockedAt,
          isPinned: ua.isPinned,
          progress: ua.progressPercentage,
        });
      });
    }

    // Default user status for non-unlocked achievements
    const defaultUserStatus: UserAchievementStatus = {
      isUnlocked: false,
      unlockedAt: null,
      isPinned: false,
      progress: 0,
    };

    // Apply user filters and enhance results
    let results = achievements.map((achievement) => {
      const userStatus =
        userAchievementsMap.get(achievement.id) || defaultUserStatus;

      return {
        ...achievement,
        userStatus,
        relevanceScore: query
          ? calculateRelevanceScore(achievement, query)
          : 0,
      };
    });

    // Filter by unlock status
    if (userFilters.unlockStatus === 'unlocked') {
      results = results.filter((r) => r.userStatus.isUnlocked);
    } else if (userFilters.unlockStatus === 'locked') {
      results = results.filter((r) => !r.userStatus.isUnlocked);
    }

    // Filter by pinned
    if (userFilters.isPinned !== undefined) {
      results = results.filter(
        (r) => r.userStatus.isPinned === userFilters.isPinned
      );
    }

    // Filter by progress range
    if (userFilters.progressRange) {
      const { min, max } = userFilters.progressRange;
      results = results.filter((r) => {
        const progress = r.userStatus.progress;
        if (min !== undefined && progress < min) {
          return false;
        }
        if (max !== undefined && progress > max) {
          return false;
        }
        return true;
      });
    }

    // Calculate facets for filtering UI
    const facets: SearchFacets = {
      categories: {},
      tiers: {},
      rarities: {},
      unlockStatus: {
        unlocked: 0,
        locked: 0,
      },
    };

    achievements.forEach((a) => {
      facets.categories[a.category] =
        (facets.categories[a.category] || 0) + 1;
      facets.tiers[a.tier] = (facets.tiers[a.tier] || 0) + 1;
      facets.rarities[a.rarity] = (facets.rarities[a.rarity] || 0) + 1;

      const isUnlocked = userAchievementsMap.has(a.id);
      if (isUnlocked) {
        facets.unlockStatus.unlocked++;
      } else {
        facets.unlockStatus.locked++;
      }
    });

    const totalPages = Math.ceil(total / pagination.limit);

    const paginationResult: PaginationResult = {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    };

    log.info('Complex search completed', {
      userId,
      query,
      filtersApplied:
        Object.keys(filters).length + Object.keys(userFilters).length,
      resultsCount: results.length,
      totalMatches: total,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        results,
        facets,
        pagination: paginationResult,
        appliedFilters: {
          query,
          filters,
          userFilters,
          sort,
        },
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error in complex search', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// OPTIONS - CORS preflight
// =============================================================================

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}