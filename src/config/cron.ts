// ============================================================================
// FILE: src/config/cron.ts
// PURPOSE: Cron job and scheduled task configuration
// ============================================================================

// =============================================================================
// ENVIRONMENT
// =============================================================================

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface CronConfig {
  enabled: boolean;
  timezone: string;
  jobs: Record<string, CronJobConfig>;
  retries: RetryConfig;
  concurrency: ConcurrencyConfig;
  monitoring: MonitoringConfig;
}

export interface CronJobConfig {
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  timeout: number;
  retries: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  tags: string[];
  runOnStart?: boolean;
  exclusive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ConcurrencyConfig {
  maxConcurrentJobs: number;
  maxJobsPerMinute: number;
  queueSize: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  alertOnFailure: boolean;
  alertOnSlowJob: boolean;
  slowJobThresholdMs: number;
  healthCheckInterval: number;
  metricsRetentionDays: number;
}

// =============================================================================
// CRON SCHEDULES
// =============================================================================

/**
 * Cron schedule expressions reference:
 * - Second (optional): 0-59
 * - Minute: 0-59
 * - Hour: 0-23
 * - Day of month: 1-31
 * - Month: 1-12 (or names)
 * - Day of week: 0-7 (0 or 7 is Sunday, or names)
 *
 * Examples:
 * - "0 * * * *" = Every hour at minute 0
 * - "0 0 * * *" = Every day at midnight
 * - "0 0 * * 0" = Every Sunday at midnight
 * - "0 0 1 * *" = First day of every month at midnight
 * - "*15 * * * *" = Every 15 minutes"**/


export const CRON_SCHEDULES = {
  // Every minute
  EVERY_MINUTE: '* * * * *',

  // Every 5 minutes
  EVERY_5_MINUTES: '*/5 * * * *',

  // Every 15 minutes
  EVERY_15_MINUTES: '*/15 * * * *',

  // Every 30 minutes
  EVERY_30_MINUTES: '*/30 * * * *',

  // Every hour
  EVERY_HOUR: '0 * * * *',

  // Every 2 hours
  EVERY_2_HOURS: '0 */2 * * *',

  // Every 4 hours
  EVERY_4_HOURS: '0 */4 * * *',

  // Every 6 hours
  EVERY_6_HOURS: '0 */6 * * *',

  // Every 12 hours
  EVERY_12_HOURS: '0 */12 * * *',

  // Daily at midnight
  DAILY_MIDNIGHT: '0 0 * * *',

  // Daily at 1 AM
  DAILY_1AM: '0 1 * * *',

  // Daily at 6 AM
  DAILY_6AM: '0 6 * * *',

  // Daily at 9 AM
  DAILY_9AM: '0 9 * * *',

  // Weekly on Sunday at midnight
  WEEKLY_SUNDAY: '0 0 * * 0',

  // Weekly on Monday at midnight
  WEEKLY_MONDAY: '0 0 * * 1',

  // Monthly on 1st at midnight
  MONTHLY_FIRST: '0 0 1 * *',

  // Quarterly (1st of Jan, Apr, Jul, Oct)
  QUARTERLY: '0 0 1 1,4,7,10 *',

  // Yearly on Jan 1st
  YEARLY: '0 0 1 1 *',
} as const;

// =============================================================================
// JOB CONFIGURATIONS
// =============================================================================

export const CRON_JOBS: Record<string, CronJobConfig> = {
  // ==================== SYNC JOBS ====================

  dailySync: {
    name: 'Daily Platform Sync',
    description: 'Sync all user platforms daily',
    schedule: CRON_SCHEDULES.DAILY_1AM,
    enabled: IS_PRODUCTION,
    timeout: 30 * 60 * 1000, // 30 minutes
    retries: 3,
    priority: 'high',
    tags: ['sync', 'platforms', 'daily'],
    exclusive: true,
  },

  platformHealthCheck: {
    name: 'Platform Health Check',
    description: 'Check health status of all platforms',
    schedule: CRON_SCHEDULES.EVERY_15_MINUTES,
    enabled: true,
    timeout: 5 * 60 * 1000, // 5 minutes
    retries: 2,
    priority: 'normal',
    tags: ['health', 'platforms', 'monitoring'],
  },

  syncRetry: {
    name: 'Sync Retry',
    description: 'Retry failed sync jobs',
    schedule: CRON_SCHEDULES.EVERY_HOUR,
    enabled: true,
    timeout: 15 * 60 * 1000, // 15 minutes
    retries: 1,
    priority: 'normal',
    tags: ['sync', 'retry'],
  },

  // ==================== STREAK JOBS ====================

  streakCheck: {
    name: 'Streak Check',
    description: 'Check and update user streaks',
    schedule: CRON_SCHEDULES.DAILY_MIDNIGHT,
    enabled: true,
    timeout: 10 * 60 * 1000, // 10 minutes
    retries: 3,
    priority: 'critical',
    tags: ['streaks', 'daily'],
    exclusive: true,
  },

  streakReminder: {
    name: 'Streak Reminder',
    description: 'Send streak at-risk notifications',
    schedule: '0 18 * * *', // 6 PM daily
    enabled: IS_PRODUCTION,
    timeout: 10 * 60 * 1000,
    retries: 2,
    priority: 'high',
    tags: ['streaks', 'notifications'],
  },

  streakFreeze: {
    name: 'Streak Freeze Check',
    description: 'Process streak freeze requests',
    schedule: '0 23 * * *', // 11 PM daily
    enabled: true,
    timeout: 5 * 60 * 1000,
    retries: 2,
    priority: 'high',
    tags: ['streaks', 'freeze'],
  },

  // ==================== ACHIEVEMENT JOBS ====================

  achievementCheck: {
    name: 'Achievement Check',
    description: 'Check and unlock user achievements',
    schedule: CRON_SCHEDULES.EVERY_HOUR,
    enabled: true,
    timeout: 15 * 60 * 1000,
    retries: 2,
    priority: 'normal',
    tags: ['achievements'],
  },

  // ==================== LEADERBOARD JOBS ====================

  leaderboardUpdate: {
    name: 'Leaderboard Update',
    description: 'Update global leaderboard rankings',
    schedule: CRON_SCHEDULES.EVERY_HOUR,
    enabled: true,
    timeout: 10 * 60 * 1000,
    retries: 2,
    priority: 'normal',
    tags: ['leaderboard', 'rankings'],
  },

  rankUpdate: {
    name: 'Rank Update',
    description: 'Recalculate user ranks',
    schedule: CRON_SCHEDULES.DAILY_6AM,
    enabled: true,
    timeout: 20 * 60 * 1000,
    retries: 2,
    priority: 'high',
    tags: ['rankings', 'daily'],
  },

  // ==================== REPORT JOBS ====================

  weeklyReport: {
    name: 'Weekly Report',
    description: 'Generate and send weekly reports',
    schedule: CRON_SCHEDULES.WEEKLY_MONDAY,
    enabled: IS_PRODUCTION,
    timeout: 30 * 60 * 1000,
    retries: 3,
    priority: 'normal',
    tags: ['reports', 'email', 'weekly'],
    exclusive: true,
  },

  monthlyReport: {
    name: 'Monthly Report',
    description: 'Generate and send monthly reports',
    schedule: CRON_SCHEDULES.MONTHLY_FIRST,
    enabled: IS_PRODUCTION,
    timeout: 45 * 60 * 1000,
    retries: 3,
    priority: 'normal',
    tags: ['reports', 'email', 'monthly'],
    exclusive: true,
  },

  // ==================== GOAL JOBS ====================

  goalReminder: {
    name: 'Goal Reminder',
    description: 'Send goal deadline reminders',
    schedule: CRON_SCHEDULES.DAILY_9AM,
    enabled: IS_PRODUCTION,
    timeout: 10 * 60 * 1000,
    retries: 2,
    priority: 'normal',
    tags: ['goals', 'notifications'],
  },

  goalDeadlineCheck: {
    name: 'Goal Deadline Check',
    description: 'Check for goals approaching deadline',
    schedule: CRON_SCHEDULES.EVERY_6_HOURS,
    enabled: true,
    timeout: 5 * 60 * 1000,
    retries: 2,
    priority: 'normal',
    tags: ['goals', 'deadlines'],
  },

  // ==================== STATS JOBS ====================

  statsAggregate: {
    name: 'Stats Aggregate',
    description: 'Aggregate daily statistics',
    schedule: '0 2 * * *', // 2 AM daily
    enabled: true,
    timeout: 20 * 60 * 1000,
    retries: 3,
    priority: 'high',
    tags: ['stats', 'aggregation', 'daily'],
    exclusive: true,
  },

  // ==================== CLEANUP JOBS ====================

  sessionCleanup: {
    name: 'Session Cleanup',
    description: 'Remove expired sessions',
    schedule: CRON_SCHEDULES.EVERY_HOUR,
    enabled: true,
    timeout: 5 * 60 * 1000,
    retries: 2,
    priority: 'low',
    tags: ['cleanup', 'sessions'],
  },

  tokenCleanup: {
    name: 'Token Cleanup',
    description: 'Remove expired tokens (password reset, verification)',
    schedule: CRON_SCHEDULES.DAILY_1AM,
    enabled: true,
    timeout: 5 * 60 * 1000,
    retries: 2,
    priority: 'low',
    tags: ['cleanup', 'tokens'],
  },

  notificationCleanup: {
    name: 'Notification Cleanup',
    description: 'Remove old read notifications',
    schedule: CRON_SCHEDULES.DAILY_1AM,
    enabled: true,
    timeout: 10 * 60 * 1000,
    retries: 2,
    priority: 'low',
    tags: ['cleanup', 'notifications'],
  },

  exportCleanup: {
    name: 'Export Cleanup',
    description: 'Remove expired export files',
    schedule: CRON_SCHEDULES.EVERY_6_HOURS,
    enabled: true,
    timeout: 5 * 60 * 1000,
    retries: 2,
    priority: 'low',
    tags: ['cleanup', 'exports'],
  },

  fileCleanup: {
    name: 'File Cleanup',
    description: 'Remove orphaned uploaded files',
    schedule: CRON_SCHEDULES.WEEKLY_SUNDAY,
    enabled: true,
    timeout: 15 * 60 * 1000,
    retries: 2,
    priority: 'low',
    tags: ['cleanup', 'files'],
  },

  // ==================== EMAIL JOBS ====================

  digestEmail: {
    name: 'Digest Email',
    description: 'Send daily digest emails',
    schedule: CRON_SCHEDULES.DAILY_9AM,
    enabled: IS_PRODUCTION,
    timeout: 20 * 60 * 1000,
    retries: 2,
    priority: 'normal',
    tags: ['email', 'digest'],
  },

  // ==================== EXPORT JOBS ====================

  scheduledExports: {
    name: 'Scheduled Exports',
    description: 'Process scheduled export jobs',
    schedule: CRON_SCHEDULES.EVERY_HOUR,
    enabled: true,
    timeout: 30 * 60 * 1000,
    retries: 2,
    priority: 'normal',
    tags: ['exports', 'scheduled'],
  },

  scheduledReports: {
    name: 'Scheduled Reports',
    description: 'Process scheduled report generation',
    schedule: CRON_SCHEDULES.EVERY_HOUR,
    enabled: true,
    timeout: 30 * 60 * 1000,
    retries: 2,
    priority: 'normal',
    tags: ['reports', 'scheduled'],
  },

  // ==================== BILLING JOBS ====================

  subscriptionCheck: {
    name: 'Subscription Check',
    description: 'Check for expiring subscriptions',
    schedule: CRON_SCHEDULES.DAILY_6AM,
    enabled: IS_PRODUCTION,
    timeout: 10 * 60 * 1000,
    retries: 3,
    priority: 'high',
    tags: ['billing', 'subscriptions'],
  },

  // ==================== DATABASE JOBS ====================

  databaseBackup: {
    name: 'Database Backup',
    description: 'Create database backup',
    schedule: CRON_SCHEDULES.DAILY_1AM,
    enabled: IS_PRODUCTION,
    timeout: 60 * 60 * 1000, // 1 hour
    retries: 3,
    priority: 'critical',
    tags: ['database', 'backup'],
    exclusive: true,
  },

  // ==================== HEALTH CHECK JOBS ====================

  healthCheck: {
    name: 'Health Check',
    description: 'System health check',
    schedule: CRON_SCHEDULES.EVERY_5_MINUTES,
    enabled: true,
    timeout: 1 * 60 * 1000, // 1 minute
    retries: 1,
    priority: 'critical',
    tags: ['health', 'monitoring'],
  },
};

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

export const RETRY_CONFIG: RetryConfig = {
  /** Maximum retry attempts */
  maxAttempts: 3,

  /** Initial delay between retries (ms) */
  initialDelayMs: 1000,

  /** Maximum delay between retries (ms) */
  maxDelayMs: 60000,

  /** Backoff multiplier */
  backoffMultiplier: 2,

  /** Errors that should trigger retry */
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'NETWORK_ERROR',
    'RATE_LIMITED',
    'SERVICE_UNAVAILABLE',
    'INTERNAL_ERROR',
  ],
};

