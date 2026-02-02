// src/app/api/achievements/recent/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, ForbiddenError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { z } from 'zod';
import { cache } from '@/lib/redis';
import { Prisma, PlatformCategory } from '@prisma/client';

const log = logger.child({ route: 'achievements/recent' });

// =============================================================================
// TYPES
// =============================================================================

interface EnhancedAchievement {
  id: string;
  achievementId: string;
  achievement: {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: PlatformCategory;
    tier: string;
    icon: string | null;
    color: string | null;
    badgeImage: string | null;
    points: number;
    xpReward: number;
    rarity: string;
    requirementText: string | null;
    totalUnlocked: number;
    unlockPercentage: number;
  };
  unlockedAt: Date;
  timeAgo: string;
  isPinned: boolean;
  progress: number;
  progressPercentage: number;
}

interface RecentSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  averagePerDay: number;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const RecentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  days: z.coerce.number().int().min(1).max(365).optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  rarity: z.string().optional(),
  tier: z.string().optional(),
  userId: z.string().cuid().optional(),
  includeHidden: z.coerce.boolean().default(false),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const timeSinceUnlock = now.getTime() - date.getTime();
  
  const seconds = Math.floor(timeSinceUnlock / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else if (weeks < 4) {
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

function getDateRanges(): {
  todayStart: Date;
  weekStart: Date;
  monthStart: Date;
} {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setMonth(monthStart.getMonth() - 1);
  monthStart.setHours(0, 0, 0, 0);

  return { todayStart, weekStart, monthStart };
}

// =============================================================================
// GET /api/achievements/recent - Get recently unlocked achievements
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

    const currentUserId = token.id as string;
    const isAdmin = token.isAdmin as boolean;

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:recent:${currentUserId}`,
      rateLimiters.api
    );
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const queryResult = RecentQuerySchema.safeParse(searchParams);

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

    const { limit, offset, days, category, rarity, tier, userId, includeHidden } =
      queryResult.data;

    // Determine target user
    let targetUserId = currentUserId;
    let isOwnProfile = true;

    if (userId && userId !== currentUserId) {
      // Check if target user's profile is public
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true,
          isPublic: true, 
          showAchievements: true,
          username: true,
        },
      });

      if (!targetUser) {
        return apiResponse.notFound('User not found', requestId);
      }

      if (!targetUser.isPublic || !targetUser.showAchievements) {
        return apiResponse.forbidden('User achievements are private', requestId);
      }

      targetUserId = userId;
      isOwnProfile = false;
    }

    // Try cache for own profile without filters
    const cacheKey = `recent_achievements:${targetUserId}:${limit}:${offset}`;
    const hasFilters = days || category || rarity || tier;

    if (!hasFilters && isOwnProfile) {
      const cached = await cache.get<{
        achievements: EnhancedAchievement[];
        pagination: PaginationInfo;
        summary: RecentSummary;
      }>(cacheKey);

      if (cached) {
        log.debug('Recent achievements served from cache', { 
          userId: currentUserId,
          targetUserId,
        });
        return apiResponse.success(
          { ...cached, isOwnProfile, cached: true },
          { status: 200, meta: { requestId } }
        );
      }
    }

    // Build where clause using proper Prisma types
    const where: Prisma.UserAchievementWhereInput = {
      userId: targetUserId,
    };

    // Only show non-hidden unless admin viewing own profile
    if (!includeHidden || !isOwnProfile || !isAdmin) {
      where.isHidden = false;
    }

    // Filter by days
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      where.unlockedAt = { gte: cutoffDate };
    }

    // Build achievement filter
    const achievementFilter: Prisma.AchievementWhereInput = {};
    
    if (category) {
      achievementFilter.category = category;
    }
    if (rarity) {
      achievementFilter.rarity = rarity;
    }
    if (tier) {
      achievementFilter.tier = tier;
    }

    // Only add achievement filter if we have any conditions
    if (Object.keys(achievementFilter).length > 0) {
      where.achievement = achievementFilter;
    }

    // Fetch recent achievements with proper typing
    const [recentAchievements, total] = await Promise.all([
      prisma.userAchievement.findMany({
        where,
        include: {
          achievement: {
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
              requirementText: true,
              totalUnlocked: true,
              unlockPercentage: true,
            },
          },
        },
        orderBy: { unlockedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.userAchievement.count({ where }),
    ]);

    // Enhance achievements with time info
    const enhancedAchievements: EnhancedAchievement[] = recentAchievements.map(
      (ua) => ({
        id: ua.id,
        achievementId: ua.achievementId,
        achievement: ua.achievement,
        unlockedAt: ua.unlockedAt,
        timeAgo: formatTimeAgo(ua.unlockedAt),
        isPinned: ua.isPinned,
        progress: ua.progress,
        progressPercentage: ua.progressPercentage,
      })
    );

    // Get summary stats
    const { todayStart, weekStart, monthStart } = getDateRanges();

    const [todayCount, weekCount, monthCount] = await Promise.all([
      prisma.userAchievement.count({
        where: { 
          userId: targetUserId, 
          unlockedAt: { gte: todayStart },
          isHidden: false,
        },
      }),
      prisma.userAchievement.count({
        where: { 
          userId: targetUserId, 
          unlockedAt: { gte: weekStart },
          isHidden: false,
        },
      }),
      prisma.userAchievement.count({
        where: { 
          userId: targetUserId, 
          unlockedAt: { gte: monthStart },
          isHidden: false,
        },
      }),
    ]);

    // Calculate average per day (last 30 days)
    const daysInMonth = 30;
    const averagePerDay = Math.round((monthCount / daysInMonth) * 100) / 100;

    const summary: RecentSummary = {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      averagePerDay,
    };

    const pagination: PaginationInfo = {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };

    // Cache result if no filters
    if (!hasFilters && isOwnProfile) {
      await cache.set(
        cacheKey,
        { achievements: enhancedAchievements, pagination, summary },
        300 // 5 minutes
      );
    }

    log.info('Recent achievements fetched', {
      userId: currentUserId,
      targetUserId,
      count: recentAchievements.length,
      total,
      filters: { days, category, rarity, tier },
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        achievements: enhancedAchievements,
        pagination,
        summary,
        isOwnProfile,
        filters: {
          days: days ?? null,
          category: category ?? null,
          rarity: rarity ?? null,
          tier: tier ?? null,
        },
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error fetching recent achievements', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE /api/achievements/recent - Clear recent achievements cache (Admin only)
// =============================================================================

export async function DELETE(req: NextRequest) {
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

    // Only admin can clear caches
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    // Get parameters
    const targetUserId = req.nextUrl.searchParams.get('userId') || userId;
    const olderThanDays = parseInt(
      req.nextUrl.searchParams.get('olderThanDays') || '0',
      10
    );
    const confirm = req.nextUrl.searchParams.get('confirm') === 'true';
    const action = req.nextUrl.searchParams.get('action') || 'clearCache';

    // Build where clause for counting
    const countWhere: Prisma.UserAchievementWhereInput = {
      userId: targetUserId,
    };

    if (olderThanDays > 0) {
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - olderThanDays);
      countWhere.unlockedAt = { lt: dateFilter };
    }

    // Count affected records
    const affectedCount = await prisma.userAchievement.count({
      where: countWhere,
    });

    if (!confirm) {
      return apiResponse.success(
        {
          preview: true,
          targetUserId,
          action,
          affectedRecords: affectedCount,
          olderThanDays: olderThanDays || 'all',
          availableActions: ['clearCache', 'hideOld'],
          message: 'Add ?confirm=true to proceed',
        },
        { status: 200, meta: { requestId } }
      );
    }

    let result: {
      action: string;
      affected: number;
      message: string;
    };

    switch (action) {
      case 'clearCache': {
        // Clear all related caches for the user
        const cacheKeys = [
          `recent_achievements:${targetUserId}:*`,
          `achievement_stats:${targetUserId}`,
          `achievement_progress:${targetUserId}`,
          `user_achievements:${targetUserId}`,
        ];

        await Promise.all(cacheKeys.map((key) => cache.del(key)));

        result = {
          action: 'clearCache',
          affected: cacheKeys.length,
          message: 'Achievement caches cleared successfully',
        };
        break;
      }

      case 'hideOld': {
        // Hide old achievements (soft action)
        if (olderThanDays === 0) {
          throw new ForbiddenError(
            'olderThanDays parameter required for hideOld action'
          );
        }

        const updated = await prisma.userAchievement.updateMany({
          where: countWhere,
          data: { isHidden: true },
        });

        result = {
          action: 'hideOld',
          affected: updated.count,
          message: `Hidden ${updated.count} achievements older than ${olderThanDays} days`,
        };
        break;
      }

      default:
        throw new ForbiddenError(`Unknown action: ${action}`);
    }

    log.info('Recent achievements action completed', {
      adminId: userId,
      targetUserId,
      action,
      affected: result.affected,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        ...result,
        targetUserId,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error in recent achievements action', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// POST /api/achievements/recent - Mark achievement as seen/notified
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

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      `achievements:recent:mark:${userId}`,
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
      throw new ForbiddenError('Invalid JSON body');
    }

    // Validate
    const MarkSeenSchema = z.object({
      achievementIds: z.array(z.string().cuid()).min(1).max(50),
      action: z.enum(['markNotified', 'markSeen', 'pin', 'unpin', 'hide', 'unhide']),
    });

    const validationResult = MarkSeenSchema.safeParse(body);
    if (!validationResult.success) {
      return apiResponse.validationError(
        'Invalid request body',
        validationResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const { achievementIds, action } = validationResult.data;

    // Verify user owns these achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: {
        id: { in: achievementIds },
        userId,
      },
      select: { id: true },
    });

    const ownedIds = new Set(userAchievements.map((ua) => ua.id));
    const notOwned = achievementIds.filter((id) => !ownedIds.has(id));

    if (notOwned.length > 0) {
      return apiResponse.forbidden(
        `You don't own some of the specified achievements`,
        requestId
      );
    }

    // Perform action
    let updateData: Prisma.UserAchievementUpdateInput;

    switch (action) {
      case 'markNotified':
        updateData = { notified: true, notifiedAt: new Date() };
        break;
      case 'markSeen':
        updateData = { notified: true };
        break;
      case 'pin':
        updateData = { isPinned: true };
        break;
      case 'unpin':
        updateData = { isPinned: false };
        break;
      case 'hide':
        updateData = { isHidden: true };
        break;
      case 'unhide':
        updateData = { isHidden: false };
        break;
      default: {
        const _exhaustiveCheck: never = action;
        throw new ForbiddenError(`Unknown action: ${_exhaustiveCheck}`);
      }
    }

    const updated = await prisma.userAchievement.updateMany({
      where: {
        id: { in: achievementIds },
        userId,
      },
      data: updateData,
    });

    // Clear cache
    await cache.del(`recent_achievements:${userId}:*`);
    await cache.del(`achievement_stats:${userId}`);

    log.info('Recent achievements updated', {
      userId,
      action,
      requested: achievementIds.length,
      updated: updated.count,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        action,
        updated: updated.count,
        message: `Successfully ${action} ${updated.count} achievement(s)`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error updating recent achievements', { requestId }, error);
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}