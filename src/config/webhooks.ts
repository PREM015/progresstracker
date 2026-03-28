// ============================================================================
// FILE: src/config/webhooks.ts
// PURPOSE: Webhook configuration for outgoing and incoming webhooks
// ============================================================================

import type { WebhookEventType, WebhookDeliveryStatus } from '@prisma/client';

// =============================================================================
// ENVIRONMENT
// =============================================================================

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface WebhookConfig {
  outgoing: OutgoingWebhookConfig;
  incoming: IncomingWebhookConfig;
  events: WebhookEventConfigs;
  delivery: DeliveryConfig;
  security: WebhookSecurityConfig;
  retry: RetryConfig;
  limits: WebhookLimits;
}

export interface OutgoingWebhookConfig {
  enabled: boolean;
  maxWebhooksPerUser: number;
  maxEventsPerWebhook: number;
  signatureHeader: string;
  signatureAlgorithm: 'sha256' | 'sha512';
  userAgentString: string;
  defaultTimeout: number;
  defaultRetries: number;
}

export interface IncomingWebhookConfig {
  enabled: boolean;
  providers: WebhookProviderConfig[];
  signatureValidation: boolean;
  ipWhitelist: string[];
}

export interface WebhookProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  signatureHeader: string;
  signatureAlgorithm: string;
  secret?: string;
  ipWhitelist: string[];
}

export interface WebhookEventConfig {
  label: string;
  description: string;
  category: string;
  payloadSchema?: object;
  samplePayload?: object;
  deprecated?: boolean;
}

export type WebhookEventConfigs = Record<WebhookEventType, WebhookEventConfig>;

export interface DeliveryConfig {
  timeout: number;
  maxRetries: number;
  retryDelays: number[];
  batchSize: number;
  concurrency: number;
  successCodes: number[];
  retryOnCodes: number[];
}

