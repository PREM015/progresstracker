// src/app/api/analytics/activity/route.ts
// =============================================================================
// Activity Feed Analytics
// =============================================================================
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { PlatformCategory } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, format } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1),
  platformId: z.string().optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  type: z.enum(['all', 'problems', 'commits', 'goals', 'achievements']).default('all'),
});

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

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `analytics-activity:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

interface ActivityItem {
  id: string;
  type: 'tracker' | 'goal_completed' | 'goal_created' | 'achievement' | 'streak_milestone';
  date: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Feed-Type', 'activity');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/activity failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryValidation = querySchema.safeParse({
      days: searchParams.get('days') || '7',
      limit: searchParams.get('limit') || '50',
      page: searchParams.get('page') || '1',
      platformId: searchParams.get('platformId'),
      category: searchParams.get('category'),
      type: searchParams.get('type') || 'all',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;
    const startDate = subDays(new Date(), params.days);
    const skip = (params.page - 1) * params.limit;

    const activities: ActivityItem[] = [];

    // Fetch tracker entries
    if (params.type === 'all' || params.type === 'problems' || params.type === 'commits') {
      const trackerWhere: {
        userId: string;
        date: { gte: Date };
        platformId?: string;
        category?: PlatformCategory;
      } = {
        userId,
        date: { gte: startDate },
      };

      if (params.platformId) trackerWhere.platformId = params.platformId;
      if (params.category) trackerWhere.category = params.category;

      const entries = await prisma.trackerEntry.findMany({
        where: trackerWhere,
        include: {
          platform: { select: { name: true, icon: true, color: true } },
        },
        orderBy: { date: 'desc' },
        take: params.limit * 2, // Get more to filter later
      });

      entries.forEach(entry => {
        if (entry.problemsSolved > 0 && (params.type === 'all' || params.type === 'problems')) {
          activities.push({
            id: `tracker_problems_${entry.id}`,
            type: 'tracker',
            date: entry.date.toISOString(),
            title: `Solved ${entry.problemsSolved} problem${entry.problemsSolved > 1 ? 's' : ''}`,
            description: entry.platform ? `on ${entry.platform.name}` : 'Manual entry',
            icon: 'Code',
            color: entry.platform?.color || '#3B82F6',
            metadata: {
              platformId: entry.platformId,
              platformName: entry.platform?.name,
              count: entry.problemsSolved,
              category: entry.category,
            },
          });
        }

        if (entry.commits > 0 && (params.type === 'all' || params.type === 'commits')) {
          activities.push({
            id: `tracker_commits_${entry.id}`,
            type: 'tracker',
            date: entry.date.toISOString(),
            title: `Made ${entry.commits} commit${entry.commits > 1 ? 's' : ''}`,
            description: entry.platform ? `on ${entry.platform.name}` : 'Manual entry',
            icon: 'GitCommit',
            color: entry.platform?.color || '#10B981',
            metadata: {
              platformId: entry.platformId,
              platformName: entry.platform?.name,
              count: entry.commits,
            },
          });
        }
      });
    }

    // Fetch goal completions
    if (params.type === 'all' || params.type === 'goals') {
      const completedGoals = await prisma.goal.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: startDate },
        },
        orderBy: { completedAt: 'desc' },
        take: 20,
      });

      completedGoals.forEach(goal => {
        activities.push({
          id: `goal_completed_${goal.id}`,
          type: 'goal_completed',
          date: goal.completedAt!.toISOString(),
          title: 'Goal Completed! 🎉',
          description: goal.title,
          icon: 'Target',
          color: '#10B981',
          metadata: {
            goalId: goal.id,
            target: goal.target,
            category: goal.category,
          },
        });
      });

      const createdGoals = await prisma.goal.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      createdGoals.forEach(goal => {
        activities.push({
          id: `goal_created_${goal.id}`,
          type: 'goal_created',
          date: goal.createdAt.toISOString(),
          title: 'New Goal Set',
          description: goal.title,
          icon: 'Flag',
          color: '#8B5CF6',
          metadata: {
            goalId: goal.id,
            target: goal.target,
            deadline: goal.deadline?.toISOString(),
          },
        });
      });
    }

    // Fetch achievements
    if (params.type === 'all' || params.type === 'achievements') {
      const achievements = await prisma.userAchievement.findMany({
        where: {
          userId,
          unlockedAt: { gte: startDate },
        },
        include: {
          achievement: { select: { title: true, icon: true, tier: true, points: true } },
        },
        orderBy: { unlockedAt: 'desc' },
        take: 20,
      });

      achievements.forEach(ua => {
        activities.push({
          id: `achievement_${ua.id}`,
          type: 'achievement',
          date: ua.unlockedAt.toISOString(),
          title: 'Achievement Unlocked! 🏆',
          description: ua.achievement.title,
          icon: ua.achievement.icon || 'Award',
          color: '#F59E0B',
          metadata: {
            achievementId: ua.achievementId,
            tier: ua.achievement.tier,
            points: ua.achievement.points,
          },
        });
      });
    }

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply pagination
    const paginatedActivities = activities.slice(skip, skip + params.limit);
    const total = activities.length;

    // Group by date for display
    const groupedByDate: Record<string, ActivityItem[]> = {};
    paginatedActivities.forEach(activity => {
      const dateKey = format(new Date(activity.date), 'yyyy-MM-dd');
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(activity);
    });

    // Build response
    const response = {
      activities: paginatedActivities,
      grouped: Object.entries(groupedByDate).map(([date, items]) => ({
        date,
        label: format(new Date(date), 'EEEE, MMMM d'),
        items,
      })),
      summary: {
        total,
        byType: activities.reduce<Record<string, number>>((acc, a) => {
          acc[a.type] = (acc[a.type] || 0) + 1;
          return acc;
        }, {}),
      },
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
        hasNextPage: params.page * params.limit < total,
        hasPreviousPage: params.page > 1,
      },
    };

    logger.info('Activity feed fetched', {
      userId,
      days: params.days,
      activityCount: paginatedActivities.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/activity failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch activity feed', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';