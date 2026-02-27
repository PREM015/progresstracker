/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/stripe/subscription/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SubscriptionStatus, SubscriptionTier, BillingInterval } from '@prisma/client';

// =============================================================================
// GET - Get current subscription
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized subscription access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.debug('Fetching subscription', { userId: session.user.id });

    // Get subscription
    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      include: {
        invoices: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            currency: true,
            status: true,
            invoiceDate: true,
            invoicePdfUrl: true,
          },
        },
      },
    });

    // Create free subscription if none exists
    if (!subscription) {
      logger.info('Creating free subscription', { userId: session.user.id });
      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          billingInterval: BillingInterval.MONTHLY,
          // Free tier limits
          platformLimit: 3,
          syncFrequencyMinutes: 1440, // 24 hours
          exportLimitMonthly: 1,
          apiRequestsDaily: 50,
          currentPlatformCount: 0,
          currentExportCount: 0,
          features: ['basic_tracking', 'manual_sync'],
        },
        include: {
          invoices: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    // Get current usage
    const currentPlatformCount = await prisma.userPlatform.count({
      where: { 
        userId: session.user.id,
        isActive: true,
      },
    });

    // Get export count this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const currentExportCount = await prisma.exportJob.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: startOfMonth },
        status: 'COMPLETED',
      },
    });

    logger.info('Subscription fetched', {
      userId: session.user.id,
      tier: subscription.tier,
      status: subscription.status,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        billingInterval: subscription.billingInterval,
        // Pricing
        priceAmount: subscription.priceAmount,
        currency: subscription.currency,
        // Period
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        // Trial
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        // Cancellation
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelAt: subscription.cancelAt,
        canceledAt: subscription.canceledAt,
        cancelReason: subscription.cancelReason,
        // Limits
        limits: {
          platforms: subscription.platformLimit,
          syncFrequencyMinutes: subscription.syncFrequencyMinutes,
          exportsPerMonth: subscription.exportLimitMonthly,
          apiRequestsPerDay: subscription.apiRequestsDaily,
        },
        // Current usage
        usage: {
          platforms: currentPlatformCount,
          exportsThisMonth: currentExportCount,
        },
        // Features
        features: subscription.features,
        // Recent invoices
        invoices: subscription.invoices,
        // Timestamps
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching subscription', {}, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update subscription (change plan)
// =============================================================================

export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tier, billingInterval } = body;

    // Validate tier
    if (tier && !Object.values(SubscriptionTier).includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Validate billing interval
    if (billingInterval && !Object.values(BillingInterval).includes(billingInterval)) {
      return NextResponse.json(
        { success: false, error: 'Invalid billing interval' },
        { status: 400 }
      );
    }

    logger.info('Subscription update requested', {
      userId: session.user.id,
      tier,
      billingInterval,
    });

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No subscription found' },
        { status: 404 }
      );
    }

    // If changing to paid plan, redirect to checkout
    if (tier && tier !== SubscriptionTier.FREE && subscription.tier === SubscriptionTier.FREE) {
      return NextResponse.json({
        success: true,
        requiresCheckout: true,
        message: 'Please complete checkout to upgrade',
        checkoutUrl: `/api/stripe/create-checkout?tier=${tier}&interval=${billingInterval || 'MONTHLY'}`,
      });
    }

    // If downgrading to free
    if (tier === SubscriptionTier.FREE && subscription.tier !== SubscriptionTier.FREE) {
      // Cancel at period end
      const updated = await prisma.subscription.update({
        where: { userId: session.user.id },
        data: {
          cancelAtPeriodEnd: true,
          cancelReason: 'downgrade_to_free',
          updatedAt: new Date(),
        },
      });

      logger.info('Subscription set to downgrade at period end', {
        userId: session.user.id,
        currentTier: subscription.tier,
        periodEnd: subscription.currentPeriodEnd,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Your subscription will be downgraded to Free at the end of your billing period.`,
      });
    }

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SUBSCRIPTION_CHANGE',
        category: 'billing',
        entityType: 'subscription',
        entityId: subscription.id,
        description: `Subscription change: ${subscription.tier} -> ${tier || 'no change'}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Subscription updated', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: subscription,
      message: 'Subscription updated',
    });
  } catch (error) {
    logger.error('Error updating subscription', {}, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Resume paused subscription or reactivate cancelled
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  

  try {
    const session = await getServerSession(authOptions);
console.log(startTime);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    logger.info('Subscription action requested', {
      userId: session.user.id,
      action,
    });

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No subscription found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'reactivate': {
        // Reactivate a cancelled subscription before period end
        if (!subscription.cancelAtPeriodEnd) {
          return NextResponse.json(
            { success: false, error: 'Subscription is not cancelled' },
            { status: 400 }
          );
        }

        const updated = await prisma.subscription.update({
          where: { userId: session.user.id },
          data: {
            cancelAtPeriodEnd: false,
            cancelAt: null,
            cancelReason: null,
            updatedAt: new Date(),
          },
        });

        logger.info('Subscription reactivated', { userId: session.user.id });

        return NextResponse.json({
          success: true,
          data: updated,
          message: 'Your subscription has been reactivated',
        });
      }

      case 'resume': {
        // Resume a paused subscription
        if (subscription.status !== SubscriptionStatus.PAUSED) {
          return NextResponse.json(
            { success: false, error: 'Subscription is not paused' },
            { status: 400 }
          );
        }

        const updated = await prisma.subscription.update({
          where: { userId: session.user.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            pausedAt: null,
            resumesAt: null,
            updatedAt: new Date(),
          },
        });

        logger.info('Subscription resumed', { userId: session.user.id });

        return NextResponse.json({
          success: true,
          data: updated,
          message: 'Your subscription has been resumed',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error processing subscription action', {}, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Cancel subscription
// =============================================================================

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
console.log(startTime);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const immediately = searchParams.get('immediately') === 'true';
    const reason = searchParams.get('reason');

    logger.info('Subscription cancellation requested', {
      userId: session.user.id,
      immediately,
      reason,
    });

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No subscription found' },
        { status: 404 }
      );
    }

    if (subscription.tier === SubscriptionTier.FREE) {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel free tier' },
        { status: 400 }
      );
    }

    // Store cancellation feedback
    if (reason) {
      await prisma.feedback.create({
        data: {
          userId: session.user.id,
          type: 'other',
          title: 'Subscription Cancellation Feedback',
          message: reason,
          status: 'new',
        },
      });
    }

    if (immediately) {
      // Immediate cancellation - downgrade to free
      const updated = await prisma.subscription.update({
        where: { userId: session.user.id },
        data: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.CANCELLED,
          canceledAt: new Date(),
          cancelReason: reason || 'user_cancelled',
          // Reset to free tier limits
          platformLimit: 3,
          syncFrequencyMinutes: 1440,
          exportLimitMonthly: 1,
          apiRequestsDaily: 50,
          features: ['basic_tracking', 'manual_sync'],
          updatedAt: new Date(),
        },
      });

      logger.info('Subscription cancelled immediately', { userId: session.user.id });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Your subscription has been cancelled and downgraded to Free',
      });
    } else {
      // Cancel at period end
      const updated = await prisma.subscription.update({
        where: { userId: session.user.id },
        data: {
          cancelAtPeriodEnd: true,
          cancelAt: subscription.currentPeriodEnd,
          cancelReason: reason || 'user_cancelled',
          updatedAt: new Date(),
        },
      });

      logger.info('Subscription set to cancel at period end', {
        userId: session.user.id,
        cancelAt: subscription.currentPeriodEnd,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Your subscription will be cancelled on ${subscription.currentPeriodEnd?.toLocaleDateString()}`,
      });
    }
  } catch (error) {
    logger.error('Error cancelling subscription', {}, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}