// =============================================================================
// src/app/api/logs/route.ts
// =============================================================================
// Description: System and audit logs (Admin only)
// Methods: GET, OPTIONS
// Auth Required: True (Admin)
// Rate Limit: 30 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { AuditAction, Prisma } from "@prisma/client";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import apiResponse from "@/lib/apiResponse";

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: AuditAction;
  category: string | null;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  status: string;
  errorMessage: string | null;
  performedBy: string | null;
  createdAt: string;
}

interface LogStats {
  total: number;
  byAction: { action: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
  last24Hours: number;
  last7Days: number;
  topUsers: { userId: string; userName: string | null; count: number }[];
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  userId: z.string().cuid().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  category: z.string().max(50).optional(),
  entityType: z.string().max(50).optional(),
  entityId: z.string().max(100).optional(),
  status: z.enum(["success", "failure", "all"]).default("all"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeStats: z.enum(["true", "false"]).default("false"),
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

function maskSensitiveData(log: AuditLogEntry): AuditLogEntry {
  // Mask IP address partially
  if (log.ipAddress) {
    const parts = log.ipAddress.split(".");
    if (parts.length === 4) {
      log.ipAddress = `${parts[0]}.${parts[1]}.***.***`;
    }
  }

  return log;
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
 * GET - Get audit logs (Admin only)
 *
 * Query Parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 50, max: 100)
 *   - userId: Filter by user ID
 *   - action: Filter by action type
 *   - category: Filter by category
 *   - entityType: Filter by entity type
 *   - entityId: Filter by entity ID
 *   - status: "success" | "failure" | "all"
 *   - startDate: Filter from date (ISO string)
 *   - endDate: Filter to date (ISO string)
 *   - search: Search in description
 *   - sortOrder: "asc" | "desc"
 *   - includeStats: "true" | "false" - Include statistics
 *
 * Response:
 *   - List of audit log entries
 *   - Statistics (if requested)
 *   - Pagination info
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const log = logger.child({
    requestId,
    method: "GET",
    path: "/api/logs",
  });

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      RATE_LIMIT,
      `logs:${ip}`
    );

    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded", { ip });
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Authentication & Authorization
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn("Unauthorized access attempt");
      return addHeaders(
        apiResponse.unauthorized("Authentication required", requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Check admin role
    if (!session.user.isAdmin) {
      log.warn("Non-admin access attempt", { userId: session.user.id });
      return addHeaders(
        apiResponse.forbidden("Admin access required", requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      userId: searchParams.get("userId"),
      action: searchParams.get("action"),
      category: searchParams.get("category"),
      entityType: searchParams.get("entityType"),
      entityId: searchParams.get("entityId"),
      status: searchParams.get("status"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      search: searchParams.get("search"),
      sortOrder: searchParams.get("sortOrder"),
      includeStats: searchParams.get("includeStats"),
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

    const {
      page,
      limit,
      userId,
      action,
      category,
      entityType,
      entityId,
      status,
      startDate,
      endDate,
      search,
      sortOrder,
      includeStats,
    } = queryValidation.data;

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (category) where.category = category;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (status !== "all") where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.description = { contains: search, mode: "insensitive" };
    }

    // Fetch logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: sortOrder },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Transform logs
    const transformedLogs: AuditLogEntry[] = logs.map((logEntry) => {
      const entry: AuditLogEntry = {
        id: logEntry.id,
        userId: logEntry.userId,
        userName: logEntry.user?.name || null,
        userEmail: logEntry.user?.email || null,
        action: logEntry.action,
        category: logEntry.category,
        entityType: logEntry.entityType,
        entityId: logEntry.entityId,
        description: logEntry.description,
        ipAddress: logEntry.ipAddress,
        country: logEntry.country,
        city: logEntry.city,
        requestPath: logEntry.requestPath,
        requestMethod: logEntry.requestMethod,
        status: logEntry.status,
        errorMessage: logEntry.errorMessage,
        performedBy: logEntry.performedBy,
        createdAt: logEntry.createdAt.toISOString(),
      };

      return maskSensitiveData(entry);
    });

    // Build response
    let stats: LogStats | undefined;

    if (includeStats === "true") {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        byAction,
        byCategory,
        byStatus,
        count24h,
        count7d,
        topUsersData,
      ] = await Promise.all([
        prisma.auditLog.groupBy({
          by: ["action"],
          _count: { action: true },
          orderBy: { _count: { action: "desc" } },
          take: 10,
        }),
        prisma.auditLog.groupBy({
          by: ["category"],
          where: { category: { not: null } },
          _count: { category: true },
          orderBy: { _count: { category: "desc" } },
          take: 10,
        }),
        prisma.auditLog.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
        prisma.auditLog.count({
          where: { createdAt: { gte: last24Hours } },
        }),
        prisma.auditLog.count({
          where: { createdAt: { gte: last7Days } },
        }),
        prisma.auditLog.groupBy({
          by: ["userId"],
          where: { userId: { not: null } },
          _count: { userId: true },
          orderBy: { _count: { userId: "desc" } },
          take: 5,
        }),
      ]);

      // Get user names for top users
      const topUserIds = topUsersData
        .map((u) => u.userId)
        .filter((id): id is string => id !== null);

      const topUserNames = await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: { id: true, name: true },
      });

      const userNameMap = new Map(
        topUserNames.map((u) => [u.id, u.name])
      );

      stats = {
        total,
        byAction: byAction.map((a) => ({
          action: a.action,
          count: a._count.action,
        })),
        byCategory: byCategory.map((c) => ({
          category: c.category || "uncategorized",
          count: c._count.category,
        })),
        byStatus: byStatus.map((s) => ({
          status: s.status,
          count: s._count.status,
        })),
        last24Hours: count24h,
        last7Days: count7d,
        topUsers: topUsersData.map((u) => ({
          userId: u.userId || "unknown",
          userName: userNameMap.get(u.userId || "") || null,
          count: u._count.userId,
        })),
      };
    }

    log.info("Audit logs fetched", {
      adminId: session.user.id,
      total,
      page,
      filters: { userId, action, category, status },
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      transformedLogs,
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
          ...(stats ? { stats } : {}),
        },
      }
    );

    return addHeaders(response, requestId, { rateLimitResult });
  } catch (error) {
    log.error("Failed to fetch audit logs", {}, error);
    return addHeaders(
      apiResponse.internalError("Failed to fetch logs", requestId),
      requestId
    );
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";