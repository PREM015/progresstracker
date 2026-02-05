// =============================================================================
// src/app/api/config/route.ts
// =============================================================================
// Description: Get public application configuration
// Endpoints:
//   GET  - Get public configuration (platforms, features, UI settings)
// Auth Required: Optional (authenticated users get more config)
// Rate Limit: 100 requests/minute
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

const RATE_LIMIT = 100;
const CACHE_TTL = 300; // 5 minutes

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// =============================================================================
// TYPES
// =============================================================================

interface PlatformConfig {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  category: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  supportsAutoSync: boolean;
  supportsOAuth: boolean;
}

interface FeatureFlagConfig {
  key: string;
  name: string;
  isEnabled: boolean;
}

interface UIConfig {
  appName: string;
  appDescription: string;
  supportEmail: string;
  docsUrl: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  socialLinks: {
    twitter: string | null;
    github: string | null;
    discord: string | null;
  };
  themes: string[];
  defaultTheme: string;
  languages: string[];
  defaultLanguage: string;
}

interface SubscriptionConfig {
  tiers: {
    name: string;
    slug: string;
    price: number;
    interval: string;
    features: string[];
  }[];
  currency: string;
}

interface PublicConfig {
  app: UIConfig;
  platforms: PlatformConfig[];
  features: FeatureFlagConfig[];
  subscription: SubscriptionConfig | null;
  maintenance: {
    isActive: boolean;
    message: string | null;
    estimatedEnd: Date | null;
  };
  version: string;
  environment: string;
}

interface AuthenticatedConfig extends PublicConfig {
  user: {
    tier: string;
    features: string[];
    limits: {
      platforms: number;
      syncsPerDay: number;
      exportsPerMonth: number;
    };
  };
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  include: z
    .string()
    .optional()
    .transform((val) => val?.split(",").map((s) => s.trim()) || []),
  format: z.enum(["full", "minimal"]).default("full"),
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
  // Security headers
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(
    ([key, value]) => {
      response.headers.set(key, value);
    }
  );

  // Request ID
  response.headers.set("X-Request-ID", requestId);

  // Rate limit headers
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

  // Cache headers
  if (options?.cacheTtl) {
    response.headers.set(
      "Cache-Control",
      `public, max-age=${options.cacheTtl}, s-maxage=${options.cacheTtl}`
    );
  } else {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

async function getPublicSettings(): Promise<Record<string, unknown>> {
  const settings = await prisma.systemSettings.findMany({
    where: { isPublic: true },
  });

  const result: Record<string, unknown> = {};
  settings.forEach((s) => {
    result[s.key] = s.value;
  });

  return result;
}

async function getActivePlatforms(): Promise<PlatformConfig[]> {
  const platforms = await prisma.platform.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      displayName: true,
      category: true,
      icon: true,
      color: true,
      isActive: true,
      supportsAutoSync: true,
      supportsOAuth: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return platforms;
}

async function getPublicFeatureFlags(): Promise<FeatureFlagConfig[]> {
  const flags = await prisma.featureFlag.findMany({
    where: { enabledForAll: true },
    select: {
      key: true,
      name: true,
      isEnabled: true,
    },
  });

  return flags;
}

async function getActiveMaintenanceWindow(): Promise<{
  isActive: boolean;
  message: string | null;
  estimatedEnd: Date | null;
}> {
  const now = new Date();

  const maintenance = await prisma.maintenanceWindow.findFirst({
    where: {
      isActive: true,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    orderBy: { startTime: "desc" },
  });

  if (!maintenance) {
    return { isActive: false, message: null, estimatedEnd: null };
  }

  return {
    isActive: true,
    message: maintenance.message,
    estimatedEnd: maintenance.endTime,
  };
}

async function getUserConfig(userId: string): Promise<{
  tier: string;
  features: string[];
  limits: {
    platforms: number;
    syncsPerDay: number;
    exportsPerMonth: number;
  };
} | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      tier: true,
      platformLimit: true,
      syncFrequencyMinutes: true,
      exportLimitMonthly: true,
      features: true,
    },
  });

  if (!subscription) {
    // Default free tier limits
    return {
      tier: "FREE",
      features: [],
      limits: {
        platforms: 5,
        syncsPerDay: 1,
        exportsPerMonth: 3,
      },
    };
  }

  return {
    tier: subscription.tier,
    features: subscription.features,
    limits: {
      platforms: subscription.platformLimit,
      syncsPerDay: Math.floor(1440 / subscription.syncFrequencyMinutes),
      exportsPerMonth: subscription.exportLimitMonthly,
    },
  };
}

