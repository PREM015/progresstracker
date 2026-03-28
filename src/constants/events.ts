// ============================================================================
// FILE: src/constants/events.ts
// PURPOSE: Event names and webhook event constants
// ============================================================================

// =============================================================================
// APPLICATION EVENTS
// =============================================================================

export const APP_EVENTS = {
  // User Events
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_EMAIL_VERIFIED: 'user.email_verified',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  USER_PROFILE_UPDATED: 'user.profile_updated',

  // Authentication Events
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_TOKEN_REFRESH: 'auth.token.refresh',
  AUTH_SESSION_EXPIRED: 'auth.session.expired',
  AUTH_2FA_ENABLED: 'auth.2fa.enabled',
  AUTH_2FA_DISABLED: 'auth.2fa.disabled',
  AUTH_PASSWORD_RESET_REQUESTED: 'auth.password_reset.requested',
  AUTH_PASSWORD_RESET_COMPLETED: 'auth.password_reset.completed',

  // Platform Events
  PLATFORM_CONNECTED: 'platform.connected',
  PLATFORM_DISCONNECTED: 'platform.disconnected',
  PLATFORM_SYNC_STARTED: 'platform.sync.started',
  PLATFORM_SYNC_COMPLETED: 'platform.sync.completed',
  PLATFORM_SYNC_FAILED: 'platform.sync.failed',
  PLATFORM_VERIFIED: 'platform.verified',
  PLATFORM_TOKEN_EXPIRED: 'platform.token.expired',

  // Sync Events
  SYNC_STARTED: 'sync.started',
  SYNC_COMPLETED: 'sync.completed',
  SYNC_FAILED: 'sync.failed',
  SYNC_CANCELLED: 'sync.cancelled',
  SYNC_RATE_LIMITED: 'sync.rate_limited',
  SYNC_QUEUED: 'sync.queued',
  SYNC_PROGRESS_UPDATE: 'sync.progress.update',

  // Tracker Events
  ENTRY_CREATED: 'tracker.entry.created',
  ENTRY_UPDATED: 'tracker.entry.updated',
  ENTRY_DELETED: 'tracker.entry.deleted',
  ENTRY_VERIFIED: 'tracker.entry.verified',

  // Goal Events
  GOAL_CREATED: 'goal.created',
  GOAL_UPDATED: 'goal.updated',
  GOAL_DELETED: 'goal.deleted',
  GOAL_STARTED: 'goal.started',
  GOAL_COMPLETED: 'goal.completed',
  GOAL_FAILED: 'goal.failed',
  GOAL_PAUSED: 'goal.paused',
  GOAL_RESUMED: 'goal.resumed',
  GOAL_ARCHIVED: 'goal.archived',
  GOAL_PROGRESS_UPDATED: 'goal.progress.updated',
  GOAL_MILESTONE_REACHED: 'goal.milestone.reached',
  GOAL_REMINDER_SENT: 'goal.reminder.sent',

  // Achievement Events
  ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',
  ACHIEVEMENT_PINNED: 'achievement.pinned',
  ACHIEVEMENT_UNPINNED: 'achievement.unpinned',
  ACHIEVEMENT_PROGRESS_UPDATED: 'achievement.progress.updated',

  // Streak Events
  STREAK_STARTED: 'streak.started',
  STREAK_CONTINUED: 'streak.continued',
  STREAK_BROKEN: 'streak.broken',
  STREAK_FROZEN: 'streak.frozen',
  STREAK_MILESTONE: 'streak.milestone',
  STREAK_AT_RISK: 'streak.at_risk',

  // Subscription Events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  SUBSCRIPTION_TRIAL_STARTED: 'subscription.trial.started',
  SUBSCRIPTION_TRIAL_ENDING: 'subscription.trial.ending',
  SUBSCRIPTION_TRIAL_ENDED: 'subscription.trial.ended',

  // Payment Events
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_FAILED: 'invoice.failed',

  // Notification Events
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_DISMISSED: 'notification.dismissed',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',

  // Email Events
  EMAIL_SENT: 'email.sent',
  EMAIL_DELIVERED: 'email.delivered',
  EMAIL_OPENED: 'email.opened',
  EMAIL_CLICKED: 'email.clicked',
  EMAIL_BOUNCED: 'email.bounced',
  EMAIL_COMPLAINED: 'email.complained',
  EMAIL_FAILED: 'email.failed',

  // Export Events
  EXPORT_STARTED: 'export.started',
  EXPORT_COMPLETED: 'export.completed',
  EXPORT_FAILED: 'export.failed',
  EXPORT_EXPIRED: 'export.expired',

  // Report Events
  REPORT_GENERATED: 'report.generated',
  REPORT_SENT: 'report.sent',
  REPORT_FAILED: 'report.failed',

  // Webhook Events
  WEBHOOK_CREATED: 'webhook.created',
  WEBHOOK_UPDATED: 'webhook.updated',
  WEBHOOK_DELETED: 'webhook.deleted',
  WEBHOOK_TRIGGERED: 'webhook.triggered',
  WEBHOOK_DELIVERED: 'webhook.delivered',
  WEBHOOK_FAILED: 'webhook.failed',

  // Share Events
  SHARE_CREATED: 'share.created',
  SHARE_ACCESSED: 'share.accessed',
  SHARE_REVOKED: 'share.revoked',
  SHARE_EXPIRED: 'share.expired',

  // Support Events
  TICKET_CREATED: 'support.ticket.created',
  TICKET_UPDATED: 'support.ticket.updated',
  TICKET_RESOLVED: 'support.ticket.resolved',
  TICKET_CLOSED: 'support.ticket.closed',
  TICKET_REPLY_ADDED: 'support.ticket.reply.added',

  // Referral Events
  REFERRAL_CREATED: 'referral.created',
  REFERRAL_COMPLETED: 'referral.completed',
  REFERRAL_REWARD_EARNED: 'referral.reward.earned',
  REFERRAL_REWARD_PAID: 'referral.reward.paid',

  // System Events
  SYSTEM_MAINTENANCE_STARTED: 'system.maintenance.started',
  SYSTEM_MAINTENANCE_ENDED: 'system.maintenance.ended',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_HEALTH_CHECK: 'system.health.check',
} as const;

