// src/types/webhook-delivery.ts
// Webhook delivery attempt types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying' | 'abandoned';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Webhook delivery attempt (matches Prisma WebhookDelivery model) */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string; // WebhookEvent string
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  statusCode?: number | null;
  responseBody?: string | null;
  responseHeaders?: Record<string, string> | null;
  errorMessage?: string | null;
  durationMs?: number | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: Date | null;
  deliveredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Webhook delivery with webhook info */
export interface WebhookDeliveryWithWebhook extends WebhookDelivery {
  webhook: {
    id: string;
    name: string;
    url: string;
    userId: string;
  };
}

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

/** Webhook delivery stats for a webhook */
export interface WebhookDeliveryStats {
  webhookId: string;
  total: number;
  successful: number;
  failed: number;
  abandoned: number;
  successRate: number;
  avgDurationMs: number;
  lastDeliveryAt?: Date | null;
  byEvent: Record<string, { total: number; successful: number }>;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface RetryWebhookDeliveryInput {
  deliveryId: string;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface WebhookDeliveryQuery {
  webhookId?: string;
  status?: WebhookDeliveryStatus;
  event?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isWebhookDeliveryRetryable(
  delivery: Pick<WebhookDelivery, 'status' | 'attemptCount' | 'maxAttempts'>
): boolean {
  return delivery.status === 'failed' && delivery.attemptCount < delivery.maxAttempts;
}

export default WebhookDelivery;
