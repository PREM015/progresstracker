// =============================================================================
// src/app/api/health/route.ts
// =============================================================================
// Description: Comprehensive health check endpoint for monitoring
// Methods: GET, HEAD, OPTIONS
// Auth Required: False
// Rate Limit: 200 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import apiResponse from "@/lib/apiResponse";

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 200;
const CACHE_TTL = 30; // 30 seconds

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

type ServiceStatus = "operational" | "degraded" | "down" | "unknown";

interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  message?: string;
  lastCheck: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    api: ServiceHealth;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu?: {
      usage: number;
    };
  };
  checks: {
    name: string;
    status: ServiceStatus;
    duration: number;
  }[];
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
      `public, max-age=${options.cacheTtl}, s-maxage=${options.cacheTtl}`
    );
  }

  return response;
}

async function checkDatabase(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    return {
      status: latency < 100 ? "operational" : "degraded",
      latency,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "down",
      message: error instanceof Error ? error.message : "Database connection failed",
      lastCheck: new Date().toISOString(),
    };
  }
}

async function checkCache(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    // For now, return operational as we're using in-memory rate limiter
    // In production, this would check Redis connection
    const latency = Date.now() - startTime;

    return {
      status: "operational",
      latency,
      message: "In-memory cache operational",
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "down",
      message: error instanceof Error ? error.message : "Cache check failed",
      lastCheck: new Date().toISOString(),
    };
  }
}

function getSystemMetrics(): {
  memory: { used: number; total: number; percentage: number };
} {
  const memUsage = process.memoryUsage();
  const used = Math.round(memUsage.heapUsed / 1024 / 1024);
  const total = Math.round(memUsage.heapTotal / 1024 / 1024);
  const percentage = Math.round((used / total) * 100);

  return {
    memory: { used, total, percentage },
  };
}

function determineOverallStatus(services: {
  database: ServiceHealth;
  cache: ServiceHealth;
  api: ServiceHealth;
}): "healthy" | "degraded" | "unhealthy" {
  const statuses = [
    services.database.status,
    services.cache.status,
    services.api.status,
  ];

  if (statuses.includes("down")) {
    // If database is down, system is unhealthy
    if (services.database.status === "down") {
      return "unhealthy";
    }
    return "degraded";
  }

  if (statuses.includes("degraded")) {
    return "degraded";
  }

  return "healthy";
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
 * HEAD - Quick health check
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;

    const response = new NextResponse(null, { status: 200 });
    response.headers.set("X-Health-Status", "healthy");
    return addHeaders(response, requestId);
  } catch {
    const response = new NextResponse(null, { status: 503 });
    response.headers.set("X-Health-Status", "unhealthy");
    return addHeaders(response, requestId);
  }
}

/**
 * GET - Comprehensive health check
 *
 * Query Parameters:
 *   - detailed: "true" | "false" - Include detailed service checks
 *   - format: "json" | "prometheus" - Response format
 *
 * Response:
 *   - Overall health status
 *   - Individual service statuses
 *   - System metrics
 *   - Response time for each check
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const log = logger.child({
    requestId,
    method: "GET",
    path: "/api/health",
  });

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      RATE_LIMIT,
      `health:${ip}`
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
    const detailed = searchParams.get("detailed") === "true";
    const format = searchParams.get("format") || "json";

    // Perform health checks in parallel
    const checks: { name: string; status: ServiceStatus; duration: number }[] = [];
    
    const dbCheckStart = Date.now();
    const [databaseHealth, cacheHealth] = await Promise.all([
      checkDatabase(),
      checkCache(),
    ]);
    
    checks.push({
      name: "database",
      status: databaseHealth.status,
      duration: Date.now() - dbCheckStart,
    });

    checks.push({
      name: "cache",
      status: cacheHealth.status,
      duration: cacheHealth.latency || 0,
    });

    // API is always operational if we reach this point
    const apiHealth: ServiceHealth = {
      status: "operational",
      latency: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
    };

    checks.push({
      name: "api",
      status: apiHealth.status,
      duration: apiHealth.latency || 0,
    });

    const services = {
      database: databaseHealth,
      cache: cacheHealth,
      api: apiHealth,
    };

    const overallStatus = determineOverallStatus(services);
    const systemMetrics = getSystemMetrics();

    const healthResponse: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: Math.floor(process.uptime()),
      services,
      system: systemMetrics,
      checks: detailed ? checks : [],
    };

    // Prometheus format
    if (format === "prometheus") {
      const prometheusMetrics = [
        `# HELP health_status Overall health status (1=healthy, 0.5=degraded, 0=unhealthy)`,
        `# TYPE health_status gauge`,
        `health_status ${overallStatus === "healthy" ? 1 : overallStatus === "degraded" ? 0.5 : 0}`,
        ``,
        `# HELP service_status Service status (1=operational, 0.5=degraded, 0=down)`,
        `# TYPE service_status gauge`,
        `service_status{service="database"} ${databaseHealth.status === "operational" ? 1 : databaseHealth.status === "degraded" ? 0.5 : 0}`,
        `service_status{service="cache"} ${cacheHealth.status === "operational" ? 1 : cacheHealth.status === "degraded" ? 0.5 : 0}`,
        `service_status{service="api"} 1`,
        ``,
        `# HELP uptime_seconds Process uptime in seconds`,
        `# TYPE uptime_seconds counter`,
        `uptime_seconds ${Math.floor(process.uptime())}`,
        ``,
        `# HELP memory_used_mb Memory used in MB`,
        `# TYPE memory_used_mb gauge`,
        `memory_used_mb ${systemMetrics.memory.used}`,
        ``,
        `# HELP memory_total_mb Total memory in MB`,
        `# TYPE memory_total_mb gauge`,
        `memory_total_mb ${systemMetrics.memory.total}`,
      ].join("\n");

      const response = new NextResponse(prometheusMetrics, {
        status: overallStatus === "unhealthy" ? 503 : 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });

      return addHeaders(response, requestId, { rateLimitResult, cacheTtl: CACHE_TTL });
    }

    // JSON format
    const statusCode = overallStatus === "unhealthy" ? 503 : 200;

    log.info("Health check completed", {
      status: overallStatus,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(healthResponse, {
      status: statusCode,
      meta: { requestId },
    });

    return addHeaders(response, requestId, {
      rateLimitResult,
      cacheTtl: CACHE_TTL,
    });
  } catch (error) {
    log.error("Health check failed", {}, error);

    const errorResponse: HealthResponse = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: Math.floor(process.uptime()),
      services: {
        database: { status: "unknown", lastCheck: new Date().toISOString() },
        cache: { status: "unknown", lastCheck: new Date().toISOString() },
        api: {
          status: "degraded",
          message: error instanceof Error ? error.message : "Unknown error",
          lastCheck: new Date().toISOString(),
        },
      },
      system: getSystemMetrics(),
      checks: [],
    };

    const response = apiResponse.success(errorResponse, {
      status: 503,
      meta: { requestId },
    });

    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";