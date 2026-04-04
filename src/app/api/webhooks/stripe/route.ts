// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { stripe, constructWebhookEvent, mapStripeStatus, getBillingInterval } from '@/lib/stripe';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Stripe requires the raw body for webhook signature verification
export async function POST(request: NextRequest): Promise<NextResponse> {
  let event: Stripe.Event;

  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      logger.warn('Stripe webhook missing signature');
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    event = constructWebhookEvent(body, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid webhook';
    logger.error('Stripe webhook signature verification failed', { message });
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  logger.info('Stripe webhook received', { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(subscription);
        break;
      }
      default:
        logger.info('Unhandled Stripe event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error('Stripe webhook handler error', { type: event.type }, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ message: 'Stripe webhook endpoint is active' }, { status: 200 });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const user = await prisma.user.findFirst({
    where: { subscription: { stripeCustomerId: customerId } },
    include: { subscription: true },
  });
  if (!user) return;

  const subscription = user.subscription;
  if (!subscription) return;

  // Record invoice in DB
  const rawInvoice = invoice as any;
  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      userId: user.id,
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: typeof rawInvoice.payment_intent === 'string' ? rawInvoice.payment_intent : undefined,
      invoiceNumber: invoice.number || undefined,
      subtotal: invoice.subtotal,
      tax: rawInvoice.tax || 0,
      total: invoice.total,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      invoiceDate: new Date(invoice.created * 1000),
      invoicePdfUrl: invoice.invoice_pdf || undefined,
      hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
      billingReason: invoice.billing_reason || undefined,
    },
    update: {
      status: 'paid',
      amountPaid: invoice.amount_paid,
      invoicePdfUrl: invoice.invoice_pdf || undefined,
    },
  });

  const rawInvoice2 = invoice as any;
  const stripeSubscriptionId = typeof rawInvoice2.subscription === 'string' ? rawInvoice2.subscription : rawInvoice2.subscription?.id;
  if (stripeSubscriptionId) {
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: new Date((stripeSub as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
      },
    });
  }

  // Send invoice paid email
  try {
    const { emailService } = await import('@/lib/email');
    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } });
    if (fullUser?.email) {
      await emailService.sendInvoicePaid(fullUser.email, {
        userName: fullUser.name || 'there',
        invoiceNumber: invoice.number || invoice.id,
        invoiceDate: new Date(invoice.created * 1000).toISOString(),
        amount: `$${(invoice.total / 100).toFixed(2)}`,
        paymentMethod: 'Card',
        paymentMethodLast4: '****',
        planName: subscription.tier,
        billingPeriodStart: new Date(invoice.period_start * 1000).toISOString(),
        billingPeriodEnd: new Date(invoice.period_end * 1000).toISOString(),
        items: invoice.lines.data.map((line) => ({ description: line.description || 'Subscription', amount: `$${((line.amount) / 100).toFixed(2)}` })),
        invoiceUrl: invoice.hosted_invoice_url || '',
        nextBillingDate: new Date(invoice.period_end * 1000).toISOString(),
      });
    }
  } catch (e: any) {
    logger.warn('Failed to send invoice paid email', { error: e.message || String(e) });
  }

  logger.info('Invoice paid processed', { invoiceId: invoice.id, userId: user.id });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const user = await prisma.user.findFirst({
    where: { subscription: { stripeCustomerId: customerId } },
    include: { subscription: true },
  });
  if (!user) return;

  await prisma.subscription.update({
    where: { userId: user.id },
    data: { status: 'PAST_DUE' },
  });

  const rawInvoice3 = invoice as any;
  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      userId: user.id,
      subscriptionId: user.subscription?.id,
      stripeInvoiceId: invoice.id,
      subtotal: invoice.subtotal,
      tax: rawInvoice3.tax || 0,
      total: invoice.total,
      amountDue: invoice.amount_due,
      amountPaid: 0,
      currency: invoice.currency,
      status: 'payment_failed',
      invoiceDate: new Date(invoice.created * 1000),
    },
    update: { status: 'payment_failed' },
  });

  try {
    const { emailService } = await import('@/lib/email');
    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } });
    if (fullUser?.email) {
      await emailService.sendPaymentFailed(fullUser.email, {
        userName: fullUser.name || 'there',
        planName: user.subscription?.tier || 'Pro',
        amount: `$${(invoice.total / 100).toFixed(2)}`,
        failedAt: new Date().toISOString(),
        failureReason: 'Payment declined',
        gracePeriodEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethodLast4: '****',
      });
    }
  } catch (e: any) {
    logger.warn('Failed to send payment failed email', { error: e.message || String(e) });
  }

  logger.info('Invoice payment failed processed', { invoiceId: invoice.id, userId: user.id });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const user = await prisma.user.findFirst({
    where: { subscription: { stripeCustomerId: customerId } },
  });
  if (!user) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const { getPlanByPriceId } = await import('@/lib/stripe');
  const plan = priceId ? getPlanByPriceId(priceId) : undefined;

  await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      tier: plan?.tier || 'PRO',
      status: mapStripeStatus(subscription.status),
      billingInterval: getBillingInterval(subscription.items.data[0]?.price),
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
    },
  });

  logger.info('Subscription created', { subscriptionId: subscription.id, userId: user.id });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const user = await prisma.user.findFirst({
    where: { subscription: { stripeCustomerId: customerId } },
  });
  if (!user) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const { getPlanByPriceId } = await import('@/lib/stripe');
  const plan = priceId ? getPlanByPriceId(priceId) : undefined;

  await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      tier: plan?.tier,
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      cancelAt: (subscription as any).cancel_at ? new Date((subscription as any).cancel_at * 1000) : null,
    },
  });

  logger.info('Subscription updated', { subscriptionId: subscription.id, userId: user.id });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const user = await prisma.user.findFirst({
    where: { subscription: { stripeCustomerId: customerId } },
  });
  if (!user) return;

  await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      status: 'CANCELLED',
      tier: 'FREE',
      canceledAt: new Date(),
    },
  });

  try {
    const { emailService } = await import('@/lib/email');
    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, subscription: true } });
    if (fullUser?.email) {
      await emailService.sendSubscriptionCancelled(fullUser.email, {
        userName: fullUser.name || 'there',
        planName: fullUser.subscription?.tier || 'Pro',
        cancelledAt: new Date().toISOString(),
        accessEndsAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : new Date().toISOString(),
      });
    }
  } catch (e: any) {
    logger.warn('Failed to send subscription cancelled email', { error: e.message || String(e) });
  }

  logger.info('Subscription deleted', { subscriptionId: subscription.id, userId: user.id });
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const user = await prisma.user.findFirst({ where: { subscription: { stripeCustomerId: customerId } } });
  if (!user) return;
  logger.info('Trial will end', { subscriptionId: subscription.id, userId: user.id });
}
