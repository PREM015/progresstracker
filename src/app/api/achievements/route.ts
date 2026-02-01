// src/app/api/achievements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter } from '@/lib/rateLimit';
import { AchievementService } from '@/services/achievementService';
import { PlatformCategory } from '@prisma/client';
import type {
  UserAchievementWithDetails,
  AchievementProgress,
  Achievement,
} from '@/services/achievementService';

// =============================================================================
// TYPES
// =============================================================================

// Union type for different achievement response formats
type AchievementResponse = UserAchievementWithDetails | AchievementProgress | Achievement;

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
  includeStats: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  includeHidden: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  unlockedOnly: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  page: z
    .string()
    .transform((v) => Math.max(1, parseInt(v) || 1))
    .optional(),
  limit: z
    .string()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v) || 20)))
    .optional(),
});

const checkAchievementsSchema = z.object({
  type: z.enum(['all', 'problems', 'streak', 'goals', 'platforms']).optional(),
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
// GET - List Achievements
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized achievements access', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await apiRateLimiter.check(100, `achievements:${ip}`);
    
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { ip, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    // ✅ Validate Query Params
    const { searchParams } = new URL(req.url);
    const params = querySchema.parse({
      category: searchParams.get('category') || undefined,
      tier: searchParams.get('tier') || undefined,
      includeProgress: searchParams.get('progress') || 'false',
      includeStats: searchParams.get('stats') || 'false',
      includeHidden: searchParams.get('hidden') || 'false',
      unlockedOnly: searchParams.get('unlockedOnly') || 'false',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    logger.debug('Fetching achievements', {
      userId: session.user.id,
      params,
      requestId,
    });

    // ✅ Fetch Achievements with explicit typing
    let achievements: AchievementResponse[];
    let stats = null;

    if (params.unlockedOnly) {
      achievements = await AchievementService.getUserAchievements(session.user.id);
    } else if (params.includeProgress) {
      achievements = await AchievementService.getAchievementProgress(session.user.id);
    } else {
      achievements = await AchievementService.getAvailableAchievements(session.user.id);
    }

    // ✅ Get Statistics if requested
    if (params.includeStats) {
      stats = await AchievementService.getAchievementStats(session.user.id);
    }

    // ✅ Apply filters using type-safe helpers
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

    logger.info('Achievements fetched successfully', {
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
          stats: params.includeStats ? stats : undefined,
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

    logger.error('Failed to fetch achievements', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// POST - Check & Unlock Achievements
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized achievement check', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting (stricter for POST)
    const rateLimitResult = await apiRateLimiter.check(
      10,
      `achievements:check:${session.user.id}`
    );
    
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for achievement check', {
        userId: session.user.id,
        requestId,
      });
      return apiResponse.rateLimited(60, requestId);
    }

    // ✅ Validate Request Body
    const body = await req.json().catch(() => ({}));
    const validated = checkAchievementsSchema.parse(body);

    logger.info('Checking achievements', {
      userId: session.user.id,
      type: validated.type || 'all',
      requestId,
    });

    // ✅ Check & Unlock Achievements
    let newUnlocks: UserAchievementWithDetails[];

    switch (validated.type) {
      case 'problems':
        newUnlocks = await AchievementService.checkProblemAchievements(session.user.id);
        break;
      case 'streak': {
        // Get user stats privately from service
        const user = await AchievementService['getUserStats'](session.user.id);
        newUnlocks = await AchievementService.checkStreakAchievements(
          session.user.id,
          user.current_streak
        );
        break;
      }
      case 'goals':
        newUnlocks = await AchievementService.checkGoalAchievements(session.user.id);
        break;
      case 'platforms':
        newUnlocks = await AchievementService.checkPlatformAchievements(session.user.id);
        break;
      default:
        newUnlocks = await AchievementService.checkAndUnlockAchievements(session.user.id);
    }

    const duration = Date.now() - startTime;

    logger.info('Achievement check complete', {
      userId: session.user.id,
      unlocked: newUnlocks.length,
      duration,
      requestId,
    });

    return apiResponse.success(
      {
        newUnlocks,
        count: newUnlocks.length,
      },
      {
        status: 200,
        meta: { requestId, duration },
        message:
          newUnlocks.length > 0
            ? `Unlocked ${newUnlocks.length} new achievement(s)!`
            : 'No new achievements unlocked',
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid request body', { errors: error.errors, requestId });
      return apiResponse.validationError(
        'Invalid request body',
        error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    logger.error('Failed to check achievements', { requestId }, error);
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}