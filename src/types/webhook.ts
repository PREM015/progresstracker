// ============================================================================
// FILE: types/webhook.ts
// PURPOSE: Webhook-related type definitions
// ============================================================================

import type { Platform } from './platform';
import type { SyncStatus, SyncResult } from './sync';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Webhook provider */
export type WebhookProvider = 
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'stripe'
  | 'custom';

/** Webhook event type */
export type WebhookEventType = 
  // GitHub events
  | 'github:push'
  | 'github:pull_request'
  | 'github:issues'
  | 'github:commit_comment'
  | 'github:release'
  | 'github:repository'
  | 'github:star'
  | 'github:fork'
  // GitLab events
  | 'gitlab:push'
  | 'gitlab:merge_request'
  | 'gitlab:issue'
  | 'gitlab:note'
  | 'gitlab:pipeline'
  | 'gitlab:release'
  // Bitbucket events
  | 'bitbucket:repo:push'
  | 'bitbucket:pullrequest:created'
  | 'bitbucket:pullrequest:updated'
  | 'bitbucket:issue:created'
  | 'bitbucket:issue:updated'
  // Stripe events
  | 'stripe:payment_intent.succeeded'
  | 'stripe:payment_intent.failed'
  | 'stripe:subscription.created'
  | 'stripe:subscription.updated'
  | 'stripe:subscription.deleted'
  | 'stripe:customer.created'
  | 'stripe:invoice.paid'
  | 'stripe:invoice.payment_failed'
  // Custom events
  | 'custom:sync'
  | 'custom:data_update';

/** Webhook status */
export type WebhookStatus = 
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'retrying'
  | 'ignored'
  | 'expired';

/** Signature algorithm */
export type SignatureAlgorithm = 
  | 'sha1'
  | 'sha256'
  | 'sha512'
  | 'hmac-sha1'
  | 'hmac-sha256'
  | 'hmac-sha512';

/** Webhook action */
export type WebhookAction = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'opened'
  | 'closed'
  | 'reopened'
  | 'merged'
  | 'pushed'
  | 'commented'
  | 'reviewed'
  | 'labeled'
  | 'assigned'
  | 'unassigned';

/** Webhook delivery status */
export type WebhookDeliveryStatus = 
  | 'pending'
  | 'delivered'
  | 'failed'
  | 'retry';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Webhook configuration */
export interface Webhook {
  id: string;
  userId?: string;
  platformId?: string;
  
  // Provider info
  provider: WebhookProvider;
  providerWebhookId?: string; // ID on the provider's side
  
  // Endpoint
  url: string;
  secret?: string;
  
  // Events
  events: string[];
  isActive: boolean;
  
  // Verification
  signatureHeader?: string;
  signatureAlgorithm?: SignatureAlgorithm;
  
  // Stats
  deliveryCount: number;
  failureCount: number;
  lastDeliveredAt?: Date | null;
  lastFailedAt?: Date | null;
  
  // Rate limiting
  rateLimit?: number;
  rateLimitWindow?: number;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Webhook event (incoming) */
export interface WebhookEvent {
  id: string;
  webhookId?: string;
  
  // Provider & Event
  provider: WebhookProvider;
  eventType: string;
  action?: WebhookAction;
  
  // Headers
  headers: Record<string, string>;
  
  // Payload
  payload: WebhookPayload;
  rawPayload?: string;
  
  // Signature
  signature?: string;
  signatureValid?: boolean;
  
  // Processing
  status: WebhookStatus;
  attempts: number;
  lastAttemptAt?: Date | null;
  nextRetryAt?: Date | null;
  
  // Result
  result?: WebhookResult;
  error?: string;
  
  // Tracking
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamps
  receivedAt: Date;
  processedAt?: Date | null;
}

/** Webhook payload (varies by provider) */
export interface WebhookPayload {
  platform: WebhookProvider;
  event: string;
  data: any;
  signature?: string;
  timestamp?: string;
  
  // Common fields
  repository?: {
    id: number | string;
    name: string;
    full_name: string;
    owner?: {
      login?: string;
      id?: number | string;
    };
  };
  
