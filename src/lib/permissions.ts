// src/lib/permissions.ts
// Client-side permission checking utilities

// =============================================================================
// TYPES
// =============================================================================

export type UserRole = 'user' | 'pro' | 'admin' | 'super_admin';
export type ResourceAction = 'read' | 'create' | 'update' | 'delete' | 'manage';

export interface Permission {
  resource: string;
  action: ResourceAction;
  roles: UserRole[];
  condition?: (context: PermissionContext) => boolean;
}

export interface PermissionContext {
  userId: string;
  role: UserRole;
  resourceOwnerId?: string;
  subscriptionPlan?: string;
  [key: string]: unknown;
}

// =============================================================================
// ROLE HIERARCHY
// =============================================================================

const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  pro: 1,
  admin: 2,
  super_admin: 3,
};

/**
 * Check if a role has at least the given minimum role level.
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Check if user is admin or super_admin.
 */
export function isAdmin(role: UserRole | string | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Check if user is super_admin.
 */
export function isSuperAdmin(role: UserRole | string | undefined): boolean {
  return role === 'super_admin';
}

// =============================================================================
// RESOURCE PERMISSIONS
// =============================================================================

const PERMISSIONS: Permission[] = [
  // Tracker
  { resource: 'tracker', action: 'read', roles: ['user', 'pro', 'admin', 'super_admin'] },
  { resource: 'tracker', action: 'create', roles: ['user', 'pro', 'admin', 'super_admin'] },
  { resource: 'tracker', action: 'update', roles: ['user', 'pro', 'admin', 'super_admin'],
    condition: (ctx) => ctx.userId === ctx.resourceOwnerId || isAdmin(ctx.role) },
  { resource: 'tracker', action: 'delete', roles: ['user', 'pro', 'admin', 'super_admin'],
    condition: (ctx) => ctx.userId === ctx.resourceOwnerId || isAdmin(ctx.role) },

  // Goals
  { resource: 'goal', action: 'read', roles: ['user', 'pro', 'admin', 'super_admin'] },
  { resource: 'goal', action: 'create', roles: ['user', 'pro', 'admin', 'super_admin'] },
  { resource: 'goal', action: 'update', roles: ['user', 'pro', 'admin', 'super_admin'],
    condition: (ctx) => ctx.userId === ctx.resourceOwnerId || isAdmin(ctx.role) },
  { resource: 'goal', action: 'delete', roles: ['user', 'pro', 'admin', 'super_admin'],
    condition: (ctx) => ctx.userId === ctx.resourceOwnerId || isAdmin(ctx.role) },

  // Analytics
  { resource: 'analytics', action: 'read', roles: ['user', 'pro', 'admin', 'super_admin'] },
  { resource: 'analytics:advanced', action: 'read', roles: ['pro', 'admin', 'super_admin'] },

  // Blog
  { resource: 'blog_post', action: 'read', roles: ['user', 'pro', 'admin', 'super_admin'] },
  { resource: 'blog_post', action: 'create', roles: ['admin', 'super_admin'] },
  { resource: 'blog_post', action: 'update', roles: ['admin', 'super_admin'] },
  { resource: 'blog_post', action: 'delete', roles: ['admin', 'super_admin'] },

  // Admin
  { resource: 'admin', action: 'read', roles: ['admin', 'super_admin'] },
  { resource: 'admin:users', action: 'manage', roles: ['admin', 'super_admin'] },
  { resource: 'admin:settings', action: 'manage', roles: ['super_admin'] },

  // API keys
  { resource: 'api_key', action: 'create', roles: ['pro', 'admin', 'super_admin'] },
  { resource: 'api_key', action: 'manage', roles: ['pro', 'admin', 'super_admin'],
    condition: (ctx) => ctx.userId === ctx.resourceOwnerId || isAdmin(ctx.role) },

  // Exports
  { resource: 'export:pdf', action: 'create', roles: ['pro', 'admin', 'super_admin'] },
  { resource: 'export:csv', action: 'create', roles: ['user', 'pro', 'admin', 'super_admin'] },
];

/**
 * Check if a user has permission to perform an action on a resource.
 */
export function can(
  context: PermissionContext,
  resource: string,
  action: ResourceAction
): boolean {
  const permission = PERMISSIONS.find(
    (p) => p.resource === resource && p.action === action
  );

  if (!permission) return false;
  if (!permission.roles.includes(context.role)) return false;
  if (permission.condition && !permission.condition(context)) return false;

  return true;
}

/**
 * Check if user owns a resource or is an admin.
 */
export function isOwnerOrAdmin(userId: string, ownerId: string, role: UserRole): boolean {
  return userId === ownerId || isAdmin(role);
}

/**
 * Get all allowed actions for a resource/role combination.
 */
export function getAllowedActions(role: UserRole, resource: string): ResourceAction[] {
  return PERMISSIONS
    .filter((p) => p.resource === resource && p.roles.includes(role))
    .map((p) => p.action);
}
