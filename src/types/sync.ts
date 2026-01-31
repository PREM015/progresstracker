// src/types/sync.ts

import type { SyncStatus as PrismaSyncStatus } from '@prisma/client';

// Re-export Prisma SyncStatus for convenience
export type { PrismaSyncStatus as SyncStatusEnum };

// Simplified SyncStatus for internal use
export type SyncStatus = 
  | 'pending'
  | 'running'
  | 'success'
  | 'partial'
  | 'failed'
  | 'cancelled';

// Map internal status to Prisma enum
export function toPrismaSyncStatus(status: SyncStatus): PrismaSyncStatus {
  const map: Record<SyncStatus, PrismaSyncStatus> = {
    pending: 'PENDING',
    running: 'IN_PROGRESS',
    success: 'SUCCESS',
    partial: 'PARTIAL',
    failed: 'FAILED',
    cancelled: 'CANCELLED',
  };
  return map[status];
}

// Sync Job representation
export interface SyncJob {
  id: string;
  userId: string;
  status: SyncStatus;
  progress: number;
  totalPlatforms: number;
  completedPlatforms: number;
  failedPlatforms: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  platforms?: SyncPlatformStatus[];
}

export interface SyncPlatformStatus {
  platformId: string;
  platformName: string;
  status: SyncStatus;
  itemsFound?: number;
  itemsCreated?: number;
  itemsUpdated?: number;
  error?: string;
  duration?: number;
}

// Sync request options
export interface SyncRequestOptions {
  userId: string;
  platformIds?: string[];
  force?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

// Sync result
export interface SyncResult {
  success: boolean;
  platformId: string;
  platformName?: string;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  duration: number;
  error?: string;
  dataFromDate?: Date;
  dataToDate?: Date;
}

// Sync log entry (matches database)
export interface SyncLogEntry {
  id: string;
  userId: string;
  platformId: string | null;
  userPlatformId: string | null;
  status: PrismaSyncStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  hasError: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  triggeredBy: string;
  platform?: {
    name: string;
    slug: string;
    icon: string | null;
  };
}

// Queue status
export interface SyncQueueStatus {
  queueLength: number;
  activeJobs: number;
  isProcessing: boolean;
}

// Webhook payload types
export interface GitHubWebhookPayload {
  action?: string;
  repository?: {
    id: number;
    name: string;
    full_name: string;
  };
  sender?: {
    login: string;
    id: number;
  };
  commits?: Array<{
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
  }>;
  pusher?: {
    name: string;
    email: string;
  };
  ref?: string;
  before?: string;
  after?: string;
}

export interface GitLabWebhookPayload {
  object_kind: string;
  project?: {
    id: number;
    name: string;
    path_with_namespace: string;
  };
  user?: {
    name: string;
    username: string;
  };
  commits?: Array<{
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
  }>;
}

export interface BitbucketWebhookPayload {
  repository?: {
    uuid: string;
    name: string;
    full_name: string;
  };
  actor?: {
    display_name: string;
    username: string;
  };
  push?: {
    changes: Array<{
      commits: Array<{
        hash: string;
        message: string;
        date: string;
        author: {
          raw: string;
        };
      }>;
    }>;
  };
}

// Scraper types
export interface ScraperResult {
  success: boolean;
  data?: ScrapedData;
  error?: string;
  rateLimited?: boolean;
  retryAfter?: number;
}

export interface ScrapedData {
  problemsSolved?: number;
  problemsAttempted?: number;
  easyProblems?: number;
  mediumProblems?: number;
  hardProblems?: number;
  commits?: number;
  pullRequests?: number;
  pullRequestsMerged?: number;
  issuesOpened?: number;
  issuesClosed?: number;
  rating?: number;
  ratingChange?: number;
  rank?: number;
  rankChange?: number;
  points?: number;
  pointsEarned?: number;
  streak?: number;
  contestsParticipated?: number;
  contestsCompleted?: number;
  xpEarned?: number;
  coursesCompleted?: number;
  certificationsEarned?: number;
  // Platform-specific
  contributions?: number;
  followers?: number;
  following?: number;
  stars?: number;
  repositories?: number;
  // Raw data for storage
  rawData?: Record<string, unknown>;
}

// Platform sync configuration
export interface PlatformSyncConfig {
  platformId: string;
  slug: string;
  syncInterval: number; // minutes
  rateLimit: number;
  rateLimitWindow: number;
  supportsAutoSync: boolean;
  supportsWebhook: boolean;
  priority: number;
}