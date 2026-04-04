// ===== FILE: src/config/sync.ts =====
// Sync configuration - synced with Prisma SyncLog and UserPlatform models
/* eslint-disable @typescript-eslint/no-unused-vars */


import type { SyncStatus } from '@prisma/client';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SyncConfig {
  /** Rate limiting settings */
  rateLimit: SyncRateLimitConfig;
  /** Retry configuration */
  retry: SyncRetryConfig;
  /** Timeout settings */
  timeout: SyncTimeoutConfig;
  /** Queue settings */
  queue: SyncQueueConfig;
  /** Platform-specific settings */
  platforms: SyncPlatformSettings;
  /** Health check settings */
  healthCheck: SyncHealthCheckConfig;
}

export interface SyncRateLimitConfig {
  /** Max requests per minute globally */
  maxRequestsPerMinute: number;
  /** Max concurrent syncs */
  maxConcurrentSyncs: number;
  /** Max syncs per user per hour */
  maxSyncsPerUserPerHour: number;
  /** Cooldown between syncs for same platform (seconds) */
  platformCooldownSeconds: number;
}

export interface SyncRetryConfig {
  /** Max retry attempts */
  maxRetries: number;
  /** Initial delay between retries (ms) */
  initialDelay: number;
  /** Max delay between retries (ms) */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Errors that should not be retried */
  nonRetryableErrors: string[];
}

export interface SyncTimeoutConfig {
  /** Request timeout (ms) */
  request: number;
  /** Total job timeout (ms) */
  job: number;
  /** Scraping timeout (ms) */
  scraping: number;
  /** OAuth timeout (ms) */
  oauth: number;
}

export interface SyncQueueConfig {
  /** Enable queue processing */
  enabled: boolean;
  /** Queue processing interval (ms) */
  processingInterval: number;
  /** Max items to process per batch */
  batchSize: number;
  /** Priority levels */
  priorities: {
    high: number;
    normal: number;
    low: number;
  };
}

export interface SyncPlatformSettings {
  /** Platforms with working auto-sync */
  workingPlatforms: string[];
  /** Platforms requiring OAuth */
  oauthPlatforms: string[];
  /** Platforms requiring web scraping */
  scrapingPlatforms: string[];
  /** Manual-only platforms */
  manualPlatforms: string[];
  /** Platforms with webhooks */
  webhookPlatforms: string[];
  /** Platform-specific rate limits */
  platformRateLimits: Record<string, { requests: number; window: number }>;
}

export interface SyncHealthCheckConfig {
  /** Enable health checks */
  enabled: boolean;
  /** Check interval (ms) */
  interval: number;
  /** Consecutive failures before marking unhealthy */
  unhealthyThreshold: number;
  /** Consecutive successes before marking healthy */
  healthyThreshold: number;
}

export interface SyncJobStatus {
  status: SyncStatus;
  progress: number;
  message: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  itemsProcessed: number;
  itemsTotal: number;
}

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

export const SYNC_STATUS_CONFIG: Record<SyncStatus, {
  label: string;
  color: string;
  icon: string;
  isTerminal: boolean;
}> = {
  IDLE: {
    label: 'Idle',
    color: '#6B7280',
    icon: 'Circle',
    isTerminal: true,
  },
  PENDING: {
    label: 'Pending',
    color: '#F59E0B',
    icon: 'Clock',
    isTerminal: false,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: '#3B82F6',
    icon: 'Loader',
    isTerminal: false,
  },
  SUCCESS: {
    label: 'Success',
    color: '#10B981',
    icon: 'CheckCircle',
    isTerminal: true,
  },
  PARTIAL: {
    label: 'Partial Success',
    color: '#F59E0B',
    icon: 'AlertCircle',
    isTerminal: true,
  },
  FAILED: {
    label: 'Failed',
    color: '#EF4444',
    icon: 'XCircle',
    isTerminal: true,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#6B7280',
    icon: 'XCircle',
    isTerminal: true,
  },
  RATE_LIMITED: {
    label: 'Rate Limited',
    color: 'text-amber-500',
    icon: 'AlertTriangle',
    isTerminal: true,
  },
  ERROR: {
    label: 'Error',
    color: 'text-red-500',
    icon: 'XCircle',
  },
} as any;

// =============================================================================
// MAIN CONFIGURATION
// =============================================================================

