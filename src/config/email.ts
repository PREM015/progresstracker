// ============================================================================
// FILE: config/email.ts
// PURPOSE: Email configuration and templates
// ============================================================================

import type { EmailTemplate } from '@/types/email';

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

/** Email provider type */
export type EmailProvider = 'brevo';

/** Current email provider */
export const EMAIL_PROVIDER: EmailProvider = 'brevo';

/** Email provider configurations */
export const PROVIDER_CONFIG: Record<EmailProvider, {
  name: string;
  apiKey?: string;
  requiresApiKey: boolean;
  supportsBatch: boolean;
  maxBatchSize: number;
  supportsTemplates: boolean;
}> = {
  brevo: {
    name: 'Brevo',
    apiKey: process.env.BREVO_API_KEY,
    requiresApiKey: true,
    supportsBatch: true,
    maxBatchSize: 500,
    supportsTemplates: true,
  },
};

// =============================================================================
// SENDER CONFIGURATION
// =============================================================================

/** Default sender email addresses */
export const EMAIL_FROM = {
  default: process.env.EMAIL_FROM || 'noreply@progresstracker.com',
  support: process.env.EMAIL_FROM_SUPPORT || 'support@progresstracker.com',
  security: process.env.EMAIL_FROM_SECURITY || 'security@progresstracker.com',
  billing: process.env.EMAIL_FROM_BILLING || 'billing@progresstracker.com',
  newsletter: process.env.EMAIL_FROM_NEWSLETTER || 'newsletter@progresstracker.com',
  reports: process.env.EMAIL_FROM_REPORTS || 'reports@progresstracker.com',
} as const;

/** Default sender names */
export const EMAIL_FROM_NAME = {
  default: process.env.EMAIL_FROM_NAME || 'ProgressTracker',
  support: 'ProgressTracker Support',
  security: 'ProgressTracker Security',
  billing: 'ProgressTracker Billing',
  newsletter: 'ProgressTracker Newsletter',
  reports: 'ProgressTracker Reports',
} as const;

/** Reply-to address */
export const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || 'hello@progresstracker.com';

// =============================================================================
// SMTP CONFIGURATION (for Nodemailer)
// =============================================================================

/** SMTP configuration */
export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
} as const;

// =============================================================================
// TEMPLATE CONFIGURATION
// =============================================================================

/** App name for templates */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'ProgressTracker';

/** App URL for templates */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.com';

/** Template default variables */
export const TEMPLATE_DEFAULTS = {
  appName: APP_NAME,
  appUrl: APP_URL,
  supportUrl: `${APP_URL}/support`,
  settingsUrl: `${APP_URL}/settings`,
  dashboardUrl: `${APP_URL}/dashboard`,
  unsubscribeUrl: `${APP_URL}/unsubscribe`,

  // Social links
  twitterUrl: process.env.TWITTER_URL || 'https://twitter.com/progresstracker',
  githubUrl: process.env.GITHUB_URL || 'https://github.com/progresstracker',
  linkedinUrl: process.env.LINKEDIN_URL || 'https://linkedin.com/company/progresstracker',

  // Legal
  privacyUrl: `${APP_URL}/privacy`,
  termsUrl: `${APP_URL}/terms`,

  // Contact
  supportEmail: EMAIL_FROM.support,

  // Branding
  logoUrl: `${APP_URL}/logo.png`,
  primaryColor: '#3B82F6',
  backgroundColor: '#F9FAFB',
  textColor: '#1F2937',

  // Current year
  currentYear: new Date().getFullYear(),
} as const;

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

/** Email rate limits */
export const EMAIL_RATE_LIMITS = {
  /** Max emails per user per hour */
  perUserPerHour: 10,

  /** Max emails per user per day */
  perUserPerDay: 50,

  /** Max emails globally per minute */
  globalPerMinute: 100,

  /** Max emails globally per hour */
  globalPerHour: 5000,

  /** Max emails globally per day */
  globalPerDay: 50000,

  /** Rate limit by email type */
  byType: {
    transactional: 1000, // per hour
    notification: 500,   // per hour
    marketing: 100,      // per hour
    report: 200,         // per hour
  },
} as const;

// =============================================================================
// BATCH CONFIGURATION
// =============================================================================

/** Batch email configuration */
export const BATCH_CONFIG = {
  /** Default batch size */
  defaultSize: 50,

  /** Max batch size (provider-specific) */
  maxSize: PROVIDER_CONFIG[EMAIL_PROVIDER].maxBatchSize,

  /** Delay between batches (milliseconds) */
  delayBetweenBatches: 1000,

  /** Max concurrent batches */
  maxConcurrentBatches: 3,

  /** Batch timeout (milliseconds) */
  batchTimeout: 30000,
} as const;

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

