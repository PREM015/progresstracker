// =============================================================================
// FILE: app/api/stats/achievements/route.ts
// PURPOSE: Achievement-related statistics
// Methods: GET
// Auth Required: True
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * GET - Achievement statistics for the current user
 *
 * Returns: total unlocked, completion rate, recent unlocks, category breakdown,
 *          rarity distribution, points earned from achievements
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats-achievements:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;

    // Fetch achievement stats in parallel
    const [
      totalAvailable,
      userAchievements,
      recentUnlocks,
      categoryBreakdown,
    ] = await Promise.all([
      prisma.achievement.count(),
      prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: {
            select: {
              id: true,
              title: true,
              category: true,
              rarity: true,
              points: true,
            },
          },
        },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: 'desc' },
        take: 5,
        include: {
          achievement: {
            select: { title: true, icon: true, category: true, points: true },
          },
        },
      }),
      prisma.userAchievement.groupBy({
        by: ['achievementId'],
        where: { userId },
      }),
    ]);

    const totalUnlocked = userAchievements.length;
    const totalPoints = userAchievements.reduce(
      (sum, ua) => sum + (ua.achievement.points || 0),
      0
    );

    // Category breakdown
    const categoryMap = new Map<string, number>();
    userAchievements.forEach((ua) => {
      const cat = ua.achievement.category || 'OTHER';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    // Rarity distribution
    const rarityMap = new Map<string, number>();
    userAchievements.forEach((ua) => {
      const rarity = ua.achievement.rarity || 'COMMON';
      rarityMap.set(rarity, (rarityMap.get(rarity) || 0) + 1);
    });

    const data = {
      overview: {
        totalAvailable,
        totalUnlocked,
        completionRate: totalAvailable > 0
          ? Math.round((totalUnlocked / totalAvailable) * 100)
          : 0,
        totalPoints,
      },
      recentUnlocks: recentUnlocks.map((ua) => ({
        title: ua.achievement.title,
        icon: ua.achievement.icon,
        category: ua.achievement.category,
        points: ua.achievement.points,
        unlockedAt: ua.unlockedAt.toISOString(),
      })),
      byCategory: Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
      })),
      byRarity: Array.from(rarityMap.entries()).map(([rarity, count]) => ({
        rarity,
        count,
      })),
    };

    logger.info('GET /stats/achievements completed', {
      userId,
      totalUnlocked,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /stats/achievements failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch achievement stats', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