export const syncConfig: SyncConfig = {
  rateLimit: {
    maxRequestsPerMinute: 30,
    maxConcurrentSyncs: 5,
    maxSyncsPerUserPerHour: 10,
    platformCooldownSeconds: 300, // 5 minutes
  },
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    nonRetryableErrors: [
      'INVALID_CREDENTIALS',
      'ACCOUNT_NOT_FOUND',
      'PROFILE_PRIVATE',
      'UNAUTHORIZED',
      'FORBIDDEN',
    ],
  },
  // ===== FILE: src/config/sync.ts (CONTINUED) =====

  timeout: {
    request: 30000, // 30 seconds
    job: 300000, // 5 minutes
    scraping: 60000, // 1 minute
    oauth: 30000, // 30 seconds
  },
  queue: {
    enabled: true,
    processingInterval: 5000, // 5 seconds
    batchSize: 10,
    priorities: {
      high: 1,
      normal: 5,
      low: 10,
    },
  },
  platforms: {
    workingPlatforms: [
      'github',
      'gitlab',
      'leetcode',
      'codeforces',
      'atcoder',
      'codewars',
      'exercism',
      'geeksforgeeks',
      'kaggle',
      'codingame',
      'freecodecamp',
      'gssoc',
      'topcoder',
      'dmoj',
      'hackerrank',
      'codechef',
      'hackerearth',
      'interviewbit',
      'datacamp',
      'codecademy',
      'scrimba',
      'sololearn',
      'kwoc',
    ],
    oauthPlatforms: [
      'github',
      'gitlab',
      'bitbucket',
      'linkedin',
      'dribbble',
      'behance',
      'producthunt',
      'devpost',
      'devfolio',
      'mlh',
      'coursera',
      'edx',
      'udacity',
      'khanacademy',
      'hacktoberfest',
      'wellfound',
      'hired',
      'replit',
      'showwcase',
    ],
    scrapingPlatforms: [
      'leetcode',
      'codechef',
      'hackerrank',
      'hackerearth',
      'geeksforgeeks',
      'spoj',
      'interviewbit',
      'naukri',
      'internshala',
      'instahyre',
      'codecademy',
      'freecodecamp',
      'datacamp',
      'scrimba',
      'sololearn',
      'unstop',
      'gssoc',
      'kwoc',
      'hackathoncom',
    ],
    manualPlatforms: [
      'udemy',
      'skillshare',
      'projecteuler',
      'algoexpert',
      'codingninjas',
      'cses',
      'indeed',
      'glassdoor',
      'monster',
      'dice',
      'simplyhired',
      'ziprecruiter',
      'levels',
      'blind',
      'gsoc',
      'outreachy',
      'lfx',
      'mlhfellowship',
      'swoc',
      'jwoc',
      'ssoc',
      'amazonjobs',
      'microsoftcareers',
      'googlecareers',
      'metacareers',
      'applecareers',
      'netflixjobs',
      'ibmcareers',
      'salesforcecareers',
      'sourceforge',
      'frontendmasters',
      'egghead',
    ],
    webhookPlatforms: [
      'github',
      'gitlab',
      'bitbucket',
    ],
    platformRateLimits: {
      github: { requests: 5000, window: 3600 },
      gitlab: { requests: 2000, window: 3600 },
      bitbucket: { requests: 1000, window: 3600 },
      leetcode: { requests: 10, window: 60 },
      codeforces: { requests: 5, window: 60 },
      codechef: { requests: 5, window: 60 },
      hackerrank: { requests: 5, window: 60 },
      kaggle: { requests: 10, window: 60 },
    },
  },
  healthCheck: {
    enabled: true,
    interval: 60000, // 1 minute
    unhealthyThreshold: 3,
    healthyThreshold: 2,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if sync is supported for a platform
 */
export function isSyncSupported(slug: string): boolean {
  return syncConfig.platforms.workingPlatforms.includes(slug);
}

/**
 * Check if platform requires OAuth
 */
export function requiresOAuth(slug: string): boolean {
  return syncConfig.platforms.oauthPlatforms.includes(slug);
}

/**
 * Check if platform requires scraping
 */
export function requiresScraping(slug: string): boolean {
  return syncConfig.platforms.scrapingPlatforms.includes(slug);
}

/**
 * Check if platform is manual-only
 */
export function isManualOnly(slug: string): boolean {
  return syncConfig.platforms.manualPlatforms.includes(slug);
}

/**
 * Check if platform supports webhooks
 */
export function supportsWebhook(slug: string): boolean {
  return syncConfig.platforms.webhookPlatforms.includes(slug);
}

/**
 * Get sync method for platform
 */
export function getSyncMethod(slug: string): 'oauth' | 'api' | 'scraping' | 'manual' {
  if (requiresOAuth(slug)) return 'oauth';
  if (requiresScraping(slug)) return 'scraping';
  if (isManualOnly(slug)) return 'manual';
  return 'api';
}

/**
 * Get platform rate limit
 */
export function getPlatformRateLimit(slug: string): { requests: number; window: number } {
  return syncConfig.platforms.platformRateLimits[slug] || { requests: 10, window: 60 };
}

/**
 * Get status config
 */
export function getSyncStatusConfig(status: SyncStatus): typeof SYNC_STATUS_CONFIG[SyncStatus] {
  return SYNC_STATUS_CONFIG[status];
}

/**
 * Get status label
 */
export function getSyncStatusLabel(status: SyncStatus): string {
  return SYNC_STATUS_CONFIG[status]?.label || status;
}

/**
 * Get status color
 */
export function getSyncStatusColor(status: SyncStatus): string {
  return SYNC_STATUS_CONFIG[status]?.color || '#6B7280';
}

/**
 * Check if status is terminal
 */
export function isTerminalStatus(status: SyncStatus): boolean {
  return SYNC_STATUS_CONFIG[status]?.isTerminal ?? true;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(attempt: number): number {
  const { initialDelay, maxDelay, backoffMultiplier } = syncConfig.retry;
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(errorCode: string): boolean {
  return !syncConfig.retry.nonRetryableErrors.includes(errorCode);
}

/**
 * Check if user can sync (rate limit)
 */
export function canUserSync(syncsInLastHour: number): boolean {
  return syncsInLastHour < syncConfig.rateLimit.maxSyncsPerUserPerHour;
}

/**
 * Calculate next available sync time
 */
export function getNextAvailableSyncTime(lastSyncAt: Date): Date {
  const cooldown = syncConfig.rateLimit.platformCooldownSeconds * 1000;
  return new Date(lastSyncAt.getTime() + cooldown);
}

/**
 * Check if platform can be synced (cooldown)
 */
export function canSyncPlatform(lastSyncAt: Date | null): boolean {
  if (!lastSyncAt) return true;
  return new Date() >= getNextAvailableSyncTime(lastSyncAt);
}

/**
 * Get cooldown remaining (seconds)
 */
export function getCooldownRemaining(lastSyncAt: Date | null): number {
  if (!lastSyncAt) return 0;
  const nextSync = getNextAvailableSyncTime(lastSyncAt);
  const remaining = nextSync.getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Format sync duration
 */
export function formatSyncDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 60000).toFixed(1)}m`;
}

/**
 * Get estimated sync time for platform
 */
export function getEstimatedSyncTime(slug: string): string {
  if (requiresOAuth(slug)) return '5-15 seconds';
  if (requiresScraping(slug)) return '15-45 seconds';
  if (isManualOnly(slug)) return 'N/A (Manual)';
  return '3-10 seconds';
}

/**
 * Create sync job status
 */
export function createSyncJobStatus(
  status: SyncStatus,
  options: Partial<SyncJobStatus> = {}
): SyncJobStatus {
  return {
    status,
    progress: 0,
    message: getSyncStatusLabel(status),
    startedAt: new Date(),
    itemsProcessed: 0,
    itemsTotal: 0,
    ...options,
  };
}

/**
 * Log sync event
 */
export function logSyncEvent(
  event: 'start' | 'progress' | 'success' | 'error' | 'retry' | 'cancelled',
  details: Record<string, unknown>
): void {
  const level = event === 'error' ? 'error' : event === 'retry' ? 'warn' : 'info';
  
  if (level === 'error') {
    logger.error(`Sync ${event}`, details);
  } else if (level === 'warn') {
    logger.warn(`Sync ${event}`, details);
  } else {
    logger.info(`Sync ${event}`, details);
  }
}

/**
 * Get sync statistics
 */
export function getSyncStats(): {
  supportedPlatforms: number;
  oauthPlatforms: number;
  scrapingPlatforms: number;
  manualPlatforms: number;
  webhookPlatforms: number;
} {
  return {
    supportedPlatforms: syncConfig.platforms.workingPlatforms.length,
    oauthPlatforms: syncConfig.platforms.oauthPlatforms.length,
    scrapingPlatforms: syncConfig.platforms.scrapingPlatforms.length,
    manualPlatforms: syncConfig.platforms.manualPlatforms.length,
    webhookPlatforms: syncConfig.platforms.webhookPlatforms.length,
  };
}

/**
 * Validate sync configuration
 */
export function validateSyncConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for overlapping platforms
  const allPlatforms = new Set<string>();
  const duplicates: string[] = [];
  
  [
    ...syncConfig.platforms.oauthPlatforms,
    ...syncConfig.platforms.scrapingPlatforms,
    ...syncConfig.platforms.manualPlatforms,
  ].forEach((p) => {
    if (allPlatforms.has(p)) {
      // This is expected - platforms can be in multiple categories
    }
    allPlatforms.add(p);
  });
  
  // Check working platforms are in at least one category
  syncConfig.platforms.workingPlatforms.forEach((p) => {
    if (!allPlatforms.has(p)) {
      errors.push(`Working platform "${p}" is not in any sync category`);
    }
  });
  
  // Validate rate limits
  if (syncConfig.rateLimit.maxRequestsPerMinute <= 0) {
    errors.push('maxRequestsPerMinute must be positive');
  }
  
  if (syncConfig.rateLimit.maxConcurrentSyncs <= 0) {
    errors.push('maxConcurrentSyncs must be positive');
  }
  
  // Validate timeouts
  if (syncConfig.timeout.request <= 0) {
    errors.push('Request timeout must be positive');
  }
  
  if (syncConfig.timeout.job < syncConfig.timeout.request) {
    errors.push('Job timeout should be greater than request timeout');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// ERROR CODES
// =============================================================================

export const SYNC_ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid or expired credentials',
  UNAUTHORIZED: 'Not authorized to access this resource',
  FORBIDDEN: 'Access forbidden',
  TOKEN_EXPIRED: 'Access token has expired',
  
  // Account errors
  ACCOUNT_NOT_FOUND: 'Account not found on platform',
  PROFILE_PRIVATE: 'Profile is set to private',
  ACCOUNT_SUSPENDED: 'Account is suspended',
  
  // Rate limiting
  RATE_LIMITED: 'Rate limit exceeded',
  TOO_MANY_REQUESTS: 'Too many requests',
  
  // Network errors
  NETWORK_ERROR: 'Network connection error',
  TIMEOUT: 'Request timed out',
  CONNECTION_REFUSED: 'Connection refused',
  
  // Platform errors
  PLATFORM_UNAVAILABLE: 'Platform is temporarily unavailable',
  MAINTENANCE_MODE: 'Platform is under maintenance',
  API_ERROR: 'Platform API error',
  
  // Data errors
  PARSE_ERROR: 'Failed to parse response data',
  INVALID_DATA: 'Invalid data received',
  DATA_MISMATCH: 'Data mismatch detected',
  
  // Internal errors
  INTERNAL_ERROR: 'Internal server error',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

export type SyncErrorCode = keyof typeof SYNC_ERROR_CODES;

/**
 * Get error message for code
 */
export function getSyncErrorMessage(code: SyncErrorCode): string {
  return SYNC_ERROR_CODES[code] || SYNC_ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Categorize error
 */
export function categorizeError(code: SyncErrorCode): 'auth' | 'account' | 'rate_limit' | 'network' | 'platform' | 'data' | 'internal' {
  if (['INVALID_CREDENTIALS', 'UNAUTHORIZED', 'FORBIDDEN', 'TOKEN_EXPIRED'].includes(code)) {
    return 'auth';
  }
  if (['ACCOUNT_NOT_FOUND', 'PROFILE_PRIVATE', 'ACCOUNT_SUSPENDED'].includes(code)) {
    return 'account';
  }
  if (['RATE_LIMITED', 'TOO_MANY_REQUESTS'].includes(code)) {
    return 'rate_limit';
  }
  if (['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_REFUSED'].includes(code)) {
    return 'network';
  }
  if (['PLATFORM_UNAVAILABLE', 'MAINTENANCE_MODE', 'API_ERROR'].includes(code)) {
    return 'platform';
  }
  if (['PARSE_ERROR', 'INVALID_DATA', 'DATA_MISMATCH'].includes(code)) {
    return 'data';
  }
  return 'internal';
}

export default syncConfig;