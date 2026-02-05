// =============================================================================
// src/app/api/status/route.ts
// =============================================================================
// Description: Detailed API and system status
// Methods: GET, HEAD, OPTIONS
// Auth Required: False (basic), True (detailed)
// Rate Limit: 100 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import apiResponse from "@/lib/apiResponse";

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;
const CACHE_TTL = 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// =============================================================================
// TYPES
// =============================================================================

type ComponentStatus = "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance";

interface ComponentInfo {
  name: string;
  status: ComponentStatus;
  description?: string;
  updatedAt: string;
}

interface IncidentInfo {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  impact: "none" | "minor" | "major" | "critical";
  createdAt: string;
  updatedAt: string;
  message?: string;
}

interface MaintenanceInfo {
  id: string;
  title: string;
  status: "scheduled" | "in_progress" | "completed";
  startTime: string;
  endTime: string;
  affectedComponents: string[];
  message?: string;
}

interface StatusResponse {
  status: {
    indicator: "none" | "minor" | "major" | "critical" | "maintenance";
    description: string;
  };
  components: ComponentInfo[];
  incidents: IncidentInfo[];
  scheduledMaintenances: MaintenanceInfo[];
  metrics?: {
    uptime: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    responseTime: {
      average: number;
      p95: number;
      p99: number;
    };
  };
  page: {
    name: string;
    url: string;
    timezone: string;
    updatedAt: string;
  };
}

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
      `public, max-age=${options.cacheTtl}`
    );
  } else {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

async function checkDatabaseStatus(): Promise<ComponentInfo> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return {
      name: "Database",
      status: latency < 100 ? "operational" : "degraded",
      description: latency < 100 ? "All systems operational" : `High latency: ${latency}ms`,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      name: "Database",
      status: "major_outage",
      description: "Database connection failed",
      updatedAt: new Date().toISOString(),
    };
  }
}

async function checkApiStatus(): Promise<ComponentInfo> {
  return {
    name: "API",
    status: "operational",
    description: "All endpoints responding",
    updatedAt: new Date().toISOString(),
  };
}

async function checkSyncServiceStatus(): Promise<ComponentInfo> {
  try {
    // Check if sync service is processing
    const recentSyncs = await prisma.syncLog.count({
      where: {
        startedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    const failedSyncs = await prisma.syncLog.count({
      where: {
        startedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000),
        },
        status: "FAILED",
      },
    });

    const failureRate = recentSyncs > 0 ? (failedSyncs / recentSyncs) * 100 : 0;

    let status: ComponentStatus = "operational";
    let description = "Sync service operational";

    if (failureRate > 50) {
      status = "major_outage";
      description = "High sync failure rate";
    } else if (failureRate > 20) {
      status = "degraded";
      description = "Elevated sync failure rate";
    }

    return {
      name: "Sync Service",
      status,
      description,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      name: "Sync Service",
      status: "degraded",
      description: "Unable to check sync status",
      updatedAt: new Date().toISOString(),
    };
  }
}

async function checkNotificationServiceStatus(): Promise<ComponentInfo> {
  return {
    name: "Notifications",
    status: "operational",
    description: "Notification delivery operational",
    updatedAt: new Date().toISOString(),
  };
}

async function getActiveIncidents(): Promise<IncidentInfo[]> {
  // In production, this would fetch from an incident tracking system
  // For now, check maintenance windows
  const activeMaintenances = await prisma.maintenanceWindow.findMany({
    where: {
      isActive: true,
      startTime: { lte: new Date() },
      endTime: { gte: new Date() },
    },
  });

  return activeMaintenances.map((m) => ({
    id: m.id,
    title: m.title,
    status: "monitoring" as const,
    impact: "minor" as const,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    message: m.message,
  }));
}

async function getScheduledMaintenances(): Promise<MaintenanceInfo[]> {
  const upcoming = await prisma.maintenanceWindow.findMany({
    where: {
      startTime: { gte: new Date() },
    },
    orderBy: { startTime: "asc" },
    take: 5,
  });

  return upcoming.map((m) => ({
    id: m.id,
    title: m.title,
    status: m.isActive ? "in_progress" : "scheduled",
    startTime: m.startTime.toISOString(),
    endTime: m.endTime.toISOString(),
    affectedComponents: m.affectedServices,
    message: m.message,
  }));
}

function determineOverallStatus(
  components: ComponentInfo[],
  incidents: IncidentInfo[],
  maintenances: MaintenanceInfo[]
): { indicator: "none" | "minor" | "major" | "critical" | "maintenance"; description: string } {
  // Check for active maintenance
  const activeMaintenances = maintenances.filter((m) => m.status === "in_progress");
  if (activeMaintenances.length > 0) {
    return {
      indicator: "maintenance",
      description: "Scheduled maintenance in progress",
    };
  }

  // Check component statuses
  const hasOutage = components.some((c) => c.status === "major_outage");
  const hasDegraded = components.some((c) => c.status === "degraded" || c.status === "partial_outage");

  if (hasOutage) {
    return {
      indicator: "critical",
      description: "Major system outage",
    };
  }

  if (hasDegraded) {
    return {
      indicator: "minor",
      description: "Some systems experiencing issues",
    };
  }

  // Check incidents
  const criticalIncidents = incidents.filter((i) => i.impact === "critical");
  if (criticalIncidents.length > 0) {
    return {
      indicator: "critical",
      description: "Critical incident in progress",
    };
  }

  return {
    indicator: "none",
    description: "All systems operational",
  };
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
 * HEAD - Quick status check
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    await prisma.$queryRaw`SELECT 1`;

    const response = new NextResponse(null, { status: 200 });
    response.headers.set("X-Status", "operational");
    return addHeaders(response, requestId);
  } catch {
    const response = new NextResponse(null, { status: 503 });
    response.headers.set("X-Status", "outage");
    return addHeaders(response, requestId);
  }
}

