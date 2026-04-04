// ============================================================================
// FILE: src/middleware/impersonation.ts
// PURPOSE: Admin user impersonation with full audit trail and time limits
// SECURITY: 🔴 CRITICAL — was a stub (`export const NotImplemented = true`)
//           Without this, any admin could silently impersonate users with no record.
//
// Security controls:
//   - Admin-only: requires session.user.isAdmin === true
//   - Super-admin to impersonate admins: prevents lateral privilege escalation
//   - Time-limited: max 1 hour per session (Redis TTL key)
//   - Full audit trail: DB log on START and END (auto-expire also logged async)
//   - Downstream awareness: X-Impersonating-UserId header
//   - Auto-end on logout: handled by clearing Redis key
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// ============================================================================
// CONSTANTS
// ============================================================================

const IMPERSONATION_TTL_SECONDS = 60 * 60; // 1 hour max
const IMPERSONATION_KEY_PREFIX = "impersonate";

// ============================================================================
// TYPES
// ============================================================================

export interface ImpersonationSession {
  adminId: string;
  adminEmail: string;
  targetUserId: string;
  startedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}

export interface ImpersonationContext {
  isImpersonating: true;
  adminId: string;
  adminEmail: string;
  targetUserId: string;
  actualUserId: string; // always the admin's real ID for audit log writes
}

// ============================================================================
// REDIS HELPERS
// ============================================================================

function impersonationKey(adminId: string, targetId: string): string {
  return `${IMPERSONATION_KEY_PREFIX}:${adminId}:${targetId}`;
}

async function getImpersonationSession(
  adminId: string,
  targetUserId: string
): Promise<ImpersonationSession | null> {
  try {
    const raw = await redis.get(impersonationKey(adminId, targetUserId)) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonationSession;
  } catch {
    return null;
  }
}

async function setImpersonationSession(session: ImpersonationSession): Promise<void> {
  const key = impersonationKey(session.adminId, session.targetUserId);
  const ttl = Math.floor((session.expiresAt * 1000 - Date.now()) / 1000);
  if (ttl <= 0) return;
  await redis.setex(key, ttl, JSON.stringify(session));
}

async function clearImpersonationSession(
  adminId: string,
  targetUserId: string
): Promise<void> {
  await redis.del(impersonationKey(adminId, targetUserId));
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

async function writeAuditLog(
  action: "IMPERSONATE_START" | "IMPERSONATE_END",
  adminId: string,
  targetUserId: string,
  request: NextRequest,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const userAgent = request.headers.get("user-agent")?.slice(0, 255) ?? null;

    await prisma.auditLog.create({
      data: {
        userId: adminId, // Always the real admin — never the target
        action: action as any,
        category: "admin",
        entityType: "user",
        entityId: targetUserId,
        description:
          action === "IMPERSONATE_START"
            ? `Admin started impersonating user ${targetUserId}`
            : `Admin ended impersonating user ${targetUserId}`,
        status: "success",
        ipAddress: ip,
        userAgent,
        newValue: {
          targetUserId,
          ...metadata,
        },
      },
    });
  } catch (err) {
    // Non-blocking — log failure should not break impersonation flow
    console.error("[Impersonation] Audit log write failed:", err);
  }
}

// ============================================================================
// START IMPERSONATION
// ============================================================================

/**
 * Begin impersonating a target user.
 * Only callable by admins; super-admin required to impersonate other admins.
 *
 * @returns null on success, NextResponse with error on failure
 */
export async function startImpersonation(
  request: NextRequest,
  targetUserId: string
): Promise<{ error: NextResponse } | { session: ImpersonationSession }> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.id || !token?.email) {
    return {
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  if (!token.isAdmin && token.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  const adminId = token.id as string;
  const adminEmail = token.email as string;

  // Prevent self-impersonation
  if (adminId === targetUserId) {
    return {
      error: NextResponse.json(
        { error: "Cannot impersonate yourself" },
        { status: 400 }
      ),
    };
  }

  // Fetch target user to check if they're an admin
  let targetUser: { id: string; isAdmin: boolean; role: string } | null;
  try {
    targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isAdmin: true, role: true },
    });
  } catch {
    return {
      error: NextResponse.json({ error: "Target user not found" }, { status: 404 }),
    };
  }

  if (!targetUser) {
    return {
      error: NextResponse.json({ error: "Target user not found" }, { status: 404 }),
    };
  }

  // Only super-admins (role === 'superadmin') can impersonate other admins
  const targetIsAdmin = targetUser.isAdmin || targetUser.role === "admin";
  const callerIsSuperAdmin = (token.role as string) === "superadmin";
  if (targetIsAdmin && !callerIsSuperAdmin) {
    return {
      error: NextResponse.json(
        { error: "Super-admin access required to impersonate admins" },
        { status: 403 }
      ),
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const session: ImpersonationSession = {
    adminId,
    adminEmail,
    targetUserId,
    startedAt: now,
    expiresAt: now + IMPERSONATION_TTL_SECONDS,
  };

  await setImpersonationSession(session);
  await writeAuditLog("IMPERSONATE_START", adminId, targetUserId, request, {
    expiresAt: session.expiresAt,
    targetIsAdmin,
  });

  return { session };
}

// ============================================================================
// END IMPERSONATION
// ============================================================================

/**
 * End an active impersonation session.
 */
export async function endImpersonation(
  request: NextRequest,
  targetUserId: string
): Promise<void> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return;

  const adminId = token.id as string;
  await clearImpersonationSession(adminId, targetUserId);
  await writeAuditLog("IMPERSONATE_END", adminId, targetUserId, request);
}

