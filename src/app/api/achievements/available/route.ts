// src/app/api/achievements/available/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { AchievementQuerySchema } from '@/lib/validations/achievement';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ApiError, NotFoundError, ValidationError } from '@/lib/apiError';
const log = logger.child({ route: 'achievements/available' });

// =============================================================================
// GET /api/achievements/available - Get achievements available to unlock
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
    const rateLimitResult = await checkRateLimit(`achievements:available:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const queryResult = AchievementQuerySchema.safeParse(searchParams);

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

    const query = queryResult.data;

    // Get user's already unlocked achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const unlockedIds = userAchievements.map(ua => ua.achievementId);

    // Build where clause for available achievements
    const where: Prisma.AchievementWhereInput = {
      isActive: true,
      isHidden: false,
      isSecret: false,
      id: { notIn: unlockedIds },
    };

    if (query.category) where.category = query.category;
    if (query.tier) where.tier = query.tier;
    if (query.rarity) where.rarity = query.rarity;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Pagination
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    // Fetch available achievements
    const [achievements, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        orderBy: [
          { tier: 'asc' },
          { points: 'asc' },
          { sortOrder: 'asc' },
        ],
        skip,
        take,
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
          totalUnlocked: true,
          unlockPercentage: true,
          sortOrder: true,
        },
      }),
      prisma.achievement.count({ where }),
    ]);

    // Get user stats to calculate progress
    const [
      problemsCount,
      goalsCount,
      platformsCount,
      user,
      daysActiveCount,
    ] = await Promise.all([
      prisma.trackerEntry.aggregate({
        where: { userId },
        _sum: { problemsSolved: true },
      }),
      prisma.goal.count({
        where: { userId, status: 'COMPLETED' },
      }),
      prisma.userPlatform.count({
        where: { userId, isActive: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, longestStreak: true },
      }),
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: { userId },
      }),
    ]);

    const stats = {
      problems_solved: problemsCount._sum.problemsSolved || 0,
      goals_completed: goalsCount,
      platforms_connected: platformsCount,
      current_streak: user?.currentStreak || 0,
      longest_streak: user?.longestStreak || 0,
      days_active: daysActiveCount.length,
    };

    // Calculate progress for each achievement
    const achievementsWithProgress = achievements.map(achievement => {
      const requirement = achievement.requirement as {
        type: string;
        metric: string;
        value: number;
      } | null;

      let currentValue = 0;
      const targetValue = requirement?.value || 1;

      if (requirement?.metric) {
        const metricKey = requirement.metric as keyof typeof stats;
        currentValue = stats[metricKey] || 0;
      }

      const percentage = Math.min(Math.round((currentValue / targetValue) * 100), 100);

      return {
        ...achievement,
        progress: {
          current: currentValue,
          target: targetValue,
          percentage,
          remaining: Math.max(0, targetValue - currentValue),
        },
      };
    });

    // Sort by closest to completion
    achievementsWithProgress.sort((a, b) => b.progress.percentage - a.progress.percentage);

    const totalPages = Math.ceil(total / query.limit);

    log.info('Available achievements fetched', {
      userId,
      total,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        achievements: achievementsWithProgress,
        stats,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPreviousPage: query.page > 1,
        },
      },
      {
        status: 200,
        meta: { requestId },
      }
    );
  } catch (error) {
    log.error('Error fetching available achievements', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}


// =============================================================================
// POST /api/achievements/available - Add to wishlist/interested
// =============================================================================

export async function POST(req: NextRequest) {
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
    const rateLimitResult = await checkRateLimit(`achievements:wishlist:${userId}`, rateLimiters.api);
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
    const WishlistSchema = z.object({
      achievementId: z.string().cuid(),
      action: z.enum(['add', 'remove']).default('add'),
      priority: z.number().int().min(1).max(5).optional(),
      notes: z.string().max(500).optional(),
    });

    const validationResult = WishlistSchema.safeParse(body);
    if (!validationResult.success) {
      return apiResponse.validationError(
        'Validation failed',
        validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const { achievementId, action, priority, notes } = validationResult.data;

    // Verify achievement exists and is available
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
      select: { id: true, title: true, isActive: true, isHidden: true, isSecret: true },
    });

    if (!achievement || !achievement.isActive || achievement.isHidden || achievement.isSecret) {
      throw new NotFoundError('Achievement');
    }

    // Check if already unlocked
    const alreadyUnlocked = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId },
      },
    });

    if (alreadyUnlocked) {
      return apiResponse.success(
        {
          alreadyUnlocked: true,
          message: 'Achievement is already unlocked',
        },
        { status: 200, meta: { requestId } }
      );
    }

    // Store wishlist in user settings or create a new model
    // For now, we'll use the user's preferences JSON field
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    const currentWishlist = (userSettings?.dashboardLayout as { achievementWishlist?: Array<{
      achievementId: string;
      priority?: number;
      notes?: string;
      addedAt: string;
    }> })?.achievementWishlist || [];

    let updatedWishlist: Array<{
      achievementId: string;
      priority?: number;
      notes?: string;
      addedAt: string;
    }>;

    if (action === 'add') {
      // Check if already in wishlist
      const existingIndex = currentWishlist.findIndex(w => w.achievementId === achievementId);
      
      if (existingIndex >= 0) {
        // Update existing
        currentWishlist[existingIndex] = {
          ...currentWishlist[existingIndex],
          priority,
          notes,
        };
        updatedWishlist = currentWishlist;
      } else {
        // Add new
        updatedWishlist = [
          ...currentWishlist,
          {
            achievementId,
            priority,
            notes,
            addedAt: new Date().toISOString(),
          },
        ];
      }
    } else {
      // Remove from wishlist
      updatedWishlist = currentWishlist.filter(w => w.achievementId !== achievementId);
    }

    // Limit wishlist size
    if (updatedWishlist.length > 50) {
      throw new ApiError('Wishlist limit reached (50 achievements)', 400, 'VALIDATION_ERROR');
    }

    // Update user settings
    await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        dashboardLayout: { achievementWishlist: updatedWishlist },
      },
      update: {
        dashboardLayout: {
          ...(userSettings?.dashboardLayout as object || {}),
          achievementWishlist: updatedWishlist,
        },
      },
    });

    log.info('Achievement wishlist updated', {
      userId,
      achievementId,
      action,
      wishlistSize: updatedWishlist.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        action,
        achievementId,
        achievementTitle: achievement.title,
        wishlistSize: updatedWishlist.length,
        message: action === 'add'
          ? `"${achievement.title}" added to wishlist`
          : `"${achievement.title}" removed from wishlist`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error updating wishlist', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}


export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}