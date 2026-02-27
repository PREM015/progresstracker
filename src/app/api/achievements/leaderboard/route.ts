// src/app/api/achievements/leaderboard/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { cache } from '@/lib/redis';
import { LeaderboardQuerySchema } from '@/lib/validations/achievement';
import { ForbiddenError } from '@/lib/apiError';
import { auditLogService } from '@/services/auditLogService';
const log = logger.child({ route: 'achievements/leaderboard' });

// =============================================================================
// TYPES
// =============================================================================

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  totalAchievements: number;
  totalPoints: number;
  rareAchievements: number;
  legendaryAchievements: number;
  currentStreak: number;
  isCurrentUser: boolean;
  recentAchievement?: {
    title: string;
    icon: string | null;
    unlockedAt: Date;
  };
}

// =============================================================================
// GET /api/achievements/leaderboard - Get achievement leaderboard
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = token.id as string;

    // Rate limit
    const rateLimitResult = await checkRateLimit(`achievements:leaderboard:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const queryResult = LeaderboardQuerySchema.safeParse(searchParams);

    if (!queryResult.success) {
      return apiResponse.validationError(
        'Invalid query parameters',
        queryResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const { page, limit, period } = queryResult.data;

    // Check cache
    const cacheKey = `achievement_leaderboard:${period}:${page}:${limit}`;
    const cached = await cache.get<{
      leaderboard: LeaderboardEntry[];
      userRank: number | null;
      totalUsers: number;
    }>(cacheKey);

    if (cached) {
      // Update isCurrentUser flag
      cached.leaderboard = cached.leaderboard.map(entry => ({
        ...entry,
        isCurrentUser: entry.userId === userId,
      }));
      
      log.debug('Leaderboard served from cache', { userId, period });
      return apiResponse.success(
        {
          ...cached,
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(cached.totalUsers / limit),
            hasNextPage: page * limit < cached.totalUsers,
            hasPreviousPage: page > 1,
          },
        },
        { status: 200, meta: { requestId, cached: true } }
      );
    }

    // Calculate date filter for period
    let dateFilter: Date | undefined;
    if (period !== 'all') {
      dateFilter = new Date();
      switch (period) {
        case 'week':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case 'month':
          dateFilter.setMonth(dateFilter.getMonth() - 1);
          break;
        case 'year':
          dateFilter.setFullYear(dateFilter.getFullYear() - 1);
          break;
      }
    }

    // Get users with public profiles and their achievement counts
    const usersWithAchievements = await prisma.user.findMany({
      where: {
        isPublic: true,
        showAchievements: true,
        isActive: true,
        isBanned: false,
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        totalAchievements: true,
        totalPoints: true,
        currentStreak: true,
        _count: {
          select: {
            achievements: dateFilter ? {
              where: { unlockedAt: { gte: dateFilter } },
            } : true,
          },
        },
        achievements: {
          select: {
            achievement: {
              select: {
                title: true,
                icon: true,
                rarity: true,
              },
            },
            unlockedAt: true,
          },
          orderBy: { unlockedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { totalPoints: 'desc' },
        { totalAchievements: 'desc' },
      ],
    });

    // Calculate rare/legendary counts and sort
    const enrichedUsers = await Promise.all(
      usersWithAchievements.map(async (user) => {
        // Get rarity counts
        const rarityCounts = await prisma.userAchievement.groupBy({
          by: ['achievementId'],
          where: {
            userId: user.id,
            ...(dateFilter ? { unlockedAt: { gte: dateFilter } } : {}),
          },
        });

        if (rarityCounts.length === 0) {
          return {
            ...user,
            rareCount: 0,
            legendaryCount: 0,
            effectivePoints: user.totalPoints,
          };
        }

        // Get achievement details for rarity
        const achievements = await prisma.achievement.findMany({
          where: { id: { in: rarityCounts.map(r => r.achievementId) } },
          select: { id: true, rarity: true, points: true },
        });

        let rareCount = 0;
        let legendaryCount = 0;
        let periodPoints = 0;

        achievements.forEach(a => {
          if (a.rarity === 'rare' || a.rarity === 'epic') rareCount++;
          if (a.rarity === 'legendary') legendaryCount++;
          periodPoints += a.points;
        });

        return {
          ...user,
          rareCount,
          legendaryCount,
          effectivePoints: period === 'all' ? user.totalPoints : periodPoints,
        };
      })
    );

    // Sort by effective points
    enrichedUsers.sort((a, b) => {
      if (b.effectivePoints !== a.effectivePoints) {
        return b.effectivePoints - a.effectivePoints;
      }
      return b.totalAchievements - a.totalAchievements;
    });

    // Paginate
    const totalUsers = enrichedUsers.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = enrichedUsers.slice(startIndex, startIndex + limit);

    // Build leaderboard
    const leaderboard: LeaderboardEntry[] = paginatedUsers.map((user, index) => ({
      rank: startIndex + index + 1,
      userId: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      totalAchievements: period === 'all' 
        ? user.totalAchievements 
        : user._count.achievements,
      totalPoints: user.effectivePoints,
      rareAchievements: user.rareCount,
      legendaryAchievements: user.legendaryCount,
      currentStreak: user.currentStreak,
      isCurrentUser: user.id === userId,
      recentAchievement: user.achievements[0] ? {
        title: user.achievements[0].achievement.title,
        icon: user.achievements[0].achievement.icon,
        unlockedAt: user.achievements[0].unlockedAt,
      } : undefined,
    }));

    // Find current user's rank
    const userRankIndex = enrichedUsers.findIndex(u => u.id === userId);
    const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;

    // Get current user's entry if not in current page
    let currentUserEntry: LeaderboardEntry | null = null;
    if (userRank && (userRank <= startIndex || userRank > startIndex + limit)) {
      const currentUser = enrichedUsers[userRankIndex];
      currentUserEntry = {
        rank: userRank,
        userId: currentUser.id,
        username: currentUser.username,
        name: currentUser.name,
        image: currentUser.image,
        totalAchievements: period === 'all' 
          ? currentUser.totalAchievements 
          : currentUser._count.achievements,
        totalPoints: currentUser.effectivePoints,
        rareAchievements: currentUser.rareCount,
        legendaryAchievements: currentUser.legendaryCount,
        currentStreak: currentUser.currentStreak,
        isCurrentUser: true,
        recentAchievement: currentUser.achievements[0] ? {
          title: currentUser.achievements[0].achievement.title,
          icon: currentUser.achievements[0].achievement.icon,
          unlockedAt: currentUser.achievements[0].unlockedAt,
        } : undefined,
      };
    }

    const result = {
      leaderboard,
      userRank,
      currentUserEntry,
      totalUsers,
      period,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
        hasNextPage: page * limit < totalUsers,
        hasPreviousPage: page > 1,
      },
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, {
      leaderboard,
      userRank,
      totalUsers,
    }, 300);

    log.info('Leaderboard fetched', {
      userId,
      period,
      totalUsers,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(result, { status: 200, meta: { requestId } });
  } catch (error) {
    log.error('Error fetching leaderboard', { requestId }, error);
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// =============================================================================
// DELETE /api/achievements/leaderboard - Reset leaderboard cache (Admin only)
// =============================================================================

export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const isAdmin = token.isAdmin as boolean;
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    const userId = token.id as string;

    // Clear all leaderboard caches
    const periods = ['all', 'year', 'month', 'week'];
    let clearedCount = 0;

    for (const period of periods) {
      // Clear multiple pages
      for (let page = 1; page <= 10; page++) {
        for (const limit of [10, 20, 50, 100]) {
          await cache.del(`achievement_leaderboard:${period}:${page}:${limit}`);
          clearedCount++;
        }
      }
    }

    // Audit log
    await auditLogService.logAdminAction(
      userId,
      'DELETE',
      'Reset achievement leaderboard cache',
      {
        entityType: 'cache',
        newValue: { clearedCount },
      }
    );

    log.info('Leaderboard cache reset', {
      adminId: userId,
      clearedCount,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        reset: true,
        cacheEntriesCleared: clearedCount,
        message: 'Leaderboard cache has been reset',
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error resetting leaderboard', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
} 