export interface WebhookSecurityConfig {
  secretMinLength: number;
  secretMaxLength: number;
  signatureExpiry: number;
  validateSsl: boolean;
  blockedHosts: string[];
  allowedProtocols: string[];
  maxPayloadSize: number;
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

export interface WebhookLimits {
  maxWebhooksPerUser: number;
  maxEventsPerWebhook: number;
  maxDeliveriesPerHour: number;
  maxPayloadSize: number;
  maxUrlLength: number;
  maxHeadersCount: number;
  maxHistoryDays: number;
  maxFailuresBeforeDisable: number;
}

// =============================================================================
// OUTGOING WEBHOOK CONFIGURATION
// =============================================================================

export const OUTGOING_CONFIG: OutgoingWebhookConfig = {
  /** Enable outgoing webhooks */
  enabled: process.env.WEBHOOKS_ENABLED !== 'false',

  /** Maximum webhooks per user */
  maxWebhooksPerUser: 10,

  /** Maximum events per webhook */
  maxEventsPerWebhook: 20,

  /** Header name for signature */
  signatureHeader: 'X-ProgressTracker-Signature',

  /** Signature algorithm */
  signatureAlgorithm: 'sha256',

  /** User agent for webhook requests */
  userAgentString: `ProgressTracker-Webhook/${process.env.npm_package_version || '1.0.0'}`,

  /** Default timeout in ms */
  defaultTimeout: 30000,

  /** Default retry attempts */
  defaultRetries: 3,
};

// =============================================================================
// INCOMING WEBHOOK CONFIGURATION
// =============================================================================

export const INCOMING_CONFIG: IncomingWebhookConfig = {
  /** Enable incoming webhooks */
  enabled: true,

  /** Webhook providers */
  providers: [
    {
      id: 'github',
      name: 'GitHub',
      enabled: true,
      signatureHeader: 'X-Hub-Signature-256',
      signatureAlgorithm: 'sha256',
      secret: process.env.GITHUB_WEBHOOK_SECRET,
      ipWhitelist: [], // GitHub's IP ranges are dynamic
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      enabled: true,
      signatureHeader: 'X-Gitlab-Token',
      signatureAlgorithm: 'token',
      secret: process.env.GITLAB_WEBHOOK_SECRET,
      ipWhitelist: [],
    },
    {
      id: 'bitbucket',
      name: 'Bitbucket',
      enabled: true,
      signatureHeader: 'X-Hub-Signature',
      signatureAlgorithm: 'sha256',
      secret: process.env.BITBUCKET_WEBHOOK_SECRET,
      ipWhitelist: [],
    },
    {
      id: 'stripe',
      name: 'Stripe',
      enabled: true,
      signatureHeader: 'Stripe-Signature',
      signatureAlgorithm: 'stripe',
      secret: process.env.STRIPE_WEBHOOK_SECRET,
      ipWhitelist: [],
    },
  ],

  /** Require signature validation */
  signatureValidation: IS_PRODUCTION,

  /** Global IP whitelist (empty = allow all) */
  ipWhitelist: [],
};

// =============================================================================
// WEBHOOK EVENT CONFIGURATIONS
// =============================================================================

export const WEBHOOK_EVENT_CONFIGS: WebhookEventConfigs = {
  ENTRY_CREATED: {
    label: 'Entry Created',
    description: 'Triggered when a new tracker entry is created',
    category: 'tracker',
    samplePayload: {
      event: 'ENTRY_CREATED',
      timestamp: '2024-01-01T00:00:00.000Z',
      data: {
        id: 'entry_123',
        userId: 'user_456',
        platformId: 'platform_789',
        date: '2024-01-01',
        problemsSolved: 5,
      },
    },
  },
  ENTRY_UPDATED: {
    label: 'Entry Updated',
    description: 'Triggered when a tracker entry is updated',
    category: 'tracker',
  },
  ENTRY_DELETED: {
    label: 'Entry Deleted',
    description: 'Triggered when a tracker entry is deleted',
    category: 'tracker',
  },
  GOAL_CREATED: {
    label: 'Goal Created',
    description: 'Triggered when a new goal is created',
    category: 'goals',
    samplePayload: {
      event: 'GOAL_CREATED',
      timestamp: '2024-01-01T00:00:00.000Z',
      data: {
        id: 'goal_123',
        userId: 'user_456',
        title: 'Solve 100 problems',
        target: 100,
        deadline: '2024-12-31',
      },
    },
  },
  GOAL_COMPLETED: {
    label: 'Goal Completed',
    description: 'Triggered when a goal is completed',
    category: 'goals',
  },
  GOAL_FAILED: {
    label: 'Goal Failed',
    description: 'Triggered when a goal deadline passes without completion',
    category: 'goals',
  },
  ACHIEVEMENT_UNLOCKED: {
    label: 'Achievement Unlocked',
    description: 'Triggered when a user unlocks an achievement',
    category: 'achievements',
    samplePayload: {
      event: 'ACHIEVEMENT_UNLOCKED',
      timestamp: '2024-01-01T00:00:00.000Z',
      data: {
        id: 'achievement_123',
        userId: 'user_456',
        achievementId: 'first_problem',
        title: 'First Problem',
        points: 10,
        unlockedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  },
  STREAK_MILESTONE: {
    label: 'Streak Milestone',
    description: 'Triggered when a user reaches a streak milestone',
    category: 'streaks',
  },
  STREAK_BROKEN: {
    label: 'Streak Broken',
    description: 'Triggered when a user\'s streak is broken',
    category: 'streaks',
  },
  SYNC_COMPLETED: {
    label: 'Sync Completed',
    description: 'Triggered when a platform sync completes successfully',
    category: 'sync',
  },
  SYNC_FAILED: {
    label: 'Sync Failed',
    description: 'Triggered when a platform sync fails',
    category: 'sync',
  },
  SUBSCRIPTION_CHANGED: {
    label: 'Subscription Changed',
    description: 'Triggered when a user\'s subscription status changes',
    category: 'billing',
  },
};

// =============================================================================
// DELIVERY CONFIGURATION
// =============================================================================

export const DELIVERY_CONFIG: DeliveryConfig = {
  /** Request timeout in ms */
  timeout: 30000,

  /** Maximum retry attempts */
  maxRetries: 3,

  /** Delays between retries in ms */
  retryDelays: [1000, 5000, 30000, 60000, 300000],

  /** Batch size for processing */
  batchSize: 50,

  /** Concurrent deliveries */
  concurrency: 10,

  /** HTTP status codes considered success */
  successCodes: [200, 201, 202, 204],

  /** HTTP status codes to retry */
  retryOnCodes: [408, 429, 500, 502, 503, 504],
};

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

export const SECURITY_CONFIG: WebhookSecurityConfig = {
  /** Minimum webhook secret length */
  secretMinLength: 16,

  /** Maximum webhook secret length */
  secretMaxLength: 256,

  /** Signature expiry in seconds (5 minutes) */
  signatureExpiry: 300,

  /** Validate SSL certificates */
  validateSsl: IS_PRODUCTION,

  /** Blocked hosts (security) */
  blockedHosts: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    'metadata.google.internal',
    '169.254.169.254',
  ],

  /** Allowed protocols */
  allowedProtocols: ['https'],

  /** Maximum payload size in bytes (1MB) */
  maxPayloadSize: 1024 * 1024,
};

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

export const RETRY_CONFIG: RetryConfig = {
  /** Enable automatic retries */
  enabled: true,

  /** Maximum retry attempts */
  maxAttempts: 5,

  /** Initial delay in ms */
  initialDelay: 1000,

  /** Maximum delay in ms */
  maxDelay: 300000, // 5 minutes

  /** Backoff multiplier */
  backoffMultiplier: 2,

  /** HTTP statuses to retry */
  retryableStatuses: [408, 429, 500, 502, 503, 504],

  /** Error types to retry */
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EPIPE',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
  ],
};

// =============================================================================
// WEBHOOK LIMITS
// =============================================================================

export const WEBHOOK_LIMITS: WebhookLimits = {
  /** Maximum webhooks per user */
  maxWebhooksPerUser: 10,

  /** Maximum events per webhook */
  maxEventsPerWebhook: 20,

  /** Maximum deliveries per hour per webhook */
  maxDeliveriesPerHour: 1000,

  /** Maximum payload size in bytes */
  maxPayloadSize: 1024 * 1024, // 1MB

  /** Maximum URL length */
  maxUrlLength: 2048,

  /** Maximum custom headers */
  maxHeadersCount: 10,

  /** Days to keep delivery history */
  maxHistoryDays: 30,

  /** Consecutive failures before auto-disable */
  maxFailuresBeforeDisable: 10,
};

// =============================================================================
// STATUS CONFIGURATIONS
// =============================================================================

export const DELIVERY_STATUS_CONFIG: Record<WebhookDeliveryStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}> = {
  PENDING: {
    label: 'Pending',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Clock',
    description: 'Waiting to be delivered',
  },
  SUCCESS: {
    label: 'Success',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle',
    description: 'Successfully delivered',
  },
  FAILED: {
    label: 'Failed',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'XCircle',
    description: 'Delivery failed',
  },
  RETRYING: {
    label: 'Retrying',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'RefreshCw',
    description: 'Retrying delivery',
  },
};

