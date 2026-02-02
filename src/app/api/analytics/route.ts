// src/app/api/analytics/route.ts
// =============================================================================
// Main Analytics Overview Endpoint
// =============================================================================
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 100 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, startOfDay, endOfDay } from 'date-fns';

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
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const getQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  includeGoals: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  includeAchievements: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  includePlatforms: z.enum(['true', 'false']).optional().default('true').transform(v => v === 'true'),
  includeStreak: z.enum(['true', 'false']).optional().default('true').transform(v => v === 'true'),
});

const postBodySchema = z.object({
  action: z.enum(['refresh', 'recalculate']),
  days: z.number().int().min(1).max(365).optional().default(30),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
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
  const rateLimitKey = `analytics:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
    };
  }

  return { error: null, session, rateLimitResult };
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * HEAD - Resource metadata
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Get count of tracker entries for metadata
    const entryCount = await prisma.trackerEntry.count({
      where: { userId },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Entries', String(entryCount));
    response.headers.set('X-User-ID', userId);

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - Get comprehensive analytics overview
 */
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
    const queryValidation = getQuerySchema.safeParse({
      days: searchParams.get('days') || '30',
      includeGoals: searchParams.get('includeGoals'),
      includeAchievements: searchParams.get('includeAchievements'),
      includePlatforms: searchParams.get('includePlatforms'),
      includeStreak: searchParams.get('includeStreak'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, params.days));

    // Fetch tracker entries for the period
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        platform: {
          select: { id: true, slug: true, name: true, icon: true, color: true, category: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate overview stats
    const overview = {
      totalProblems: entries.reduce((sum, e) => sum + e.problemsSolved, 0),
      totalCommits: entries.reduce((sum, e) => sum + e.commits, 0),
      totalPullRequests: entries.reduce((sum, e) => sum + e.pullRequests, 0),
      totalTimeSpent: entries.reduce((sum, e) => sum + e.timeSpent, 0),
      totalPoints: entries.reduce((sum, e) => sum + (e.pointsEarned || 0), 0),
      activeDays: new Set(entries.map(e => e.date.toDateString())).size,
      totalEntries: entries.length,
      avgProblemsPerDay: 0,
      avgTimePerDay: 0,
      avgCommitsPerDay: 0,
    };

    // Calculate averages
    if (overview.activeDays > 0) {
      overview.avgProblemsPerDay = Math.round((overview.totalProblems / overview.activeDays) * 10) / 10;
      overview.avgTimePerDay = Math.round((overview.totalTimeSpent / overview.activeDays) * 10) / 10;
      overview.avgCommitsPerDay = Math.round((overview.totalCommits / overview.activeDays) * 10) / 10;
    }

    // Get user streak data
    let streakData = null;
    if (params.includeStreak) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          streakStartDate: true,
          lastActivityDate: true,
        },
      });
      streakData = user;
    }

    // Get platform breakdown
    let platformStats = null;
    if (params.includePlatforms) {
      const platformMap = new Map<string, {
        platformId: string;
        platformName: string;
        platformSlug: string;
        icon: string | null;
        color: string | null;
        category: string;
        problems: number;
        commits: number;
        time: number;
        entries: number;
      }>();

      entries.forEach(entry => {
        if (entry.platform) {
          const key = entry.platform.id;
          const existing = platformMap.get(key) || {
            platformId: entry.platform.id,
            platformName: entry.platform.name,
            platformSlug: entry.platform.slug,
            icon: entry.platform.icon,
            color: entry.platform.color,
            category: entry.platform.category,
            problems: 0,
            commits: 0,
            time: 0,
            entries: 0,
          };

          existing.problems += entry.problemsSolved;
          existing.commits += entry.commits;
          existing.time += entry.timeSpent;
          existing.entries += 1;

          platformMap.set(key, existing);
        }
      });

      platformStats = Array.from(platformMap.values())
        .sort((a, b) => b.problems - a.problems)
        .map((p, index) => ({
          ...p,
          rank: index + 1,
          percentage: overview.totalProblems > 0
            ? Math.round((p.problems / overview.totalProblems) * 100)
            : 0,
        }));
    }

    // Get goals summary
    let goalsSummary = null;
    if (params.includeGoals) {
      const goals = await prisma.goal.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          progress: true,
          target: true,
        },
      });

      goalsSummary = {
        total: goals.length,
        active: goals.filter(g => g.status === 'ACTIVE').length,
        completed: goals.filter(g => g.status === 'COMPLETED').length,
        avgProgress: goals.length > 0
          ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
          : 0,
      };
    }

    // Get achievements summary
    let achievementsSummary = null;
    if (params.includeAchievements) {
      const achievements = await prisma.userAchievement.count({
        where: { userId },
      });

      const totalAchievements = await prisma.achievement.count({
        where: { isActive: true },
      });

      achievementsSummary = {
        unlocked: achievements,
        total: totalAchievements,
        percentage: totalAchievements > 0
          ? Math.round((achievements / totalAchievements) * 100)
          : 0,
      };
    }

    // Build response
    const analytics = {
      overview,
      streak: streakData,
      platforms: platformStats,
      goals: goalsSummary,
      achievements: achievementsSummary,
      period: {
        days: params.days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    logger.info('Analytics overview fetched', {
      userId,
      days: params.days,
      entries: entries.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(analytics, {
      meta: {
        requestId,
        days: params.days,
        cached: false,
      },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET analytics failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch analytics', requestId), requestId);
  }
}

/**
 * POST - Refresh or recalculate analytics
 */
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

    const { action, days } = validation.data;

    if (action === 'recalculate') {
      // Recalculate user stats from tracker entries
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      const entries = await prisma.trackerEntry.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
      });

      const totals = {
        totalProblems: entries.reduce((sum, e) => sum + e.problemsSolved, 0),
        totalCommits: entries.reduce((sum, e) => sum + e.commits, 0),
        totalPoints: entries.reduce((sum, e) => sum + (e.pointsEarned || 0), 0),
      };

      // Update user totals
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalProblems: totals.totalProblems,
          totalCommits: totals.totalCommits,
          totalPoints: totals.totalPoints,
          lastActiveAt: new Date(),
        },
      });

      logger.info('Analytics recalculated', {
        userId,
        days,
        totals,
        requestId,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success({
        message: 'Analytics recalculated successfully',
        totals,
        entriesProcessed: entries.length,
      }, { meta: { requestId } });

      return addHeaders(response, requestId, rateLimitResult);
    }

    // Default: refresh (just return current analytics)
    const response = apiResponse.success({
      message: 'Analytics refreshed',
      action,
    }, { meta: { requestId } });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST analytics failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to process analytics', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';