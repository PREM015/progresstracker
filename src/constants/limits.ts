// ============================================================================
// FILE: src/constants/limits.ts
// PURPOSE: Application limits and quotas
// ============================================================================

// Define locally since it's not exported from @prisma/client yet
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE';

// =============================================================================
// GLOBAL LIMITS
// =============================================================================

export const GLOBAL_LIMITS = {
  MAX_USERNAME_LENGTH: 30,
  MIN_USERNAME_LENGTH: 3,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MAX_BIO_LENGTH: 500,
  MAX_NOTES_LENGTH: 5000,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_TITLE_LENGTH: 200,
  MAX_URL_LENGTH: 2048,
  MAX_TAGS: 20,
  MAX_TAG_LENGTH: 50,
} as const;

// =============================================================================
// FILE UPLOAD LIMITS
// =============================================================================

export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_AVATAR_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_DOCUMENT_SIZE: 25 * 1024 * 1024, // 25MB
  MAX_FILES_PER_UPLOAD: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
} as const;

// =============================================================================
// RATE LIMITS (requests per window)
// =============================================================================

export const RATE_LIMITS = {
  // API Rate Limits
  API_FREE: { requests: 100, window: 3600 }, // 100 req/hour
  API_STARTER: { requests: 500, window: 3600 }, // 500 req/hour
  API_PRO: { requests: 2000, window: 3600 }, // 2000 req/hour
  API_TEAM: { requests: 10000, window: 3600 }, // 10k req/hour
  API_ENTERPRISE: { requests: -1, window: 3600 }, // Unlimited

  // Authentication
  LOGIN_ATTEMPTS: { requests: 5, window: 900 }, // 5 attempts per 15 minutes
  PASSWORD_RESET: { requests: 3, window: 3600 }, // 3 per hour
  EMAIL_VERIFICATION: { requests: 3, window: 3600 }, // 3 per hour
  MAGIC_LINK: { requests: 3, window: 900 }, // 3 per 15 minutes

  // Actions
  SYNC_MANUAL: { requests: 10, window: 3600 }, // 10 per hour
  EXPORT_CREATION: { requests: 5, window: 3600 }, // 5 per hour
  WEBHOOK_CREATION: { requests: 10, window: 86400 }, // 10 per day
  SHARE_CREATION: { requests: 20, window: 3600 }, // 20 per hour
  SUPPORT_TICKET: { requests: 5, window: 86400 }, // 5 per day
  FEEDBACK_SUBMISSION: { requests: 3, window: 86400 }, // 3 per day

  // Content Creation
  GOAL_CREATION: { requests: 50, window: 86400 }, // 50 per day
  TRACKER_ENTRY: { requests: 100, window: 86400 }, // 100 per day
  CUSTOM_PLATFORM: { requests: 10, window: 86400 }, // 10 per day

  // Social
  COMMENT_CREATION: { requests: 30, window: 3600 }, // 30 per hour
  LIKE_ACTION: { requests: 100, window: 3600 }, // 100 per hour

  // Search
  SEARCH_QUERIES: { requests: 60, window: 60 }, // 60 per minute
} as const;

// =============================================================================
// SUBSCRIPTION TIER LIMITS
// =============================================================================

export const SUBSCRIPTION_LIMITS: Record<
  SubscriptionTier,
  {
    platformLimit: number;
    syncFrequencyMinutes: number;
    exportLimitMonthly: number;
    apiRequestsDaily: number;
    teamMembers: number;
    customIntegrations: number;
    dataRetentionDays: number;
    webhooks: number;
    goals: number;
    trackerEntriesDaily: number;
    customPlatforms: number;
    shareLinks: number;
    apiKeys: number;
  }
