// src/types/sync.ts

export type SyncStatus = 'idle' | 'pending' | 'running' | 'success' | 'failed' | 'partial';

export interface SyncJob {
  id: string;
  userId: string;
  platformId?: string;
  status: SyncStatus;
  progress: number;
  totalPlatforms: number;
  completedPlatforms: number;
  failedPlatforms: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface SyncResult {
  platformId: string;
  platformName: string;
  status: SyncStatus;
  entriesAdded: number;
  entriesUpdated: number;
  error?: string;
  duration: number;
}

export interface SyncLog {
  id: string;
  userId: string;
  platformId?: string;
  platform?: {
    name: string;
    icon?: string;
    slug: string;
  };
  status: string;
  message?: string;
  createdAt: Date;
}

export interface SyncState {
  isRunning: boolean;
  currentJob?: SyncJob;
  activeSyncs: number;
  lastSync?: Date;
  recentLogs: SyncLog[];
  platformStatuses: Record<string, PlatformSyncStatus>;
}

export interface PlatformSyncStatus {
  platformId: string;
  lastSync?: Date;
  status: SyncStatus;
  entriesCount: number;
  error?: string;
}

export interface SyncOptions {
  force?: boolean;
  platforms?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface SyncTriggerResponse {
  success: boolean;
  jobId?: string;
  message: string;
  platformCount?: number;
}

export interface DailySyncConfig {
  enabled: boolean;
  time: string; // "HH:MM" format
  timezone: string;
  platforms: string[];
}