function buildUIConfig(settings: Record<string, unknown>): UIConfig {
  return {
    appName: (settings.appName as string) || "Progress Tracker",
    appDescription:
      (settings.appDescription as string) ||
      "Track your coding progress across platforms",
    supportEmail: (settings.supportEmail as string) || "support@example.com",
    docsUrl: (settings.docsUrl as string) || null,
    privacyUrl: (settings.privacyUrl as string) || "/privacy",
    termsUrl: (settings.termsUrl as string) || "/terms",
    socialLinks: {
      twitter: (settings.twitterUrl as string) || null,
      github: (settings.githubUrl as string) || null,
      discord: (settings.discordUrl as string) || null,
    },
    themes: ["light", "dark", "system"],
    defaultTheme: (settings.defaultTheme as string) || "system",
    languages: ["en", "es", "fr", "de", "ja", "zh"],
    defaultLanguage: (settings.defaultLanguage as string) || "en",
  };
}

function buildSubscriptionConfig(): SubscriptionConfig {
  return {
    currency: "usd",
    tiers: [
      {
        name: "Free",
        slug: "FREE",
        price: 0,
        interval: "monthly",
        features: [
          "5 platform connections",
          "Daily sync",
          "Basic analytics",
          "3 exports/month",
        ],
      },
      {
        name: "Starter",
        slug: "STARTER",
        price: 499, // $4.99
        interval: "monthly",
        features: [
          "10 platform connections",
          "Hourly sync",
          "Advanced analytics",
          "10 exports/month",
          "Email reports",
        ],
      },
      {
        name: "Pro",
        slug: "PRO",
        price: 999, // $9.99
        interval: "monthly",
        features: [
          "Unlimited platforms",
          "Real-time sync",
          "Full analytics",
          "Unlimited exports",
          "Priority support",
          "API access",
        ],
      },
    ],
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
 * HEAD - Resource metadata
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set("X-Config-Version", process.env.npm_package_version || "1.0.0");
    return addHeaders(response, requestId, { cacheTtl: CACHE_TTL });
  } catch (error) {
    logger.error("HEAD /api/config failed", { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - Get public configuration
 *
 * Query Parameters:
 *   - include: Comma-separated list of sections to include
 *              Options: platforms, features, subscription, maintenance
 *   - format: "full" | "minimal" (default: full)
 *
 * Response:
 *   - Public config for unauthenticated users
 *   - Extended config with user-specific settings for authenticated users
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const log = logger.child({
    requestId,
    method: "GET",
    path: "/api/config",
  });

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      RATE_LIMIT,
      `config:${ip}`
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
    const queryValidation = querySchema.safeParse({
      include: searchParams.get("include") || undefined,
      format: searchParams.get("format") || "full",
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

    const { include, format } = queryValidation.data;

    // Check for authenticated user
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session?.user?.id;

    // Fetch configuration data in parallel
    const [settings, platforms, features, maintenance] = await Promise.all([
      getPublicSettings(),
      include.length === 0 || include.includes("platforms")
        ? getActivePlatforms()
        : [],
      include.length === 0 || include.includes("features")
        ? getPublicFeatureFlags()
        : [],
      include.length === 0 || include.includes("maintenance")
        ? getActiveMaintenanceWindow()
        : { isActive: false, message: null, estimatedEnd: null },
    ]);

    // Build base config
    const publicConfig: PublicConfig = {
      app: buildUIConfig(settings),
      platforms: format === "minimal" ? [] : platforms,
      features: format === "minimal" ? [] : features,
      subscription:
        include.length === 0 || include.includes("subscription")
          ? buildSubscriptionConfig()
          : null,
      maintenance,
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    // If authenticated, add user-specific config
    let responseData: PublicConfig | AuthenticatedConfig = publicConfig;

    if (isAuthenticated && session.user.id) {
      const userConfig = await getUserConfig(session.user.id);

      if (userConfig) {
        responseData = {
          ...publicConfig,
          user: userConfig,
        } as AuthenticatedConfig;
      }
    }

    log.info("Config fetched successfully", {
      authenticated: isAuthenticated,
      format,
      includeSections: include,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(responseData, {
      status: 200,
      meta: {
        requestId,
        cached: false,
        timestamp: new Date().toISOString(),
      },
    });

    return addHeaders(response, requestId, {
      rateLimitResult,
      cacheTtl: isAuthenticated ? 60 : CACHE_TTL, // Shorter cache for auth users
    });
  } catch (error) {
    log.error("GET /api/config failed", {}, error);
    return addHeaders(
      apiResponse.internalError("Failed to fetch configuration", requestId),
      requestId
    );
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";