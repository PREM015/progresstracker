// ============================================================================
// FILE: src/lib/server/cron-auth.ts
// PURPOSE: Cron job authorization — CRON_SECRET verification + optional IP allowlist
// SECURITY: 🔴 CRITICAL — cron routes were publicly accessible without this guard
//
// Usage:
//   import { withCronAuth } from '@/lib/server/cron-auth';
//   export const GET = withCronAuth(handler);
//   export const POST = withCronAuth(handler);
//
// Vercel cron jobs send Authorization: Bearer <CRON_SECRET>  
// (same pattern already used in src/app/api/cron/cleanup/route.ts)
//
// Env vars:
//   CRON_SECRET        — required, shared secret for all cron routes
//   CRON_ALLOWED_IPS   — optional, comma-separated IP allowlist (e.g. Vercel cron IPs)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

// Vercel Cron's documented source IP ranges (add more as Vercel updates them)
// Ref: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
const VERCEL_CRON_IPS = new Set([
  // Vercel currently runs cron from shared infra; users should set CRON_ALLOWED_IPS
  // This set is a placeholder — override with CRON_ALLOWED_IPS env var
]);

// ============================================================================
// IP ALLOWLIST
// ============================================================================

function getConfiguredIPs(): Set<string> | null {
  const raw = process.env.CRON_ALLOWED_IPS;
  if (!raw || raw.trim() === "") return null; // null = "allow all IPs" (rely on secret only)

  const ips = new Set(
    raw
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean)
  );

  // Merge with known Vercel IPs
  VERCEL_CRON_IPS.forEach((ip) => ips.add(ip));

  return ips.size > 0 ? ips : null;
}

// ============================================================================
// AUTH CHECK
// ============================================================================

/**
 * Validate a cron request.
 * Returns an error NextResponse if invalid, null if authorized.
 */
export function validateCronRequest(request: NextRequest): NextResponse | null {
  // ─── 1. Verify CRON_SECRET is configured ────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.trim() === "") {
    console.error("[CronAuth] CRON_SECRET environment variable is not configured");
    return NextResponse.json(
      { error: "Server configuration error", code: "CRON_SECRET_MISSING" },
      { status: 500 }
    );
  }

  // ─── 2. Check Authorization header ──────────────────────────────────────
  // Vercel uses "Authorization: Bearer <secret>" for cron jobs.
  // We also support "x-cron-secret: <secret>" as an alternative.
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");

  const providedSecret =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cronHeader;

  if (!providedSecret || providedSecret !== cronSecret) {
    const clientIP =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    console.warn("[CronAuth] Unauthorized cron attempt", {
      ip: clientIP,
      path: request.nextUrl.pathname,
      hasAuth: !!providedSecret,
    });
    return NextResponse.json(
      { error: "Unauthorized", code: "INVALID_CRON_SECRET" },
      { status: 401 }
    );
  }

  // ─── 3. Optional IP allowlist ────────────────────────────────────────────
  const allowedIPs = getConfiguredIPs();
  if (allowedIPs) {
    const clientIP =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "";

    if (!clientIP || !allowedIPs.has(clientIP)) {
      console.warn("[CronAuth] Cron request from non-allowlisted IP", {
        ip: clientIP,
        path: request.nextUrl.pathname,
      });
      return NextResponse.json(
        { error: "Forbidden", code: "IP_NOT_ALLOWED" },
        { status: 403 }
      );
    }
  }

  // ─── Authorized ──────────────────────────────────────────────────────────
  return null;
}

// ============================================================================
// HOF WRAPPER
// ============================================================================

type CronHandler = (request: NextRequest) => Promise<NextResponse> | NextResponse;

/**
 * Wrap a cron route handler with authorization checks.
 *
 * @example
 * // src/app/api/cron/my-job/route.ts
 * import { withCronAuth } from '@/lib/server/cron-auth';
 *
 * async function handler(req: NextRequest) {
 *   // ... cron logic
 *   return NextResponse.json({ success: true });
 * }
 *
 * export const GET = withCronAuth(handler);
 * export const POST = withCronAuth(handler);
 */
export function withCronAuth(handler: CronHandler): CronHandler {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authError = validateCronRequest(request);
    if (authError) return authError;
    return handler(request);
  };
}

export default withCronAuth;
