/* eslint-disable @typescript-eslint/no-unused-vars */
// ===== FILE: src/types/admin.ts =====
// Complete admin types for dashboard and management

import type { AuditAction as PrismaAuditAction } from '@prisma/client';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Audit action types (matches Prisma) */
export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_change'
  | 'password_reset'
  | 'email_change'
  | 'settings_change'
  | 'export_data'
  | 'import_data'
  | 'sync_trigger'
  | 'subscription_change'
  | 'api_key_create'
  | 'api_key_delete'
  | 'two_factor_enable'
  | 'two_factor_disable'
  | 'account_delete'
  | 'admin_action';

/** Admin action status */
export type ActionStatus = 'success' | 'failure' | 'pending';

/** System component */
export type SystemComponent = 'database' | 'cache' | 'queue' | 'storage' | 'email' | 'sync' | 'api';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Admin user view */
export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string;
  role: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
  isVerified: boolean;
  isBanned: boolean;
  banReason?: string;
  currentStreak: number;
  totalProblems: number;
  totalPoints: number;
  platformCount: number;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  subscription?: {
    tier: string;
    status: string;
  };
}

/** Admin dashboard stats */
export interface AdminStats {
  users: {
    total: number;
    active: number;
    new24h: number;
    new7d: number;
    new30d: number;
    banned: number;
    verified: number;
    premium: number;
    growth: number;
  };
  platforms: {
    total: number;
    active: number;
    connections: number;
    syncsToday: number;
    syncsFailed: number;
    avgSyncTime: number;
  };
  content: {
    trackerEntries: number;
    goals: number;
    achievements: number;
    exports: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
    queuedJobs: number;
  };
  revenue?: {
    mrr: number;
    arr: number;
    growth: number;
    churn: number;
  };
}

/** System health status */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: Date;
  uptime: number;
  version: string;
  components: ComponentHealth[];
  checks: HealthCheck[];
  metrics: SystemMetrics;
}

/** Component health */
export interface ComponentHealth {
  name: SystemComponent;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latency?: number;
  message?: string;
  lastCheck: Date;
  details?: Record<string, unknown>;
}

/** Health check result */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  timestamp: Date;
}

/** System metrics */
export interface SystemMetrics {
  requests: {
    total: number;
    perMinute: number;
    avgLatency: number;
    errorRate: number;
  };
  database: {
    connections: number;
    activeQueries: number;
    avgQueryTime: number;
  };
  cache: {
    hitRate: number;
    size: number;
    keys: number;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
    completed: number;
  };
}

/** Audit log entry */
export interface AuditLog {
  id: string;
  userId?: string;
  action: AuditAction;
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
  status: ActionStatus;
  errorMessage?: string;
  performedBy?: string;
  createdAt: Date;
  
  // Relations
  user?: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  };
}

/** Admin action */
export interface AdminAction {
  id: string;
  type: string;
  targetType: 'user' | 'platform' | 'content' | 'system';
  targetId: string;
  adminId: string;
  adminEmail: string;
  reason?: string;
  notes?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  status: ActionStatus;
  createdAt: Date;
  completedAt?: Date;
}

/** Feature flag */
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  enabledForAll: boolean;
  enabledUserIds: string[];
  enabledTiers: string[];
  enabledPercentage: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** System setting */
export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  category?: string;
  isPublic: boolean;
  updatedAt: Date;
  updatedBy?: string;
}

/** Maintenance window */
export interface MaintenanceWindow {
  id: string;
  title: string;
  message: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  affectedServices: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Admin user filter */
export interface AdminUserFilter {
  search?: string;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isBanned?: boolean;
  subscriptionTier?: string;
  startDate?: Date;
  endDate?: Date;
}

/** Audit log filter */
export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction | AuditAction[];
  category?: string;
  entityType?: string;
  entityId?: string;
  status?: ActionStatus;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}

/** Update user admin request */
export interface UpdateUserAdminRequest {
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isBanned?: boolean;
  banReason?: string;
  permissions?: string[];
}

/** Create feature flag request */
export interface CreateFeatureFlagRequest {
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  enabledForAll?: boolean;
  enabledPercentage?: number;
  enabledTiers?: string[];
}

