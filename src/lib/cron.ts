// src/lib/cron.ts
// Cron expression utilities and job scheduling helpers

// =============================================================================
// TYPES
// =============================================================================

export interface CronSchedule {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export interface CronJobDefinition {
  name: string;
  schedule: string; // Standard cron expression
  description: string;
  timezone?: string;
  isEnabled: boolean;
  maxDurationMs?: number;
}

// =============================================================================
// PREDEFINED SCHEDULES
// =============================================================================

export const CRON_SCHEDULES = {
  /** Every minute */
  EVERY_MINUTE: '* * * * *',
  /** Every 5 minutes */
  EVERY_5_MINUTES: '*/5 * * * *',
  /** Every 15 minutes */
  EVERY_15_MINUTES: '*/15 * * * *',
  /** Every 30 minutes */
  EVERY_30_MINUTES: '*/30 * * * *',
  /** Every hour at :00 */
  EVERY_HOUR: '0 * * * *',
  /** Every 6 hours */
  EVERY_6_HOURS: '0 */6 * * *',
  /** Once a day at midnight UTC */
  DAILY_MIDNIGHT: '0 0 * * *',
  /** Once a day at 2am UTC */
  DAILY_2AM: '0 2 * * *',
  /** Every Monday at 9am UTC */
  WEEKLY_MONDAY_9AM: '0 9 * * 1',
  /** 1st of each month at midnight */
  MONTHLY_1ST: '0 0 1 * *',
} as const;

/** Registered application cron jobs */
export const APP_CRON_JOBS: CronJobDefinition[] = [
  {
    name: 'sync-platforms',
    schedule: CRON_SCHEDULES.EVERY_HOUR,
    description: 'Sync all active user platforms',
    isEnabled: true,
    maxDurationMs: 5 * 60 * 1000,
  },
  {
    name: 'check-streaks',
    schedule: CRON_SCHEDULES.DAILY_MIDNIGHT,
    description: 'Update streak status for all users at end of day',
    isEnabled: true,
    maxDurationMs: 10 * 60 * 1000,
  },
  {
    name: 'check-goals',
    schedule: CRON_SCHEDULES.DAILY_MIDNIGHT,
    description: 'Check goal progress and send reminders',
    isEnabled: true,
    maxDurationMs: 5 * 60 * 1000,
  },
  {
    name: 'send-weekly-digest',
    schedule: CRON_SCHEDULES.WEEKLY_MONDAY_9AM,
    description: 'Send weekly digest emails to opted-in users',
    isEnabled: true,
  },
  {
    name: 'cleanup-expired-tokens',
    schedule: CRON_SCHEDULES.DAILY_2AM,
    description: 'Delete expired verification tokens, refresh tokens, etc.',
    isEnabled: true,
  },
  {
    name: 'cleanup-old-exports',
    schedule: CRON_SCHEDULES.DAILY_2AM,
    description: 'Delete expired export file records',
    isEnabled: true,
  },
  {
    name: 'process-scheduled-exports',
    schedule: CRON_SCHEDULES.EVERY_HOUR,
    description: 'Execute due scheduled exports',
    isEnabled: true,
  },
  {
    name: 'retry-failed-webhooks',
    schedule: CRON_SCHEDULES.EVERY_15_MINUTES,
    description: 'Retry webhook deliveries that have failed',
    isEnabled: true,
  },
  {
    name: 'aggregate-daily-stats',
    schedule: CRON_SCHEDULES.DAILY_2AM,
    description: 'Aggregate daily usage statistics',
    isEnabled: true,
  },
];

// =============================================================================
// PARSE & VALIDATE
// =============================================================================

/**
 * Validate a cron expression.
 */
export function isValidCronExpression(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const ranges = [
    { min: 0, max: 59 }, // minute
    { min: 0, max: 23 }, // hour
    { min: 1, max: 31 }, // day of month
    { min: 1, max: 12 }, // month
    { min: 0, max: 7 },  // day of week (0 and 7 = Sunday)
  ];

  return parts.every((part, i) => {
    if (part === '*') return true;
    if (part.startsWith('*/')) {
      const n = parseInt(part.slice(2), 10);
      return !isNaN(n) && n > 0;
    }
    const n = parseInt(part, 10);
    return !isNaN(n) && n >= ranges[i].min && n <= ranges[i].max;
  });
}

/**
 * Parse cron expression into components.
 */
export function parseCronExpression(expression: string): CronSchedule | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  return { minute, hour, dayOfMonth, month, dayOfWeek };
}

/**
 * Get human-readable description for common cron expressions.
 */
export function describeCronSchedule(expression: string): string {
  const descriptions: Record<string, string> = {
    [CRON_SCHEDULES.EVERY_MINUTE]: 'Every minute',
    [CRON_SCHEDULES.EVERY_5_MINUTES]: 'Every 5 minutes',
    [CRON_SCHEDULES.EVERY_15_MINUTES]: 'Every 15 minutes',
    [CRON_SCHEDULES.EVERY_30_MINUTES]: 'Every 30 minutes',
    [CRON_SCHEDULES.EVERY_HOUR]: 'Every hour',
    [CRON_SCHEDULES.EVERY_6_HOURS]: 'Every 6 hours',
    [CRON_SCHEDULES.DAILY_MIDNIGHT]: 'Daily at midnight',
    [CRON_SCHEDULES.DAILY_2AM]: 'Daily at 2:00 AM',
    [CRON_SCHEDULES.WEEKLY_MONDAY_9AM]: 'Every Monday at 9:00 AM',
    [CRON_SCHEDULES.MONTHLY_1ST]: 'First day of each month at midnight',
  };

  return descriptions[expression] ?? expression;
}

/**
 * Get job by name.
 */
export function getCronJob(name: string): CronJobDefinition | undefined {
  return APP_CRON_JOBS.find((j) => j.name === name);
}