/** Email retry configuration */
export const RETRY_CONFIG = {
  /** Max retry attempts */
  maxAttempts: 3,

  /** Initial retry delay (milliseconds) */
  initialDelay: 1000,

  /** Max retry delay (milliseconds) */
  maxDelay: 30000,

  /** Backoff multiplier */
  backoffMultiplier: 2,

  /** Errors that should not be retried */
  nonRetryableErrors: [
    'Invalid email address',
    'Email address does not exist',
    'User unsubscribed',
    'Blocked recipient',
    'Invalid API key',
    'Insufficient credits',
  ],

  /** Retry delay by attempt */
  delayByAttempt: [1000, 2000, 5000, 10000, 30000],
} as const;

// =============================================================================
// QUEUE CONFIGURATION
// =============================================================================

/** Email queue configuration */
export const QUEUE_CONFIG = {
  /** Enable email queue */
  enabled: process.env.EMAIL_QUEUE_ENABLED !== 'false',

  /** Queue processing interval (milliseconds) */
  processingInterval: 5000,

  /** Max items to process per batch */
  batchSize: 50,

  /** Queue priorities */
  priorities: {
    high: 1,    // Security, transactional
    normal: 5,  // Notifications, reports
    low: 10,    // Marketing, newsletters
  },

  /** Max queue size */
  maxQueueSize: 10000,

  /** Queue retention (milliseconds) */
  retentionTime: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

// =============================================================================
// TEMPLATE CATEGORIZATION
// =============================================================================

/** Email template categories */
export const TEMPLATE_CATEGORIES = {
  authentication: [
    'welcome',
    'verify-email',
    'password-reset',
    'password-changed',
    'email-change-request',
    'email-changed',
  ] as EmailTemplate[],

  security: [
    'login-alert',
    'two-factor-enabled',
    'two-factor-disabled',
    'backup-codes-generated',
  ] as EmailTemplate[],

  streak: [
    'streak-at-risk',
    'streak-broken',
    'streak-milestone',
  ] as EmailTemplate[],

  goals: [
    'goal-reminder',
    'goal-completed',
  ] as EmailTemplate[],

  achievements: [
    'achievement-unlocked',
  ] as EmailTemplate[],

  reports: [
    'weekly-report',
    'monthly-report',
    'report-generated',
  ] as EmailTemplate[],

  sync: [
    'sync-failed',
  ] as EmailTemplate[],

  support: [
    'support-ticket-created',
    'support-ticket-reply',
  ] as EmailTemplate[],

  system: [
    'maintenance-notification',
  ] as EmailTemplate[],

  billing: [
    'subscription-created',
    'subscription-cancelled',
    'payment-failed',
    'invoice-paid',
  ] as EmailTemplate[],

  account: [
    'account-deleted',
  ] as EmailTemplate[],

  marketing: [
    'newsletter',
    'waitlist-welcome',
  ] as EmailTemplate[],
} as const;

/** Get template category */
export function getTemplateCategory(template: EmailTemplate): string {
  for (const [category, templates] of Object.entries(TEMPLATE_CATEGORIES)) {
    if (templates.includes(template)) {
      return category;
    }
  }
  return 'other';
}

// =============================================================================
// TEMPLATE PRIORITY
// =============================================================================

/** Template priority mapping */
export const TEMPLATE_PRIORITY: Record<EmailTemplate, 'high' | 'normal' | 'low'> = {
  // High priority (security & transactional)
  'password-reset': 'high',
  'verify-email': 'high',
  'login-alert': 'high',
  'two-factor-enabled': 'high',
  'two-factor-disabled': 'high',
  'email-change-request': 'high',
  'payment-failed': 'high',
  'subscription-cancelled': 'high',

  // Normal priority (notifications)
  'welcome': 'normal',
  'password-changed': 'normal',
  'email-changed': 'normal',
  'backup-codes-generated': 'normal',
  'streak-at-risk': 'normal',
  'streak-broken': 'normal',
  'streak-milestone': 'normal',
  'goal-reminder': 'normal',
  'goal-completed': 'normal',
  'achievement-unlocked': 'normal',
  'sync-failed': 'normal',
  'support-ticket-created': 'normal',
  'support-ticket-reply': 'normal',
  'maintenance-notification': 'normal',
  'subscription-created': 'normal',
  'invoice-paid': 'normal',
  'account-deleted': 'normal',
  'report-generated': 'normal',

  // Low priority (reports & marketing)
  'weekly-report': 'low',
  'monthly-report': 'low',
  'newsletter': 'low',
  'waitlist-welcome': 'low',
};

/** Get template priority */
export function getTemplatePriority(template: EmailTemplate): 'high' | 'normal' | 'low' {
  return TEMPLATE_PRIORITY[template] || 'normal';
}

// =============================================================================
// TEMPLATE SENDER
// =============================================================================

/** Template sender mapping */
export const TEMPLATE_SENDER: Partial<Record<EmailTemplate, keyof typeof EMAIL_FROM>> = {
  'password-reset': 'security',
  'verify-email': 'security',
  'login-alert': 'security',
  'two-factor-enabled': 'security',
  'two-factor-disabled': 'security',
  'email-change-request': 'security',
  'password-changed': 'security',
  'email-changed': 'security',
  'backup-codes-generated': 'security',

  'subscription-created': 'billing',
  'subscription-cancelled': 'billing',
  'payment-failed': 'billing',
  'invoice-paid': 'billing',

  'support-ticket-created': 'support',
  'support-ticket-reply': 'support',

  'weekly-report': 'reports',
  'monthly-report': 'reports',
  'report-generated': 'reports',

  'newsletter': 'newsletter',
  'waitlist-welcome': 'newsletter',
};

/** Get template sender */
export function getTemplateSender(template: EmailTemplate): {
  email: string;
  name: string;
} {
  const senderType = TEMPLATE_SENDER[template] || 'default';
  return {
    email: EMAIL_FROM[senderType],
    name: EMAIL_FROM_NAME[senderType],
  };
}

// =============================================================================
// UNSUBSCRIBE CONFIGURATION
// =============================================================================

/** Unsubscribe types */
export const UNSUBSCRIBE_TYPES = {
  all: 'All emails',
  marketing: 'Marketing emails',
  reports: 'Weekly/Monthly reports',
  notifications: 'Notification emails',
  achievements: 'Achievement alerts',
  goals: 'Goal reminders',
  streak: 'Streak alerts',
  sync: 'Sync notifications',
} as const;

export type UnsubscribeType = keyof typeof UNSUBSCRIBE_TYPES;

/** Templates that can be unsubscribed from */
export const UNSUBSCRIBABLE_TEMPLATES: Record<EmailTemplate, UnsubscribeType[]> = {
  'welcome': [],
  'verify-email': [],
  'password-reset': [],
  'password-changed': [],
  'email-change-request': [],
  'email-changed': [],
  'login-alert': [],
  'two-factor-enabled': [],
  'two-factor-disabled': [],
  'backup-codes-generated': [],

  'streak-at-risk': ['streak', 'notifications', 'all'],
  'streak-broken': ['streak', 'notifications', 'all'],
  'streak-milestone': ['streak', 'notifications', 'all'],

  'goal-reminder': ['goals', 'notifications', 'all'],
  'goal-completed': ['goals', 'notifications', 'all'],

  'achievement-unlocked': ['achievements', 'notifications', 'all'],

  'weekly-report': ['reports', 'all'],
  'monthly-report': ['reports', 'all'],
  'report-generated': ['reports', 'notifications', 'all'],

  'sync-failed': ['sync', 'notifications', 'all'],

  'support-ticket-created': [],
  'support-ticket-reply': [],

  'maintenance-notification': [],

  'subscription-created': [],
  'subscription-cancelled': [],
  'payment-failed': [],
  'invoice-paid': [],

  'account-deleted': [],

  'newsletter': ['marketing', 'all'],
  'waitlist-welcome': ['marketing', 'all'],
};

// =============================================================================
// TRACKING CONFIGURATION
// =============================================================================

/** Email tracking configuration */
export const TRACKING_CONFIG = {
  /** Enable open tracking */
  trackOpens: process.env.EMAIL_TRACK_OPENS !== 'false',

  /** Enable click tracking */
  trackClicks: process.env.EMAIL_TRACK_CLICKS !== 'false',

  /** Enable unsubscribe tracking */
  trackUnsubscribes: true,

  /** Tracking pixel URL */
  trackingPixelUrl: `${APP_URL}/api/email/track`,

  /** Click tracking URL */
  clickTrackingUrl: `${APP_URL}/api/email/click`,
} as const;

// =============================================================================
// PERFORMANCE CONFIGURATION
// =============================================================================

/** Performance configuration */
export const PERFORMANCE_CONFIG = {
  /** Cache rendered templates */
  cacheTemplates: process.env.NODE_ENV === 'production',

  /** Template cache TTL (milliseconds) */
  templateCacheTTL: 5 * 60 * 1000, // 5 minutes

  /** Warm up templates on startup */
  warmupTemplates: process.env.NODE_ENV === 'production',

  /** Prerender common templates */
  prerenderTemplates: ['welcome', 'verify-email', 'password-reset'],
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Calculate retry delay with exponential backoff */
export function calculateRetryDelay(attempt: number): number {
  if (attempt <= 0) return 0;
  if (attempt >= RETRY_CONFIG.delayByAttempt.length) {
    return RETRY_CONFIG.maxDelay;
  }
  return RETRY_CONFIG.delayByAttempt[attempt - 1];
}

/** Check if error is retryable */
export function isRetryableError(error: string): boolean {
  return !RETRY_CONFIG.nonRetryableErrors.some(
    nonRetryable => error.toLowerCase().includes(nonRetryable.toLowerCase())
  );
}

/** Get batch size for provider */
export function getBatchSize(provider: EmailProvider = EMAIL_PROVIDER): number {
  return Math.min(
    BATCH_CONFIG.defaultSize,
    PROVIDER_CONFIG[provider].maxBatchSize
  );
}

/** Format sender address */
export function formatSenderAddress(email: string, name?: string): string {
  if (!name) return email;
  return `${name} <${email}>`;
}

/** Generate email ID */
export function generateEmailId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/** Validate email address */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** Get environment-specific config */
export function getEnvironmentConfig(): {
  isDevelopment: boolean;

  isProduction: boolean;
  isTest: boolean;
} {
  return {
    isDevelopment: process.env.NODE_ENV === 'development',

    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
  };
}

/** Check if emails should be sent (based on environment) */
export function shouldSendEmails(): boolean {
  const env = getEnvironmentConfig();

  // Don't send emails in test environment
  if (env.isTest) return false;

  // Respect EMAIL_ENABLED flag
  if (process.env.EMAIL_ENABLED === 'false') return false;

  return true;
}



/** Validate email configuration */
export function validateEmailConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check provider configuration
  const providerConfig = PROVIDER_CONFIG[EMAIL_PROVIDER];
  if (providerConfig.requiresApiKey && !providerConfig.apiKey) {
    errors.push(`${providerConfig.name} requires an API key`);
  }

  // Check SMTP configuration for Brevo (uses SMTP)
  if (!SMTP_CONFIG.host) errors.push('SMTP host is required');
  if (!SMTP_CONFIG.auth.user) errors.push('SMTP user is required');
  if (!SMTP_CONFIG.auth.pass) errors.push('SMTP password is required');

  // Check sender addresses
  if (!EMAIL_FROM.default) errors.push('Default sender email is required');
  if (!isValidEmail(EMAIL_FROM.default)) errors.push('Default sender email is invalid');

  // Warnings
  if (!EMAIL_FROM.support) warnings.push('Support email not configured');
  if (!EMAIL_FROM.security) warnings.push('Security email not configured');
  if (!EMAIL_REPLY_TO) warnings.push('Reply-to address not configured');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

const emailConfig = {
  // Provider
  EMAIL_PROVIDER,
  PROVIDER_CONFIG,

  // Sender
  EMAIL_FROM,
  EMAIL_FROM_NAME,
  EMAIL_REPLY_TO,

  // SMTP
  SMTP_CONFIG,

  // Templates
  APP_NAME,
  APP_URL,
  TEMPLATE_DEFAULTS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_PRIORITY,
  TEMPLATE_SENDER,

  // Rate limiting
  EMAIL_RATE_LIMITS,

  // Batch
  BATCH_CONFIG,

  // Retry
  RETRY_CONFIG,

  // Queue
  QUEUE_CONFIG,

  // Unsubscribe
  UNSUBSCRIBE_TYPES,
  UNSUBSCRIBABLE_TEMPLATES,

  // Tracking
  TRACKING_CONFIG,

  // Performance
  PERFORMANCE_CONFIG,

  // Helper functions
  getTemplateCategory,
  getTemplatePriority,
  getTemplateSender,
  calculateRetryDelay,
  isRetryableError,
  getBatchSize,
  formatSenderAddress,
  generateEmailId,
  isValidEmail,
  getEnvironmentConfig,
  shouldSendEmails,

  validateEmailConfig,
};

export default emailConfig;