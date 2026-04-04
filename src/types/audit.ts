/* eslint-disable @typescript-eslint/no-explicit-any */
// src/types/audit.ts
// ===== FILE: src/types/audit.ts =====
// Complete audit log types matching Prisma AuditLog model

import type { AuditAction as PrismaAuditAction } from '@prisma/client';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Audit action types (matches Prisma) */
export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | 'EMAIL_CHANGE'
  | 'SETTINGS_CHANGE'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'SYNC_TRIGGER'
  | 'SUBSCRIPTION_CHANGE'
  | 'API_KEY_CREATE'
  | 'API_KEY_DELETE'
  | 'TWO_FACTOR_ENABLE'
  | 'TWO_FACTOR_DISABLE'
  | 'ACCOUNT_DELETE'
  | 'ADMIN_ACTION';

/** Action status */
export type AuditStatus = 'success' | 'failure';

/** Entity types */
export type AuditEntityType = 
  | 'user'
  | 'platform'
  | 'goal'
  | 'achievement'
  | 'tracker'
  | 'subscription'
  | 'api_key'
  | 'export'
  | 'settings'
  | 'notification'
  | 'support_ticket'
  | 'system';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Main AuditLog interface (matches Prisma model) */
export interface AuditLog {
  id: string;
  userId?: string;

  // Action
  action: PrismaAuditAction;
  category?: string;

  // Entity
  entityType?: string;
  entityId?: string;

  // Details
  description?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;

  // Context
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;

  // Request Info
  requestId?: string;
  requestPath?: string;
  requestMethod?: string;

  // Status
  status: AuditStatus;
  errorMessage?: string;

  // Admin
  performedBy?: string;

  // Timestamp
  createdAt: Date;

  // Relations
  user?: {
    id: string;
    email: string | null;
    name: string | null;
    image?: string | null;
  };
}

/** Audit log entry for display */
export interface AuditLogEntry extends AuditLog {
  actionLabel: string;
  actionIcon: string;
  actionColor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  formattedChanges?: FormattedChange[];
}

/** Formatted change */
export interface FormattedChange {
  field: string;
  oldValue: string;
  newValue: string;
  type: 'added' | 'modified' | 'removed';
}

