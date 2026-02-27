// src/app/api/platforms/recommended/route.ts
/**
 * Recommended Platforms API
 *
 * @route GET /api/platforms/recommended - Get personalized platform recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError } from '@/lib/apiError';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { cache } from '@/lib/redis';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const CACHE_TTL = 60 * 15; // 15 minutes

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=900',
};

const log = logger.child({ route: 'platforms/recommended' });

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
  category: z.string().optional(),
});

// =============================================================================
// TYPES
// =============================================================================

interface ScoredPlatform {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  description: string | null;
  category: string;
  icon: string | null;
  color: string | null;
  tags: string[];
  supportsAutoSync: boolean;
  authType: string;
  totalUsers: number;
  website: string | null;
  recommendationScore: number;
  matchReasons: string[];
}

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

function calculateRecommendationScore(
  platform: {
    category: string;
    tags: string[];
    supportsAutoSync: boolean;
    totalUsers: number;
  },
  context: {
    connectedCategories: string[];
    goalCategories: string[];
    userTags: string[];
    userStats: { totalProblems: number; totalCommits: number; totalProjects: number } | null;
  }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Category match with connected platforms
  if (context.connectedCategories.includes(platform.category)) {
    score += 30;
    reasons.push('Similar to your connected platforms');
  }

  // Goal category match
  if (context.goalCategories.includes(platform.category)) {
    score += 25;
    reasons.push('Matches your goals');
  }

  // Popularity score (capped at 20)
  score += Math.min(platform.totalUsers / 100, 20);
  if (platform.totalUsers > 1000) {
    reasons.push('Popular platform');
  }

  // Auto-sync bonus
  if (platform.supportsAutoSync) {
    score += 15;
    reasons.push('Supports automatic sync');
  }

  // DSA bonus for problem solvers
  if (platform.category === 'DSA' && (context.userStats?.totalProblems || 0) > 0) {
    score += 20;
  }

  // Git bonus for committers
  if (platform.category === 'GIT' && (context.userStats?.totalCommits || 0) > 0) {
    score += 20;
  }

  // Tag matching
  const matchingTags = platform.tags.filter((tag) => context.userTags.includes(tag));
  if (matchingTags.length > 0) {
    score += matchingTags.length * 5;
    reasons.push(`Matches interests: ${matchingTags.slice(0, 3).join(', ')}`);
  }

  return { score: Math.round(score), reasons };
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
 * GET /api/platforms/recommended
 *
 * Get personalized platform recommendations
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
    const rateLimitKey = `platforms:recommended:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Parse query
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

    const { limit, category } = queryValidation.data;

    // Check cache
    const cacheKey = `platforms:recommended:${userId}:${limit}:${category || 'all'}`;
    try {
      const cached = await cache.get<{ recommendations: ScoredPlatform[] }>(cacheKey);
      if (cached) {
        return addHeaders(
          apiResponse.success(cached, { meta: { requestId, cached: true } }),
          requestId,
          rateLimitResult
        );
      }
    } catch {
      // Continue without cache
    }

    // Fetch user context
    const [userPlatforms, userGoals, userStats] = await Promise.all([
      prisma.userPlatform.findMany({
        where: { userId },
        include: {
          platform: {
            select: { category: true, tags: true },
          },
        },
      }),
      prisma.goal.findMany({
        where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
        select: { category: true, metric: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          totalProblems: true,
          totalCommits: true,
          totalProjects: true,
        },
      }),
    ]);

    const connectedPlatformIds = userPlatforms.map((up) => up.platformId);
    const connectedCategories = userPlatforms.map((up) => up.platform.category);
    const goalCategories = userGoals.map((g) => g.category);
    const userTags = userPlatforms.flatMap((up) => up.platform.tags);

    // Build platform filter
    const platformWhere: Record<string, unknown> = {
      isActive: true,
      isBeta: false,
      id: { notIn: connectedPlatformIds },
    };

    if (category) {
      platformWhere.category = category.toUpperCase();
    }

    // Fetch available platforms
    const availablePlatforms = await prisma.platform.findMany({
      where: platformWhere,
      select: {
        id: true,
        slug: true,
        name: true,
        displayName: true,
        description: true,
        category: true,
        icon: true,
        color: true,
        tags: true,
        supportsAutoSync: true,
        authType: true,
        totalUsers: true,
        website: true,
      },
    });

    // Score and sort platforms
    const scoredPlatforms: ScoredPlatform[] = availablePlatforms.map((platform) => {
      const { score, reasons } = calculateRecommendationScore(platform, {
        connectedCategories,
        goalCategories,
        userTags,
        userStats,
      });

      return {
        ...platform,
        recommendationScore: score,
        matchReasons: reasons,
      };
    });

    scoredPlatforms.sort((a, b) => b.recommendationScore - a.recommendationScore);
    const recommendations = scoredPlatforms.slice(0, limit);

    // Get popular platforms as fallback
    const popularPlatforms = await prisma.platform.findMany({
      where: {
        isActive: true,
        isBeta: false,
        id: { notIn: connectedPlatformIds },
      },
      orderBy: { totalUsers: 'desc' },
      take: 5,
      select: {
        id: true,
        slug: true,
        name: true,
        displayName: true,
        category: true,
        icon: true,
        color: true,
        totalUsers: true,
        supportsAutoSync: true,
      },
    });

    const response = {
      recommendations,
      popular: popularPlatforms,
      stats: {
        totalAvailable: availablePlatforms.length,
        connected: userPlatforms.length,
        recommendationsShown: recommendations.length,
      },
    };

    // Cache the result
    try {
      await cache.set(cacheKey, response, CACHE_TTL);
    } catch {
      // Continue without caching
    }

    log.info('Recommendations generated', {
      userId,
      recommendationCount: recommendations.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId, duration: Date.now() - startTime } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Error generating recommendations', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';