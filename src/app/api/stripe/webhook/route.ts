// src/app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';
import { stripeService } from '@/services/stripeService';

// =============================================================================
// CONSTANTS & INITIALIZATION
// =============================================================================

const initializeStripe = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(secretKey, {
    maxNetworkRetries: 3,
    timeout: 30000,
  });
};

const stripe = initializeStripe();

const getWebhookSecret = (): string => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }
  return secret;
};

let webhookSecret: string;
try {
  webhookSecret = getWebhookSecret();
} catch (error) {
  if (error instanceof Error) {
    throw error;
  }
  throw new Error('Failed to initialize webhook secret');
}

const SUBSCRIPTION_STATUS_MAP: Record<
  Stripe.Subscription.Status,
  'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'PAUSED' | 'UNPAID'
> = {
  active: 'ACTIVE',
  trialing: 'TRIALING',
  past_due: 'PAST_DUE',
  canceled: 'CANCELLED',
  incomplete: 'INCOMPLETE',
  incomplete_expired: 'INCOMPLETE_EXPIRED',
  paused: 'PAUSED',
  unpaid: 'UNPAID',
};

const PRICE_TIER_MAP: Record<string, 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE'> = {
  [process.env.STRIPE_STARTER_PRICE_ID || '']: 'STARTER',
  [process.env.STRIPE_PRO_PRICE_ID || '']: 'PRO',
  [process.env.STRIPE_TEAM_PRICE_ID || '']: 'TEAM',
  [process.env.STRIPE_ENTERPRISE_PRICE_ID || '']: 'ENTERPRISE',
  [process.env.STRIPE_STARTER_YEARLY_PRICE_ID || '']: 'STARTER',
  [process.env.STRIPE_PRO_YEARLY_PRICE_ID || '']: 'PRO',
  [process.env.STRIPE_TEAM_YEARLY_PRICE_ID || '']: 'TEAM',
};

// ============================================================================
// HELPER FUNCTIONS - TYPED SAFELY
// ============================================================================

/**
 * Safe access to Invoice properties using unknown casting
 */
function getInvoicePaymentIntentId(invoice: Stripe.Invoice): string | undefined {
  const invoiceData = invoice as unknown as Record<string, unknown>;
  if (typeof invoiceData.payment_intent === 'string') {
    return invoiceData.payment_intent;
  }
  const paymentIntent = invoiceData.payment_intent as Record<string, unknown> | undefined;
  if (paymentIntent && typeof paymentIntent.id === 'string') {
    return paymentIntent.id;
  }
  return undefined;
}

/**
 * Safe access to Invoice tax
 */
function getInvoiceTaxAmount(invoice: Stripe.Invoice): number {
  const invoiceData = invoice as unknown as Record<string, unknown>;
  
  if (Array.isArray(invoiceData.total_tax_amounts)) {
    return (invoiceData.total_tax_amounts as Array<{ amount?: number }>).reduce(
      (sum, tax) => sum + (tax.amount ?? 0),
      0
    );
  }

  if (typeof invoiceData.tax === 'number') {
    return invoiceData.tax;
  }

  return 0;
}

/**
 * Create line items from invoice
 */
function createLineItems(invoice: Stripe.Invoice): Array<{
  description: string;
  amount: number;
  quantity: number;
}> {
  return invoice.lines.data.map((line) => ({
    description: line.description ?? 'N/A',
    amount: line.amount ?? 0,
    quantity: line.quantity ?? 1,
  }));
}

/**
 * Safe access to Stripe Subscription period dates
 */
function getSubscriptionPeriodDates(subscription: Stripe.Subscription): {
  start: Date;
  end: Date;
} {
  const subData = subscription as unknown as Record<string, unknown>;
  const start = new Date(((subData.current_period_start as number) ?? 0) * 1000);
  const end = new Date(((subData.current_period_end as number) ?? 0) * 1000);
  return { start, end };
}

/**
 * Determine tier from price ID
 */
