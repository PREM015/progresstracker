// src/types/subscription.ts
// Subscription plan and status types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';
export type SubscriptionInterval = 'month' | 'year';
export type SubscriptionCancelReason =
  | 'too_expensive'
  | 'missing_features'
  | 'switching_product'
  | 'not_using'
  | 'other';

export const PLAN_LIMITS: Record<SubscriptionPlan, {
  maxPlatforms: number;
  maxGoals: number;
  maxApiKeys: number;
  dataRetentionDays: number;
  exportFormats: string[];
  hasPrioritySync: boolean;
  hasAdvancedAnalytics: boolean;
  hasCustomIntegrations: boolean;
  hasApiAccess: boolean;
}> = {
  free: {
    maxPlatforms: 3,
    maxGoals: 5,
    maxApiKeys: 0,
    dataRetentionDays: 30,
    exportFormats: ['csv'],
    hasPrioritySync: false,
    hasAdvancedAnalytics: false,
    hasCustomIntegrations: false,
    hasApiAccess: false,
  },
  basic: {
    maxPlatforms: 10,
    maxGoals: 20,
    maxApiKeys: 2,
    dataRetentionDays: 180,
    exportFormats: ['csv', 'json'],
    hasPrioritySync: false,
    hasAdvancedAnalytics: true,
    hasCustomIntegrations: false,
    hasApiAccess: true,
  },
  pro: {
    maxPlatforms: -1, // Unlimited
    maxGoals: -1,
    maxApiKeys: 10,
    dataRetentionDays: -1,
    exportFormats: ['csv', 'json', 'pdf'],
    hasPrioritySync: true,
    hasAdvancedAnalytics: true,
    hasCustomIntegrations: true,
    hasApiAccess: true,
  },
  enterprise: {
    maxPlatforms: -1,
    maxGoals: -1,
    maxApiKeys: -1,
    dataRetentionDays: -1,
    exportFormats: ['csv', 'json', 'pdf', 'excel'],
    hasPrioritySync: true,
    hasAdvancedAnalytics: true,
    hasCustomIntegrations: true,
    hasApiAccess: true,
  },
};

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Subscription record (matches Prisma Subscription model) */
export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  interval: SubscriptionInterval;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  stripePriceId?: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | null;
  cancelReason?: SubscriptionCancelReason | null;
  trialStart?: Date | null;
  trialEnd?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Subscription with invoice history */
export interface SubscriptionWithDetails extends Subscription {
  invoices?: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    date: Date;
    pdfUrl?: string | null;
  }>;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateSubscriptionInput {
  plan: SubscriptionPlan;
  interval: SubscriptionInterval;
  paymentMethodId?: string;
  couponCode?: string;
  trialDays?: number;
}

export interface UpdateSubscriptionInput {
  plan?: SubscriptionPlan;
  interval?: SubscriptionInterval;
  cancelAtPeriodEnd?: boolean;
}

export interface CancelSubscriptionInput {
  immediately?: boolean;
  reason?: SubscriptionCancelReason;
  feedback?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isPlanActive(subscription: Pick<Subscription, 'status'>): boolean {
  return ['active', 'trialing'].includes(subscription.status);
}

export function isSubscriptionExpiring(
  sub: Pick<Subscription, 'cancelAtPeriodEnd' | 'currentPeriodEnd'>
): boolean {
  if (!sub.cancelAtPeriodEnd) return false;
  const daysLeft = Math.ceil(
    (new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return daysLeft <= 7;
}

export function getPlanLabel(plan: SubscriptionPlan): string {
  const labels: Record<SubscriptionPlan, string> = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };
  return labels[plan];
}

export default Subscription;