// =============================================================================
// WEBHOOK EVENT TYPES (matches Prisma schema)
// =============================================================================

export const WEBHOOK_EVENT_TYPES = {
  ENTRY_CREATED: 'ENTRY_CREATED',
  ENTRY_UPDATED: 'ENTRY_UPDATED',
  ENTRY_DELETED: 'ENTRY_DELETED',
  GOAL_CREATED: 'GOAL_CREATED',
  GOAL_COMPLETED: 'GOAL_COMPLETED',
  GOAL_FAILED: 'GOAL_FAILED',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  STREAK_MILESTONE: 'STREAK_MILESTONE',
  STREAK_BROKEN: 'STREAK_BROKEN',
  SYNC_COMPLETED: 'SYNC_COMPLETED',
  SYNC_FAILED: 'SYNC_FAILED',
  SUBSCRIPTION_CHANGED: 'SUBSCRIPTION_CHANGED',
} as const;

export const WEBHOOK_EVENT_LABELS = {
  ENTRY_CREATED: 'Entry Created',
  ENTRY_UPDATED: 'Entry Updated',
  ENTRY_DELETED: 'Entry Deleted',
  GOAL_CREATED: 'Goal Created',
  GOAL_COMPLETED: 'Goal Completed',
  GOAL_FAILED: 'Goal Failed',
  ACHIEVEMENT_UNLOCKED: 'Achievement Unlocked',
  STREAK_MILESTONE: 'Streak Milestone',
  STREAK_BROKEN: 'Streak Broken',
  SYNC_COMPLETED: 'Sync Completed',
  SYNC_FAILED: 'Sync Failed',
  SUBSCRIPTION_CHANGED: 'Subscription Changed',
} as const;

