// =============================================================================
// src/app/api/ping/route.ts
// =============================================================================
// Description: Simple ping endpoint for uptime monitoring
// Methods: GET, HEAD, OPTIONS
// Auth Required: False
// Rate Limit: 500 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 500;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `ping_${Date.now().toString(36)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * HEAD - Minimal ping
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "X-Ping": "pong",
    },
  });
}

/**
 * GET - Simple ping response
 *
 * Response:
 *   - "pong" with timestamp
 *   - Minimal processing for fastest response
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const ip = getClientIp(request);

  // Rate limiting
  const rateLimitResult = await checkLimit(
    apiRateLimiter,
    RATE_LIMIT,
    `ping:${ip}`
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: 60,
      },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": "60",
        },
      }
    );
  }

  const response = {
    ping: "pong",
    timestamp: new Date().toISOString(),
    requestId,
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "X-Request-ID": requestId,
      "X-RateLimit-Limit": String(rateLimitResult.limit),
      "X-RateLimit-Remaining": String(rateLimitResult.remaining),
      "Cache-Control": "no-store",
    },
  });
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";