// =============================================================================
// EVENT CATEGORIES
// =============================================================================

export const EVENT_CATEGORIES = {
  tracker: {
    label: 'Tracker',
    description: 'Tracker entry events',
    events: ['ENTRY_CREATED', 'ENTRY_UPDATED', 'ENTRY_DELETED'] as WebhookEventType[],
  },
  goals: {
    label: 'Goals',
    description: 'Goal-related events',
    events: ['GOAL_CREATED', 'GOAL_COMPLETED', 'GOAL_FAILED'] as WebhookEventType[],
  },
  achievements: {
    label: 'Achievements',
    description: 'Achievement events',
    events: ['ACHIEVEMENT_UNLOCKED'] as WebhookEventType[],
  },
  streaks: {
    label: 'Streaks',
    description: 'Streak-related events',
    events: ['STREAK_MILESTONE', 'STREAK_BROKEN'] as WebhookEventType[],
  },
  sync: {
    label: 'Sync',
    description: 'Platform synchronization events',
    events: ['SYNC_COMPLETED', 'SYNC_FAILED'] as WebhookEventType[],
  },
  billing: {
    label: 'Billing',
    description: 'Subscription and billing events',
    events: ['SUBSCRIPTION_CHANGED'] as WebhookEventType[],
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get event config */
export function getEventConfig(event: WebhookEventType): WebhookEventConfig {
  return WEBHOOK_EVENT_CONFIGS[event];
}

/** Get all events */
export function getAllEvents(): WebhookEventType[] {
  return Object.keys(WEBHOOK_EVENT_CONFIGS) as WebhookEventType[];
}

/** Get events by category */
export function getEventsByCategory(category: string): WebhookEventType[] {
  return (Object.keys(WEBHOOK_EVENT_CONFIGS) as WebhookEventType[])
    .filter(event => WEBHOOK_EVENT_CONFIGS[event].category === category);
}

/** Check if URL is allowed */
export function isUrlAllowed(url: string): { allowed: boolean; reason?: string } {
  try {
    const parsed = new URL(url);

    // Check protocol
    if (!SECURITY_CONFIG.allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
      return { allowed: false, reason: 'Protocol not allowed' };
    }

    // Check for blocked hosts
    for (const blocked of SECURITY_CONFIG.blockedHosts) {
      if (parsed.hostname === blocked || parsed.hostname.includes(blocked)) {
        return { allowed: false, reason: 'Host not allowed' };
      }
    }

    // Check URL length
    if (url.length > WEBHOOK_LIMITS.maxUrlLength) {
      return { allowed: false, reason: 'URL too long' };
    }

    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'Invalid URL' };
  }
}

/** Generate webhook secret */
export function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 32;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `whsec_${result}`;
}

