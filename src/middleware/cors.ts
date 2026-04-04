// ============================================================================
// FILE: src/middleware/cors.ts
// PURPOSE: CORS middleware — strict origin allowlist, no wildcards in production
// SECURITY: 🔴 CRITICAL — was a stub (`export const NotImplemented = true`)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Parse allowed origins from environment variable.
 * Format: ALLOWED_ORIGINS="https://app.example.com,https://www.example.com"
 * In development, localhost is automatically allowed.
 */
function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  // Always add the primary app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.add(process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""));
  }

  // Add comma-separated list from env
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(",").forEach((o) => {
      const trimmed = o.trim().replace(/\/$/, "");
      if (trimmed) origins.add(trimmed);
    });
  }

  // Allow localhost variants in development and test
  if (process.env.NODE_ENV !== "production") {
    ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"].forEach((o) =>
      origins.add(o)
    );
  }

  return origins;
}

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const ALLOWED_HEADERS = [
  "Accept",
  "Accept-Language",
  "Content-Language",
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "X-CSRF-Token",
  "X-Request-ID",
  "Cache-Control",
  "Last-Event-ID", // SSE reconnect header
].join(", ");

// Cache the allowed origins set (computed once at module load)
let _allowedOrigins: Set<string> | null = null;
function getOrigins(): Set<string> {
  if (!_allowedOrigins) {
    _allowedOrigins = getAllowedOrigins();
  }
  return _allowedOrigins;
}

// ============================================================================
// CORE CORS LOGIC
// ============================================================================

/**
 * Validate whether a given origin is allowed.
 * Returns null if origin is missing (same-origin requests).
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Same-origin request (no Origin header)

  const allowed = getOrigins();

  // Exact match check
  if (allowed.has(origin)) return true;

  // In development: allow any localhost port
  if (process.env.NODE_ENV !== "production") {
    try {
      const url = new URL(origin);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    } catch {
      // Invalid origin URL — deny
    }
  }

  return false;
}

/**
 * Build CORS headers for an allowed origin.
 * Returns null if origin is not allowed.
 */
function buildCorsHeaders(origin: string | null): Record<string, string> | null {
  if (!isOriginAllowed(origin)) {
    return null;
  }

  const headers: Record<string, string> = {
    // Reflect the exact origin back (never use * for credentialed requests)
    "Access-Control-Allow-Origin": origin || "",
    "Access-Control-Allow-Methods": ALLOWED_METHODS.join(", "),
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    // Allow cookies/auth headers in cross-origin requests
    "Access-Control-Allow-Credentials": "true",
    // Cache preflight for 10 minutes
    "Access-Control-Max-Age": "600",
    // Required: browser must re-check if Origin changes
    Vary: "Origin",
  };

  return headers;
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Handle CORS for a Next.js API route.
 *
 * Usage in API routes:
 * ```ts
 * export async function GET(req: NextRequest) {
 *   const corsResponse = handleCors(req);
 *   if (corsResponse) return corsResponse; // OPTIONS preflight
 *   // ... handler logic
 * }
 * ```
 */
export function handleCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const method = request.method;

  // Handle OPTIONS preflight requests
  if (method === "OPTIONS") {
    const corsHeaders = buildCorsHeaders(origin);

    if (!corsHeaders) {
      // Origin not allowed — reject preflight
      return new NextResponse(null, {
        status: 403,
        statusText: "CORS: Origin not allowed",
      });
    }

    return new NextResponse(null, {
      status: 204, // No Content
      headers: corsHeaders,
    });
  }

  // For non-OPTIONS requests, CORS headers will be applied by applyCorsHeaders()
  return null;
}

/**
 * Apply CORS headers to an existing NextResponse.
 * Call this before returning your response from a route handler.
 *
 * @returns Modified response, or 403 if origin is not allowed
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const origin = request.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (!corsHeaders) {
    // Origin not allowed — replace response with 403
    if (origin) {
      return NextResponse.json(
        { error: "CORS: Origin not allowed", success: false },
        { status: 403, headers: { Vary: "Origin" } }
      );
    }
    // No Origin header = same-origin request, pass through
    return response;
  }

  // Apply CORS headers to the response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * withCors HOF: Wraps an API handler with CORS handling.
 *
 * @example
 * export const GET = withCors(async (req) => {
 *   return NextResponse.json({ data: 'ok' });
 * });
 */
export function withCors(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight
    const preflightResponse = handleCors(request);
    if (preflightResponse) return preflightResponse;

    // Execute handler
    const response = await handler(request);

    // Apply CORS headers to response
    return applyCorsHeaders(request, response as NextResponse);
  };
}

/**
 * Check if an origin is in the allowlist.
 * Useful for manual checks.
 */
export function checkOrigin(origin: string | null): boolean {
  return isOriginAllowed(origin);
}

// Reset cached origins (useful in tests when env vars change)
export function resetOriginCache(): void {
  _allowedOrigins = null;
}

export default withCors;