  sender?: {
    login?: string;
    id?: number | string;
    type?: string;
  };
  
  action?: string;
  ref?: string;
  before?: string;
  after?: string;
}

/** GitHub webhook payload */
export interface GitHubWebhookPayload extends WebhookPayload {
  platform: 'github';
  
  // GitHub-specific fields
  repository?: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
      id: number;
      type: string;
    };
  };
  
  sender?: {
    login: string;
    id: number;
    type: string;
    avatar_url?: string;
  };
  
  // Event-specific data
  commits?: Array<{
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
      username?: string;
    };
  }>;
  
  pull_request?: {
    id: number;
    number: number;
    title: string;
    state: string;
    merged: boolean;
  };
  
  issue?: {
    id: number;
    number: number;
    title: string;
    state: string;
  };
}

/** GitLab webhook payload */
export interface GitLabWebhookPayload extends WebhookPayload {
  platform: 'gitlab';
  object_kind: string;
  
  // GitLab-specific fields
  project?: {
    id: number;
    name: string;
    path_with_namespace: string;
    visibility_level: number;
  };
  
  user?: {
    id: number;
    name: string;
    username: string;
    email?: string;
  };
  
  // Event-specific data
  commits?: Array<{
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
    };
  }>;
  
  merge_request?: {
    id: number;
    iid: number;
    title: string;
    state: string;
    merged: boolean;
  };
}

/** Bitbucket webhook payload */
export interface BitbucketWebhookPayload extends WebhookPayload {
  platform: 'bitbucket';
  
  // Bitbucket-specific fields
  repository?: {
    uuid: string;
    name: string;
    full_name: string;
    is_private: boolean;
  };
  
  actor?: {
    display_name: string;
    username: string;
    uuid: string;
  };
  
  // Event-specific data
  push?: {
    changes: Array<{
      created: boolean;
      closed: boolean;
      commits: Array<{
        hash: string;
        message: string;
        date: string;
        author: {
          raw: string;
          user?: {
            username: string;
            display_name: string;
          };
        };
      }>;
    }>;
  };
  
  pullrequest?: {
    id: number;
    title: string;
    state: string;
    merged: boolean;
  };
}

/** Stripe webhook payload */
export interface StripeWebhookPayload extends WebhookPayload {
  platform: 'stripe';
  
  // Stripe-specific fields
  id: string;
  object: string;
  api_version: string;
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: string;
  
  // Event data
  data: {
    object: any; // Varies by event type
    previous_attributes?: any;
  };
}

/** Webhook signature verification */
export interface WebhookSignature {
  header: string;
  algorithm: SignatureAlgorithm;
  secret: string;
  payload: string;
  isValid?: boolean;
  computedSignature?: string;
  providedSignature?: string;
}

/** Webhook log entry */
export interface WebhookLog {
  id: string;
  webhookId?: string;
  eventId: string;
  
  // Event info
  provider: WebhookProvider;
  eventType: string;
  
  // Processing
  status: WebhookStatus;
  statusCode?: number;
  duration: number; // milliseconds
  
  // Request/Response
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: any;
  };
  
  response?: {
    status: number;
    headers: Record<string, string>;
    body: any;
  };
  
  // Error
  error?: string;
  errorStack?: string;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  
  createdAt: Date;
}

/** Webhook processing result */
export interface WebhookResult {
  success: boolean;
  message: string;
  syncTriggered?: boolean;
  syncLogId?: string;
  dataProcessed?: any;
  error?: string;
}

/** Webhook provider configuration */
export interface WebhookConfig {
  provider: WebhookProvider;
  
  // Endpoints
  webhookUrl: string;
  apiUrl?: string;
  
  // Authentication
  signatureHeader: string;
  signatureAlgorithm: SignatureAlgorithm;
  secretKey?: string;
  
  // Events
  supportedEvents: string[];
  requiredEvents?: string[];
  
