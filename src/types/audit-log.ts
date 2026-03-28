// src/types/audit-log.ts
// Audit log types for admin/compliance

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.login'
  | 'user.logout'
  | 'user.password_changed'
  | 'user.email_changed'
  | 'user.role_changed'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'api_key.created'
  | 'api_key.used'
  | 'api_key.revoked'
  | 'platform.connected'
  | 'platform.disconnected'
  | 'platform.synced'
  | 'admin.settings_updated'
  | 'admin.user_banned'
  | 'admin.user_unbanned'
  | 'data.exported'
  | 'data.deleted'
  | 'webhook.created'
  | 'webhook.fired'
  | 'webhook.failed';

export type AuditLogSeverity = 'info' | 'warning' | 'error' | 'critical';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Audit log entry (matches Prisma AuditLog model) */
export interface AuditLog {
  id: string;
  userId: string;
  actorId?: string | null; // Who performed the action (may differ from userId)
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: string | null;
  severity: AuditLogSeverity;
  description?: string | null;
  changes?: AuditLogChanges | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  createdAt: Date;
}

/** Audit log changes */
export interface AuditLogChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  fields?: string[];
}

/** Audit log with user info */
export interface AuditLogWithUser extends AuditLog {
  user: { id: string; name: string | null; email: string | null };
  actor?: { id: string; name: string | null; email: string | null } | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateAuditLogInput {
  userId: string;
  actorId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  severity?: AuditLogSeverity;
  description?: string;
  changes?: AuditLogChanges;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface AuditLogQuery {
  userId?: string;
  actorId?: string;
  action?: AuditAction | AuditAction[];
  severity?: AuditLogSeverity;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export default AuditLog;
