// =============================================================================
// src/app/api/metrics/route.ts
// =============================================================================
// Description: User activity metrics and statistics
// Methods: GET, OPTIONS
// Auth Required: True
// Rate Limit: 60 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import apiResponse from "@/lib/apiResponse";

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;
const CACHE_TTL = 300; // 5 minutes

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// =============================================================================
// TYPES
// =============================================================================

interface DailyMetric {
  date: string;
  problems: number;
  commits: number;
  timeSpent: number;
  points: number;
}

interface PlatformMetric {
  platformId: string;
  platformName: string;
  category: string;
  problems: number;
  commits: number;
  timeSpent: number;
  lastSynced: string | null;
}

interface GoalMetric {
  total: number;
  active: number;
  completed: number;
  failed: number;
  completionRate: number;
}

interface AchievementMetric {
  total: number;
  unlocked: number;
  progress: number;
  recentUnlocks: {
    id: string;
    title: string;
    unlockedAt: string;
  }[];
}

interface StreakMetric {
  current: number;
  longest: number;
  totalDays: number;
  averageLength: number;
}

interface UserMetrics {
  overview: {
    totalProblems: number;
    totalCommits: number;
    totalTimeSpent: number;
    totalPoints: number;
    rank: number | null;
    percentile: number;
  };
  daily: DailyMetric[];
  platforms: PlatformMetric[];
  goals: GoalMetric;
  achievements: AchievementMetric;
  streaks: StreakMetric;
  trends: {
    problemsChange: number;
    commitsChange: number;
    timeSpentChange: number;
    trend: "up" | "down" | "stable";
  };
  period: {
    start: string;
    end: string;
    days: number;
  };
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  period: z.enum(["7d", "14d", "30d", "90d", "365d", "all"]).default("30d"),
  include: z
    .string()
    .optional()
    .transform((val) => val?.split(",").map((s) => s.trim()) || []),
  format: z.enum(["full", "summary"]).default("full"),
});

