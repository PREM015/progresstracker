// ===== FILE: src/types/sync.ts =====
// Complete sync types matching Prisma schema

import type { SyncStatus as PrismaSyncStatus } from '@prisma/client';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Sync status (matches Prisma) */
export type SyncStatus = 
  | 'idle'
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'partial'
  | 'failed'
  | 'cancelled'
  | 'rate_limited';

/** Sync trigger type */
export type SyncTrigger = 'manual' | 'scheduled' | 'webhook' | 'system' | 'login' | 'auto';

/** Sync priority */
export type SyncPriority = 'low' | 'normal' | 'high' | 'critical';

/** Map Prisma status to local */
export const SYNC_STATUS_MAP: Record<PrismaSyncStatus, SyncStatus> = {
  IDLE: 'idle',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RATE_LIMITED: 'rate_limited',
};

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Sync job */
export interface SyncJob {
  id: string;
  userId: string;
  platformId?: string;
  userPlatformId?: string;
  
  // Status
  status: SyncStatus;
  priority: SyncPriority;
  
  // Timing
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // ms
  
  // Progress
  progress: number; // 0-100
  currentStep?: string;
  
  // Results
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  
  // Data range
  dataFromDate?: Date;
  dataToDate?: Date;
  
  // Error
  hasError: boolean;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  
  // Retry
  attemptNumber: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  
  // Trigger
  triggeredBy: SyncTrigger;
  triggerSource?: string;
  
  // Request
  requestId?: string;
  
  // Log entries
  logEntries?: SyncLogEntry[];
  
  // Timestamps
  createdAt: Date;
  
  // Relations
  platform?: {
    id: string;
    slug: string;
    name: string;
    icon?: string;
  };
}

/** Sync log entry */
export interface SyncLogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

/** Sync result */
export interface SyncResult {
  success: boolean;
  jobId: string;
  status: SyncStatus;
  
  // Stats
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  
  // Timing
  duration: number;
  startedAt: Date;
  completedAt: Date;
  
  // Data
  dataFromDate?: Date;
  dataToDate?: Date;
  
  // Error
  error?: SyncError;
  
  // Created/Updated entries
  entries?: Array<{
    id: string;
    date: Date;
    isNew: boolean;
  }>;
}

/** Sync error */
export interface SyncError {
  code: string;
  message: string;
  details?: string;
  stack?: string;
  retryable: boolean;
  retryAfter?: number;
}

/** Platform sync status */
export interface PlatformSyncStatus {
  platformId: string;
  userPlatformId: string;
  platformSlug: string;
  platformName: string;
  platformIcon?: string;
  
  // Status
  status: SyncStatus;
  isActive: boolean;
  isConnected: boolean;
  
  // Last sync
  lastSyncedAt?: Date;
  lastSyncStatus?: SyncStatus;
  lastSyncDuration?: number;
  lastSyncError?: string;
  
  // Stats
  syncAttempts: number;
  consecutiveFailures: number;
  successRate: number;
  
  // Next sync
  nextSyncAt?: Date;
  autoSync: boolean;
  
  // Data
  cachedStats?: Record<string, unknown>;
  statsUpdatedAt?: Date;
}

/** Sync schedule */
export interface SyncSchedule {
  id: string;
  userId: string;
  platformId?: string;
  
  // Schedule
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'custom';
  cronExpression?: string;
  timezone: string;
  
  // Next run
  nextRunAt: Date;
  lastRunAt?: Date;
  lastRunStatus?: SyncStatus;
  
