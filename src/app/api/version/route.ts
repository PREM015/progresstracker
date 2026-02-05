// =============================================================================
// src/app/api/version/route.ts
// =============================================================================
// Description: API version and compatibility information
// Methods: GET, HEAD, OPTIONS
// Auth Required: False
// Rate Limit: 200 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import apiResponse from "@/lib/apiResponse";

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 200;
const CACHE_TTL = 3600; // 1 hour

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

interface VersionInfo {
  api: {
    version: string;
    minClientVersion: string;
    deprecatedVersions: string[];
    sunset: {
      version: string;
      date: string;
      message: string;
    }[];
  };
  app: {
    version: string;
    name: string;
    buildNumber?: string;
    buildDate?: string;
    gitCommit?: string;
  };
  features: {
    name: string;
    version: string;
    status: "stable" | "beta" | "deprecated";
  }[];
  compatibility: {
    browsers: {
      chrome: string;
      firefox: string;
      safari: string;
      edge: string;
    };
    node: string;
  };
  links: {
    changelog: string;
    documentation: string;
    releaseNotes: string;
  };
}

// =============================================================================
// VERSION DATA
// =============================================================================

const VERSION_DATA: VersionInfo = {
  api: {
    version: "1.0.0",
    minClientVersion: "0.9.0",
    deprecatedVersions: [],
    sunset: [],
  },
  app: {
    version: process.env.npm_package_version || "1.0.0",
    name: "Progress Tracker",
    buildNumber: process.env.BUILD_NUMBER,
    buildDate: process.env.BUILD_DATE,
    gitCommit: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7),
  },
  features: [
    { name: "Platform Sync", version: "1.0.0", status: "stable" },
    { name: "Goals", version: "1.0.0", status: "stable" },
    { name: "Achievements", version: "1.0.0", status: "stable" },
    { name: "Analytics", version: "1.0.0", status: "stable" },
    { name: "Export", version: "1.0.0", status: "stable" },
    { name: "2FA", version: "1.0.0", status: "stable" },
    { name: "API Keys", version: "1.0.0", status: "beta" },
    { name: "Webhooks", version: "0.9.0", status: "beta" },
  ],
  compatibility: {
    browsers: {
      chrome: "90+",
      firefox: "88+",
      safari: "14+",
      edge: "90+",
    },
    node: "18.0.0+",
  },
  links: {
    changelog: "/changelog",
    documentation: "/docs",
    releaseNotes: "/releases",
  },
};

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
  response.headers.set("X-API-Version", VERSION_DATA.api.version);

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

function checkClientVersion(clientVersion: string | null): {
  compatible: boolean;
  message?: string;
  upgrade?: boolean;
} {
  if (!clientVersion) {
    return { compatible: true };
  }

  // Simple semver comparison
  const parseVersion = (v: string) => {
    const parts = v.split(".").map(Number);
    return parts[0] * 10000 + parts[1] * 100 + parts[2];
  };

  const clientNum = parseVersion(clientVersion);
  const minNum = parseVersion(VERSION_DATA.api.minClientVersion);

  if (clientNum < minNum) {
    return {
      compatible: false,
      message: `Client version ${clientVersion} is no longer supported. Please upgrade to ${VERSION_DATA.api.minClientVersion} or later.`,
      upgrade: true,
    };
  }

  // Check if version is deprecated
  if (VERSION_DATA.api.deprecatedVersions.includes(clientVersion)) {
    return {
      compatible: true,
      message: `Client version ${clientVersion} is deprecated and will be removed soon.`,
      upgrade: true,
    };
  }

  return { compatible: true };
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
 * HEAD - Quick version check
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  
  const response = new NextResponse(null, { status: 200 });
  response.headers.set("X-API-Version", VERSION_DATA.api.version);
  response.headers.set("X-App-Version", VERSION_DATA.app.version);
  response.headers.set("X-Min-Client-Version", VERSION_DATA.api.minClientVersion);
  
  return addHeaders(response, requestId, { cacheTtl: CACHE_TTL });
}

/**
 * GET - Version information
 *
 * Query Parameters:
 *   - format: "full" | "minimal" - Response format
 *   - check: Client version to check compatibility
 *
 * Headers:
 *   - X-Client-Version: Client version for compatibility check
 *
 * Response:
 *   - API version information
 *   - App version information
 *   - Feature list with versions
 *   - Compatibility information
 *   - Deprecation notices
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const log = logger.child({
    requestId,
    method: "GET",
    path: "/api/version",
  });

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      RATE_LIMIT,
      `version:${ip}`
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
    const format = searchParams.get("format") || "full";
    const checkVersion = searchParams.get("check") || request.headers.get("x-client-version");

    // Check client version compatibility
    const compatibility = checkClientVersion(checkVersion);

    // Build response based on format
    let responseData: Partial<VersionInfo> & {
      compatibility?: {
        compatible: boolean;
        message?: string;
        upgrade?: boolean;
      };
    };

    if (format === "minimal") {
      responseData = {
        api: {
          version: VERSION_DATA.api.version,
          minClientVersion: VERSION_DATA.api.minClientVersion,
          deprecatedVersions: VERSION_DATA.api.deprecatedVersions,
          sunset: VERSION_DATA.api.sunset,
        },
        app: {
          version: VERSION_DATA.app.version,
          name: VERSION_DATA.app.name,
        },
      };
    } else {
      responseData = { ...VERSION_DATA };
    }

    // Add compatibility check result if version was provided
    if (checkVersion) {
      responseData.compatibility = compatibility;
    }

    log.debug("Version info requested", {
      format,
      checkVersion,
      compatible: compatibility.compatible,
    });

    const response = apiResponse.success(responseData, {
      status: 200,
      meta: { requestId },
    });

    return addHeaders(response, requestId, {
      rateLimitResult,
      cacheTtl: CACHE_TTL,
    });
  } catch (error) {
    log.error("Version endpoint failed", {}, error);
    return addHeaders(
      apiResponse.internalError("Failed to fetch version info", requestId),
      requestId
    );
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";