function determineTierFromPrice(
  priceId: string | undefined
): 'FREE' | 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE' {
  if (!priceId) {
    return 'FREE';
  }
  return PRICE_TIER_MAP[priceId] ?? 'FREE';
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const log = logger.child({ route: 'POST /api/stripe/webhook', requestId: crypto.randomUUID() });

  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      log.warn('Missing Stripe signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      log.error('Webhook signature verification failed', { error: errorMessage });
      return NextResponse.json(
        { error: 'Invalid signature', details: 'Signature verification failed' },
        { status: 401 }
      );
    }

    log.info('Stripe webhook received', {
      eventId: event.id,
      eventType: event.type,
      timestamp: new Date(event.created * 1000).toISOString(),
    });

    const alreadyProcessed = await stripeService.isEventProcessed(event.id);
    if (alreadyProcessed) {
      log.info('Event already processed (idempotent)', { eventId: event.id });
      return NextResponse.json({
        received: true,
        status: 'already_processed',
        eventId: event.id,
      });
    }

    try {
      await handleWebhookEvent(event, log);

      await stripeService.recordPaymentEvent({
        stripeEventId: event.id,
        stripeEventType: event.type,
        eventType: 'webhook_processed',
        status: 'SUCCEEDED',
        rawData: { eventType: event.type, processedAt: new Date().toISOString() },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      log.error('Error handling webhook event', {
        eventId: event.id,
        eventType: event.type,
        error: errorMessage,
        stack: errorStack,
      });

      try {
        await stripeService.recordPaymentEvent({
          stripeEventId: event.id,
          stripeEventType: event.type,
          eventType: 'webhook_error',
          status: 'FAILED',
          rawData: {
            error: errorMessage,
            stack: errorStack,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (recordError) {
        log.error('Failed to record webhook error event', {
          originalError: errorMessage,
          recordError: recordError instanceof Error ? recordError.message : 'Unknown',
        });
      }

      return NextResponse.json(
        {
          received: true,
          status: 'error',
          message: 'Event processing failed',
          eventId: event.id,
        },
        { status: 200 }
      );
    }

    const duration = Date.now() - startTime;
    log.info('Webhook processed successfully', {
      eventId: event.id,
      eventType: event.type,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      received: true,
      status: 'processed',
      eventId: event.id,
      processingTime: `${duration}ms`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;

    log.error('Webhook handler critical error', {
      duration: `${duration}ms`,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// EVENT ROUTER
// =============================================================================

async function handleWebhookEvent(
  event: Stripe.Event,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session, event.id, log);
      break;
    }

    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCreated(subscription, event.id, log);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription, event.id, log);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription, event.id, log);
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleTrialWillEnd(subscription, log);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice, event.id, log);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice, event.id, log);
      break;
    }

    case 'invoice.created': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoiceCreated(invoice, event.id, log);
      break;
    }

    case 'invoice.finalized': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoiceFinalized(invoice, log);
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentIntentSucceeded(paymentIntent, event.id, log);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentIntentFailed(paymentIntent, event.id, log);
      break;
    }

    case 'customer.created': {
      const customer = event.data.object as Stripe.Customer;
      log.info('Customer created in Stripe', { customerId: customer.id });
      break;
    }

    case 'customer.updated': {
      const customer = event.data.object as Stripe.Customer;
      log.info('Customer updated in Stripe', { customerId: customer.id });
      break;
    }

    case 'customer.deleted': {
      const customer = event.data.object as Stripe.Customer;
      log.info('Customer deleted in Stripe', { customerId: customer.id });
      break;
    }

    default:
      log.debug('Unhandled event type received', {
        eventType: event.type,
        eventId: event.id,
      });
  }
}

// =============================================================================
// HANDLER FUNCTIONS - CHECKOUT
// =============================================================================

