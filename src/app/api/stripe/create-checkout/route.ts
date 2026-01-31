/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/stripe/create-checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';
import { z } from 'zod';
import type { SubscriptionTier } from '@prisma/client';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// =============================================================================
// CONFIGURATION
// =============================================================================

interface PlanConfig {
  name: string;
  priceId: string;
  yearlyPriceId?: string;
  features: string[];
}

const PLAN_CONFIG: Record<Exclude<SubscriptionTier, 'FREE'>, PlanConfig> = {
  STARTER: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID || '',
    yearlyPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    features: [
      '5 platform connections',
      'Auto-sync every 12 hours',
      'Basic analytics',
      'Email support',
    ],
  },
  PRO: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    yearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    features: [
      '15 platform connections',
      'Auto-sync every hour',
      'Advanced analytics',
      'Goal tracking',
      'API access',
      'Priority support',
    ],
  },
  TEAM: {
    name: 'Team',
    priceId: process.env.STRIPE_TEAM_PRICE_ID || '',
    yearlyPriceId: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
    features: [
      '50 platform connections',
      'Real-time sync',
      'Team dashboards',
      'Custom integrations',
      'Dedicated support',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
    features: [
      'Unlimited platforms',
      'Custom sync frequency',
      'SSO/SAML',
      'SLA guarantee',
      'Dedicated account manager',
    ],
  },
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createCheckoutSchema = z.object({
  tier: z.enum(['STARTER', 'PRO', 'TEAM', 'ENTERPRISE']),
  interval: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// =============================================================================
// GET - Get available plans
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'GET /api/stripe/create-checkout' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized plans request');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: {
        tier: true,
        status: true,
        billingInterval: true,
        currentPeriodEnd: true,
      },
    });

    // Build plans response
    const plans = Object.entries(PLAN_CONFIG).map(([tier, config]) => ({
      tier,
      name: config.name,
      features: config.features,
      hasPriceId: !!config.priceId,
      hasYearlyPriceId: !!config.yearlyPriceId,
      isCurrent: subscription?.tier === tier,
    }));

    log.info('Plans retrieved', {
      userId: session.user.id,
      currentTier: subscription?.tier,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      plans,
      currentSubscription: subscription,
    });
  } catch (error) {
    log.error(
      'Failed to get plans',
      { duration: Date.now() - startTime },
      error
    );

    return NextResponse.json(
      { success: false, error: 'Failed to get plans' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create Stripe Checkout Session
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'POST /api/stripe/create-checkout' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized checkout attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createCheckoutSchema.parse(body);

    log.info('Checkout session requested', {
      userId: session.user.id,
      tier: validated.tier,
      interval: validated.interval,
    });

    // Get plan configuration
    const planConfig = PLAN_CONFIG[validated.tier];
    if (!planConfig) {
      log.error('Invalid plan tier', { tier: validated.tier });
      return NextResponse.json(
        { success: false, error: 'Invalid plan tier' },
        { status: 400 }
      );
    }

    // Get price ID based on interval
    const priceId = validated.interval === 'YEARLY' && planConfig.yearlyPriceId
      ? planConfig.yearlyPriceId
      : planConfig.priceId;

    if (!priceId) {
      log.error('Price ID not configured', { tier: validated.tier, interval: validated.interval });
      return NextResponse.json(
        { success: false, error: 'This plan is not available' },
        { status: 400 }
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        subscription: {
          select: {
            stripeCustomerId: true,
            tier: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      log.error('User not found', { userId: session.user.id });
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already has this tier
    if (user.subscription?.tier === validated.tier && user.subscription.status === 'ACTIVE') {
      log.warn('User already has this plan', { tier: validated.tier });
      return NextResponse.json(
        { success: false, error: 'You are already subscribed to this plan' },
        { status: 400 }
      );
    }

    // Build URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const successUrl = validated.successUrl || `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = validated.cancelUrl || `${baseUrl}/checkout/cancel`;

    // Create or retrieve Stripe customer
    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      log.debug('Creating new Stripe customer', { userId: session.user.id });
      
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });
      
      customerId = customer.id;

      // Save customer ID to subscription
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: { stripeCustomerId: customerId },
        create: {
          userId: user.id,
          stripeCustomerId: customerId,
          tier: 'FREE',
          status: 'ACTIVE',
          billingInterval: 'MONTHLY',
          platformLimit: 5,
          syncFrequencyMinutes: 1440,
          exportLimitMonthly: 3,
          apiRequestsDaily: 100,
        },
      });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        tier: validated.tier,
        interval: validated.interval,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier: validated.tier,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    log.info('Checkout session created', {
      userId: session.user.id,
      sessionId: checkoutSession.id,
      tier: validated.tier,
      duration: Date.now() - startTime,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        category: 'billing',
        entityType: 'checkout_session',
        entityId: checkoutSession.id,
        description: `Created checkout session for ${validated.tier} plan`,
        status: 'success',
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn('Invalid checkout request', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Stripe.errors.StripeError) {
      log.error('Stripe error', { code: error.code }, error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment processing error',
          message: error.message,
        },
        { status: 400 }
      );
    }

    log.error(
      'Failed to create checkout session',
      { duration: Date.now() - startTime },
      error
    );

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}