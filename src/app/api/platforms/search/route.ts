// src/app/api/platforms/search/route.ts
/**
 * Platform Search API
 *
 * @route GET /api/platforms/search - Search platforms
 * @route HEAD /api/platforms/search - Check search availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { cache } from '@/lib/redis';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60; // Public endpoint
const CACHE_TTL = 60 * 5; // 5 minutes for search results

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'public, max-age=300',
};

const log = logger.child({ route: 'platforms/search' });

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const SearchQuerySchema = z.object({
  q: z
    .string()
    .min(1, 'Search query is required')
    .max(100, 'Search query too long')
    .transform((val) => val.trim()),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  includeInactive: z.coerce.boolean().default(false),
  authType: z.enum(['NONE', 'OAUTH', 'API_KEY', 'SCRAPING', 'MANUAL', 'HYBRID']).optional(),
});

// =============================================================================
// TYPES
// =============================================================================

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  description: string | null;
  category: string;
  icon: string | null;
  color: string | null;
  supportsAutoSync: boolean;
  authType: string;
  totalUsers: number;
  isActive: boolean;
  relevanceScore?: number;
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

function calculateRelevanceScore(platform: SearchResult, query: string): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  // Exact name match
  if (platform.name.toLowerCase() === queryLower) {
    score += 100;
  }
  // Name starts with query
  else if (platform.name.toLowerCase().startsWith(queryLower)) {
    score += 80;
  }
  // Name contains query
  else if (platform.name.toLowerCase().includes(queryLower)) {
    score += 60;
  }

  // Slug match
  if (platform.slug.toLowerCase().includes(queryLower)) {
    score += 40;
  }

  // Display name match
  if (platform.displayName?.toLowerCase().includes(queryLower)) {
    score += 30;
  }

  // Description match
  if (platform.description?.toLowerCase().includes(queryLower)) {
    score += 20;
  }

  // Popularity bonus
  score += Math.min(platform.totalUsers / 1000, 10);

  return Math.round(score);
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
 * HEAD - Check search availability
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const count = await prisma.platform.count({ where: { isActive: true } });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Searchable-Platforms', String(count));

    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET /api/platforms/search
 *
 * Search platforms by name, slug, or description
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Rate limiting (public endpoint)
    const ip = getClientIp(request);
    const rateLimitKey = `platforms:search:${ip}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Parse and validate query
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const queryValidation = SearchQuerySchema.safeParse(searchParams);

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

    const { q, category, limit, includeInactive, authType } = queryValidation.data;

    // Check cache
    const cacheKey = `platforms:search:${q}:${category || 'all'}:${limit}:${includeInactive}:${authType || 'all'}`;
    try {
      const cached = await cache.get<{ results: SearchResult[]; count: number }>(cacheKey);
      if (cached) {
        return addHeaders(
          apiResponse.success(
            { query: q, ...cached },
            { meta: { requestId, cached: true } }
          ),
          requestId,
          rateLimitResult
        );
      }
    } catch {
      // Continue without cache
    }

    // Build search query
    const whereClause: Record<string, unknown> = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { hasSome: [q.toLowerCase()] } },
      ],
    };

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    if (category) {
      whereClause.category = category.toUpperCase();
    }

    if (authType) {
      whereClause.authType = authType;
    }

    // Execute search
    const platforms = await prisma.platform.findMany({
      where: whereClause,
      select: {
        id: true,
        slug: true,
        name: true,
        displayName: true,
        description: true,
        category: true,
        icon: true,
        color: true,
        supportsAutoSync: true,
        authType: true,
        totalUsers: true,
        isActive: true,
      },
      take: limit * 2, // Get more than needed for relevance sorting
    });

    // Calculate relevance scores and sort
    const scoredResults: SearchResult[] = platforms
      .map((platform) => ({
        ...platform,
        relevanceScore: calculateRelevanceScore(platform, q),
      }))
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      .slice(0, limit);

    const response = {
      results: scoredResults,
      count: scoredResults.length,
    };

    // Cache results
    try {
      await cache.set(cacheKey, response, CACHE_TTL);
    } catch {
      // Continue without caching
    }

    log.info('Platform search performed', {
      query: q,
      category,
      resultsCount: scoredResults.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        { query: q, ...response },
        { meta: { requestId, duration: Date.now() - startTime } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Error searching platforms', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';