/** Calculate retry delay with exponential backoff */
export function calculateRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelay *
    Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/** Check if status code should retry */
export function shouldRetryStatusCode(statusCode: number): boolean {
  return RETRY_CONFIG.retryableStatuses.includes(statusCode);
}

/** Check if error should retry */
export function shouldRetryError(errorCode: string): boolean {
  return RETRY_CONFIG.retryableErrors.includes(errorCode);
}

/** Get provider config */
export function getProviderConfig(providerId: string): WebhookProviderConfig | undefined {
  return INCOMING_CONFIG.providers.find(p => p.id === providerId);
}

/** Get enabled providers */
export function getEnabledProviders(): WebhookProviderConfig[] {
  return INCOMING_CONFIG.providers.filter(p => p.enabled);
}

/** Validate webhook configuration */
export function validateWebhookConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check outgoing configuration
  if (!OUTGOING_CONFIG.enabled) {
    warnings.push('Outgoing webhooks are disabled');
  }

  // Check incoming provider secrets
  for (const provider of INCOMING_CONFIG.providers) {
    if (provider.enabled && !provider.secret && IS_PRODUCTION) {
      warnings.push(`${provider.name} webhook secret not configured`);
    }
  }

  // Check security
  if (!IS_PRODUCTION && SECURITY_CONFIG.allowedProtocols.includes('http')) {
    warnings.push('HTTP webhooks allowed (development only)');
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

export const WEBHOOK_CONFIG: WebhookConfig = {
  outgoing: OUTGOING_CONFIG,
  incoming: INCOMING_CONFIG,
  events: WEBHOOK_EVENT_CONFIGS,
  delivery: DELIVERY_CONFIG,
  security: SECURITY_CONFIG,
  retry: RETRY_CONFIG,
  limits: WEBHOOK_LIMITS,
};

export default WEBHOOK_CONFIG;