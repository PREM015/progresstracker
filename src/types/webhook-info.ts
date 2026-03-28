// src/types/webhook-info.ts
// Webhook configuration types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type WebhookStatus = 'active' | 'inactive' | 'suspended' | 'error';
export type WebhookEvent =
  | 'tracker.created'
  | 'tracker.updated'
  | 'goal.created'
  | 'goal.completed'
  | 'goal.updated'
  | 'achievement.unlocked'
  | 'streak.updated'
  | 'streak.broken'
  | 'platform.synced'
  | 'platform.connected'
  | 'platform.disconnected'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'user.updated';

export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = [
  'tracker.created', 'tracker.updated',
  'goal.created', 'goal.completed', 'goal.updated',
  'achievement.unlocked',
  'streak.updated', 'streak.broken',
  'platform.synced', 'platform.connected', 'platform.disconnected',
  'subscription.created', 'subscription.updated', 'subscription.cancelled',
  'payment.succeeded', 'payment.failed',
  'user.updated',
];

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Webhook endpoint record (matches Prisma Webhook model) */
export interface WebhookInfo {
  id: string;
  userId: string;
  name: string;
  url: string;
  secret: string; // HMAC secret
  events: WebhookEvent[];
  status: WebhookStatus;
  isVerified: boolean;
  retryCount: number;
  maxRetries: number;
  timeoutMs: number;
  lastTriggeredAt?: Date | null;
  lastSuccessAt?: Date | null;
  lastFailureAt?: Date | null;
  successCount: number;
  failureCount: number;
  metadata?: Record<string, unknown> | null;
  headers?: Record<string, string> | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateWebhookInput {
  name: string;
  url: string;
  events: WebhookEvent[];
  timeoutMs?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

export interface UpdateWebhookInput extends Partial<CreateWebhookInput> {
  status?: WebhookStatus;
}

export interface TestWebhookInput {
  webhookId: string;
  event: WebhookEvent;
  payload?: Record<string, unknown>;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface WebhookListResponse {
  webhooks: WebhookInfo[];
  total: number;
  activeCount: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getWebhookHealthScore(wh: Pick<WebhookInfo, 'successCount' | 'failureCount'>): number {
  const total = wh.successCount + wh.failureCount;
  if (total === 0) return 100;
  return Math.round((wh.successCount / total) * 100);
}

export default WebhookInfo;
