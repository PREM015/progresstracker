/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/user/delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { compare } from 'bcryptjs';
import { z } from 'zod';



// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'Please type DELETE to confirm' }),
  }),
  reason: z.string().optional(),
  feedback: z.string().optional(),
});

// =============================================================================
// GET - Get account deletion info
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized deletion info access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.debug('Fetching deletion info', { userId: session.user.id });

    // Get counts of all user data that will be deleted
    const [
      entriesCount,
      goalsCount,
      achievementsCount,
      platformsCount,
      notificationsCount,
      syncLogsCount,
      dailyStatsCount,
      streakHistoryCount,
      exportJobsCount,
      apiKeysCount,
    ] = await Promise.all([
      prisma.trackerEntry.count({ where: { userId: session.user.id } }),
      prisma.goal.count({ where: { userId: session.user.id } }),
      prisma.userAchievement.count({ where: { userId: session.user.id } }),
      prisma.userPlatform.count({ where: { userId: session.user.id } }),
      prisma.notification.count({ where: { userId: session.user.id } }),
      prisma.syncLog.count({ where: { userId: session.user.id } }),
      prisma.dailyStats.count({ where: { userId: session.user.id } }),
      prisma.streakHistory.count({ where: { userId: session.user.id } }),
      prisma.exportJob.count({ where: { userId: session.user.id } }),
      prisma.apiKey.count({ where: { userId: session.user.id } }),
    ]);

    // Check for active subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: {
        status: true,
        tier: true,
        currentPeriodEnd: true,
      },
    });

    const hasActiveSubscription = subscription?.status === 'ACTIVE' && 
      subscription.tier !== 'FREE';

    logger.info('Deletion info fetched', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        dataToBeDeleted: {
          trackerEntries: entriesCount,
          goals: goalsCount,
          achievements: achievementsCount,
          connectedPlatforms: platformsCount,
          notifications: notificationsCount,
          syncLogs: syncLogsCount,
          dailyStats: dailyStatsCount,
          streakHistory: streakHistoryCount,
          exportJobs: exportJobsCount,
          apiKeys: apiKeysCount,
        },
        subscription: hasActiveSubscription ? {
          status: subscription?.status,
          tier: subscription?.tier,
          currentPeriodEnd: subscription?.currentPeriodEnd,
          warning: 'Your active subscription will be cancelled immediately.',
        } : null,
        warnings: [
          'This action cannot be undone.',
          'All your data will be permanently deleted.',
          'Your username will become available for others.',
          hasActiveSubscription ? 'Your active subscription will be cancelled.' : null,
          'You will lose all achievements and streaks.',
          'Connected platforms will be disconnected.',
        ].filter(Boolean),
        confirmationRequired: 'DELETE',
      },
    });
  } catch (error) {
    logger.error('Error fetching deletion info', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch account info' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Delete account (soft delete first, then hard delete)
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized account deletion attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = deleteAccountSchema.parse(body);

    logger.warn('Account deletion initiated', { userId: session.user.id });

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true,
        email: true,
        password: true,
        username: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify password (if user has one)
    if (user.password) {
      const isValidPassword = await compare(validated.password, user.password);
      if (!isValidPassword) {
        logger.warn('Invalid password for account deletion', { userId: session.user.id });
        return NextResponse.json(
          { success: false, error: 'Invalid password' },
          { status: 400 }
        );
      }
    }

    // Store deletion feedback if provided
    if (validated.reason || validated.feedback) {
      await prisma.feedback.create({
        data: {
          userId: session.user.id,
          type: 'other',
          title: 'Account Deletion Feedback',
          message: `Reason: ${validated.reason || 'Not provided'}\n\nFeedback: ${validated.feedback || 'Not provided'}`,
          status: 'new',
        },
      });
    }

    // Log the action before deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ACCOUNT_DELETE',
        category: 'user',
        description: 'User initiated account deletion',
        metadata: {
          email: user.email,
          username: user.username,
          reason: validated.reason,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Cancel Stripe subscription if exists
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { stripeSubscriptionId: true },
    });

    if (subscription?.stripeSubscriptionId) {
      try {
        // Import stripe service dynamically to avoid issues if not configured
        const { stripeService } = await import('@/services/stripeService');
        await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
        logger.info('Subscription cancelled during deletion', { userId: session.user.id });
      } catch (stripeError) {
        logger.error('Failed to cancel Stripe subscription', {}, stripeError);
        // Continue with deletion even if Stripe fails
      }
    }

    // Perform soft delete first (set deletedAt, isActive = false)
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        email: `deleted_${session.user.id}@deleted.local`, // Free up email
        username: `deleted_${session.user.id}`, // Free up username
      },
    });

    // Delete user data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete in order of dependencies
      await tx.goalReminder.deleteMany({ where: { userId: session.user.id } });
      await tx.goal.deleteMany({ where: { userId: session.user.id } });
      await tx.userAchievement.deleteMany({ where: { userId: session.user.id } });
      await tx.notification.deleteMany({ where: { userId: session.user.id } });
      await tx.pushSubscription.deleteMany({ where: { userId: session.user.id } });
      await tx.trackerEntry.deleteMany({ where: { userId: session.user.id } });
      await tx.dailyStats.deleteMany({ where: { userId: session.user.id } });
      await tx.streakHistory.deleteMany({ where: { userId: session.user.id } });
      await tx.syncLog.deleteMany({ where: { userId: session.user.id } });
      await tx.userPlatform.deleteMany({ where: { userId: session.user.id } });
      await tx.customPlatform.deleteMany({ where: { userId: session.user.id } });
      await tx.exportJob.deleteMany({ where: { userId: session.user.id } });
      await tx.scheduledExport.deleteMany({ where: { userId: session.user.id } });
      await tx.apiKey.deleteMany({ where: { userId: session.user.id } });
      await tx.activeSession.deleteMany({ where: { userId: session.user.id } });
      await tx.refreshToken.deleteMany({ where: { userId: session.user.id } });
      await tx.twoFactorAuth.deleteMany({ where: { userId: session.user.id } });
      await tx.backupCode.deleteMany({ where: { userId: session.user.id } });
      await tx.passwordReset.deleteMany({ where: { userId: session.user.id } });
      await tx.emailVerification.deleteMany({ where: { userId: session.user.id } });
      await tx.emailChangeRequest.deleteMany({ where: { userId: session.user.id } });
      await tx.loginAttempt.deleteMany({ where: { userId: session.user.id } });
      await tx.userSettings.deleteMany({ where: { userId: session.user.id } });
      await tx.notificationPreferences.deleteMany({ where: { userId: session.user.id } });
      await tx.subscription.deleteMany({ where: { userId: session.user.id } });
      await tx.invoice.deleteMany({ where: { userId: session.user.id } });
      await tx.paymentMethod.deleteMany({ where: { userId: session.user.id } });
      await tx.report.deleteMany({ where: { userId: session.user.id } });
      await tx.supportTicket.deleteMany({ where: { userId: session.user.id } });
      await tx.account.deleteMany({ where: { userId: session.user.id } });
      await tx.session.deleteMany({ where: { userId: session.user.id } });
      
      // Finally delete the user
      await tx.user.delete({ where: { id: session.user.id } });
    });

    logger.info('Account deleted successfully', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully. You will be logged out.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Deletion validation error', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error deleting account', {}, error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete account' },
      { status: 500 }
    );
  }
}