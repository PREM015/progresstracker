// src/lib/server/auth-helpers.ts
// Server-only authentication helpers

import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { AuthError, ForbiddenError } from '@/lib/error-handler';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  image?: string | null;
  subscriptionPlan?: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  session: {
    expires: string;
  };
}

// =============================================================================
// SESSION HELPERS
// =============================================================================

/**
 * Get the current session from a Next.js API route context.
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
      name: session.user.name,
      role: (session.user as { role?: string }).role ?? 'user',
      image: session.user.image,
    },
    session: {
      expires: session.expires,
    },
  };
}

/**
 * Require an authenticated session. Throws AuthError if not authenticated.
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getSession();
  if (!ctx) throw new AuthError('You must be logged in to perform this action');
  return ctx;
}

/**
 * Require an authenticated session with a minimum role.
 * Throws AuthError if not authenticated, ForbiddenError if insufficient role.
 */
export async function requireRole(minimumRole: string): Promise<AuthContext> {
  const ctx = await requireAuth();

  const roleOrder = ['user', 'pro', 'admin', 'super_admin'];
  const userLevel = roleOrder.indexOf(ctx.user.role);
  const requiredLevel = roleOrder.indexOf(minimumRole);

  if (userLevel < requiredLevel) {
    throw new ForbiddenError(
      `Access denied. Required role: ${minimumRole}, your role: ${ctx.user.role}`
    );
  }

  return ctx;
}

/**
 * Require admin access (admin or super_admin).
 */
export async function requireAdmin(): Promise<AuthContext> {
  return requireRole('admin');
}

/**
 * Require super_admin access.
 */
export async function requireSuperAdmin(): Promise<AuthContext> {
  return requireRole('super_admin');
}

// =============================================================================
// REQUEST HELPERS
// =============================================================================

/**
 * Extract bearer token from Authorization header.
 */
export function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/**
 * Get client IP from request headers (respects proxies).
 */
export function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    null
  );
}

/**
 * Get user agent from request.
 */
export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent');
}

// =============================================================================
// OWNERSHIP HELPERS
// =============================================================================

/**
 * Assert the current user owns a resource or is admin.
 */
export function assertOwnerOrAdmin(
  currentUserId: string,
  resourceOwnerId: string,
  role: string
): void {
  if (currentUserId !== resourceOwnerId && role !== 'admin' && role !== 'super_admin') {
    throw new ForbiddenError('You do not have permission to access this resource');
  }
}

/**
 * Assert the current user owns a resource.
 */
export function assertOwner(currentUserId: string, resourceOwnerId: string): void {
  if (currentUserId !== resourceOwnerId) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }
}
