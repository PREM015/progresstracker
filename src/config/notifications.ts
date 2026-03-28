// ============================================================================
// FILE: src/config/notifications.ts
// PURPOSE: Notification system configuration
// ============================================================================

import type {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '@prisma/client';

// =============================================================================
// ENVIRONMENT
// =============================================================================

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface NotificationConfig {
  channels: ChannelConfigs;
  types: NotificationTypeConfigs;
  priorities: PriorityConfigs;
  delivery: DeliveryConfig;
  retention: RetentionConfig;
  rateLimit: NotificationRateLimitConfig;
  templates: NotificationTemplateConfig;
  push: PushConfig;
  digest: DigestConfig;
}

export interface ChannelConfigs {
  inApp: ChannelConfig;
  email: ChannelConfig;
  push: ChannelConfig;
  sms: ChannelConfig;
}

export interface ChannelConfig {
  enabled: boolean;
  label: string;
  description: string;
  icon: string;
  requiresVerification: boolean;
  maxPerHour: number;
  maxPerDay: number;
  cooldownMs: number;
}

export interface NotificationTypeConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultChannel: NotificationChannel;
  allowedChannels: NotificationChannel[];
  defaultPriority: NotificationPriority;
  canDisable: boolean;
  category: string;
  template?: string;
}

export type NotificationTypeConfigs = Record<NotificationType, NotificationTypeConfig>;

export interface PriorityConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  ttlHours: number;
  bypassQuietHours: boolean;
  bypassDigest: boolean;
}

export type PriorityConfigs = Record<NotificationPriority, PriorityConfig>;

export interface DeliveryConfig {
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  batchDelayMs: number;
  timeoutMs: number;
  concurrency: number;
}

export interface RetentionConfig {
  readNotificationDays: number;
  unreadNotificationDays: number;
  archivedNotificationDays: number;
  maxNotificationsPerUser: number;
  cleanupBatchSize: number;
}

export interface NotificationRateLimitConfig {
  perUserPerHour: number;
  perUserPerDay: number;
  perTypePerHour: Record<string, number>;
  globalPerMinute: number;
}

export interface NotificationTemplateConfig {
  defaultLocale: string;
  supportedLocales: string[];
  fallbackToDefault: boolean;
}

export interface PushConfig {
  enabled: boolean;
  vapidPublicKey: string | undefined;
  vapidPrivateKey: string | undefined;
  vapidSubject: string;
  ttl: number;
  urgency: 'very-low' | 'low' | 'normal' | 'high';
  maxSubscriptionsPerUser: number;
  cleanupInactiveAfterDays: number;
}

export interface DigestConfig {
  enabled: boolean;
  frequencies: DigestFrequency[];
  defaultFrequency: string;
  defaultTime: string;
  maxItemsPerDigest: number;
  groupByType: boolean;
}

export interface DigestFrequency {
  value: string;
  label: string;
  description: string;
}

// =============================================================================
// CHANNEL CONFIGURATIONS
// =============================================================================

export const CHANNEL_CONFIGS: ChannelConfigs = {
  inApp: {
    enabled: true,
    label: 'In-App',
    description: 'Notifications shown within the application',
    icon: 'Bell',
    requiresVerification: false,
    maxPerHour: 100,
    maxPerDay: 500,
    cooldownMs: 0,
  },
  email: {
    enabled: true,
    label: 'Email',
    description: 'Notifications sent to your email address',
    icon: 'Mail',
    requiresVerification: true,
    maxPerHour: 10,
    maxPerDay: 50,
    cooldownMs: 60000, // 1 minute
  },
  push: {
    enabled: true,
    label: 'Push',
    description: 'Browser push notifications',
    icon: 'Smartphone',
    requiresVerification: false,
    maxPerHour: 20,
    maxPerDay: 100,
    cooldownMs: 30000, // 30 seconds
  },
  sms: {
    enabled: false,
    label: 'SMS',
    description: 'Text message notifications',
    icon: 'MessageSquare',
    requiresVerification: true,
    maxPerHour: 5,
    maxPerDay: 20,
    cooldownMs: 300000, // 5 minutes
  },
};