/** Create maintenance window request */
export interface CreateMaintenanceWindowRequest {
  title: string;
  message: string;
  startTime: Date;
  endTime: Date;
  affectedServices?: string[];
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Audit action configuration */
export const AUDIT_ACTION_CONFIG: Record<AuditAction, {
  label: string;
  icon: string;
  color: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = {
  create: { label: 'Create', icon: 'Plus', color: '#10B981', severity: 'low' },
  read: { label: 'Read', icon: 'Eye', color: '#6B7280', severity: 'low' },
  update: { label: 'Update', icon: 'Edit', color: '#3B82F6', severity: 'low' },
  delete: { label: 'Delete', icon: 'Trash', color: '#EF4444', severity: 'medium' },
  login: { label: 'Login', icon: 'LogIn', color: '#10B981', severity: 'low' },
  logout: { label: 'Logout', icon: 'LogOut', color: '#6B7280', severity: 'low' },
  login_failed: { label: 'Login Failed', icon: 'XCircle', color: '#F59E0B', severity: 'medium' },
  password_change: { label: 'Password Change', icon: 'Key', color: '#8B5CF6', severity: 'high' },
  password_reset: { label: 'Password Reset', icon: 'RefreshCw', color: '#8B5CF6', severity: 'high' },
  email_change: { label: 'Email Change', icon: 'Mail', color: '#8B5CF6', severity: 'high' },
  settings_change: { label: 'Settings Change', icon: 'Settings', color: '#3B82F6', severity: 'low' },
  export_data: { label: 'Export Data', icon: 'Download', color: '#6366F1', severity: 'medium' },
  import_data: { label: 'Import Data', icon: 'Upload', color: '#6366F1', severity: 'medium' },
  sync_trigger: { label: 'Sync Trigger', icon: 'RefreshCw', color: '#10B981', severity: 'low' },
  subscription_change: { label: 'Subscription Change', icon: 'CreditCard', color: '#F59E0B', severity: 'high' },
  api_key_create: { label: 'API Key Create', icon: 'Key', color: '#8B5CF6', severity: 'high' },
  api_key_delete: { label: 'API Key Delete', icon: 'Key', color: '#EF4444', severity: 'high' },
  two_factor_enable: { label: '2FA Enable', icon: 'Shield', color: '#10B981', severity: 'high' },
  two_factor_disable: { label: '2FA Disable', icon: 'ShieldOff', color: '#EF4444', severity: 'critical' },
  account_delete: { label: 'Account Delete', icon: 'UserX', color: '#EF4444', severity: 'critical' },
  admin_action: { label: 'Admin Action', icon: 'Shield', color: '#8B5CF6', severity: 'high' },
};

/** System component configuration */
export const COMPONENT_CONFIG: Record<SystemComponent, {
  label: string;
  icon: string;
  description: string;
}> = {
  database: { label: 'Database', icon: 'Database', description: 'PostgreSQL database connection' },
  cache: { label: 'Cache', icon: 'Zap', description: 'Redis cache service' },
  queue: { label: 'Queue', icon: 'ListOrdered', description: 'Background job queue' },
  storage: { label: 'Storage', icon: 'HardDrive', description: 'File storage service' },
  email: { label: 'Email', icon: 'Mail', description: 'Email delivery service' },
  sync: { label: 'Sync', icon: 'RefreshCw', description: 'Platform sync service' },
  api: { label: 'API', icon: 'Globe', description: 'External API services' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get audit action config */
export function getAuditActionConfig(action: AuditAction) {
  return AUDIT_ACTION_CONFIG[action];
}

/** Get component config */
export function getComponentConfig(component: SystemComponent) {
  return COMPONENT_CONFIG[component];
}

/** Calculate system health status */
export function calculateSystemHealth(components: ComponentHealth[]): 'healthy' | 'degraded' | 'down' {
  const downCount = components.filter(c => c.status === 'down').length;
  const degradedCount = components.filter(c => c.status === 'degraded').length;
  
  if (downCount > 0) return 'down';
  if (degradedCount > 0) return 'degraded';
  return 'healthy';
}

/** Format uptime */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  
  return parts.join(' ');
}

/** Format bytes */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default AdminStats;