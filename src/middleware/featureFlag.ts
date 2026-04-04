// src/middleware/featureFlag.ts
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Validates if a required feature flag is enabled.
 * If not enabled, returns 404 Not Found to obscure existence.
 */
export async function featureFlagAuth(request: NextRequest, flagName: string) {
  try {
    // Basic env-based feature flags for middleware (Redis could be used for dynamic flags)
    const activeFlagsStr = process.env.ACTIVE_FEATURE_FLAGS || "";
    const activeFlags = new Set(activeFlagsStr.split(",").map((f) => f.trim()));

    if (!activeFlags.has(flagName)) {
      logger.warn(`Access denied: Feature flag '${flagName}' is disabled`, {
        url: request.nextUrl.pathname,
        ip: request.headers.get("x-forwarded-for"),
      });
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
  } catch (error) {
    logger.error("Feature flag check failed", { error, flagName });
    // Fail secure
    return NextResponse.json({ error: "Service Unavailable" }, { status: 503 });
  }

  return null;
}