// =============================================================================
// CONCURRENCY CONFIGURATION
// =============================================================================

export const CONCURRENCY_CONFIG: ConcurrencyConfig = {
  /** Maximum concurrent jobs */
  maxConcurrentJobs: parseInt(process.env.CRON_MAX_CONCURRENT || '5', 10),

  /** Maximum jobs per minute */
  maxJobsPerMinute: parseInt(process.env.CRON_MAX_PER_MINUTE || '10', 10),

  /** Job queue size */
  queueSize: 100,
};

// =============================================================================
// MONITORING CONFIGURATION
// =============================================================================

export const MONITORING_CONFIG: MonitoringConfig = {
  /** Enable job monitoring */
  enabled: true,

  /** Alert on job failure */
  alertOnFailure: IS_PRODUCTION,

  /** Alert on slow jobs */
  alertOnSlowJob: IS_PRODUCTION,

  /** Slow job threshold (ms) */
  slowJobThresholdMs: 5 * 60 * 1000, // 5 minutes

  /** Health check interval (ms) */
  healthCheckInterval: 60 * 1000, // 1 minute

  /** Metrics retention (days) */
  metricsRetentionDays: 30,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get job config by name */
export function getJobConfig(jobName: string): CronJobConfig | undefined {
  return CRON_JOBS[jobName];
}

/** Get enabled jobs */
export function getEnabledJobs(): Record<string, CronJobConfig> {
  return Object.fromEntries(
    Object.entries(CRON_JOBS).filter(([, config]) => config.enabled)
  );
}

/** Get jobs by tag */
export function getJobsByTag(tag: string): Record<string, CronJobConfig> {
  return Object.fromEntries(
    Object.entries(CRON_JOBS).filter(([, config]) => config.tags.includes(tag))
  );
}

/** Get jobs by priority */
export function getJobsByPriority(
  priority: CronJobConfig['priority']
): Record<string, CronJobConfig> {
  return Object.fromEntries(
    Object.entries(CRON_JOBS).filter(([, config]) => config.priority === priority)
  );
}

/** Calculate retry delay with exponential backoff */
export function calculateRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelayMs *
    Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/** Check if error is retryable */
export function isRetryableError(error: Error): boolean {
  return RETRY_CONFIG.retryableErrors.some(
    code => error.message.includes(code) || error.name.includes(code)
  );
}

/** Parse cron expression to human readable */
export function describeCronSchedule(schedule: string): string {
  const parts = schedule.split(' ');
  if (parts.length !== 5) return schedule;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute === '*' && hour === '*') return 'Every minute';
  if (minute.startsWith('*/')) return `Every ${minute.slice(2)} minutes`;
  if (hour === '*' && minute === '0') return 'Every hour';
  if (hour.startsWith('*/') && minute === '0') return `Every ${hour.slice(2)} hours`;
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (dayOfWeek !== '*') return `Weekly on day ${dayOfWeek} at ${hour}:${minute.padStart(2, '0')}`;
  if (dayOfMonth !== '*') return `Monthly on day ${dayOfMonth} at ${hour}:${minute.padStart(2, '0')}`;

  return schedule;
}

