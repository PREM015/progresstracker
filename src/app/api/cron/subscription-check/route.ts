// =============================================================================
// cron/subscription-check/route.ts — Check subscription status
// SECURITY: Protected by withCronAuth
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/server/cron-auth';
import { addDays } from 'date-fns';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function _cronHandler(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const result = { subscriptionsChecked: 0, expiringSoon: 0, failedPayments: 0, downgraded: 0, remindersSent: 0 };

  try {
    const now = new Date();
    const in7Days = addDays(now, 7);

    // 1. Find subscriptions expiring in next 7 days (not cancelled)
    const expiringSubs = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        currentPeriodEnd: { gte: now, lte: in7Days },
        cancelAtPeriodEnd: false,
      },
      include: {
        user: { select: { email: true, name: true, id: true } },
      },
    });

    result.expiringSoon = expiringSubs.length;
    result.subscriptionsChecked += expiringSubs.length;

    for (const sub of expiringSubs) {
      try {
        if (sub.user.email) {
          const { emailService } = await import('@/lib/email');
          const daysLeft = Math.ceil((sub.currentPeriodEnd!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          await emailService.send({
            to: sub.user.email,
            subject: `⏰ Your subscription renews in ${daysLeft} day(s)`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <h2>Subscription Renewal Reminder</h2>
                <p>Hi ${sub.user.name || 'there'},</p>
                <p>Your <strong>${sub.tier}</strong> subscription renews on <strong>${sub.currentPeriodEnd!.toLocaleDateString()}</strong>.</p>
                <p>Make sure your payment method is up to date to avoid interruption.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Manage Billing</a>
              </div>
            `,
          });
          result.remindersSent++;
        }
      } catch (e) {
        logger.warn('Failed to send renewal reminder', { userId: sub.userId, error: String(e) });
      }
    }

    // 2. Find subscriptions with failed payments (PAST_DUE) older than grace period
    const gracePeriodDate = addDays(now, -7); // 7-day grace period
    const failedSubs = await prisma.subscription.findMany({
      where: {
        status: 'PAST_DUE',
        updatedAt: { lt: gracePeriodDate },
      },
      include: {
        user: { select: { email: true, name: true, id: true } },
      },
    });

    result.failedPayments = failedSubs.length;
    result.subscriptionsChecked += failedSubs.length;

    for (const sub of failedSubs) {
      try {
        // Downgrade to FREE after grace period
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            tier: 'FREE',
            status: 'CANCELLED',
            platformLimit: 3,
            syncFrequencyMinutes: 1440,
            exportLimitMonthly: 1,
            apiRequestsDaily: 50,
          },
        });

        result.downgraded++;

        if (sub.user.email) {
          const { emailService } = await import('@/lib/email');
          await emailService.send({
            to: sub.user.email,
            subject: '⚠️ Your subscription has been downgraded to Free',
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <h2>Subscription Downgraded</h2>
                <p>Hi ${sub.user.name || 'there'},</p>
                <p>Due to a payment failure, your subscription has been downgraded to the <strong>Free</strong> plan.</p>
                <p>To restore your previous plan, please update your payment method:</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Update Payment Method</a>
              </div>
            `,
          });
        }
      } catch (e) {
        logger.error('Failed to downgrade subscription', { userId: sub.userId }, e);
      }
    }

    // 3. Find expired trial subscriptions
    const expiredTrials = await prisma.subscription.findMany({
      where: {
        status: 'TRIALING',
        trialEnd: { lt: now },
      },
    });

    result.subscriptionsChecked += expiredTrials.length;

    for (const trial of expiredTrials) {
      try {
        await prisma.subscription.update({
          where: { id: trial.id },
          data: { status: 'CANCELLED', tier: 'FREE', platformLimit: 3, syncFrequencyMinutes: 1440, exportLimitMonthly: 1, apiRequestsDaily: 50 },
        });
        result.downgraded++;
      } catch (e) {
        logger.error('Failed to expire trial', { userId: trial.userId }, e);
      }
    }

    logger.info('Subscription check cron completed', { ...result, duration: Date.now() - startTime });

    return NextResponse.json({
      success: true,
      data: { ...result, duration: Date.now() - startTime, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    logger.error('Subscription check cron failed', {}, error);
    return NextResponse.json({ error: 'Subscription check job failed' }, { status: 500 });
  }
}

export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