// =============================================================================
// NOTIFICATION TYPE CONFIGURATIONS
// =============================================================================

export const NOTIFICATION_TYPE_CONFIGS: NotificationTypeConfigs = {
  SYSTEM: {
    label: 'System',
    description: 'Important system notifications',
    icon: 'Settings',
    color: '#6B7280',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL'],
    defaultPriority: 'NORMAL',
    canDisable: false,
    category: 'system',
  },
  ACHIEVEMENT_UNLOCKED: {
    label: 'Achievement Unlocked',
    description: 'When you unlock a new achievement',
    icon: 'Trophy',
    color: '#F59E0B',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL', 'PUSH'],
    defaultPriority: 'NORMAL',
    canDisable: true,
    category: 'achievements',
    template: 'achievement-unlocked',
  },
  GOAL_REMINDER: {
    label: 'Goal Reminder',
    description: 'Reminders about your goals',
    icon: 'Target',
    color: '#3B82F6',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL', 'PUSH'],
    defaultPriority: 'NORMAL',
    canDisable: true,
    category: 'goals',
    template: 'goal-reminder',
  },
  GOAL_COMPLETED: {
    label: 'Goal Completed',
    description: 'When you complete a goal',
    icon: 'CheckCircle',
    color: '#10B981',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL', 'PUSH'],
    defaultPriority: 'NORMAL',
    canDisable: true,
    category: 'goals',
    template: 'goal-completed',
  },
  GOAL_FAILED: {
    label: 'Goal Failed',
    description: 'When a goal deadline passes',
    icon: 'XCircle',
    color: '#EF4444',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL'],
    defaultPriority: 'NORMAL',
    canDisable: true,
    category: 'goals',
  },
  STREAK_AT_RISK: {
    label: 'Streak at Risk',
    description: 'Warning when your streak might break',
    icon: 'AlertTriangle',
    color: '#F59E0B',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL', 'PUSH'],
    defaultPriority: 'HIGH',
    canDisable: true,
    category: 'streaks',
    template: 'streak-at-risk',
  },
  STREAK_BROKEN: {
    label: 'Streak Broken',
    description: 'When your streak ends',
    icon: 'Flame',
    color: '#EF4444',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL'],
    defaultPriority: 'NORMAL',
    canDisable: true,
    category: 'streaks',
    template: 'streak-broken',
  },
  STREAK_MILESTONE: {
    label: 'Streak Milestone',
    description: 'When you reach a streak milestone',
    icon: 'Award',
    color: '#8B5CF6',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL', 'PUSH'],
    defaultPriority: 'NORMAL',
    canDisable: true,
    category: 'streaks',
    template: 'streak-milestone',
  },
  SYNC_COMPLETE: {
    label: 'Sync Complete',
    description: 'When platform sync finishes',
    icon: 'RefreshCw',
    color: '#10B981',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP'],
    defaultPriority: 'LOW',
    canDisable: true,
    category: 'sync',
  },
  SYNC_FAILED: {
    label: 'Sync Failed',
    description: 'When platform sync fails',
    icon: 'AlertCircle',
    color: '#EF4444',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL'],
    defaultPriority: 'HIGH',
    canDisable: true,
    category: 'sync',
    template: 'sync-failed',
  },
  WEEKLY_REPORT: {
    label: 'Weekly Report',
    description: 'Your weekly progress summary',
    icon: 'BarChart2',
    color: '#3B82F6',
    defaultChannel: 'EMAIL',
    allowedChannels: ['IN_APP', 'EMAIL'],
    defaultPriority: 'LOW',
    canDisable: true,
    category: 'reports',
    template: 'weekly-report',
  },
  MONTHLY_REPORT: {
    label: 'Monthly Report',
    description: 'Your monthly progress summary',
    icon: 'PieChart',
    color: '#8B5CF6',
    defaultChannel: 'EMAIL',
    allowedChannels: ['IN_APP', 'EMAIL'],
    defaultPriority: 'LOW',
    canDisable: true,
    category: 'reports',
    template: 'monthly-report',
  },
  NEW_FEATURE: {
    label: 'New Feature',
    description: 'Announcements about new features',
    icon: 'Sparkles',
    color: '#EC4899',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL'],
    defaultPriority: 'LOW',
    canDisable: true,
    category: 'product',
  },
  SECURITY_ALERT: {
    label: 'Security Alert',
    description: 'Important security notifications',
    icon: 'Shield',
    color: '#EF4444',
    defaultChannel: 'EMAIL',
    allowedChannels: ['IN_APP', 'EMAIL', 'PUSH'],
    defaultPriority: 'URGENT',
    canDisable: false,
    category: 'security',
    template: 'login-alert',
  },
  BILLING_ALERT: {
    label: 'Billing Alert',
    description: 'Subscription and payment notifications',
    icon: 'CreditCard',
    color: '#F59E0B',
    defaultChannel: 'EMAIL',
    allowedChannels: ['IN_APP', 'EMAIL'],
    defaultPriority: 'HIGH',
    canDisable: false,
    category: 'billing',
  },
  WELCOME: {
    label: 'Welcome',
    description: 'Welcome message for new users',
    icon: 'Heart',
    color: '#EC4899',
    defaultChannel: 'EMAIL',
    allowedChannels: ['IN_APP', 'EMAIL'],
    defaultPriority: 'NORMAL',
    canDisable: false,
    category: 'onboarding',
    template: 'welcome',
  },
  REFERRAL: {
    label: 'Referral',
    description: 'Referral program notifications',
    icon: 'Users',
    color: '#10B981',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL'],
    defaultPriority: 'NORMAL',
    canDisable: true,
    category: 'referral',
  },
  CUSTOM: {
    label: 'Custom',
    description: 'Custom notifications',
    icon: 'Bell',
    color: '#6B7280',
    defaultChannel: 'IN_APP',
    allowedChannels: ['IN_APP', 'EMAIL', 'PUSH'],
    defaultPriority: 'NORMAL',
    canDisable: true,
    category: 'other',
  },
};