type QueryInput = z.infer<typeof querySchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
    cacheTtl?: number;
  }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(
    ([key, value]) => {
      response.headers.set(key, value);
    }
  );

  response.headers.set("X-Request-ID", requestId);

  if (options?.rateLimitResult) {
    response.headers.set(
      "X-RateLimit-Limit",
      String(options.rateLimitResult.limit)
    );
    response.headers.set(
      "X-RateLimit-Remaining",
      String(options.rateLimitResult.remaining)
    );
  }

  if (options?.cacheTtl) {
    response.headers.set(
      "Cache-Control",
      `private, max-age=${options.cacheTtl}`
    );
  } else {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

function getPeriodDates(period: string): { start: Date; end: Date; days: number } {
  const end = new Date();
  let days: number;

  switch (period) {
    case "7d":
      days = 7;
      break;
    case "14d":
      days = 14;
      break;
    case "30d":
      days = 30;
      break;
    case "90d":
      days = 90;
      break;
    case "365d":
      days = 365;
      break;
    case "all":
      days = 365 * 10; // 10 years as "all"
      break;
    default:
      days = 30;
  }

  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  return { start, end, days };
}

function calculatePercentile(rank: number | null, totalUsers: number): number {
  if (!rank || totalUsers === 0) return 0;
  return Math.round((1 - rank / totalUsers) * 100);
}

function calculateTrend(
  current: number,
  previous: number
): { change: number; trend: "up" | "down" | "stable" } {
  if (previous === 0) {
    return { change: current > 0 ? 100 : 0, trend: current > 0 ? "up" : "stable" };
  }

  const change = Math.round(((current - previous) / previous) * 100);

  let trend: "up" | "down" | "stable";
  if (change > 5) trend = "up";
  else if (change < -5) trend = "down";
  else trend = "stable";

  return { change, trend };
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
 * GET - Get user metrics
 *
 * Query Parameters:
 *   - period: "7d" | "14d" | "30d" | "90d" | "365d" | "all"
 *   - include: Comma-separated list of sections
 *   - format: "full" | "summary"
 *
 * Response:
 *   - Overview statistics
 *   - Daily breakdown
 *   - Platform breakdown
 *   - Goal statistics
 *   - Achievement progress
 *   - Streak information
 *   - Trends comparison
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const log = logger.child({
    requestId,
    method: "GET",
    path: "/api/metrics",
  });

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      RATE_LIMIT,
      `metrics:${ip}`
    );

    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded", { ip });
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn("Unauthorized access attempt");
      return addHeaders(
        apiResponse.unauthorized("Authentication required", requestId),
        requestId,
        { rateLimitResult }
      );
    }

    const userId = session.user.id;

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      period: searchParams.get("period"),
      include: searchParams.get("include"),
      format: searchParams.get("format"),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError(
          "Invalid query parameters",
          queryValidation.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        { rateLimitResult }
      );
    }

    const { period, include, format } = queryValidation.data;
    const { start, end, days } = getPeriodDates(period);

    // Calculate previous period for trends
    const previousStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [
      user,
      totalUsers,
      dailyStats,
      previousPeriodStats,
      platformStats,
      goalStats,
      achievementStats,
      recentAchievements,
      streakStats,
    ] = await Promise.all([
      // User data
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          totalProblems: true,
          totalCommits: true,
          totalProjects: true,
          totalPoints: true,
          rank: true,
          currentStreak: true,
          longestStreak: true,
        },
      }),

      // Total users for percentile
      prisma.user.count({ where: { isActive: true } }),

      // Daily stats for current period
      prisma.dailyStats.findMany({
        where: {
          userId,
          date: { gte: start, lte: end },
        },
        orderBy: { date: "asc" },
      }),

      // Previous period aggregate for trends
      prisma.dailyStats.aggregate({
        where: {
          userId,
          date: { gte: previousStart, lt: start },
        },
        _sum: {
          totalProblems: true,
          totalCommits: true,
          totalTimeSpent: true,
        },
      }),

      // Platform breakdown
      prisma.userPlatform.findMany({
        where: { userId, isActive: true },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      }),

      // Goal stats
      prisma.goal.groupBy({
        by: ["status"],
        where: { userId },
        _count: { status: true },
      }),

      // Achievement stats
      prisma.userAchievement.count({
        where: { userId },
      }),

      // Recent achievements
      prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: {
            select: { id: true, title: true },
          },
        },
        orderBy: { unlockedAt: "desc" },
        take: 5,
      }),

      // Streak history
      prisma.streakHistory.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { length: true },
        _avg: { length: true },
      }),
    ]);

    if (!user) {
      return addHeaders(
        apiResponse.notFound("User", requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Calculate totals for current period
    const currentPeriodTotals = dailyStats.reduce(
      (acc, day) => ({
        problems: acc.problems + day.totalProblems,
        commits: acc.commits + day.totalCommits,
        timeSpent: acc.timeSpent + day.totalTimeSpent,
        points: acc.points + day.totalPoints,
      }),
      { problems: 0, commits: 0, timeSpent: 0, points: 0 }
    );

    // Calculate trends
    const previousProblems = previousPeriodStats._sum.totalProblems || 0;
    const previousCommits = previousPeriodStats._sum.totalCommits || 0;
    const previousTimeSpent = previousPeriodStats._sum.totalTimeSpent || 0;

    const problemsTrend = calculateTrend(currentPeriodTotals.problems, previousProblems);
    const commitsTrend = calculateTrend(currentPeriodTotals.commits, previousCommits);
    const timeSpentTrend = calculateTrend(currentPeriodTotals.timeSpent, previousTimeSpent);

    // Determine overall trend
    const avgChange = (problemsTrend.change + commitsTrend.change + timeSpentTrend.change) / 3;
    const overallTrend: "up" | "down" | "stable" =
      avgChange > 5 ? "up" : avgChange < -5 ? "down" : "stable";

    // Get tracker entries for platform breakdown
    const platformEntries = await prisma.trackerEntry.groupBy({
      by: ["platformId"],
      where: {
        userId,
        date: { gte: start, lte: end },
        platformId: { not: null },
      },
      _sum: {
        problemsSolved: true,
        commits: true,
        timeSpent: true,
      },
    });

    const platformMap = new Map(
      platformStats.map((p) => [
        p.platformId,
        {
          name: p.platform.name,
          category: p.platform.category,
          lastSynced: p.lastSyncedAt,
        },
      ])
    );

    // Build platform metrics
    const platforms: PlatformMetric[] = platformEntries
      .filter((e) => e.platformId && platformMap.has(e.platformId))
      .map((e) => {
        const info = platformMap.get(e.platformId!)!;
        return {
          platformId: e.platformId!,
          platformName: info.name,
          category: info.category,
          problems: e._sum.problemsSolved || 0,
          commits: e._sum.commits || 0,
          timeSpent: e._sum.timeSpent || 0,
          lastSynced: info.lastSynced?.toISOString() || null,
        };
      });

    // Build goal metrics
    const goalStatusMap = new Map(
      goalStats.map((g) => [g.status, g._count.status])
    );

    const totalGoals =
      (goalStatusMap.get("ACTIVE") || 0) +
      (goalStatusMap.get("COMPLETED") || 0) +
      (goalStatusMap.get("FAILED") || 0) +
      (goalStatusMap.get("PAUSED") || 0);

    const completedGoals = goalStatusMap.get("COMPLETED") || 0;

    const goals: GoalMetric = {
      total: totalGoals,
      active: goalStatusMap.get("ACTIVE") || 0,
      completed: completedGoals,
      failed: goalStatusMap.get("FAILED") || 0,
      completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
    };

    // Get total achievements count
    const totalAchievements = await prisma.achievement.count({
      where: { isActive: true },
    });

    // Build achievement metrics
    const achievements: AchievementMetric = {
      total: totalAchievements,
      unlocked: achievementStats,
      progress: totalAchievements > 0
        ? Math.round((achievementStats / totalAchievements) * 100)
        : 0,
      recentUnlocks: recentAchievements.map((a) => ({
        id: a.achievement.id,
        title: a.achievement.title,
        unlockedAt: a.unlockedAt.toISOString(),
      })),
    };

    // Build streak metrics
    const streaks: StreakMetric = {
      current: user.currentStreak,
      longest: user.longestStreak,
      totalDays: streakStats._sum.length || 0,
      averageLength: Math.round(streakStats._avg.length || 0),
    };

    // Build daily metrics
    const daily: DailyMetric[] = dailyStats.map((day) => ({
      date: day.date.toISOString().split("T")[0],
      problems: day.totalProblems,
      commits: day.totalCommits,
      timeSpent: day.totalTimeSpent,
      points: day.totalPoints,
    }));

    // Build response
    const metrics: UserMetrics = {
      overview: {
        totalProblems: user.totalProblems,
        totalCommits: user.totalCommits,
        totalTimeSpent: currentPeriodTotals.timeSpent,
        totalPoints: user.totalPoints,
        rank: user.rank,
        percentile: calculatePercentile(user.rank, totalUsers),
      },
      daily: format === "summary" ? daily.slice(-7) : daily,
      platforms,
      goals,
      achievements,
      streaks,
      trends: {
        problemsChange: problemsTrend.change,
        commitsChange: commitsTrend.change,
        timeSpentChange: timeSpentTrend.change,
        trend: overallTrend,
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        days,
      },
    };

    log.info("Metrics fetched", {
      userId,
      period,
      format,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(metrics, {
      status: 200,
      meta: { requestId },
    });

    return addHeaders(response, requestId, {
      rateLimitResult,
      cacheTtl: CACHE_TTL,
    });
  } catch (error) {
    log.error("Failed to fetch metrics", {}, error);
    return addHeaders(
      apiResponse.internalError("Failed to fetch metrics", requestId),
      requestId
    );
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";