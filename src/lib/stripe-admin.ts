// src/lib/stripe-admin.ts
import Stripe from 'stripe';
import { prisma } from './prisma';
import { logger } from './logger';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

// =============================================================================
// REFUND OPERATIONS
// =============================================================================

export interface RefundOptions {
  invoiceId: string;
  amount?: number; // In cents, optional for full refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

export async function refundInvoice(options: RefundOptions) {
  const { invoiceId, amount, reason = 'requested_by_customer', metadata } = options;

  try {
    logger.info('Processing refund', { invoiceId, amount });

    // Get invoice from database
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { user: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (!invoice.stripePaymentIntentId) {
      throw new Error('No Stripe payment intent found for this invoice');
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: invoice.stripePaymentIntentId,
      amount: amount || invoice.total,
      reason,
      metadata: {
        ...metadata,
        invoiceId,
        userId: invoice.userId,
      },
    });

    // Update invoice status in database
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'void',
        voidedAt: new Date(),
      },
    });

    logger.info('Refund successful', {
      invoiceId,
      refundId: refund.id,
      amount: refund.amount,
    });

    return {
      success: true,
      refund,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    };
  } catch (error) {
    logger.error('Refund failed', { invoiceId }, error);
    throw error;
  }
}

// =============================================================================
// SUBSCRIPTION OPERATIONS
// =============================================================================

export interface CancelSubscriptionOptions {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
  reason?: string;
  feedback?: string;
}

export async function cancelSubscription(options: CancelSubscriptionOptions) {
  const { subscriptionId, cancelAtPeriodEnd = false, reason, feedback } = options;

  try {
    logger.info('Cancelling subscription', { subscriptionId, cancelAtPeriodEnd });

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new Error('No Stripe subscription ID found');
    }

    // Cancel in Stripe
    let stripeSubscription;
    if (cancelAtPeriodEnd) {
      stripeSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
          metadata: {
            cancelReason: reason || 'Admin cancelled',
            cancelFeedback: feedback || '',
          },
        }
      );
    } else {
      stripeSubscription = await stripe.subscriptions.cancel(
        subscription.stripeSubscriptionId,
        {
          prorate: true,
        }
      );
    }

    // Update database
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED',
        cancelAtPeriodEnd,
        canceledAt: cancelAtPeriodEnd ? null : new Date(),
        cancelAt: cancelAtPeriodEnd ? subscription.currentPeriodEnd : null,
        cancelReason: reason,
        cancelFeedback: feedback,
      },
    });

    logger.info('Subscription cancelled', {
      subscriptionId,
      immediate: !cancelAtPeriodEnd,
    });

    return {
      success: true,
      subscription: stripeSubscription,
      cancelAtPeriodEnd,
    };
  } catch (error) {
    logger.error('Subscription cancellation failed', { subscriptionId }, error);
    throw error;
  }
}

export interface PauseSubscriptionOptions {
  subscriptionId: string;
  resumeAt?: Date;
  behavior?: 'mark_uncollectible' | 'keep_as_draft' | 'void';
}

export async function pauseSubscription(options: PauseSubscriptionOptions) {
  const { subscriptionId, resumeAt, behavior = 'mark_uncollectible' } = options;

  try {
    logger.info('Pausing subscription', { subscriptionId, resumeAt });

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('Stripe subscription not found');
    }

    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        pause_collection: {
          behavior,
          resumes_at: resumeAt ? Math.floor(resumeAt.getTime() / 1000) : undefined,
        },
      }
    );

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        resumesAt: resumeAt,
      },
    });

    logger.info('Subscription paused', { subscriptionId });

    return {
      success: true,
      subscription: stripeSubscription,
    };
  } catch (error) {
    logger.error('Subscription pause failed', { subscriptionId }, error);
    throw error;
  }
}

export async function resumeSubscription(subscriptionId: string) {
  try {
    logger.info('Resuming subscription', { subscriptionId });

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('Stripe subscription not found');
    }

    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        pause_collection: null,
      }
    );

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
        resumesAt: null,
      },
    });

    logger.info('Subscription resumed', { subscriptionId });

    return {
      success: true,
      subscription: stripeSubscription,
    };
  } catch (error) {
    logger.error('Subscription resume failed', { subscriptionId }, error);
    throw error;
  }
}

// =============================================================================
// CUSTOMER OPERATIONS
// =============================================================================

export async function createStripeCustomer(userId: string, email: string, name?: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        userId,
      },
    });

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customer.id,
        tier: 'FREE',
        status: 'ACTIVE',
      },
      update: {
        stripeCustomerId: customer.id,
      },
    });

    return customer;
  } catch (error) {
    logger.error('Create Stripe customer failed', { userId }, error);
    throw error;
  }
}

export async function updateCustomerPaymentMethod(
  customerId: string,
  paymentMethodId: string
) {
  try {
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Update payment method failed', { customerId }, error);
    throw error;
  }
}

// =============================================================================
// INVOICE OPERATIONS
// =============================================================================

export async function voidInvoice(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice?.stripeInvoiceId) {
      throw new Error('Stripe invoice not found');
    }

    const stripeInvoice = await stripe.invoices.voidInvoice(invoice.stripeInvoiceId);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'void',
        voidedAt: new Date(),
      },
    });

    return {
      success: true,
      invoice: stripeInvoice,
    };
  } catch (error) {
    logger.error('Void invoice failed', { invoiceId }, error);
    throw error;
  }
}

export async function sendInvoiceReminder(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice?.stripeInvoiceId) {
      throw new Error('Stripe invoice not found');
    }

    await stripe.invoices.sendInvoice(invoice.stripeInvoiceId);

    return { success: true };
  } catch (error) {
    logger.error('Send invoice reminder failed', { invoiceId }, error);
    throw error;
  }
}

// =============================================================================
// ANALYTICS
// =============================================================================

export async function getStripeAnalytics(startDate: Date, endDate: Date) {
  try {
    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    });

    const refunds = await stripe.refunds.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    });

    const totalRevenue = charges.data.reduce((sum, charge) => sum + charge.amount, 0);
    const totalRefunds = refunds.data.reduce((sum, refund) => sum + refund.amount, 0);

    return {
      totalRevenue,
      totalRefunds,
      netRevenue: totalRevenue - totalRefunds,
      chargesCount: charges.data.length,
      refundsCount: refunds.data.length,
      charges: charges.data,
      refunds: refunds.data,
    };
  } catch (error) {
    logger.error('Get Stripe analytics failed', {}, error);
    throw error;
  }
}