  // Verification
  verifySignature: boolean;
  verifyTimestamp?: boolean;
  timestampTolerance?: number; // seconds
  
  // Processing
  processAsync: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
  retryDelay: number; // milliseconds
  
  // Rate limiting
  rateLimit?: number;
  rateLimitWindow?: number; // seconds
  
  // Features
  supportsBatching?: boolean;
  supportsFiltering?: boolean;
  supportsReplay?: boolean;
}

/** Webhook statistics */
export interface WebhookStats {
  // Overview
  totalWebhooks: number;
  activeWebhooks: number;
  totalEvents: number;
  successRate: number;
  
  // By provider
  byProvider: Record<WebhookProvider, {
    count: number;
    events: number;
    successRate: number;
  }>;
  
  // By status
  byStatus: Record<WebhookStatus, number>;
  
  // Timeline
  eventsToday: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  
  eventsByDay: Array<{
    date: string;
    count: number;
    success: number;
    failed: number;
  }>;
  
  // Performance
  avgProcessingTime: number; // milliseconds
  p95ProcessingTime: number;
  p99ProcessingTime: number;
  
  // Recent events
  recentEvents: WebhookEvent[];
  recentFailures: WebhookEvent[];
}

/** Webhook health status */
export interface WebhookHealth {
  webhookId: string;
  provider: WebhookProvider;
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  // Metrics
  successRate: number;
  avgResponseTime: number;
  failureCount: number;
  consecutiveFailures: number;
  
  // Last activity
  lastSuccessAt?: Date | null;
  lastFailureAt?: Date | null;
  lastError?: string;
  
