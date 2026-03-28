// src/types/payment.ts
// Payment / transaction types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'
  | 'canceled';

export type PaymentEventType =
  | 'charge.succeeded'
  | 'charge.failed'
  | 'payment_intent.created'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'charge.refunded'
  | 'charge.dispute.created';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Payment event record (matches Prisma PaymentEvent model) */
export interface PaymentEvent {
  id: string;
  userId?: string | null;
  subscriptionId?: string | null;
  stripeEventId: string;
  stripeCustomerId?: string | null;
  type: PaymentEventType;
  status: PaymentStatus;
  amount: number; // In cents
  currency: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  errorMessage?: string | null;
  processedAt?: Date | null;
  createdAt: Date;
}

/** Payment summary for user */
export interface PaymentSummary {
  totalPaid: number;
  totalRefunded: number;
  currency: string;
  lastPaymentAt?: Date | null;
  nextPaymentAt?: Date | null;
  nextPaymentAmount?: number | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface ProcessPaymentInput {
  amount: number;
  currency: string;
  paymentMethodId: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundPaymentInput {
  paymentEventId: string;
  amount?: number; // Partial refund amount in cents
  reason?: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface PaymentHistoryResponse {
  payments: PaymentEvent[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function formatAmount(amountCents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function isPaymentSuccessful(payment: Pick<PaymentEvent, 'status'>): boolean {
  return payment.status === 'succeeded';
}

export default PaymentEvent;
