// =============================================================================
// src/app/api/streak-history/route.ts
// =============================================================================
// Description: User streak history and statistics
// Methods: GET, OPTIONS
// Auth Required: True
// Rate Limit: 60 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import apiResponse from "@/lib/apiResponse";
/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "private, max-age=60",
};

// =============================================================================
// TYPES
// =============================================================================

interface StreakRecord {
  id: string;
  startDate: string;
  endDate: string;
  length: number;
  isActive: boolean;
  isCurrent: boolean;
  endReason: string | null;
  totalProblems: number;
  totalCommits: number;
  averageDaily: number;
}

interface CurrentStreak {
  length: number;
  startDate: string | null;
  lastActivityDate: string | null;
  isAtRisk: boolean;
  freezesAvailable: number;
  freezesUsed: number;
}

interface StreakStats {
  totalStreaks: number;
  longestStreak: number;
  currentStreak: number;
  averageLength: number;
  totalDaysActive: number;
  streakDistribution: {
    range: string;
    count: number;
  }[];
}

interface StreakHistoryResponse {
  streaks: StreakRecord[];
  current: CurrentStreak;
  stats: StreakStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  isActive: z.enum(["true", "false", "all"]).optional().default("all"),
  minLength: z.coerce.number().int().min(1).optional(),
  sortBy: z.enum(["startDate", "length", "endDate"]).default("startDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
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

  return response;
}

function isStreakAtRisk(lastActivityDate: Date | null): boolean {
  if (!lastActivityDate) return false;

  const now = new Date();
  const hoursSinceActivity =
    (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60);

  // Streak is at risk if no activity in last 20 hours
  return hoursSinceActivity >= 20 && hoursSinceActivity < 24;
}

function calculateStreakDistribution(
  streaks: { length: number }[]
): { range: string; count: number }[] {
  const ranges = [
    { min: 1, max: 7, label: "1-7 days" },
    { min: 8, max: 14, label: "8-14 days" },
    { min: 15, max: 30, label: "15-30 days" },
    { min: 31, max: 60, label: "31-60 days" },
    { min: 61, max: 90, label: "61-90 days" },
    { min: 91, max: Infinity, label: "90+ days" },
  ];

  return ranges.map((range) => ({
    range: range.label,
    count: streaks.filter(
      (s) => s.length >= range.min && s.length <= range.max
    ).length,
  }));
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
 * GET - Get streak history
 *
 * Query Parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 10, max: 100)
 *   - isActive: "true" | "false" | "all" - Filter by active status
 *   - minLength: Minimum streak length to include
 *   - sortBy: "startDate" | "length" | "endDate"
 *   - sortOrder: "asc" | "desc"
 *
 * Response:
 *   - List of streak records
 *   - Current streak info
 *   - Statistics
 *   - Pagination info
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const log = logger.child({
    requestId,
    method: "GET",
    path: "/api/streak-history",
  });

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      RATE_LIMIT,
      `streak-history:${ip}`
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
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      isActive: searchParams.get("isActive"),
      minLength: searchParams.get("minLength"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
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

    const { page, limit, isActive, minLength, sortBy, sortOrder } = queryValidation.data;

    // Build where clause
    const where: {
      userId: string;
      isActive?: boolean;
      length?: { gte: number };
    } = { userId };

    if (isActive !== "all") {
      where.isActive = isActive === "true";
    }

    if (minLength) {
      where.length = { gte: minLength };
    }

    // Fetch data in parallel
    const [streaks, total, user, allStreaks] = await Promise.all([
      prisma.streakHistory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.streakHistory.count({ where }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          lastActivityDate: true,
          streakStartDate: true,
          streakFreezeCount: true,
          streakFreezeUsedAt: true,
        },
      }),
      // Get all streaks for statistics
      prisma.streakHistory.findMany({
        where: { userId },
        select: { length: true },
      }),
    ]);

    if (!user) {
      return addHeaders(
        apiResponse.notFound("User", requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Transform streaks
    const transformedStreaks: StreakRecord[] = streaks.map((streak) => {
      const days = Math.ceil(
        (streak.endDate.getTime() - streak.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      
      return {
        id: streak.id,
        startDate: streak.startDate.toISOString(),
        endDate: streak.endDate.toISOString(),
        length: streak.length,
        isActive: streak.isActive,
        isCurrent: streak.isCurrent,
        endReason: streak.endReason,
        totalProblems: streak.totalProblems,
        totalCommits: streak.totalCommits,
        averageDaily: days > 0 
          ? Math.round((streak.totalProblems + streak.totalCommits) / days)
          : 0,
      };
    });

    // Build current streak info
    const currentStreak: CurrentStreak = {
      length: user.currentStreak,
      startDate: user.streakStartDate?.toISOString() || null,
      lastActivityDate: user.lastActivityDate?.toISOString() || null,
      isAtRisk: isStreakAtRisk(user.lastActivityDate),
      freezesAvailable: Math.max(0, 3 - (user.streakFreezeCount || 0)),
      freezesUsed: user.streakFreezeCount || 0,
    };

    // Calculate statistics
    const totalDaysActive = allStreaks.reduce((sum, s) => sum + s.length, 0);
    const averageLength = allStreaks.length > 0
      ? Math.round(totalDaysActive / allStreaks.length)
      : 0;

    const stats: StreakStats = {
      totalStreaks: allStreaks.length,
      longestStreak: user.longestStreak,
      currentStreak: user.currentStreak,
      averageLength,
      totalDaysActive,
      streakDistribution: calculateStreakDistribution(allStreaks),
    };

    const response: StreakHistoryResponse = {
      streaks: transformedStreaks,
      current: currentStreak,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };

    log.info("Streak history fetched", {
      userId,
      total,
      page,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, {
        status: 200,
        meta: { requestId },
      }),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    log.error("Failed to fetch streak history", {}, error);
    return addHeaders(
      apiResponse.internalError("Failed to fetch streak history", requestId),
      requestId
    );
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";