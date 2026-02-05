// =============================================================================
// src/app/api/login-history/route.ts
// =============================================================================
// Description: User login history and security events
// Methods: GET, DELETE, OPTIONS
// Auth Required: True
// Rate Limit: 30 requests/minute
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

const RATE_LIMIT = 30;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store, private",
};

// =============================================================================
// TYPES
// =============================================================================

interface LoginAttemptResponse {
  id: string;
  success: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  twoFactorRequired: boolean;
  twoFactorPassed: boolean;
  createdAt: string;
  isSuspicious: boolean;
}

interface LoginHistoryStats {
  total: number;
  successful: number;
  failed: number;
  last24Hours: {
    total: number;
    successful: number;
    failed: number;
  };
  last7Days: {
    total: number;
    successful: number;
    failed: number;
  };
  uniqueIps: number;
  uniqueCountries: string[];
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  success: z
    .enum(["true", "false", "all"])
    .optional()
    .default("all"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
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

function parseUserAgent(userAgent: string | null): {
  device: string | null;
  browser: string | null;
  os: string | null;
} {
  if (!userAgent) {
    return { device: null, browser: null, os: null };
  }

  let device = "Desktop";
  let browser = "Unknown";
  let os = "Unknown";

  // Detect device
  if (/mobile/i.test(userAgent)) {
    device = "Mobile";
  } else if (/tablet|ipad/i.test(userAgent)) {
    device = "Tablet";
  }

  // Detect browser
  if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) {
    browser = "Chrome";
  } else if (/firefox/i.test(userAgent)) {
    browser = "Firefox";
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browser = "Safari";
  } else if (/edge/i.test(userAgent)) {
    browser = "Edge";
  }

  // Detect OS
  if (/windows/i.test(userAgent)) {
    os = "Windows";
  } else if (/mac/i.test(userAgent)) {
    os = "macOS";
  } else if (/linux/i.test(userAgent)) {
    os = "Linux";
  } else if (/android/i.test(userAgent)) {
    os = "Android";
  } else if (/ios|iphone|ipad/i.test(userAgent)) {
    os = "iOS";
  }

  return { device, browser, os };
}

function maskIpAddress(ip: string | null): string | null {
  if (!ip) return null;
  
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  
  return ip.substring(0, 8) + "***";
}

function isSuspiciousLogin(
  attempt: {
    success: boolean;
    ipAddress: string | null;
    country: string | null;
    createdAt: Date;
  },
  userCountries: string[]
): boolean {
  // Failed attempt
  if (!attempt.success) return true;

  // New country
  if (attempt.country && !userCountries.includes(attempt.country)) {
    return true;
  }

  return false;
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
 * GET - Get login history
 *
 * Query Parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 *   - success: "true" | "false" | "all" - Filter by success status
 *   - startDate: ISO date string - Filter from date
 *   - endDate: ISO date string - Filter to date
 *   - sortOrder: "asc" | "desc" - Sort order (default: desc)
 *
 * Response:
 *   - List of login attempts
 *   - Statistics (total, successful, failed)
 *   - Pagination info
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const log = logger.child({
    requestId,
    method: "GET",
    path: "/api/login-history",
  });

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      RATE_LIMIT,
      `login-history:${ip}`
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
      success: searchParams.get("success"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
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

    const { page, limit, success, startDate, endDate, sortOrder } = queryValidation.data;

    // Build where clause
    const where: {
      userId: string;
      success?: boolean;
      createdAt?: { gte?: Date; lte?: Date };
    } = { userId };

    if (success !== "all") {
      where.success = success === "true";
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Fetch login attempts and stats in parallel
    const [attempts, total, stats, userCountriesData] = await Promise.all([
      prisma.loginAttempt.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: sortOrder },
        select: {
          id: true,
          success: true,
          failureReason: true,
          ipAddress: true,
          userAgent: true,
          country: true,
          twoFactorRequired: true,
          twoFactorPassed: true,
          createdAt: true,
        },
      }),
      prisma.loginAttempt.count({ where }),
      // Get stats
      prisma.loginAttempt.groupBy({
        by: ["success"],
        where: { userId },
        _count: { success: true },
      }),
      // Get user's known countries
      prisma.loginAttempt.findMany({
        where: { userId, success: true },
        select: { country: true },
        distinct: ["country"],
      }),
    ]);

