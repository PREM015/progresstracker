// src/lib/stripe.ts
/**
 * Stripe integration utilities
 * Synced with Prisma schema: Subscription, SubscriptionTier, SubscriptionStatus
 */

import Stripe from 'stripe';
import { SubscriptionTier, SubscriptionStatus, BillingInterval } from '@prisma/client';
import { logger } from './logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

// =============================================================================
// PLAN CONFIGURATION
// =============================================================================

export interface StripePlan {
  name: string;
  tier: SubscriptionTier;
  priceId: string | null;
  priceIdYearly: string | null;
  priceAmount: number; // In cents
  priceAmountYearly: number; // In cents
  features: string[];
  limits: {
    platformLimit: number;
    syncFrequencyMinutes: number;
    exportLimitMonthly: number;
    apiRequestsDaily: number;
  };
}

export const STRIPE_PLANS: Record<SubscriptionTier, StripePlan> = {
  FREE: {
    name: 'Free',
    tier: 'FREE',
    priceId: null,
    priceIdYearly: null,
    priceAmount: 0,
    priceAmountYearly: 0,
    features: [
      '5 platforms',
      '30 day history',
      'Basic analytics',
      'Email support',
    ],
    limits: {
      platformLimit: 5,
      syncFrequencyMinutes: 1440, // 24 hours
      exportLimitMonthly: 3,
      apiRequestsDaily: 100,
    },
  },
  STARTER: {
    name: 'Starter',
    tier: 'STARTER',
    priceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    priceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || null,
    priceAmount: 999, // $9.99
    priceAmountYearly: 9990, // $99.90 (2 months free)
    features: [
      '15 platforms',
      'Unlimited history',
      'Advanced analytics',
      'Priority support',
      'Export to PDF',
    ],
    limits: {
      platformLimit: 15,
      syncFrequencyMinutes: 360, // 6 hours
      exportLimitMonthly: 10,
      apiRequestsDaily: 500,
    },
  },
  PRO: {
    name: 'Pro',
    tier: 'PRO',
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    priceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || null,
    priceAmount: 1999, // $19.99
    priceAmountYearly: 19990, // $199.90 (2 months free)
    features: [
      'Unlimited platforms',
      'Unlimited history',
      'Advanced analytics',
      'Priority support',
      'API access',
      'Custom integrations',
      'Team sharing',
    ],
    limits: {
      platformLimit: 100,
      syncFrequencyMinutes: 60, // 1 hour
      exportLimitMonthly: 50,
      apiRequestsDaily: 2000,
    },
  },
  TEAM: {
    name: 'Team',
    tier: 'TEAM',
    priceId: process.env.STRIPE_TEAM_PRICE_ID || null,
    priceIdYearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || null,
    priceAmount: 4999, // $49.99
    priceAmountYearly: 49990, // $499.90
    features: [
      'Everything in Pro',
      'Team management',
      'Shared dashboards',
      'Admin controls',
      'SSO integration',
      'Dedicated support',
    ],
    limits: {
      platformLimit: 200,
      syncFrequencyMinutes: 30,
      exportLimitMonthly: 100,
      apiRequestsDaily: 5000,
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    tier: 'ENTERPRISE',
    priceId: null, // Custom pricing
    priceIdYearly: null,
    priceAmount: 0,
    priceAmountYearly: 0,
    features: [
      'Everything in Team',
      'Custom limits',
      'On-premise option',
      'SLA guarantee',
      'Custom integrations',
      'Dedicated account manager',
    ],
    limits: {
      platformLimit: 1000,
      syncFrequencyMinutes: 15,
      exportLimitMonthly: 1000,
      apiRequestsDaily: 50000,
    },
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get plan by tier
 */
export function getPlan(tier: SubscriptionTier): StripePlan {
  return STRIPE_PLANS[tier];
}

/**
 * Get plan by price ID
 */
export function getPlanByPriceId(priceId: string): StripePlan | undefined {
  return Object.values(STRIPE_PLANS).find(
    (plan) => plan.priceId === priceId || plan.priceIdYearly === priceId
  );
}

/**
 * Map Stripe subscription status to our status
 */
export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: 'ACTIVE',
    trialing: 'TRIALING',
    past_due: 'PAST_DUE',
    canceled: 'CANCELLED',
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'INCOMPLETE_EXPIRED',
    paused: 'PAUSED',
    unpaid: 'UNPAID',
  };

  return statusMap[status] || 'INCOMPLETE';
}

/**
 * Get billing interval from Stripe price
 */
export function getBillingInterval(price: Stripe.Price): BillingInterval {
  if (!price.recurring) {
    return 'LIFETIME';
  }

  switch (price.recurring.interval) {
    case 'month':
      return 'MONTHLY';
    case 'year':
      return 'YEARLY';
    default:
      return 'MONTHLY';
  }
}

// =============================================================================
// STRIPE OPERATIONS
// =============================================================================

/**
 * Create a Stripe customer
 */
export async function createCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  const startTime = Date.now();

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    logger.info('Stripe customer created', {
      customerId: customer.id,
      email,
      duration: Date.now() - startTime,
    });

    return customer;
  } catch (error) {
    logger.error('Failed to create Stripe customer', { email }, error);
    throw error;
  }
}

/**
 * Create a checkout session
 */
export async function createCheckoutSession(options: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<Stripe.Checkout.Session> {
  const startTime = Date.now();

  try {
    const session = await stripe.checkout.sessions.create({
      customer: options.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: options.priceId,
          quantity: 1,
        },
      ],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      subscription_data: options.trialDays
        ? { trial_period_days: options.trialDays }
        : undefined,
      metadata: options.metadata,
    }, {
      idempotencyKey: options.idempotencyKey
    });

    logger.info('Checkout session created', {
      sessionId: session.id,
      customerId: options.customerId,
      duration: Date.now() - startTime,
    });

    return session;
  } catch (error) {
    logger.error('Failed to create checkout session', { customerId: options.customerId }, error);
    throw error;
  }
}

/**
 * Create a customer portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const startTime = Date.now();

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    logger.info('Portal session created', {
      sessionId: session.id,
      customerId,
      duration: Date.now() - startTime,
    });

    return session;
  } catch (error) {
    logger.error('Failed to create portal session', { customerId }, error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  const startTime = Date.now();

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    logger.info('Subscription cancelled', {
      subscriptionId,
      cancelAtPeriodEnd,
      duration: Date.now() - startTime,
    });

    return subscription;
  } catch (error) {
    logger.error('Failed to cancel subscription', { subscriptionId }, error);
    throw error;
  }
}

/**
 * Resume a cancelled subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const startTime = Date.now();

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    logger.info('Subscription resumed', {
      subscriptionId,
      duration: Date.now() - startTime,
    });

    return subscription;
  } catch (error) {
    logger.error('Failed to resume subscription', { subscriptionId }, error);
    throw error;
  }
}

/**
 * Get subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    if ((error as Stripe.StripeRawError).code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

/**
 * Get invoices for a customer
 */
export async function getInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data;
}

/**
 * Construct webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type StripePlanKey = keyof typeof STRIPE_PLANS;

export default stripe;