> = {
  FREE: {
    platformLimit: 3,
    syncFrequencyMinutes: 1440, // 24 hours
    exportLimitMonthly: 1,
    apiRequestsDaily: 100,
    teamMembers: 1,
    customIntegrations: 0,
    dataRetentionDays: 90,
    webhooks: 0,
    goals: 5,
    trackerEntriesDaily: 10,
    customPlatforms: 1,
    shareLinks: 3,
    apiKeys: 1,
  },
  STARTER: {
    platformLimit: 5,
    syncFrequencyMinutes: 720, // 12 hours
    exportLimitMonthly: 5,
    apiRequestsDaily: 500,
    teamMembers: 1,
    customIntegrations: 0,
    dataRetentionDays: 365,
    webhooks: 0,
    goals: 20,
    trackerEntriesDaily: 50,
    customPlatforms: 3,
    shareLinks: 10,
    apiKeys: 2,
  },
  PRO: {
    platformLimit: 15,
    syncFrequencyMinutes: 60, // 1 hour
    exportLimitMonthly: 25,
    apiRequestsDaily: 2000,
    teamMembers: 1,
    customIntegrations: 3,
    dataRetentionDays: -1, // Unlimited
    webhooks: 5,
    goals: 100,
    trackerEntriesDaily: 200,
    customPlatforms: 10,
    shareLinks: 50,
    apiKeys: 5,
  },
  TEAM: {
    platformLimit: 50,
    syncFrequencyMinutes: 30, // 30 minutes
    exportLimitMonthly: 100,
    apiRequestsDaily: 10000,
    teamMembers: 10,
    customIntegrations: 10,
    dataRetentionDays: -1, // Unlimited
    webhooks: 25,
    goals: 500,
    trackerEntriesDaily: 1000,
    customPlatforms: 50,
    shareLinks: 200,
    apiKeys: 20,
  },
  ENTERPRISE: {
    platformLimit: -1, // Unlimited
    syncFrequencyMinutes: 5, // 5 minutes
    exportLimitMonthly: -1, // Unlimited
    apiRequestsDaily: -1, // Unlimited
    teamMembers: -1, // Unlimited
    customIntegrations: -1, // Unlimited
    dataRetentionDays: -1, // Unlimited
    webhooks: -1, // Unlimited
    goals: -1, // Unlimited
    trackerEntriesDaily: -1, // Unlimited
    customPlatforms: -1, // Unlimited
    shareLinks: -1, // Unlimited
    apiKeys: -1, // Unlimited
  },
} as const;

// =============================================================================
// FEATURE LIMITS
// =============================================================================

export const FEATURE_LIMITS = {
  // Achievements
  MAX_PINNED_ACHIEVEMENTS: 3,
  MAX_ACHIEVEMENT_PROGRESS_ITEMS: 1000,

  // Goals
  MAX_GOAL_MILESTONES: 10,
  MAX_GOAL_REMINDERS: 5,
  MAX_CONCURRENT_ACTIVE_GOALS: 20,

  // Tracker
  MAX_TRACKER_TAGS: 20,
  MAX_TRACKER_LANGUAGES: 10,
  MAX_TRACKER_TOPICS: 15,
  MAX_BULK_TRACKER_ENTRIES: 100,

  // Platforms
  MAX_PLATFORM_SYNC_RETRIES: 3,
  MAX_CONSECUTIVE_SYNC_FAILURES: 10,

  // Notifications
  MAX_UNREAD_NOTIFICATIONS: 1000,
  MAX_PUSH_SUBSCRIPTIONS: 5,
  MAX_NOTIFICATION_BATCH: 50,

  // Webhooks
  MAX_WEBHOOK_RETRIES: 3,
  MAX_WEBHOOK_URL_LENGTH: 2048,
  MAX_WEBHOOK_PAYLOAD_SIZE: 1024 * 1024, // 1MB
  MAX_WEBHOOK_EVENTS: 20,

  // Export
  MAX_EXPORT_RECORDS: 100000,
  MAX_CONCURRENT_EXPORTS: 3,
  EXPORT_EXPIRY_DAYS: 7,

  // Share
  MAX_SHARE_VIEWS: 10000,
  MAX_ALLOWED_EMAILS: 50,
  SHARE_EXPIRY_DAYS: 30,

  // API Keys
  MAX_API_KEY_SCOPES: 10,
  MAX_ALLOWED_IPS: 20,
  MAX_ALLOWED_ORIGINS: 20,

  // Support
  MAX_TICKET_ATTACHMENTS: 5,
  MAX_TICKET_REPLY_LENGTH: 10000,

  // Blog
  MAX_BLOG_COMMENTS_DEPTH: 3,
  MAX_BLOG_TAGS: 10,

  // Search
  MAX_SEARCH_RESULTS: 100,
  MAX_RECENT_SEARCHES: 10,

  // Session
  MAX_ACTIVE_SESSIONS: 10,
  MAX_REFRESH_TOKENS: 5,

  // Backup Codes
  BACKUP_CODES_COUNT: 10,
} as const;

// =============================================================================
// STORAGE LIMITS (in bytes)
// =============================================================================

export const STORAGE_LIMITS = {
  FREE: 100 * 1024 * 1024, // 100 MB
  STARTER: 500 * 1024 * 1024, // 500 MB
  PRO: 2 * 1024 * 1024 * 1024, // 2 GB
  TEAM: 10 * 1024 * 1024 * 1024, // 10 GB
  ENTERPRISE: -1, // Unlimited
} as const;