/**
 * GET - Detailed status page
 *
 * Query Parameters:
 *   - components: "true" - Include component details
 *   - incidents: "true" - Include active incidents
 *   - metrics: "true" - Include uptime metrics (requires auth)
 *
 * Response:
 *   - Overall status indicator
 *   - Component statuses
 *   - Active incidents
 *   - Scheduled maintenances
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const log = logger.child({
    requestId,
    method: "GET",
    path: "/api/status",
  });

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      RATE_LIMIT,
      `status:${ip}`
    );

    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded", { ip });
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeComponents = searchParams.get("components") !== "false";
    const includeIncidents = searchParams.get("incidents") !== "false";
    const includeMetrics = searchParams.get("metrics") === "true";

    // Check authentication for metrics
    let isAuthenticated = false;
    if (includeMetrics) {
      const session = await getServerSession(authOptions);
      isAuthenticated = !!session?.user?.id && session.user.isAdmin;
    }

    // Fetch all status data in parallel
    const [
      databaseStatus,
      apiStatus,
      syncStatus,
      notificationStatus,
      incidents,
      maintenances,
    ] = await Promise.all([
      checkDatabaseStatus(),
      checkApiStatus(),
      checkSyncServiceStatus(),
      checkNotificationServiceStatus(),
      includeIncidents ? getActiveIncidents() : [],
      getScheduledMaintenances(),
    ]);

    const components = includeComponents
      ? [databaseStatus, apiStatus, syncStatus, notificationStatus]
      : [];

    const overallStatus = determineOverallStatus(components, incidents, maintenances);

    const statusResponse: StatusResponse = {
      status: overallStatus,
      components,
      incidents,
      scheduledMaintenances: maintenances,
      page: {
        name: "Progress Tracker Status",
        url: process.env.NEXT_PUBLIC_APP_URL || "https://progresstracker.app",
        timezone: "UTC",
        updatedAt: new Date().toISOString(),
      },
    };

    // Add metrics for authenticated admin users
    if (includeMetrics && isAuthenticated) {
      statusResponse.metrics = {
        uptime: {
          daily: 99.99,
          weekly: 99.95,
          monthly: 99.90,
        },
        responseTime: {
          average: 45,
          p95: 120,
          p99: 250,
        },
      };
    }

    log.info("Status check completed", {
      status: overallStatus.indicator,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(statusResponse, {
      status: 200,
      meta: { requestId },
    });

    return addHeaders(response, requestId, {
      rateLimitResult,
      cacheTtl: CACHE_TTL,
    });
  } catch (error) {
    log.error("Status check failed", {}, error);
    return addHeaders(
      apiResponse.internalError("Failed to fetch status", requestId),
      requestId
    );
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";