  // Recommendations
  recommendations?: string[];
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Register webhook input */
export interface RegisterWebhookInput {
  provider: WebhookProvider;
  url: string;
  secret?: string;
  events: string[];
  platformId?: string;
  metadata?: Record<string, unknown>;
}

/** Update webhook input */
export interface UpdateWebhookInput {
  url?: string;
  secret?: string;
  events?: string[];
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

/** Process webhook input */
export interface ProcessWebhookInput {
  provider: WebhookProvider;
  headers: Record<string, string>;
  body: any;
  signature?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** Verify signature input */
export interface VerifySignatureInput {
  provider: WebhookProvider;
  payload: string;
  signature: string;
  secret: string;
  algorithm?: SignatureAlgorithm;
}

/** Test webhook input */
export interface TestWebhookInput {
  webhookId: string;
  eventType?: string;
  payload?: any;
}

/** Replay webhook input */
export interface ReplayWebhookInput {
  eventId: string;
  webhookId?: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Webhook response */
export interface WebhookResponse {
  success: boolean;
  webhook?: Webhook;
  message?: string;
  error?: string;
}

/** Register webhook response */
export interface RegisterWebhookResponse {
  success: boolean;
  webhook?: Webhook;
  webhookUrl?: string;
  verificationToken?: string;
  error?: string;
}

/** Process webhook response */
export interface ProcessWebhookResponse {
  success: boolean;
  eventId?: string;
  status: WebhookStatus;
  result?: WebhookResult;
  error?: string;
}

/** Webhook list response */
export interface WebhookListResponse {
  success: boolean;
  webhooks: Webhook[];
  total: number;
  error?: string;
}

/** Webhook events response */
export interface WebhookEventsResponse {
  success: boolean;
  events: WebhookEvent[];
  total: number;
  error?: string;
}

/** Webhook stats response */
export interface WebhookStatsResponse {
  success: boolean;
  stats: WebhookStats;
  error?: string;
}

/** Webhook health response */
export interface WebhookHealthResponse {
  success: boolean;
  health: WebhookHealth[];
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  error?: string;
}

/** Test webhook response */
export interface TestWebhookResponse {
  success: boolean;
  delivered: boolean;
  response?: any;
  duration?: number;
  error?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Webhook provider configuration */
export const WEBHOOK_PROVIDER_CONFIG: Record<WebhookProvider, WebhookConfig> = {
  github: {
    provider: 'github',
    webhookUrl: '/api/webhooks/github',
    apiUrl: 'https://api.github.com',
    signatureHeader: 'X-Hub-Signature-256',
    signatureAlgorithm: 'hmac-sha256',
    supportedEvents: [
      'push',
      'pull_request',
      'issues',
      'commit_comment',
      'release',
      'repository',
      'star',
      'fork',
    ],
    verifySignature: true,
    verifyTimestamp: false,
    processAsync: true,
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 1000,
  },
  gitlab: {
    provider: 'gitlab',
    webhookUrl: '/api/webhooks/gitlab',
    apiUrl: 'https://gitlab.com/api/v4',
    signatureHeader: 'X-Gitlab-Token',
    signatureAlgorithm: 'sha256',
    supportedEvents: [
      'push_events',
      'merge_requests_events',
      'issues_events',
      'note_events',
      'pipeline_events',
      'release_events',
    ],
    verifySignature: true,
    verifyTimestamp: false,
    processAsync: true,
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 1000,
  },
  bitbucket: {
    provider: 'bitbucket',
    webhookUrl: '/api/webhooks/bitbucket',
    apiUrl: 'https://api.bitbucket.org/2.0',
    signatureHeader: 'X-Hub-Signature',
    signatureAlgorithm: 'hmac-sha256',
    supportedEvents: [
      'repo:push',
      'pullrequest:created',
      'pullrequest:updated',
      'issue:created',
      'issue:updated',
    ],
    verifySignature: true,
    verifyTimestamp: false,
    processAsync: true,
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 1000,
  },
  stripe: {
    provider: 'stripe',
    webhookUrl: '/api/webhooks/stripe',
    apiUrl: 'https://api.stripe.com',
    signatureHeader: 'Stripe-Signature',
    signatureAlgorithm: 'hmac-sha256',
    supportedEvents: [
      'payment_intent.succeeded',
      'payment_intent.failed',
      'subscription.created',
      'subscription.updated',
      'subscription.deleted',
      'customer.created',
      'invoice.paid',
      'invoice.payment_failed',
    ],
    verifySignature: true,
    verifyTimestamp: true,
    timestampTolerance: 300, // 5 minutes
    processAsync: false,
    retryOnFailure: false,
    maxRetries: 0,
    retryDelay: 0,
  },
  custom: {
    provider: 'custom',
    webhookUrl: '/api/webhooks/custom',
    signatureHeader: 'X-Webhook-Signature',
    signatureAlgorithm: 'sha256',
    supportedEvents: ['sync', 'data_update'],
    verifySignature: false,
    processAsync: true,
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 1000,
  },
};

/** Webhook status configuration */
export const WEBHOOK_STATUS_CONFIG: Record<WebhookStatus, {
  label: string;
  color: string;
  icon: string;
  isTerminal: boolean;
}> = {
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    icon: 'Clock',
    isTerminal: false,
  },
  processing: {
    label: 'Processing',
    color: '#3B82F6',
    icon: 'Loader',
    isTerminal: false,
  },
  success: {
    label: 'Success',
    color: '#10B981',
    icon: 'CheckCircle',
    isTerminal: true,
  },
  failed: {
    label: 'Failed',
    color: '#EF4444',
    icon: 'XCircle',
    isTerminal: true,
  },
  retrying: {
    label: 'Retrying',
    color: '#8B5CF6',
    icon: 'RefreshCw',
    isTerminal: false,
  },
  ignored: {
    label: 'Ignored',
    color: '#6B7280',
    icon: 'Slash',
    isTerminal: true,
  },
  expired: {
    label: 'Expired',
    color: '#6B7280',
    icon: 'Clock',
    isTerminal: true,
  },
};

/** Supported events by provider */
export const WEBHOOK_EVENTS: Record<WebhookProvider, string[]> = {
  github: [
    'push',
    'pull_request',
    'issues',
    'commit_comment',
    'release',
    'repository',
    'star',
    'fork',
  ],
  gitlab: [
    'push',
    'merge_request',
    'issue',
    'note',
    'pipeline',
    'release',
  ],
  bitbucket: [
    'repo:push',
    'pullrequest:created',
    'pullrequest:updated',
    'issue:created',
    'issue:updated',
  ],
  stripe: [
    'payment_intent.succeeded',
    'payment_intent.failed',
    'subscription.created',
    'subscription.updated',
    'subscription.deleted',
    'customer.created',
    'invoice.paid',
    'invoice.payment_failed',
  ],
  custom: [
    'sync',
    'data_update',
  ],
};

// =============================================================================
// CONSTANTS
// =============================================================================

/** Max payload size (10MB) */
export const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024;

/** Default timeout (30 seconds) */
export const DEFAULT_WEBHOOK_TIMEOUT = 30000;

/** Max retries */
export const MAX_WEBHOOK_RETRIES = 5;

/** Retry delays (exponential backoff) */
export const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

/** Signature tolerance (5 minutes) */
export const SIGNATURE_TOLERANCE = 300;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get webhook provider config */
export function getWebhookProviderConfig(provider: WebhookProvider): WebhookConfig {
  return WEBHOOK_PROVIDER_CONFIG[provider];
}

/** Get webhook status config */
export function getWebhookStatusConfig(status: WebhookStatus) {
  return WEBHOOK_STATUS_CONFIG[status];
}

/** Check if event is supported */
export function isEventSupported(provider: WebhookProvider, event: string): boolean {
  return WEBHOOK_EVENTS[provider]?.includes(event) ?? false;
}

/** Generate webhook secret */
export function generateWebhookSecret(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

/** Generate webhook URL */
export function generateWebhookUrl(provider: WebhookProvider, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
  const config = WEBHOOK_PROVIDER_CONFIG[provider];
  return `${base}${config.webhookUrl}`;
}

/** Parse webhook event type */
export function parseWebhookEventType(provider: WebhookProvider, event: string): WebhookEventType {
  return `${provider}:${event}` as WebhookEventType;
}

/** Verify webhook signature */
export async function verifyWebhookSignature(input: VerifySignatureInput): Promise<boolean> {
  const config = WEBHOOK_PROVIDER_CONFIG[input.provider];
  const algorithm = input.algorithm || config.signatureAlgorithm;
  
  try {
    if (algorithm.startsWith('hmac-')) {
      const crypto = await import('crypto');
      const hash = algorithm.replace('hmac-', '');
      const computedSignature = crypto
        .createHmac(hash, input.secret)
        .update(input.payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(input.signature),
        Buffer.from(computedSignature)
      );
    }
    
    // For non-HMAC algorithms
    const crypto = await import('crypto');
    const hash = crypto.createHash(algorithm);
    hash.update(input.payload);
    const computedSignature = hash.digest('hex');
    
    return computedSignature === input.signature;
  } catch (error) {
    return false;
  }
}

/** Calculate retry delay */
export function calculateRetryDelay(attempt: number): number {
  if (attempt <= 0) return 0;
  if (attempt > RETRY_DELAYS.length) {
    return RETRY_DELAYS[RETRY_DELAYS.length - 1];
  }
  return RETRY_DELAYS[attempt - 1];
}

/** Check if status is terminal */
export function isTerminalStatus(status: WebhookStatus): boolean {
  return WEBHOOK_STATUS_CONFIG[status]?.isTerminal ?? false;
}

/** Check if webhook is healthy */
export function isWebhookHealthy(health: WebhookHealth): boolean {
  return health.status === 'healthy' && health.successRate >= 0.9;
}

/** Format webhook event for display */
export function formatWebhookEvent(event: WebhookEvent): string {
  const provider = event.provider.charAt(0).toUpperCase() + event.provider.slice(1);
  const eventType = event.eventType.replace(`${event.provider}:`, '').replace(/_/g, ' ');
  return `${provider}: ${eventType}`;
}

/** Get webhook event icon */
export function getWebhookEventIcon(eventType: string): string {
  if (eventType.includes('push')) return 'GitCommit';
  if (eventType.includes('pull') || eventType.includes('merge')) return 'GitPullRequest';
  if (eventType.includes('issue')) return 'CircleDot';
  if (eventType.includes('comment') || eventType.includes('note')) return 'MessageSquare';
  if (eventType.includes('release')) return 'Tag';
  if (eventType.includes('payment')) return 'CreditCard';
  if (eventType.includes('subscription')) return 'Calendar';
  return 'Webhook';
}

/** Parse GitHub webhook headers */
export function parseGitHubHeaders(headers: Record<string, string>): {
  event?: string;
  delivery?: string;
  signature?: string;
} {
  return {
    event: headers['x-github-event'] || headers['X-GitHub-Event'],
    delivery: headers['x-github-delivery'] || headers['X-GitHub-Delivery'],
    signature: headers['x-hub-signature-256'] || headers['X-Hub-Signature-256'],
  };
}

/** Parse GitLab webhook headers */
export function parseGitLabHeaders(headers: Record<string, string>): {
  event?: string;
  token?: string;
} {
  return {
    event: headers['x-gitlab-event'] || headers['X-Gitlab-Event'],
    token: headers['x-gitlab-token'] || headers['X-Gitlab-Token'],
  };
}

/** Parse Stripe webhook headers */
export function parseStripeHeaders(headers: Record<string, string>): {
  signature?: string;
  timestamp?: string;
} {
  const signature = headers['stripe-signature'] || headers['Stripe-Signature'];
  if (!signature) return {};
  
  const elements = signature.split(',');
  let timestamp: string | undefined;
  let sig: string | undefined;
  
  for (const element of elements) {
    const [key, value] = element.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') sig = value;
  }
  
  return { signature: sig, timestamp };
}

/** Check if webhook should be retried */
export function shouldRetryWebhook(
  status: WebhookStatus,
  attempts: number,
  maxRetries: number
): boolean {
  if (isTerminalStatus(status)) return false;
  if (status === 'success' || status === 'ignored') return false;
  return attempts < maxRetries;
}

/** Calculate webhook health score */
export function calculateWebhookHealth(
  successCount: number,
  failureCount: number,
  avgResponseTime: number
): 'healthy' | 'degraded' | 'unhealthy' {
  const total = successCount + failureCount;
  if (total === 0) return 'healthy';
  
  const successRate = successCount / total;
  
  if (successRate >= 0.95 && avgResponseTime < 1000) return 'healthy';
  if (successRate >= 0.8 || avgResponseTime < 3000) return 'degraded';
  return 'unhealthy';
}

/** Group webhook events by provider */
export function groupEventsByProvider(events: WebhookEvent[]): Record<WebhookProvider, WebhookEvent[]> {
  const grouped: Record<WebhookProvider, WebhookEvent[]> = {
    github: [],
    gitlab: [],
    bitbucket: [],
    stripe: [],
    custom: [],
  };
  
  for (const event of events) {
    if (grouped[event.provider]) {
      grouped[event.provider].push(event);
    }
  }
  
  return grouped;
}

/** Extract repository info from payload */
export function extractRepositoryInfo(payload: WebhookPayload): {
  name?: string;
  fullName?: string;
  owner?: string;
  id?: string | number;
} | null {
  if (!payload.repository) return null;
  
  return {
    name: payload.repository.name,
    fullName: payload.repository.full_name,
    owner: payload.repository.owner?.login,
    id: payload.repository.id,
  };
}

/** Check if webhook event should trigger sync */
export function shouldTriggerSync(provider: WebhookProvider, eventType: string): boolean {
  const syncTriggeringEvents: Record<WebhookProvider, string[]> = {
    github: ['push', 'pull_request', 'issues', 'commit_comment'],
    gitlab: ['push', 'merge_request', 'issue', 'note'],
    bitbucket: ['repo:push', 'pullrequest:created', 'issue:created'],
    stripe: [], // Stripe events don't trigger sync
    custom: ['sync', 'data_update'],
  };
  
  return syncTriggeringEvents[provider]?.includes(eventType) ?? false;
}

export default Webhook;