async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  eventId: string,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.info('Processing checkout session completion', {
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription,
      paymentStatus: session.payment_status,
    });

    const userId = session.metadata?.userId;
    if (!userId) {
      log.error('Checkout session missing userId in metadata', {
        sessionId: session.id,
      });
      throw new Error('Missing userId in checkout session metadata');
    }

    if (typeof session.customer === 'string') {
      await stripeService.linkStripeCustomer(userId, session.customer);
      log.info('Linked Stripe customer to user', {
        userId,
        customerId: session.customer,
      });
    }

    await stripeService.recordPaymentEvent({
      userId,
      stripeEventId: eventId,
      stripeEventType: 'checkout.session.completed',
      eventType: 'checkout_complete',
      status: 'SUCCEEDED',
      amount: session.amount_total ?? undefined,
      currency: session.currency ?? undefined,
      rawData: {
        sessionId: session.id,
        paymentStatus: session.payment_status,
      },
    });

    log.info('Checkout session processed successfully', { userId, sessionId: session.id });
  } catch (error) {
    log.error('Failed to handle checkout completion', {
      sessionId: session.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// =============================================================================
// HANDLER FUNCTIONS - SUBSCRIPTIONS
// =============================================================================

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  eventId: string,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.info('Processing subscription creation', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });

    const customerId = subscription.customer as string;
    const userId = await stripeService.getUserByStripeCustomerId(customerId);

    if (!userId) {
      log.error('No user found for Stripe customer', { customerId });
      throw new Error(`No user found for customer ${customerId}`);
    }

    const primaryItem = subscription.items.data[0];
    if (!primaryItem) {
      log.error('Subscription has no line items', { subscriptionId: subscription.id });
      throw new Error('Subscription has no line items');
    }

    const priceId = typeof primaryItem.price === 'string'
      ? primaryItem.price
      : primaryItem.price?.id;

    if (!priceId) {
      log.error('Cannot determine price ID from subscription item', {
        subscriptionId: subscription.id,
      });
      throw new Error('Unable to determine price ID');
    }

    const tier = determineTierFromPrice(priceId);
    const { start, end } = getSubscriptionPeriodDates(subscription);

    await stripeService.updateSubscription(userId, {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      tier,
      status: SUBSCRIPTION_STATUS_MAP[subscription.status],
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    await stripeService.recordPaymentEvent({
      userId,
      stripeEventId: eventId,
      stripeEventType: 'customer.subscription.created',
      eventType: 'subscription_created',
      status: 'SUCCEEDED',
      rawData: {
        subscriptionId: subscription.id,
        tier,
        status: subscription.status,
      },
    });

    log.info('Subscription created successfully', { userId, subscriptionId: subscription.id, tier });
  } catch (error) {
    log.error('Failed to handle subscription creation', {
      subscriptionId: subscription.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  eventId: string,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.info('Processing subscription update', {
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    const customerId = subscription.customer as string;
    const userId = await stripeService.getUserByStripeCustomerId(customerId);

    if (!userId) {
      log.error('No user found for subscription update', { customerId });
      throw new Error(`No user found for customer ${customerId}`);
    }

    const primaryItem = subscription.items.data[0];
    if (!primaryItem) {
      log.error('Subscription has no line items', { subscriptionId: subscription.id });
      throw new Error('Subscription has no line items');
    }

    const priceId = typeof primaryItem.price === 'string'
      ? primaryItem.price
      : primaryItem.price?.id;

    if (!priceId) {
      log.error('Cannot determine price ID from subscription item', {
        subscriptionId: subscription.id,
      });
      throw new Error('Unable to determine price ID');
    }

    const tier = determineTierFromPrice(priceId);
    const { start, end } = getSubscriptionPeriodDates(subscription);

    await stripeService.updateSubscription(userId, {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      tier,
      status: SUBSCRIPTION_STATUS_MAP[subscription.status],
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : undefined,
    });

    await stripeService.recordPaymentEvent({
      userId,
      stripeEventId: eventId,
      stripeEventType: 'customer.subscription.updated',
      eventType: 'subscription_updated',
      status: 'SUCCEEDED',
      rawData: {
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    log.info('Subscription updated successfully', { userId, subscriptionId: subscription.id });
  } catch (error) {
    log.error('Failed to handle subscription update', {
      subscriptionId: subscription.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  eventId: string,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.info('Processing subscription deletion', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    const customerId = subscription.customer as string;
    const userId = await stripeService.getUserByStripeCustomerId(customerId);

    if (!userId) {
      log.error('No user found for subscription deletion', { customerId });
      throw new Error(`No user found for customer ${customerId}`);
    }

    await stripeService.updateSubscription(userId, {
      status: 'CANCELLED',
      tier: 'FREE',
      canceledAt: new Date(),
    });

    await stripeService.recordPaymentEvent({
      userId,
      stripeEventId: eventId,
      stripeEventType: 'customer.subscription.deleted',
      eventType: 'subscription_cancelled',
      status: 'SUCCEEDED',
      rawData: {
        subscriptionId: subscription.id,
        canceledAt: new Date().toISOString(),
      },
    });

    log.info('Subscription cancelled successfully', { userId, subscriptionId: subscription.id });
  } catch (error) {
    log.error('Failed to handle subscription deletion', {
      subscriptionId: subscription.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.info('Processing trial ending notification', {
      subscriptionId: subscription.id,
      trialEnd: subscription.trial_end,
    });

    const customerId = subscription.customer as string;
    const userId = await stripeService.getUserByStripeCustomerId(customerId);

    if (!userId) {
      log.warn('No user found for trial ending notification', { customerId });
      return;
    }

    if (!subscription.trial_end) {
      log.warn('Trial end date not available', { subscriptionId: subscription.id });
      return;
    }

    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'BILLING_ALERT',
          priority: 'HIGH',
          title: 'Trial Ending Soon',
          message: 'Your free trial will end in 3 days. Add a payment method to continue.',
          actionUrl: '/billing',
          actionLabel: 'Manage Subscription',
          metadata: {
            subscriptionId: subscription.id,
            trialEnd: subscription.trial_end.toString(),
          },
        },
      });
      log.info('Trial ending notification created', { userId });
    } catch (notificationError) {
      log.error('Failed to create trial ending notification', {
        userId,
        error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
      });
    }
  } catch (error) {
    log.error('Failed to handle trial will end', {
      subscriptionId: subscription.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// =============================================================================
// HANDLER FUNCTIONS - INVOICES
// =============================================================================

async function handleInvoiceCreated(
  invoice: Stripe.Invoice,
  eventId: string,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.info('Processing invoice creation', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      status: invoice.status,
    });

    const customerId = invoice.customer as string;
    const userId = await stripeService.getUserByStripeCustomerId(customerId);

    if (!userId) {
      log.warn('No user found for invoice creation', { customerId });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { id: true },
    });

    const taxAmount = getInvoiceTaxAmount(invoice);
    const paymentIntentId = getInvoicePaymentIntentId(invoice);
    const lineItems = createLineItems(invoice);

    await stripeService.createInvoice(userId, {
      subscriptionId: subscription?.id,
      stripeInvoiceId: invoice.id,
      invoiceNumber: invoice.number ?? undefined,
      subtotal: invoice.subtotal ?? 0,
      tax: taxAmount,
      total: invoice.total ?? 0,
      amountDue: invoice.amount_due ?? 0,
      currency: invoice.currency ?? 'usd',
      status: invoice.status ?? 'draft',
      invoiceDate: new Date(invoice.created * 1000),
      dueDate: invoice.due_date
        ? new Date(invoice.due_date * 1000)
        : undefined,
      lineItems,
      invoicePdfUrl: invoice.invoice_pdf ?? undefined,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? undefined,
      billingReason: invoice.billing_reason ?? undefined,
      stripePaymentIntentId: paymentIntentId,
    });

    log.info('Invoice created successfully', { userId, invoiceId: invoice.id });
  } catch (error) {
    log.error('Failed to handle invoice creation', {
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

async function handleInvoiceFinalized(
  invoice: Stripe.Invoice,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.info('Processing invoice finalization', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
    });

    if (!invoice.id) {
      log.error('Invoice missing ID', { invoiceNumber: invoice.number });
      throw new Error('Invoice ID is missing');
    }

    await prisma.invoice.updateMany({
      where: { stripeInvoiceId: invoice.id },
      data: {
        invoiceNumber: invoice.number ?? '',
        invoicePdfUrl: invoice.invoice_pdf ?? null,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
        status: invoice.status ?? 'open',
        updatedAt: new Date(),
      },
    });

    log.info('Invoice finalized successfully', { invoiceId: invoice.id });
  } catch (error) {
    log.error('Failed to handle invoice finalization', {
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  eventId: string,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.info('Processing invoice payment', {
      invoiceId: invoice.id,
      amountPaid: invoice.amount_paid,
    });

    const customerId = invoice.customer as string;
    const userId = await stripeService.getUserByStripeCustomerId(customerId);

    if (!userId) {
      log.error('No user found for paid invoice', { customerId });
      throw new Error(`No user found for customer ${customerId}`);
    }

    await stripeService.updateInvoiceStatus(
      invoice.id,
      'paid',
      new Date(),
      invoice.amount_paid
    );

    const paymentIntentId = getInvoicePaymentIntentId(invoice);

    await prisma.subscription.updateMany({
      where: { userId },
      data: {
        lastPaymentAt: new Date(),
        lastPaymentAmount: invoice.amount_paid ?? 0,
        status: 'ACTIVE',
      },
    });

    await stripeService.recordPaymentEvent({
      userId,
      stripeEventId: eventId,
      stripeEventType: 'invoice.payment_succeeded',
      eventType: 'payment_succeeded',
      status: 'SUCCEEDED',
      amount: invoice.amount_paid ?? 0,
      currency: invoice.currency ?? 'usd',
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: paymentIntentId,
      rawData: {
        invoiceNumber: invoice.number,
        amountPaid: invoice.amount_paid,
      },
    });

    log.info('Invoice payment processed successfully', {
      userId,
      invoiceId: invoice.id,
      amountPaid: invoice.amount_paid,
    });
  } catch (error) {
    log.error('Failed to handle invoice payment', {
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  eventId: string,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.warn('Processing failed invoice payment', {
      invoiceId: invoice.id,
      attemptCount: invoice.attempt_count,
    });

    const customerId = invoice.customer as string;
    const userId = await stripeService.getUserByStripeCustomerId(customerId);

    if (!userId) {
      log.error('No user found for failed invoice payment', { customerId });
      throw new Error(`No user found for customer ${customerId}`);
    }

    await stripeService.updateInvoiceStatus(invoice.id, 'open');

    await stripeService.updateSubscription(userId, {
      status: 'PAST_DUE',
    });

    const paymentIntentId = getInvoicePaymentIntentId(invoice);

    await stripeService.recordPaymentEvent({
      userId,
      stripeEventId: eventId,
      stripeEventType: 'invoice.payment_failed',
      eventType: 'payment_failed',
      status: 'FAILED',
      amount: invoice.amount_due ?? 0,
      currency: invoice.currency ?? 'usd',
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: paymentIntentId,
      failureMessage: 'Payment method declined or expired',
      rawData: {
        invoiceNumber: invoice.number,
        attemptCount: invoice.attempt_count,
      },
    });

    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'BILLING_ALERT',
          priority: 'URGENT',
          title: 'Payment Failed',
          message: 'We couldn\'t process your payment. Please update your payment method.',
          actionUrl: '/billing',
          actionLabel: 'Update Payment',
          metadata: {
            invoiceId: invoice.id,
            amountDue: invoice.amount_due,
          },
        },
      });
      log.info('Payment failure notification created', { userId });
    } catch (notificationError) {
      log.error('Failed to create payment failure notification', {
        userId,
        error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
      });
    }

    log.warn('Invoice payment failure recorded', {
      userId,
      invoiceId: invoice.id,
    });
  } catch (error) {
    log.error('Failed to handle invoice payment failure', {
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// =============================================================================
// HANDLER FUNCTIONS - PAYMENT INTENTS
// =============================================================================

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  eventId: string,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.info('Processing successful payment intent', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    const customerId = paymentIntent.customer as string;
    if (!customerId) {
      log.warn('Payment intent missing customer ID');
      return;
    }

    const userId = await stripeService.getUserByStripeCustomerId(customerId);
    if (!userId) {
      log.warn('No user found for payment intent', { customerId });
      return;
    }

    await stripeService.recordPaymentEvent({
      userId,
      stripeEventId: eventId,
      stripeEventType: 'payment_intent.succeeded',
      eventType: 'payment_succeeded',
      status: 'SUCCEEDED',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency ?? 'usd',
      stripePaymentIntentId: paymentIntent.id,
      rawData: {
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret ? 'REDACTED' : null,
      },
    });

    log.info('Payment intent success recorded', { userId, paymentIntentId: paymentIntent.id });
  } catch (error) {
    log.error('Failed to handle payment intent success', {
      paymentIntentId: paymentIntent.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  eventId: string,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    log.warn('Processing failed payment intent', {
      paymentIntentId: paymentIntent.id,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
    });

    const customerId = paymentIntent.customer as string;
    if (!customerId) {
      log.warn('Payment intent missing customer ID');
      return;
    }

    const userId = await stripeService.getUserByStripeCustomerId(customerId);
    if (!userId) {
      log.warn('No user found for failed payment intent', { customerId });
      return;
    }

    const failureCode = paymentIntent.last_payment_error?.code ?? 'unknown_error';
    const failureMessage = paymentIntent.last_payment_error?.message ?? 'Payment failed';

    await stripeService.recordPaymentEvent({
      userId,
      stripeEventId: eventId,
      stripeEventType: 'payment_intent.payment_failed',
      eventType: 'payment_failed',
      status: 'FAILED',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency ?? 'usd',
      stripePaymentIntentId: paymentIntent.id,
      failureCode,
      failureMessage,
      rawData: {
        status: paymentIntent.status,
        lastError: {
          code: failureCode,
          message: failureMessage,
          type: paymentIntent.last_payment_error?.type,
        },
      },
    });

    log.warn('Payment intent failure recorded', {
      userId,
      paymentIntentId: paymentIntent.id,
      failureCode,
    });
  } catch (error) {
    log.error('Failed to handle payment intent failure', {
      paymentIntentId: paymentIntent.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateEnvironmentVariables(): void {
  const required = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnvironmentVariables();

// =============================================================================
// GET - Health check
// =============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'Stripe webhook endpoint is active and ready',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}