// =============================================================================
// PRIORITY CONFIGURATIONS
// =============================================================================

export const PRIORITY_CONFIGS: PriorityConfigs = {
  LOW: {
    label: 'Low',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'ChevronDown',
    ttlHours: 168, // 7 days
    bypassQuietHours: false,
    bypassDigest: false,
  },
  NORMAL: {
    label: 'Normal',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'Minus',
    ttlHours: 336, // 14 days
    bypassQuietHours: false,
    bypassDigest: false,
  },
  HIGH: {
    label: 'High',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'ChevronUp',
    ttlHours: 720, // 30 days
    bypassQuietHours: false,
    bypassDigest: true,
  },
  URGENT: {
    label: 'Urgent',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'AlertTriangle',
    ttlHours: 720, // 30 days
    bypassQuietHours: true,
    bypassDigest: true,
  },
};

// =============================================================================
// DELIVERY CONFIGURATION
// =============================================================================

export const DELIVERY_CONFIG: DeliveryConfig = {
  /** Maximum retry attempts for failed deliveries */
  maxRetries: 3,

  /** Delay between retries in ms */
  retryDelayMs: 5000,

  /** Batch size for bulk notifications */
  batchSize: 100,

  /** Delay between batches in ms */
  batchDelayMs: 1000,

  /** Delivery timeout in ms */
  timeoutMs: 30000,

  /** Concurrent delivery workers */
  concurrency: 5,
};

// =============================================================================
// RETENTION CONFIGURATION
// =============================================================================

export const RETENTION_CONFIG: RetentionConfig = {
  /** Days to keep read notifications */
  readNotificationDays: 30,

  /** Days to keep unread notifications */
  unreadNotificationDays: 90,

  /** Days to keep archived notifications */
  archivedNotificationDays: 180,

  /** Maximum notifications per user */
  maxNotificationsPerUser: 1000,

  /** Cleanup batch size */
  cleanupBatchSize: 500,
};

// =============================================================================
// RATE LIMIT CONFIGURATION
// =============================================================================