    // Get time-based stats
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [stats24h, stats7d, uniqueIpsCount] = await Promise.all([
      prisma.loginAttempt.groupBy({
        by: ["success"],
        where: { userId, createdAt: { gte: last24Hours } },
        _count: { success: true },
      }),
      prisma.loginAttempt.groupBy({
        by: ["success"],
        where: { userId, createdAt: { gte: last7Days } },
        _count: { success: true },
      }),
      prisma.loginAttempt.findMany({
        where: { userId },
        select: { ipAddress: true },
        distinct: ["ipAddress"],
      }),
    ]);

    const userCountries = userCountriesData
      .map((c) => c.country)
      .filter((c): c is string => c !== null);

    // Transform attempts
    const transformedAttempts: LoginAttemptResponse[] = attempts.map((attempt) => {
      const parsed = parseUserAgent(attempt.userAgent);
      
      return {
        id: attempt.id,
        success: attempt.success,
        failureReason: attempt.failureReason,
        ipAddress: maskIpAddress(attempt.ipAddress),
        country: attempt.country,
        device: parsed.device,
        browser: parsed.browser,
        os: parsed.os,
        twoFactorRequired: attempt.twoFactorRequired,
        twoFactorPassed: attempt.twoFactorPassed,
        createdAt: attempt.createdAt.toISOString(),
        isSuspicious: isSuspiciousLogin(attempt, userCountries),
      };
    });

    // Calculate stats
    const successCount = stats.find((s) => s.success)?._count.success || 0;
    const failureCount = stats.find((s) => !s.success)?._count.success || 0;

    const successCount24h = stats24h.find((s) => s.success)?._count.success || 0;
    const failureCount24h = stats24h.find((s) => !s.success)?._count.success || 0;

    const successCount7d = stats7d.find((s) => s.success)?._count.success || 0;
    const failureCount7d = stats7d.find((s) => !s.success)?._count.success || 0;

    const loginStats: LoginHistoryStats = {
      total: successCount + failureCount,
      successful: successCount,
      failed: failureCount,
      last24Hours: {
        total: successCount24h + failureCount24h,
        successful: successCount24h,
        failed: failureCount24h,
      },
      last7Days: {
        total: successCount7d + failureCount7d,
        successful: successCount7d,
        failed: failureCount7d,
      },
      uniqueIps: uniqueIpsCount.length,
      uniqueCountries: userCountries,
    };

    log.info("Login history fetched", {
      userId,
      total,
      page,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      transformedAttempts,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      {
        meta: {
          requestId,
          stats: loginStats,
        },
      }
    );

    return addHeaders(response, requestId, { rateLimitResult });
  } catch (error) {
    log.error("Failed to fetch login history", {}, error);
    return addHeaders(
      apiResponse.internalError("Failed to fetch login history", requestId),
      requestId
    );
  }
}

/**
 * DELETE - Clear login history
 *
 * Clears all login history older than 30 days
 * (Recent history is kept for security)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const log = logger.child({
    requestId,
    method: "DELETE",
    path: "/api/login-history",
  });

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      5,
      `login-history:delete:${ip}`
    );

    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded", { ip });
      return addHeaders(
        apiResponse.rateLimited(300, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return addHeaders(
        apiResponse.unauthorized("Authentication required", requestId),
        requestId,
        { rateLimitResult }
      );
    }

    const userId = session.user.id;

    // Delete login attempts older than 30 days
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deleteResult = await prisma.loginAttempt.deleteMany({
      where: {
        userId,
        createdAt: { lt: cutoffDate },
      },
    });

    log.info("Login history cleared", {
      userId,
      deletedCount: deleteResult.count,
    });

    const response = apiResponse.success(
      {
        message: "Login history cleared",
        deletedCount: deleteResult.count,
        note: "Recent login history (last 30 days) is retained for security purposes",
      },
      {
        status: 200,
        meta: { requestId },
      }
    );

    return addHeaders(response, requestId, { rateLimitResult });
  } catch (error) {
    log.error("Failed to clear login history", {}, error);
    return addHeaders(
      apiResponse.internalError("Failed to clear login history", requestId),
      requestId
    );
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";