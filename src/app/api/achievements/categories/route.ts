// src/app/api/achievements/categories/route.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import { cache } from '@/lib/redis';
import { ACHIEVEMENT_CATEGORIES, RARITY_CONFIG, TIER_CONFIG } from '@/config/achievements';
import { z } from 'zod';
import { ForbiddenError, NotFoundError, ValidationError, ApiError } from '@/lib/apiError';
import { auditLogService } from '@/services/auditLogService';
import { PlatformCategory } from '@prisma/client';
const log = logger.child({ route: 'achievements/categories' });

// =============================================================================
// TYPES
// =============================================================================

interface CategoryStats {
  category: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  total: number;
  unlocked: number;
  locked: number;
  completionPercentage: number;
  totalPoints: number;
  earnedPoints: number;
  achievements: Array<{
    id: string;
    title: string;
    icon: string | null;
    rarity: string;
    points: number;
    isUnlocked: boolean;
  }>;
}

interface RarityStats {
  rarity: string;
  label: string;
  color: string;
  total: number;
  unlocked: number;
  completionPercentage: number;
}

interface TierStats {
  tier: string;
  label: string;
  color: string;
  icon: string;
  total: number;
  unlocked: number;
  completionPercentage: number;
}

// =============================================================================
// GET /api/achievements/categories - Get achievement categories with stats
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
    const rateLimitResult = await checkRateLimit(`achievements:categories:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Check cache
    const cacheKey = `achievement_categories:${userId}`;
    const cached = await cache.get<{
      categories: CategoryStats[];
      rarities: RarityStats[];
      tiers: TierStats[];
    }>(cacheKey);

    if (cached) {
      log.debug('Categories served from cache', { userId });
      return apiResponse.success(
        cached,
        { status: 200, meta: { requestId, cached: true } }
      );
    }

    // Fetch all achievements and user's unlocked ones
    const [allAchievements, userAchievements] = await Promise.all([
      prisma.achievement.findMany({
        where: { isActive: true, isHidden: false, isSecret: false },
        select: {
          id: true,
          title: true,
          icon: true,
          category: true,
          tier: true,
          rarity: true,
          points: true,
          xpReward: true,
        },
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
        ],
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true },
      }),
    ]);

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    // Initialize category stats
    const categoryStatsMap: Record<string, CategoryStats> = {};
    const rarityStatsMap: Record<string, RarityStats> = {};
    const tierStatsMap: Record<string, TierStats> = {};

    // Initialize from config
    Object.entries(ACHIEVEMENT_CATEGORIES).forEach(([key, config]) => {
      categoryStatsMap[key] = {
        category: key,
        label: config.label,
        description: config.description,
        icon: config.icon,
        color: config.color,
        total: 0,
        unlocked: 0,
        locked: 0,
        completionPercentage: 0,
        totalPoints: 0,
        earnedPoints: 0,
        achievements: [],
      };
    });

    Object.entries(RARITY_CONFIG).forEach(([key, config]) => {
      rarityStatsMap[key] = {
        rarity: key,
        label: config.label,
        color: config.color,
        total: 0,
        unlocked: 0,
        completionPercentage: 0,
      };
    });

    Object.entries(TIER_CONFIG).forEach(([key, config]) => {
      tierStatsMap[key] = {
        tier: key,
        label: config.label,
        color: config.color,
        icon: config.icon,
        total: 0,
        unlocked: 0,
        completionPercentage: 0,
      };
    });

    // Process achievements
    for (const achievement of allAchievements) {
      const isUnlocked = unlockedIds.has(achievement.id);
      const categoryKey = achievement.category.toLowerCase();

      // Update category stats
      if (categoryStatsMap[categoryKey]) {
        categoryStatsMap[categoryKey].total++;
        categoryStatsMap[categoryKey].totalPoints += achievement.points;

        if (isUnlocked) {
          categoryStatsMap[categoryKey].unlocked++;
          categoryStatsMap[categoryKey].earnedPoints += achievement.points;
        } else {
          categoryStatsMap[categoryKey].locked++;
        }

        categoryStatsMap[categoryKey].achievements.push({
          id: achievement.id,
          title: achievement.title,
          icon: achievement.icon,
          rarity: achievement.rarity,
          points: achievement.points,
          isUnlocked,
        });
      }

      // Update rarity stats
      if (rarityStatsMap[achievement.rarity]) {
        rarityStatsMap[achievement.rarity].total++;
        if (isUnlocked) {
          rarityStatsMap[achievement.rarity].unlocked++;
        }
      }

      // Update tier stats
      if (tierStatsMap[achievement.tier]) {
        tierStatsMap[achievement.tier].total++;
        if (isUnlocked) {
          tierStatsMap[achievement.tier].unlocked++;
        }
      }
    }

    // Calculate completion percentages
    Object.values(categoryStatsMap).forEach(cat => {
      cat.completionPercentage = cat.total > 0
        ? Math.round((cat.unlocked / cat.total) * 100)
        : 0;
    });

    Object.values(rarityStatsMap).forEach(rar => {
      rar.completionPercentage = rar.total > 0
        ? Math.round((rar.unlocked / rar.total) * 100)
        : 0;
    });

    Object.values(tierStatsMap).forEach(tier => {
      tier.completionPercentage = tier.total > 0
        ? Math.round((tier.unlocked / tier.total) * 100)
        : 0;
    });

    // Sort categories by total achievements
    const categories = Object.values(categoryStatsMap)
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);

    // Sort achievements within each category by unlocked status, then rarity
    categories.forEach(cat => {
      const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
      cat.achievements.sort((a, b) => {
        if (a.isUnlocked !== b.isUnlocked) {
          return a.isUnlocked ? -1 : 1;
        }
        return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
      });
    });

    const result = {
      categories,
      rarities: Object.values(rarityStatsMap).filter(r => r.total > 0),
      tiers: Object.values(tierStatsMap).filter(t => t.total > 0),
      summary: {
        totalCategories: categories.length,
        completedCategories: categories.filter(c => c.completionPercentage === 100).length,
        totalAchievements: allAchievements.length,
        unlockedAchievements: userAchievements.length,
        overallCompletion: Math.round((userAchievements.length / allAchievements.length) * 100),
      },
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    log.info('Achievement categories fetched', {
      userId,
      categoryCount: categories.length,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(result, { status: 200, meta: { requestId } });
  } catch (error) {
    log.error('Error fetching achievement categories', { requestId }, error);
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
// POST /api/achievements/categories - Create custom category (Admin only)
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

    const isAdmin = token.isAdmin as boolean;
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    const userId = token.id as string;

    // Rate limit
    const rateLimitResult = await checkRateLimit(`achievements:categories:create:${userId}`, rateLimiters.api);
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
    const CreateCategorySchema = z.object({
      key: z.string().min(2).max(50).regex(/^[a-z_]+$/),
      label: z.string().min(2).max(100),
      description: z.string().max(500).optional(),
      icon: z.string().max(50).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      sortOrder: z.number().int().min(0).max(1000).optional(),
    });

    const validationResult = CreateCategorySchema.safeParse(body);
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

    const categoryData = validationResult.data;

    // Store in system settings (or create a Categories table)
    const existingCategories = await prisma.systemSettings.findUnique({
      where: { key: 'achievement_categories' },
    });

    const categories = (existingCategories?.value as Array<typeof categoryData>) || [];
    
    // Check for duplicate
    if (categories.some(c => c.key === categoryData.key)) {
      throw new ApiError(
        `Category "${categoryData.key}" already exists`,
        409,
        'CONFLICT'
      );
    }

    categories.push(categoryData);

    await prisma.systemSettings.upsert({
      where: { key: 'achievement_categories' },
      create: {
        key: 'achievement_categories',
        value: categories,
        description: 'Custom achievement categories',
        category: 'achievements',
        isPublic: false,
      },
      update: {
        value: categories,
      },
    });

    // Clear cache
    await cache.del('achievement_categories:*');

    // Audit log
    await auditLogService.logAdminAction(
      userId,
      'CREATE',
      `Created achievement category: ${categoryData.key}`,
      {
        entityType: 'achievement_category',
        newValue: categoryData,
      }
    );

    log.info('Category created', {
      adminId: userId,
      category: categoryData.key,
      duration: Date.now() - startTime,
    });

    return apiResponse.created(
      {
        category: categoryData,
        message: `Category "${categoryData.label}" created successfully`,
      },
      { requestId }
    );
  } catch (error) {
    log.error('Error creating category', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PUT /api/achievements/categories - Update category (Admin only)
// =============================================================================

export async function PUT(req: NextRequest) {
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

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate
    const UpdateCategorySchema = z.object({
      key: z.string().min(2).max(50),
      updates: z.object({
        label: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional(),
        icon: z.string().max(50).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        sortOrder: z.number().int().min(0).max(1000).optional(),
      }),
    });

    const validationResult = UpdateCategorySchema.safeParse(body);
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

    const { key, updates } = validationResult.data;

    // Get existing categories
    const existingSettings = await prisma.systemSettings.findUnique({
      where: { key: 'achievement_categories' },
    });

    const categories = (existingSettings?.value as Array<{
      key: string;
      label: string;
      description?: string;
      icon?: string;
      color?: string;
      sortOrder?: number;
    }>) || [];

    const categoryIndex = categories.findIndex(c => c.key === key);
    if (categoryIndex === -1) {
      throw new NotFoundError(`Category "${key}"`);
    }

    // Update category
    categories[categoryIndex] = {
      ...categories[categoryIndex],
      ...updates,
    };

    await prisma.systemSettings.update({
      where: { key: 'achievement_categories' },
      data: { value: categories },
    });

    // Clear cache
    await cache.del('achievement_categories:*');

    log.info('Category updated', {
      adminId: userId,
      category: key,
      updates: Object.keys(updates),
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        category: categories[categoryIndex],
        message: `Category "${key}" updated successfully`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error updating category', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PATCH /api/achievements/categories - Partial update category (Admin only)
// =============================================================================

export async function PATCH(req: NextRequest) {
  // Same as PUT but explicitly partial
  return PUT(req);
}

// =============================================================================
// DELETE /api/achievements/categories - Delete category (Admin only)
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

    // Get category key from query
    const categoryKey = req.nextUrl.searchParams.get('key');
    if (!categoryKey) {
      throw new ValidationError('Category key is required');
    }

    // Check if any achievements use this category
    const achievementsUsingCategory = await prisma.achievement.count({
      where: { category: categoryKey as PlatformCategory },
    });

    if (achievementsUsingCategory > 0) {
      throw new ApiError(
        `Cannot delete category: ${achievementsUsingCategory} achievement(s) are using it`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Get existing categories
    const existingSettings = await prisma.systemSettings.findUnique({
      where: { key: 'achievement_categories' },
    });

    const categories = (existingSettings?.value as Array<{ key: string }>) || [];
    const newCategories = categories.filter(c => c.key !== categoryKey);

    if (categories.length === newCategories.length) {
      throw new NotFoundError(`Category "${categoryKey}"`);
    }

    await prisma.systemSettings.update({
      where: { key: 'achievement_categories' },
      data: { value: newCategories },
    });

    // Clear cache
    await cache.del('achievement_categories:*');

    // Audit log
    await auditLogService.logAdminAction(
      userId,
      'DELETE',
      `Deleted achievement category: ${categoryKey}`,
      {
        entityType: 'achievement_category',
        oldValue: { key: categoryKey },
      }
    );

    log.info('Category deleted', {
      adminId: userId,
      category: categoryKey,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        deleted: true,
        key: categoryKey,
        message: `Category "${categoryKey}" deleted successfully`,
      },
      { status: 200, meta: { requestId } }
    );
  } catch (error) {
    log.error('Error deleting category', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}