  // Stats
  runCount: number;
  successCount: number;
  failureCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

/** Sync queue item */
export interface SyncQueueItem {
  id: string;
  userId: string;
  platformId: string;
  userPlatformId: string;
  priority: SyncPriority;
  scheduledFor: Date;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

/** Sync progress update */
export interface SyncProgressUpdate {
  jobId: string;
  status: SyncStatus;
  progress: number;
  currentStep: string;
  itemsProcessed: number;
  totalItems: number;
  estimatedTimeRemaining?: number;
  message?: string;
}

/** Sync summary (for dashboard) */
export interface SyncSummary {
  lastSyncAt?: Date;
  lastSyncStatus?: SyncStatus;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number;
  avgDuration: number;
  platformStatuses: PlatformSyncStatus[];
  pendingJobs: number;
  recentJobs: SyncJob[];
  nextScheduledSync?: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Trigger sync request */
export interface TriggerSyncRequest {
  platformId?: string;
  userPlatformId?: string;
  syncAll?: boolean;
  priority?: SyncPriority;
  force?: boolean;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

/** Sync filter options */
export interface SyncFilter {
  status?: SyncStatus | SyncStatus[];
  platformId?: string;
  triggeredBy?: SyncTrigger;
  hasError?: boolean;
  startDate?: Date;
  endDate?: Date;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Sync status configuration */
export const SYNC_STATUS_CONFIG: Record<SyncStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}> = {
  idle: {
    label: 'Idle',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'Clock',
    description: 'Waiting for next sync',
  },
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Clock',
    description: 'Sync queued',
  },
  in_progress: {
    label: 'Syncing',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'RefreshCw',
    description: 'Sync in progress',
  },
  success: {
    label: 'Success',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle',
    description: 'Sync completed successfully',
  },
  partial: {
    label: 'Partial',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'AlertTriangle',
    description: 'Sync completed with some errors',
  },
  failed: {
    label: 'Failed',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'XCircle',
    description: 'Sync failed',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'XCircle',
    description: 'Sync was cancelled',
  },
  rate_limited: {
    label: 'Rate Limited',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Clock',
    description: 'Rate limited, will retry later',
  },
};

/** Sync trigger configuration */
export const SYNC_TRIGGER_CONFIG: Record<SyncTrigger, {
  label: string;
  icon: string;
}> = {
  manual: { label: 'Manual', icon: 'Hand' },
  scheduled: { label: 'Scheduled', icon: 'Calendar' },
  webhook: { label: 'Webhook', icon: 'Webhook' },
  system: { label: 'System', icon: 'Settings' },
  login: { label: 'Login', icon: 'LogIn' },
  auto: { label: 'Auto', icon: 'Zap' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get sync status config */
export function getSyncStatusConfig(status: SyncStatus) {
  return SYNC_STATUS_CONFIG[status];
}

/** Check if sync is in progress */
export function isSyncInProgress(status: SyncStatus): boolean {
  return status === 'in_progress' || status === 'pending';
}

/** Check if sync is complete */
export function isSyncComplete(status: SyncStatus): boolean {
  return status === 'success' || status === 'partial' || status === 'failed' || status === 'cancelled';
}

/** Check if sync was successful */
export function isSyncSuccessful(status: SyncStatus): boolean {
  return status === 'success';
}

/** Calculate success rate */
export function calculateSyncSuccessRate(successful: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((successful / total) * 100);
}

/** Format sync duration */
export function formatSyncDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/** Get time since last sync */
export function getTimeSinceSync(lastSyncedAt?: Date): string {
  if (!lastSyncedAt) return 'Never';
  
  const now = new Date();
  const diff = now.getTime() - new Date(lastSyncedAt).getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(lastSyncedAt).toLocaleDateString();
}

/** Should retry sync */
export function shouldRetrySyncError(error: SyncError): boolean {
  const retryableCodes = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMITED',
    'PLATFORM_ERROR',
    'TEMPORARY_ERROR',
  ];
  return error.retryable || retryableCodes.includes(error.code);
}

/** Get next retry delay with exponential backoff */
export function getNextRetryDelay(attemptNumber: number): number {
  const baseDelay = 60000; // 1 minute
  const maxDelay = 3600000; // 1 hour
  const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
  // Add jitter
  return delay + Math.random() * 10000;
}

export default SyncJob;