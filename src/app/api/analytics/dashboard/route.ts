// src/app/api/analytics/dashboard/route.ts
// =============================================================================
// Dashboard Summary Analytics
// =============================================================================
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 100 requests/minute
// =============================================================================


/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, startOfDay, format, startOfWeek, startOfMonth } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
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
  widgets: z.string().optional().transform(v => v ? v.split(',') : undefined),
  compact: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
});

const postBodySchema = z.object({
  layout: z.array(z.object({
    id: z.string(),
    type: z.enum(['stats', 'chart', 'list', 'progress', 'heatmap', 'streak', 'goals', 'achievements']),
    position: z.object({ row: z.number(), col: z.number() }),
    size: z.enum(['small', 'medium', 'large', 'full']),
    visible: z.boolean(),
  })).optional(),
  preferences: z.object({
    defaultRange: z.enum(['7d', '14d', '30d', '90d']).optional(),
    showWelcome: z.boolean().optional(),
    compactMode: z.boolean().optional(),
  }).optional(),
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
  const rateLimitKey = `analytics-dashboard:${ip}`;
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
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Dashboard-Version', '2.0');
    response.headers.set('X-User-ID', session!.user.id);

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/dashboard failed', { requestId }, error);
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
      widgets: searchParams.get('widgets'),
      compact: searchParams.get('compact'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;

    // Date ranges
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const last7Days = startOfDay(subDays(now, 7));
    const last30Days = startOfDay(subDays(now, 30));

    // Parallel data fetching for performance
    const [
      user,
      todayEntries,
      weekEntries,
      monthEntries,
      recentEntries,
      activeGoals,
      recentAchievements,
      connectedPlatforms,
    ] = await Promise.all([
      // User data with streak info
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          currentStreak: true,
          longestStreak: true,
          streakStartDate: true,
          lastActivityDate: true,
          totalProblems: true,
          totalCommits: true,
          totalPoints: true,
          totalAchievements: true,
        },
      }),

      // Today's entries
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: today } },
        select: { problemsSolved: true, commits: true, timeSpent: true, pointsEarned: true },
      }),

      // This week's entries
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: weekStart } },
        select: { problemsSolved: true, commits: true, timeSpent: true, pointsEarned: true, date: true },
      }),

      // This month's entries
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: monthStart } },
        select: { problemsSolved: true, commits: true, timeSpent: true, date: true },
      }),

      // Recent entries for activity feed
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: last7Days } },
        include: {
          platform: { select: { name: true, icon: true, color: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),

      // Active goals
      prisma.goal.findMany({
        where: { userId, status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          progress: true,
          target: true,
          deadline: true,
          category: true,
        },
        orderBy: { deadline: 'asc' },
        take: 5,
      }),

      // Recent achievements
      prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: { select: { title: true, icon: true, tier: true, points: true } },
        },
        orderBy: { unlockedAt: 'desc' },
        take: 5,
      }),

      // Connected platforms count
      prisma.userPlatform.count({
        where: { userId, isActive: true },
      }),
    ]);

    // Calculate stats
    const todayStats = {
      problems: todayEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
      commits: todayEntries.reduce((sum, e) => sum + e.commits, 0),
      time: todayEntries.reduce((sum, e) => sum + e.timeSpent, 0),
      points: todayEntries.reduce((sum, e) => sum + (e.pointsEarned || 0), 0),
    };

    const weekStats = {
      problems: weekEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
      commits: weekEntries.reduce((sum, e) => sum + e.commits, 0),
      time: weekEntries.reduce((sum, e) => sum + e.timeSpent, 0),
      activeDays: new Set(weekEntries.map(e => e.date.toDateString())).size,
    };

    const monthStats = {
      problems: monthEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
      commits: monthEntries.reduce((sum, e) => sum + e.commits, 0),
      time: monthEntries.reduce((sum, e) => sum + e.timeSpent, 0),
      activeDays: new Set(monthEntries.map(e => e.date.toDateString())).size,
    };

    // Build mini chart data (last 7 days)
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayEntries = weekEntries.filter(e => format(e.date, 'yyyy-MM-dd') === dateStr);

      return {
        date: dateStr,
        label: format(date, 'EEE'),
        problems: dayEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
        commits: dayEntries.reduce((sum, e) => sum + e.commits, 0),
        time: dayEntries.reduce((sum, e) => sum + e.timeSpent, 0),
      };
    });

    // Build response
    const dashboard = {
      user: {
        name: user?.name || 'User',
        streak: {
          current: user?.currentStreak || 0,
          longest: user?.longestStreak || 0,
          startDate: user?.streakStartDate?.toISOString() || null,
          lastActivity: user?.lastActivityDate?.toISOString() || null,
        },
        totals: {
          problems: user?.totalProblems || 0,
          commits: user?.totalCommits || 0,
          points: user?.totalPoints || 0,
          achievements: user?.totalAchievements || 0,
        },
      },
      stats: {
        today: todayStats,
        thisWeek: weekStats,
        thisMonth: monthStats,
      },
      chart: chartData,
      goals: activeGoals.map(goal => ({
        id: goal.id,
        title: goal.title,
        progress: goal.progress,
        target: goal.target,
        percentage: goal.target > 0 ? Math.round((goal.progress / goal.target) * 100) : 0,
        deadline: goal.deadline?.toISOString() || null,
        category: goal.category,
        isAtRisk: goal.deadline
          ? new Date(goal.deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && goal.progress < 80
          : false,
      })),
      achievements: recentAchievements.map(ua => ({
        id: ua.id,
        title: ua.achievement.title,
        icon: ua.achievement.icon,
        tier: ua.achievement.tier,
        points: ua.achievement.points,
        unlockedAt: ua.unlockedAt.toISOString(),
      })),
      activity: recentEntries.map(entry => ({
        id: entry.id,
        date: entry.date.toISOString(),
        platform: entry.platform?.name || 'Manual',
        icon: entry.platform?.icon || null,
        color: entry.platform?.color || null,
        problems: entry.problemsSolved,
        commits: entry.commits,
        time: entry.timeSpent,
      })),
      meta: {
        connectedPlatforms,
        lastUpdated: now.toISOString(),
      },
    };

    // If compact mode, reduce data
    if (params.compact) {
      delete (dashboard as Record<string, unknown>).activity;
      delete (dashboard as Record<string, unknown>).chart;
    }

    logger.info('Dashboard data fetched', {
      userId,
      compact: params.compact,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(dashboard, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/dashboard failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch dashboard', requestId), requestId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = postBodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { layout, preferences } = validation.data;

    // Update user settings
    const updateData: Record<string, unknown> = {};

    if (layout) {
      updateData.dashboardLayout = { widgets: layout };
    }

    if (preferences) {
      if (preferences.defaultRange) updateData.defaultDateRange = preferences.defaultRange;
      if (preferences.showWelcome !== undefined) updateData.showWelcomeBanner = preferences.showWelcome;
      if (preferences.compactMode !== undefined) updateData.compactMode = preferences.compactMode;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.userSettings.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          ...updateData,
        },
      });
    }

    logger.info('Dashboard preferences updated', {
      userId,
      updates: Object.keys(updateData),
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({ message: 'Dashboard preferences saved' }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST analytics/dashboard failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to save preferences', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';