export const NOTIFICATION_RATE_LIMITS: NotificationRateLimitConfig = {
  /** Max notifications per user per hour */
  perUserPerHour: 50,

  /** Max notifications per user per day */
  perUserPerDay: 200,

  /** Rate limits by notification type */
  perTypePerHour: {
    STREAK_AT_RISK: 2,
    GOAL_REMINDER: 5,
    SYNC_COMPLETE: 10,
    WEEKLY_REPORT: 1,
    MONTHLY_REPORT: 1,
  },

  /** Global rate limit per minute */
  globalPerMinute: 1000,
};

// =============================================================================
// TEMPLATE CONFIGURATION
// =============================================================================

export const TEMPLATE_CONFIG: NotificationTemplateConfig = {
  /** Default locale for templates */
  defaultLocale: 'en',

  /** Supported locales */
  supportedLocales: ['en', 'es', 'fr', 'de', 'ja', 'zh'],

  /** Fallback to default locale if translation missing */
  fallbackToDefault: true,
};

// =============================================================================
// PUSH NOTIFICATION CONFIGURATION
// =============================================================================

export const PUSH_CONFIG: PushConfig = {
  /** Enable push notifications */
  enabled: process.env.PUSH_ENABLED !== 'false',

  /** VAPID public key */
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,

  /** VAPID private key */
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,

  /** VAPID subject (email or URL) */
  vapidSubject: process.env.VAPID_SUBJECT || `mailto:${process.env.EMAIL_FROM || 'noreply@progresstracker.com'}`,

  /** Push notification TTL in seconds */
  ttl: 86400, // 24 hours

  /** Push urgency level */
  urgency: 'normal',

  /** Maximum push subscriptions per user */
  maxSubscriptionsPerUser: 5,

  /** Clean up inactive subscriptions after days */
  cleanupInactiveAfterDays: 90,
};

// =============================================================================
// DIGEST CONFIGURATION
// =============================================================================

export const DIGEST_CONFIG: DigestConfig = {
  /** Enable notification digest */
  enabled: true,

  /** Available digest frequencies */
  frequencies: [
    { value: 'realtime', label: 'Real-time', description: 'Receive notifications immediately' },
    { value: 'hourly', label: 'Hourly', description: 'Digest every hour' },
    { value: 'daily', label: 'Daily', description: 'One digest per day' },
    { value: 'weekly', label: 'Weekly', description: 'One digest per week' },
  ],

  /** Default digest frequency */
  defaultFrequency: 'realtime',

  /** Default digest time (for daily/weekly) */
  defaultTime: '09:00',

  /** Maximum items per digest email */
  maxItemsPerDigest: 20,

  /** Group digest items by notification type */
  groupByType: true,
};

// =============================================================================
// NOTIFICATION CATEGORIES
// =============================================================================