/** Get next run time for a cron schedule */
export function getNextRunTime(schedule: string): Date | null {
  // This is a simplified implementation
  // In production, use a library like 'cron-parser'
  try {
    const now = new Date();
    const parts = schedule.split(' ');
    if (parts.length !== 5) return null;

    const [minute, hour] = parts;

    if (minute === '*' && hour === '*') {
      return new Date(now.getTime() + 60000);
    }

    // Add more parsing logic as needed
    return null;
  } catch {
    return null;
  }
}

/** Validate cron configuration */
export function validateCronConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const enabledJobs = getEnabledJobs();
  const jobCount = Object.keys(enabledJobs).length;

  if (jobCount === 0) {
    warnings.push('No cron jobs are enabled');
  }

  // Check for conflicting exclusive jobs
  const exclusiveJobs = Object.entries(CRON_JOBS)
    .filter(([, config]) => config.exclusive && config.enabled);

  for (const [name, config] of exclusiveJobs) {
    const sameScheduleJobs = Object.entries(CRON_JOBS)
      .filter(([n, c]) => n !== name && c.schedule === config.schedule && c.exclusive);

    if (sameScheduleJobs.length > 0) {
      warnings.push(`Exclusive job "${name}" shares schedule with: ${sameScheduleJobs.map(([n]) => n).join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// COMBINED CONFIG EXPORT
// =============================================================================

export const CRON_CONFIG: CronConfig = {
  enabled: process.env.CRON_ENABLED !== 'false',
  timezone: process.env.CRON_TIMEZONE || 'UTC',
  jobs: CRON_JOBS,
  retries: RETRY_CONFIG,
  concurrency: CONCURRENCY_CONFIG,
  monitoring: MONITORING_CONFIG,
};

export default CRON_CONFIG;