// =============================================================================
// PAGINATION LIMITS
// =============================================================================

export const PAGINATION_LIMITS = {
  DEFAULT_PAGE_SIZE: 20,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 100,
  MAX_PAGE_SIZE_EXPORT: 1000,
} as const;

// =============================================================================
// SEARCH LIMITS
// =============================================================================

export const SEARCH_LIMITS = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100,
  MAX_RESULTS: 100,
  MAX_SUGGESTIONS: 10,
} as const;

// =============================================================================
// VALIDATION LIMITS
// =============================================================================

export const VALIDATION_LIMITS = {
  // Platform Connection
  MAX_PLATFORM_USERNAME_LENGTH: 100,
  MAX_API_KEY_LENGTH: 500,
  MAX_ACCESS_TOKEN_LENGTH: 1000,

  // Custom Platform
  MAX_CUSTOM_PLATFORM_NAME: 50,
  MAX_CUSTOM_PLATFORM_FIELDS: 20,

  // Referral
  REFERRAL_CODE_LENGTH: 8,
  MAX_REFERRALS: 100,

  // Coupon
  MAX_COUPON_CODE_LENGTH: 50,
  MAX_COUPON_REDEMPTIONS: 1000,

  // Waitlist
  MAX_WAITLIST_POSITION: 100000,

  // Newsletter
  MAX_NEWSLETTER_TOPICS: 10,

  // Changelog
  MAX_CHANGELOG_VERSION_LENGTH: 20,
  MAX_CHANGELOG_CHANGES: 50,

  // Knowledge Base
  MAX_KB_ARTICLE_WORD_COUNT: 10000,
  MAX_KB_RELATED_ARTICLES: 10,
} as const;

// =============================================================================
// TIME LIMITS (in milliseconds)
// =============================================================================

export const TIME_LIMITS = {
  // Request Timeouts
  API_TIMEOUT: 30000, // 30 seconds
  SYNC_TIMEOUT: 300000, // 5 minutes
  EXPORT_TIMEOUT: 600000, // 10 minutes
  WEBHOOK_TIMEOUT: 30000, // 30 seconds
  EMAIL_TIMEOUT: 10000, // 10 seconds

  // Session Timeouts
  ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  SESSION_IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  SESSION_ABSOLUTE_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours

  // Verification Timeouts
  EMAIL_VERIFICATION_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_EXPIRY: 60 * 60 * 1000, // 1 hour
  MAGIC_LINK_EXPIRY: 10 * 60 * 1000, // 10 minutes
  TWO_FACTOR_CODE_EXPIRY: 5 * 60 * 1000, // 5 minutes

  // Cache TTLs
  CACHE_SHORT: 60 * 1000, // 1 minute
  CACHE_MEDIUM: 5 * 60 * 1000, // 5 minutes
  CACHE_LONG: 60 * 60 * 1000, // 1 hour
  CACHE_VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours

  // Retry Delays
  RETRY_DELAY_SHORT: 1000, // 1 second
  RETRY_DELAY_MEDIUM: 5000, // 5 seconds
  RETRY_DELAY_LONG: 30000, // 30 seconds
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getTierLimit(tier: SubscriptionTier, limitKey: keyof typeof SUBSCRIPTION_LIMITS.FREE): number {
  return SUBSCRIPTION_LIMITS[tier][limitKey];
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

export function formatLimit(value: number, unit: string = ''): string {
  if (value === -1) return 'Unlimited';
  return `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;
}

export function checkLimit(current: number, limit: number): { allowed: boolean; remaining: number } {
  if (limit === -1) return { allowed: true, remaining: -1 };
  const remaining = Math.max(0, limit - current);
  return { allowed: current < limit, remaining };
}

// =============================================================================
// EXPORTS
// =============================================================================

const LIMITS_EXPORT = {
  GLOBAL: GLOBAL_LIMITS,
  FILE_UPLOAD: FILE_UPLOAD_LIMITS,
  RATE: RATE_LIMITS,
  SUBSCRIPTION: SUBSCRIPTION_LIMITS,
  FEATURE: FEATURE_LIMITS,
  STORAGE: STORAGE_LIMITS,
  PAGINATION: PAGINATION_LIMITS,
  SEARCH: SEARCH_LIMITS,
  VALIDATION: VALIDATION_LIMITS,
  TIME: TIME_LIMITS,
};

export default LIMITS_EXPORT;