export const WEBHOOK_EVENT_DESCRIPTIONS = {
  ENTRY_CREATED: 'Triggered when a new tracker entry is created',
  ENTRY_UPDATED: 'Triggered when a tracker entry is updated',
  ENTRY_DELETED: 'Triggered when a tracker entry is deleted',
  GOAL_CREATED: 'Triggered when a new goal is created',
  GOAL_COMPLETED: 'Triggered when a goal is completed',
  GOAL_FAILED: 'Triggered when a goal fails',
  ACHIEVEMENT_UNLOCKED: 'Triggered when an achievement is unlocked',
  STREAK_MILESTONE: 'Triggered when a streak milestone is reached',
  STREAK_BROKEN: 'Triggered when a streak is broken',
  SYNC_COMPLETED: 'Triggered when a platform sync completes',
  SYNC_FAILED: 'Triggered when a platform sync fails',
  SUBSCRIPTION_CHANGED: 'Triggered when subscription status changes',
} as const;

// =============================================================================
// GITHUB WEBHOOK EVENTS
// =============================================================================

export const GITHUB_WEBHOOK_EVENTS = {
  PUSH: 'push',
  PULL_REQUEST: 'pull_request',
  ISSUES: 'issues',
  COMMIT_COMMENT: 'commit_comment',
  RELEASE: 'release',
  REPOSITORY: 'repository',
  STAR: 'star',
  FORK: 'fork',
  WATCH: 'watch',
  CREATE: 'create',
  DELETE: 'delete',
} as const;

// =============================================================================
// GITLAB WEBHOOK EVENTS
// =============================================================================

export const GITLAB_WEBHOOK_EVENTS = {
  PUSH: 'push_events',
  MERGE_REQUEST: 'merge_requests_events',
  ISSUE: 'issues_events',
  NOTE: 'note_events',
  PIPELINE: 'pipeline_events',
  RELEASE: 'release_events',
  TAG_PUSH: 'tag_push_events',
  WIKI_PAGE: 'wiki_page_events',
} as const;

// =============================================================================
// STRIPE WEBHOOK EVENTS
// =============================================================================

export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  PAYMENT_METHOD_ATTACHED: 'payment_method.attached',
  PAYMENT_METHOD_DETACHED: 'payment_method.detached',
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_FAILED: 'payment_intent.failed',
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
} as const;

// =============================================================================
// NOTIFICATION EVENT TYPES (matches Prisma schema)
// =============================================================================

export const NOTIFICATION_EVENT_TYPES = {
  SYSTEM: 'SYSTEM',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  GOAL_REMINDER: 'GOAL_REMINDER',
  GOAL_COMPLETED: 'GOAL_COMPLETED',
  GOAL_FAILED: 'GOAL_FAILED',
  STREAK_AT_RISK: 'STREAK_AT_RISK',
  STREAK_BROKEN: 'STREAK_BROKEN',
  STREAK_MILESTONE: 'STREAK_MILESTONE',
  SYNC_COMPLETE: 'SYNC_COMPLETE',
  SYNC_FAILED: 'SYNC_FAILED',
  WEEKLY_REPORT: 'WEEKLY_REPORT',
  MONTHLY_REPORT: 'MONTHLY_REPORT',
  NEW_FEATURE: 'NEW_FEATURE',
  SECURITY_ALERT: 'SECURITY_ALERT',
  BILLING_ALERT: 'BILLING_ALERT',
  WELCOME: 'WELCOME',
  REFERRAL: 'REFERRAL',
  CUSTOM: 'CUSTOM',
} as const;

// =============================================================================
// AUDIT LOG EVENT TYPES (matches Prisma schema)
// =============================================================================

export const AUDIT_EVENT_TYPES = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_CHANGE: 'EMAIL_CHANGE',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  EXPORT_DATA: 'EXPORT_DATA',
  IMPORT_DATA: 'IMPORT_DATA',
  SYNC_TRIGGER: 'SYNC_TRIGGER',
  SUBSCRIPTION_CHANGE: 'SUBSCRIPTION_CHANGE',
  API_KEY_CREATE: 'API_KEY_CREATE',
  API_KEY_DELETE: 'API_KEY_DELETE',
  TWO_FACTOR_ENABLE: 'TWO_FACTOR_ENABLE',
  TWO_FACTOR_DISABLE: 'TWO_FACTOR_DISABLE',
  ACCOUNT_DELETE: 'ACCOUNT_DELETE',
  ADMIN_ACTION: 'ADMIN_ACTION',
  WEBHOOK_TRIGGER: 'WEBHOOK_TRIGGER',
  SHARE_CREATE: 'SHARE_CREATE',
  SHARE_ACCESS: 'SHARE_ACCESS',
} as const;