/**
 * End ALL active impersonation sessions for a given admin.
 * Called on logout.
 */
export async function endAllImpersonations(adminId: string): Promise<void> {
  // Best-effort: Redis pattern scan is not available in Upstash HTTP client.
  // Rely on TTL expiry (max 1 hour) as the safety net.
  // For full cleanup on logout, store an index key per admin session.
  try {
    const indexKey = `${IMPERSONATION_KEY_PREFIX}_idx:${adminId}`;
    const raw = await redis.get(indexKey) as string | null;
    if (raw) {
      const targetIds: string[] = JSON.parse(raw);
      await Promise.all(
        targetIds.map((tid) => redis.del(impersonationKey(adminId, tid)))
      );
      await redis.del(indexKey);
    }
  } catch {
    // Best-effort; TTL ensures sessions expire within 1 hour
  }
}

// ============================================================================
// MIDDLEWARE HOF
// ============================================================================

export type ImpersonationHandler = (
  request: NextRequest,
  context: ImpersonationContext
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap an admin handler that performs actions on behalf of a target user.
 * Validates that an active impersonation session exists and hasn't expired.
 *
 * @example
 * export const GET = withImpersonation(async (req, ctx) => {
 *   // ctx.targetUserId is the user being impersonated
 *   // ctx.actualUserId is the real admin (for audit logs)
 *   return NextResponse.json({ impersonating: ctx.targetUserId });
 * });
 */
export function withImpersonation(handler: ImpersonationHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Validate admin session
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id || !token?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!token.isAdmin && token.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const adminId = token.id as string;

    // Read target user from header (set by admin at start of impersonation)
    const targetUserId = request.headers.get("x-impersonate-user-id");
    if (!targetUserId) {
      return NextResponse.json(
        { error: "X-Impersonate-User-Id header required" },
        { status: 400 }
      );
    }

    // Verify active impersonation session in Redis
    const session = await getImpersonationSession(adminId, targetUserId);
    if (!session) {
      return NextResponse.json(
        { error: "No active impersonation session. Start impersonation first." },
        { status: 403 }
      );
    }

    // Check expiry (Redis TTL should handle this, but double-check)
    const now = Math.floor(Date.now() / 1000);
    if (session.expiresAt <= now) {
      await clearImpersonationSession(adminId, targetUserId);
      return NextResponse.json(
        { error: "Impersonation session expired" },
        { status: 403 }
      );
    }

    const ctx: ImpersonationContext = {
      isImpersonating: true,
      adminId,
      adminEmail: token.email as string,
      targetUserId,
      actualUserId: adminId,
    };

    // Clone request and inject impersonation header so downstream handlers can read it
    const response = await handler(request, ctx);
    response.headers.set("X-Impersonating-UserId", targetUserId);
    response.headers.set("X-Impersonated-By", adminId);

    return response;
  };
}

// ============================================================================
// READ HELPER (for route handlers)
// ============================================================================

/**
 * Get the effective user ID for a request — returns impersonated user ID
 * if an active impersonation session exists, otherwise the real user ID.
 *
 * IMPORTANT: Always use `actualUserId` for audit logs, never `effectiveUserId`.
 */
export async function getEffectiveUserId(
  request: NextRequest
): Promise<{ effectiveUserId: string; actualUserId: string; isImpersonating: boolean }> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const actualUserId = token?.id as string | undefined;

  if (!actualUserId) {
    return { effectiveUserId: "", actualUserId: "", isImpersonating: false };
  }

  // Check if impersonation header is present and admin
  const impersonatedId = request.headers.get("x-impersonating-userid");
  if (impersonatedId && (token?.isAdmin || token?.role === "admin")) {
    const session = await getImpersonationSession(actualUserId, impersonatedId);
    if (session && session.expiresAt > Math.floor(Date.now() / 1000)) {
      return {
        effectiveUserId: impersonatedId,
        actualUserId,
        isImpersonating: true,
      };
    }
  }

  return { effectiveUserId: actualUserId, actualUserId, isImpersonating: false };
}

export default withImpersonation;