export const NOTIFICATION_CATEGORIES = {
  achievements: {
    label: 'Achievements',
    description: 'Achievement and progress notifications',
    types: ['ACHIEVEMENT_UNLOCKED'],
  },
  goals: {
    label: 'Goals',
    description: 'Goal reminders and completions',
    types: ['GOAL_REMINDER', 'GOAL_COMPLETED', 'GOAL_FAILED'],
  },
  streaks: {
    label: 'Streaks',
    description: 'Streak alerts and milestones',
    types: ['STREAK_AT_RISK', 'STREAK_BROKEN', 'STREAK_MILESTONE'],
  },
  sync: {
    label: 'Sync',
    description: 'Platform synchronization updates',
    types: ['SYNC_COMPLETE', 'SYNC_FAILED'],
  },
  reports: {
    label: 'Reports',
    description: 'Weekly and monthly reports',
    types: ['WEEKLY_REPORT', 'MONTHLY_REPORT'],
  },
  security: {
    label: 'Security',
    description: 'Security and account alerts',
    types: ['SECURITY_ALERT'],
  },
  billing: {
    label: 'Billing',
    description: 'Subscription and payment alerts',
    types: ['BILLING_ALERT'],
  },
  product: {
    label: 'Product Updates',
    description: 'New features and announcements',
    types: ['NEW_FEATURE'],
  },
  system: {
    label: 'System',
    description: 'Important system notifications',
    types: ['SYSTEM', 'WELCOME'],
  },
  referral: {
    label: 'Referrals',
    description: 'Referral program updates',
    types: ['REFERRAL'],
  },
  other: {
    label: 'Other',
    description: 'Other notifications',
    types: ['CUSTOM'],
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get notification type config */
export function getNotificationTypeConfig(type: NotificationType): NotificationTypeConfig {
  return NOTIFICATION_TYPE_CONFIGS[type];
}

/** Get channel config */
export function getChannelConfig(channel: NotificationChannel): ChannelConfig {
  const channelMap: Record<NotificationChannel, keyof ChannelConfigs> = {
    IN_APP: 'inApp',
    EMAIL: 'email',
    PUSH: 'push',
    SMS: 'sms',
  };
  return CHANNEL_CONFIGS[channelMap[channel]];
}

/** Get priority config */
export function getPriorityConfig(priority: NotificationPriority): PriorityConfig {
  return PRIORITY_CONFIGS[priority];
}

/** Check if notification type can be sent via channel */
export function canSendViaChannel(
  type: NotificationType,
  channel: NotificationChannel
): boolean {
  const typeConfig = NOTIFICATION_TYPE_CONFIGS[type];
  const channelConfig = getChannelConfig(channel);
  return channelConfig.enabled && typeConfig.allowedChannels.includes(channel);
}

/** Get enabled channels */
export function getEnabledChannels(): NotificationChannel[] {
  const channels: NotificationChannel[] = [];
  if (CHANNEL_CONFIGS.inApp.enabled) channels.push('IN_APP');
  if (CHANNEL_CONFIGS.email.enabled) channels.push('EMAIL');
  if (CHANNEL_CONFIGS.push.enabled) channels.push('PUSH');
  if (CHANNEL_CONFIGS.sms.enabled) channels.push('SMS');
  return channels;
}

/** Get disableable notification types */
export function getDisableableTypes(): NotificationType[] {
  return (Object.keys(NOTIFICATION_TYPE_CONFIGS) as NotificationType[])
    .filter(type => NOTIFICATION_TYPE_CONFIGS[type].canDisable);
}

/** Check if push notifications are configured */
export function isPushConfigured(): boolean {
  return !!(
    PUSH_CONFIG.enabled &&
    PUSH_CONFIG.vapidPublicKey &&
    PUSH_CONFIG.vapidPrivateKey
  );
}

/** Calculate notification expiry */
export function getNotificationExpiry(priority: NotificationPriority): Date {
  const hours = PRIORITY_CONFIGS[priority].ttlHours;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/** Check if should bypass quiet hours */
export function shouldBypassQuietHours(priority: NotificationPriority): boolean {
  return PRIORITY_CONFIGS[priority].bypassQuietHours;
}

/** Check if should bypass digest */
export function shouldBypassDigest(priority: NotificationPriority): boolean {
  return PRIORITY_CONFIGS[priority].bypassDigest;
}

/** Validate notification configuration */
export function validateNotificationConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check push configuration
  if (PUSH_CONFIG.enabled && !isPushConfigured()) {
    warnings.push('Push notifications enabled but VAPID keys not configured');
  }

  // Check at least one channel is enabled
  const enabledChannels = getEnabledChannels();
  if (enabledChannels.length === 0) {
    errors.push('At least one notification channel must be enabled');
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

export const NOTIFICATION_CONFIG: NotificationConfig = {
  channels: CHANNEL_CONFIGS,
  types: NOTIFICATION_TYPE_CONFIGS,
  priorities: PRIORITY_CONFIGS,
  delivery: DELIVERY_CONFIG,
  retention: RETENTION_CONFIG,
  rateLimit: NOTIFICATION_RATE_LIMITS,
  templates: TEMPLATE_CONFIG,
  push: PUSH_CONFIG,
  digest: DIGEST_CONFIG,
};

export default NOTIFICATION_CONFIG;