// src/types/sync-log.ts
// Platform sync log types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type SyncLogStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial' | 'skipped';
export type SyncTrigger = 'manual' | 'scheduled' | 'webhook' | 'auto' | 'admin';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Sync log record (matches Prisma SyncLog model) */
export interface SyncLog {
  id: string;
  userId: string;
  userPlatformId: string;
  platformId: string;
  status: SyncLogStatus;
  trigger: SyncTrigger;
  startedAt: Date;
  completedAt?: Date | null;
  durationMs?: number | null;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errorMessage?: string | null;
  errorStack?: string | null;
  metadata?: Record<string, unknown> | null;
  retryCount: number;
  nextRetryAt?: Date | null;
  createdAt: Date;
}

/** Sync log with platform info */
export interface SyncLogWithDetails extends SyncLog {
  userPlatform: {
    id: string;
    username: string;
    platform: { id: string; name: string; slug: string; logoUrl?: string | null };
  };
}

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

/** Sync status summary for a user */
export interface SyncStatusSummary {
  userId: string;
  lastSyncAt?: Date | null;
  nextSyncAt?: Date | null;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number;
  platformSyncs: Array<{
    platformId: string;
    platformName: string;
    lastSyncAt?: Date | null;
    status: SyncLogStatus;
    isRunning: boolean;
  }>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getSyncStatusLabel(status: SyncLogStatus): string {
  const labels: Record<SyncLogStatus, string> = {
    pending: 'Pending',
    running: 'Running...',
    completed: 'Completed',
    failed: 'Failed',
    partial: 'Partial',
    skipped: 'Skipped',
  };
  return labels[status];
}

export function formatSyncDuration(ms: number | null | undefined): string {
  if (!ms) return '--';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default SyncLog;