// =============================================================================
// EVENT CATEGORIES
// =============================================================================

export const EVENT_CATEGORIES = {
  USER: 'user',
  AUTHENTICATION: 'authentication',
  PLATFORM: 'platform',
  SYNC: 'sync',
  TRACKER: 'tracker',
  GOAL: 'goal',
  ACHIEVEMENT: 'achievement',
  STREAK: 'streak',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  NOTIFICATION: 'notification',
  EMAIL: 'email',
  EXPORT: 'export',
  REPORT: 'report',
  WEBHOOK: 'webhook',
  SHARE: 'share',
  SUPPORT: 'support',
  REFERRAL: 'referral',
  SYSTEM: 'system',
  AUDIT: 'audit',
} as const;

// =============================================================================
// EVENT PRIORITIES
// =============================================================================

export const EVENT_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// =============================================================================
// SSE EVENT TYPES
// =============================================================================

export const SSE_EVENT_TYPES = {
  SYNC_STARTED: 'sync:started',
  SYNC_PROGRESS: 'sync:progress',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  GOAL_PROGRESS: 'goal:progress',
  GOAL_COMPLETED: 'goal:completed',
  STREAK_UPDATED: 'streak:updated',
  EXPORT_READY: 'export:ready',
  SYSTEM_MESSAGE: 'system:message',
  HEARTBEAT: 'heartbeat',
} as const;

// =============================================================================
// REAL-TIME CHANNELS
// =============================================================================

export const REALTIME_CHANNELS = {
  USER: (userId: string) => `user:${userId}`,
  SYNC: (userId: string) => `sync:${userId}`,
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
  ACHIEVEMENTS: (userId: string) => `achievements:${userId}`,
  GOALS: (userId: string) => `goals:${userId}`,
  GLOBAL: 'global',
  ADMIN: 'admin',
} as const;

// =============================================================================
// EVENT METADATA KEYS
// =============================================================================

export const EVENT_METADATA_KEYS = {
  USER_ID: 'userId',
  IP_ADDRESS: 'ipAddress',
  USER_AGENT: 'userAgent',
  TIMESTAMP: 'timestamp',
  SOURCE: 'source',
  PLATFORM_ID: 'platformId',
  ENTITY_TYPE: 'entityType',
  ENTITY_ID: 'entityId',
  OLD_VALUE: 'oldValue',
  NEW_VALUE: 'newValue',
  CHANGES: 'changes',
  ERROR_CODE: 'errorCode',
  ERROR_MESSAGE: 'errorMessage',
  DURATION: 'duration',
  SUCCESS: 'success',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isSystemEvent(event: string): boolean {
  return event.startsWith('system.');
}

export function isUserEvent(event: string): boolean {
  return event.startsWith('user.');
}

export function isWebhookEvent(event: string): boolean {
  return (Object.values(WEBHOOK_EVENT_TYPES) as string[]).includes(event);
}

export function getEventCategory(event: string): string {
  const prefix = event.split('.')[0];
  return prefix || EVENT_CATEGORIES.SYSTEM;
}

export function formatEventName(event: string): string {
  return event
    .split('.')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================================================
// EXPORTS
// =============================================================================

const EVENTS_EXPORT = {
  APP_EVENTS,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_EVENT_LABELS,
  WEBHOOK_EVENT_DESCRIPTIONS,
  GITHUB_WEBHOOK_EVENTS,
  GITLAB_WEBHOOK_EVENTS,
  STRIPE_WEBHOOK_EVENTS,
  NOTIFICATION_EVENT_TYPES,
  AUDIT_EVENT_TYPES,
  EVENT_CATEGORIES,
  EVENT_PRIORITIES,
  SSE_EVENT_TYPES,
  REALTIME_CHANNELS,
  EVENT_METADATA_KEYS,
};

export default EVENTS_EXPORT;