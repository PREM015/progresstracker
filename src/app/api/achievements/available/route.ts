// src/app/api/achievements/available/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter } from '@/lib/rateLimit';
import { AchievementService } from '@/services/achievementService';
import { PlatformCategory } from '@prisma/client';
import type { AchievementProgress, Achievement } from '@/services/achievementService';

// =============================================================================
// TYPES
// =============================================================================

// Union type for available achievements
type AvailableAchievementResponse = AchievementProgress | Achievement;

// Helper type for filtering
interface FilterableAchievement {
  category?: PlatformCategory;
  tier?: string;
  achievement?: {
    category?: PlatformCategory;
    tier?: string;
  };
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  category: z.nativeEnum(PlatformCategory).optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).optional(),
  includeProgress: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  page: z
    .string()
    .transform((v) => Math.max(1, parseInt(v) || 1))
    .optional(),
  limit: z
    .string()
    .transform((v) => Math.min(50, Math.max(1, parseInt(v) || 20)))
    .optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Type-safe category extraction
 */
function getCategory(item: FilterableAchievement): PlatformCategory | undefined {
  return item.achievement?.category || item.category;
}

/**
 * Type-safe tier extraction
 */
function getTier(item: FilterableAchievement): string | undefined {
  return item.achievement?.tier || item.tier;
}

// =============================================================================
// GET - Get Available (Not Unlocked) Achievements
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized available achievements access', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await apiRateLimiter.check(100, `achievements:available:${ip}`);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { ip, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    // ✅ Validate Query Parameters
    const { searchParams } = new URL(req.url);
    const params = querySchema.parse({
      category: searchParams.get('category') || undefined,
      tier: searchParams.get('tier') || undefined,
      includeProgress: searchParams.get('progress') || 'false',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    logger.debug('Fetching available achievements', {
      userId: session.user.id,
      params,
      requestId,
    });

    // ✅ Get Available Achievements with explicit typing
    let achievements: AvailableAchievementResponse[];

    if (params.includeProgress) {
      const allProgress = await AchievementService.getAchievementProgress(session.user.id);
      achievements = allProgress.filter((p) => !p.isUnlocked);
    } else {
      achievements = await AchievementService.getAvailableAchievements(session.user.id);
    }

    // ✅ Apply Filters using type-safe helpers
    let filtered = achievements;

    if (params.category) {
      filtered = filtered.filter((item) => {
        const category = getCategory(item as FilterableAchievement);
        return category === params.category;
      });
    }

    if (params.tier) {
      filtered = filtered.filter((item) => {
        const tier = getTier(item as FilterableAchievement);
        return tier === params.tier;
      });
    }

    // ✅ Pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filtered.slice(startIndex, endIndex);

    const duration = Date.now() - startTime;

    logger.info('Available achievements fetched', {
      userId: session.user.id,
      total: filtered.length,
      returned: paginatedResults.length,
      duration,
      requestId,
    });

    return apiResponse.paginated(
      paginatedResults,
      {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
        hasNextPage: endIndex < filtered.length,
        hasPreviousPage: page > 1,
      },
      {
        meta: {
          requestId,
          duration,
        },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid query parameters', { errors: error.errors, requestId });
      return apiResponse.validationError(
        'Invalid query parameters',
        error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    logger.error('Failed to fetch available achievements', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}