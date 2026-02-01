// src/app/api/email/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    const { template, email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    let result;

    switch (template) {
      case 'welcome':
        result = await emailService.sendWelcome(email, {
          userName: 'Test User',
          email,
          onboardingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
        });
        break;

      case 'streak-at-risk':
        result = await emailService.sendStreakAtRisk(email, {
          userName: 'Test User',
          currentStreak: 15,
          hoursRemaining: 4,
          suggestedActions: [
            'Solve a quick LeetCode easy problem',
            'Make a small commit on GitHub',
          ],
        });
        break;

      case 'streak-milestone':
        result = await emailService.sendStreakMilestone(email, {
          userName: 'Test User',
          streakDays: 30,
          milestone: 30,
          nextMilestone: 50,
          totalActivities: 150,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        break;

      case 'goal-completed':
        result = await emailService.sendGoalCompleted(email, {
          userName: 'Test User',
          goalTitle: 'Solve 100 LeetCode Problems',
          goalTarget: 100,
          goalUnit: 'problems',
          completedAt: new Date().toISOString(),
          daysToComplete: 45,
          xpEarned: 500,
          achievementUnlocked: 'Century Solver',
        });
        break;

      case 'verification':
        result = await emailService.sendVerificationEmail(email, {
          userName: 'Test User',
          verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=test123`,
          expiresIn: '24 hours',
        });
        break;

      case 'password-reset':
        result = await emailService.sendPasswordResetEmail(email, {
          userName: 'Test User',
          resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=test123`,
          expiresIn: '1 hour',
        });
        break;

      default:
        result = await emailService.sendWelcome(email, {
          userName: 'Test User',
          email,
          onboardingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
        });
    }

    logger.info('Test email sent', { template, email, result });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      provider: result.provider,
      error: result.error,
    });
  } catch (error) {
    logger.error('Failed to send test email', {}, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}