/** Audit log summary */
export interface AuditLogSummary {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byAction: Record<AuditAction, number>;
  byStatus: Record<AuditStatus, number>;
  byCategory: Record<string, number>;
  recentLogs: AuditLog[];
  topUsers: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
  criticalEvents: AuditLog[];
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create audit log input */
export interface CreateAuditLogInput {
  userId?: string;
  action: PrismaAuditAction;
  category?: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  requestId?: string;
  requestPath?: string;
  requestMethod?: string;
  status?: AuditStatus;
  errorMessage?: string;
  performedBy?: string;
}

/** Audit log filter */
export interface AuditLogFilter {
  userId?: string;
  action?: PrismaAuditAction | PrismaAuditAction[];
  category?: string;
  entityType?: string;
  entityId?: string;
  status?: AuditStatus;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  search?: string;
}

/** Audit log sort options */
export interface AuditLogSortOptions {
  field: 'createdAt' | 'action' | 'status' | 'userId';
  order: 'asc' | 'desc';
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Audit action configuration */
export const AUDIT_ACTION_CONFIG: Record<PrismaAuditAction, {
  label: string;
  icon: string;
  color: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}> = {
  CREATE: {
    label: 'Create',
    icon: 'Plus',
    color: '#10B981',
    severity: 'low',
    category: 'data'
  },
  READ: {
    label: 'Read',
    icon: 'Eye',
    color: '#6B7280',
    severity: 'low',
    category: 'data'
  },
  UPDATE: {
    label: 'Update',
    icon: 'Edit',
    color: '#3B82F6',
    severity: 'low',
    category: 'data'
  },
  DELETE: {
    label: 'Delete',
    icon: 'Trash',
    color: '#EF4444',
    severity: 'medium',
    category: 'data'
  },
  LOGIN: {
    label: 'Login',
    icon: 'LogIn',
    color: '#10B981',
    severity: 'low',
    category: 'auth'
  },
  LOGOUT: {
    label: 'Logout',
    icon: 'LogOut',
    color: '#6B7280',
    severity: 'low',
    category: 'auth'
  },
  LOGIN_FAILED: {
    label: 'Login Failed',
    icon: 'XCircle',
    color: '#F59E0B',
    severity: 'medium',
    category: 'auth'
  },
  PASSWORD_CHANGE: {
    label: 'Password Changed',
    icon: 'Key',
    color: '#8B5CF6',
    severity: 'high',
    category: 'security'
  },
  PASSWORD_RESET: {
    label: 'Password Reset',
    icon: 'RefreshCw',
    color: '#8B5CF6',
    severity: 'high',
    category: 'security'
  },
  EMAIL_CHANGE: {
    label: 'Email Changed',
    icon: 'Mail',
    color: '#8B5CF6',
    severity: 'high',
    category: 'security'
  },
  SETTINGS_CHANGE: {
    label: 'Settings Changed',
    icon: 'Settings',
    color: '#3B82F6',
    severity: 'low',
    category: 'settings'
  },
  EXPORT_DATA: {
    label: 'Data Exported',
    icon: 'Download',
    color: '#6366F1',
    severity: 'medium',
    category: 'data'
  },
  IMPORT_DATA: {
    label: 'Data Imported',
    icon: 'Upload',
    color: '#6366F1',
    severity: 'medium',
    category: 'data'
  },
  SYNC_TRIGGER: {
    label: 'Sync Triggered',
    icon: 'RefreshCw',
    color: '#10B981',
    severity: 'low',
    category: 'sync'
  },
  SUBSCRIPTION_CHANGE: {
    label: 'Subscription Changed',
    icon: 'CreditCard',
    color: '#F59E0B',
    severity: 'high',
    category: 'billing'
  },
  API_KEY_CREATE: {
    label: 'API Key Created',
    icon: 'Key',
    color: '#8B5CF6',
    severity: 'high',
    category: 'security'
  },
  API_KEY_DELETE: {
    label: 'API Key Deleted',
    icon: 'Key',
    color: '#EF4444',
    severity: 'high',
    category: 'security'
  },
  TWO_FACTOR_ENABLE: {
    label: '2FA Enabled',
    icon: 'Shield',
    color: '#10B981',
    severity: 'high',
    category: 'security'
  },
  TWO_FACTOR_DISABLE: {
    label: '2FA Disabled',
    icon: 'ShieldOff',
    color: '#EF4444',
    severity: 'critical',
    category: 'security'
  },
  ACCOUNT_DELETE: {
    label: 'Account Deleted',
    icon: 'UserX',
    color: '#EF4444',
    severity: 'critical',
    category: 'account'
  },
  ADMIN_ACTION: {
    label: 'Admin Action',
    icon: 'Shield',
    color: '#8B5CF6',
    severity: 'high',
    category: 'admin'
  },
  WEBHOOK_TRIGGER: {
    label: '',
    icon: '',
    color: '',
    severity: 'low',
    category: ''
  },
  SHARE_CREATE: {
    label: '',
    icon: '',
    color: '',
    severity: 'low',
    category: ''
  },
  SHARE_ACCESS: {
    label: '',
    icon: '',
    color: '',
    severity: 'low',
    category: ''
  },
  IMPERSONATE_START: {
    label: 'Impersonation Started',
    icon: 'UserPlus',
    color: '#8B5CF6',
    severity: 'high',
    category: 'admin'
  },
  IMPERSONATE_END: {
    label: 'Impersonation Ended',
    icon: 'UserMinus',
    color: '#10B981',
    severity: 'medium',
    category: 'admin'
  }
} as any;

/** Status configuration */
export const AUDIT_STATUS_CONFIG: Record<AuditStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  success: {
    label: 'Success',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle'
  },
  failure: {
    label: 'Failure',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'XCircle'
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get audit action config */
export function getAuditActionConfig(action: PrismaAuditAction) {
  return AUDIT_ACTION_CONFIG[action];
}

/** Get audit status config */
export function getAuditStatusConfig(status: AuditStatus) {
  return AUDIT_STATUS_CONFIG[status];
}

/** Format changes for display */
export function formatChanges(changes?: Record<string, { old: unknown; new: unknown }>): FormattedChange[] {
  if (!changes) return [];
  
  return Object.entries(changes).map(([field, { old: oldValue, new: newValue }]) => ({
    field,
    oldValue: formatValue(oldValue),
    newValue: formatValue(newValue),
    type: oldValue === undefined ? 'added' : newValue === undefined ? 'removed' : 'modified',
  }));
}

/** Format value for display */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  if (value instanceof Date) return value.toLocaleString();
  return String(value);
}

/** Create audit log entry */
export function createAuditLogEntry(log: AuditLog): AuditLogEntry {
  const config = AUDIT_ACTION_CONFIG[log.action];
  
  return {
    ...log,
    actionLabel: config.label,
    actionIcon: config.icon,
    actionColor: config.color,
    severity: config.severity,
    formattedChanges: formatChanges(log.changes),
  };
}

/** Check if action is security-related */
export function isSecurityAction(action: PrismaAuditAction): boolean {
  const securityActions: PrismaAuditAction[] = [
    'LOGIN',
    'LOGIN_FAILED',
    'PASSWORD_CHANGE',
    'PASSWORD_RESET',
    'EMAIL_CHANGE',
    'TWO_FACTOR_ENABLE',
    'TWO_FACTOR_DISABLE',
    'API_KEY_CREATE',
    'API_KEY_DELETE',
  ];
  return securityActions.includes(action);
}

/** Check if action is critical */
export function isCriticalAction(action: PrismaAuditAction): boolean {
  const config = AUDIT_ACTION_CONFIG[action];
  return config.severity === 'critical' || config.severity === 'high';
}

/** Group logs by date */
export function groupLogsByDate(logs: AuditLog[]): Record<string, AuditLog[]> {
  return logs.reduce((acc, log) => {
    const date = new Date(log.createdAt).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AuditLog[]>);
}

/** Get logs for user */
export function getLogsForUser(logs: AuditLog[], userId: string): AuditLog[] {
  return logs.filter(log => log.userId === userId || log.performedBy === userId);
}

/** Get failed login attempts */
export function getFailedLoginAttempts(logs: AuditLog[], limit = 10): AuditLog[] {
  return logs
    .filter(log => log.action === 'LOGIN_FAILED')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/** Detect suspicious activity */
export interface SuspiciousActivity {
  userId?: string;
  ipAddress?: string;
  reason: string;
  count: number;
  logs: AuditLog[];
}

export function detectSuspiciousActivity(logs: AuditLog[]): SuspiciousActivity[] {
  const suspicious: SuspiciousActivity[] = [];
  
  // Check for multiple failed logins
  const failedLogins = logs.filter(log => log.action === 'LOGIN_FAILED');
  const ipGroups = groupBy(failedLogins, 'ipAddress');
  
  Object.entries(ipGroups).forEach(([ip, ipLogs]) => {
    if (ipLogs.length >= 5) {
      suspicious.push({
        ipAddress: ip,
        reason: 'Multiple failed login attempts',
        count: ipLogs.length,
        logs: ipLogs,
      });
    }
  });
  
  return suspicious;
}

/** Group by helper */
function groupBy<T extends object>(
  array: T[],
  key: keyof T
): Record<string, T[]> {

  return array.reduce((acc, item) => {
    const groupKey = String((item as any)[key] ?? 'unknown');

    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/** Export audit logs */
export interface AuditLogExport {
  timestamp: string;
  action: string;
  user: string;
  status: string;
  description: string;
  ipAddress?: string;
  changes?: string;
}

export function exportAuditLogs(logs: AuditLog[]): AuditLogExport[] {
  return logs.map(log => ({
    timestamp: new Date(log.createdAt).toISOString(),
    action: AUDIT_ACTION_CONFIG[log.action].label,
    user: log.user?.email || log.userId || 'System',
    status: log.status,
    description: log.description || '',
    ipAddress: log.ipAddress,
    changes: log.changes ? JSON.stringify(log.changes) : undefined,
  }));
}

export default AuditLog;