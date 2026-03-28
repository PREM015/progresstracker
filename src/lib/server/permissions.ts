// src/lib/server/permissions.ts
// Server-side permission checking with database lookups

import { prisma } from '@/lib/prisma';
import { ForbiddenError } from '@/lib/error-handler';
import type { AuthenticatedUser } from './auth-helpers';

// =============================================================================
// TYPES
// =============================================================================

export interface SubscriptionPermissions {
  canAccessAdvancedAnalytics: boolean;
  canAccessApiKeys: boolean;
  canExportPdf: boolean;
  canUsePrioritySync: boolean;
  canConnectMorePlatforms: boolean;
  canCreateMoreGoals: boolean;
  hasUnlimitedStorage: boolean;
  maxPlatforms: number;
  maxGoals: number;
  maxApiKeys: number;
}

// =============================================================================
// SUBSCRIPTION-BASED PERMISSIONS
// =============================================================================

const PLAN_PERMISSIONS: Record<string, SubscriptionPermissions> = {
  free: {
    canAccessAdvancedAnalytics: false,
    canAccessApiKeys: false,
    canExportPdf: false,
    canUsePrioritySync: false,
    canConnectMorePlatforms: true,
    canCreateMoreGoals: true,
    hasUnlimitedStorage: false,
    maxPlatforms: 3,
    maxGoals: 5,
    maxApiKeys: 0,
  },
  basic: {
    canAccessAdvancedAnalytics: true,
    canAccessApiKeys: true,
    canExportPdf: false,
    canUsePrioritySync: false,
    canConnectMorePlatforms: true,
    canCreateMoreGoals: true,
    hasUnlimitedStorage: false,
    maxPlatforms: 10,
    maxGoals: 20,
    maxApiKeys: 2,
  },
  pro: {
    canAccessAdvancedAnalytics: true,
    canAccessApiKeys: true,
    canExportPdf: true,
    canUsePrioritySync: true,
    canConnectMorePlatforms: true,
    canCreateMoreGoals: true,
    hasUnlimitedStorage: true,
    maxPlatforms: -1,
    maxGoals: -1,
    maxApiKeys: 10,
  },
  enterprise: {
    canAccessAdvancedAnalytics: true,
    canAccessApiKeys: true,
    canExportPdf: true,
    canUsePrioritySync: true,
    canConnectMorePlatforms: true,
    canCreateMoreGoals: true,
    hasUnlimitedStorage: true,
    maxPlatforms: -1,
    maxGoals: -1,
    maxApiKeys: -1,
  },
};

/**
 * Get permissions for a user based on their subscription plan.
 */
export async function getUserPermissions(userId: string): Promise<SubscriptionPermissions> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'TRIALING'] },
    },
    select: { tier: true },
    orderBy: { createdAt: 'desc' },
  });

  const plan = subscription?.tier?.toLowerCase() ?? 'free';
  return PLAN_PERMISSIONS[plan] ?? PLAN_PERMISSIONS.free;
}

/**
 * Require a specific plan permission, throwing ForbiddenError if not met.
 */
export async function requirePlanPermission(
  userId: string,
  permission: keyof SubscriptionPermissions
): Promise<void> {
  const perms = await getUserPermissions(userId);
  if (!perms[permission]) {
    throw new ForbiddenError(
      `Your current plan does not support this feature. Please upgrade to access it.`
    );
  }
}

// =============================================================================
// USAGE LIMIT CHECKS
// =============================================================================

/**
 * Check if user can add more platforms.
 */
export async function canAddPlatform(userId: string): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  if (perms.maxPlatforms === -1) return true;

  const count = await prisma.userPlatform.count({
    where: { userId, connectionStatus: { not: 'DISCONNECTED' } },
  });
  return count < perms.maxPlatforms;
}

/**
 * Check if user can create more goals.
 */
export async function canCreateGoal(userId: string): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  if (perms.maxGoals === -1) return true;

  const count = await prisma.goal.count({
    where: { userId, status: { not: 'ARCHIVED' } },
  });
  return count < perms.maxGoals;
}

/**
 * Check if user is admin.
 */
export function isServerAdmin(user: Pick<AuthenticatedUser, 'role'>): boolean {
  return user.role === 'admin' || user.role === 'super_admin';
}

/**
 * Require admin role, throws ForbiddenError if not.
 */
export function requireServerAdmin(user: Pick<AuthenticatedUser, 'role'>): void {
  if (!isServerAdmin(user)) {
    throw new ForbiddenError('Administrator access required');
  }
}
