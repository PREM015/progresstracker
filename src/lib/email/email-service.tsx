// src/lib/email/email-service.tsx
import { render } from '@react-email/render';
import * as React from 'react';
import { resend, emailConfig } from './email-config';
import { logger } from '@/lib/logger';

// Import all email templates
import WelcomeEmail from '@/emails/welcome';
import VerifyEmailEmail from '@/emails/verify-email';
import PasswordResetEmail from '@/emails/password-reset';
import PasswordChangedEmail from '@/emails/password-changed';
import EmailChangeRequestEmail from '@/emails/email-change-request';
import EmailChangedEmail from '@/emails/email-changed';
import LoginAlertEmail from '@/emails/login-alert';
import TwoFactorEnabledEmail from '@/emails/two-factor-enabled';
import TwoFactorDisabledEmail from '@/emails/two-factor-disabled';
import BackupCodesGeneratedEmail from '@/emails/backup-codes-generated';
import StreakAtRiskEmail from '@/emails/streak-at-risk';
import StreakBrokenEmail from '@/emails/streak-broken';
import StreakMilestoneEmail from '@/emails/streak-milestone';
import GoalReminderEmail from '@/emails/goal-reminder';
import GoalCompletedEmail from '@/emails/goal-completed';
import AchievementUnlockedEmail from '@/emails/achievement-unlocked';
import WeeklyReportEmail from '@/emails/weekly-report';
import MonthlyReportEmail from '@/emails/monthly-report';
import ReportGeneratedEmail from '@/emails/report-generated';
import SyncFailedEmail from '@/emails/sync-failed';
import MaintenanceNotificationEmail from '@/emails/maintenance-notification';
import SubscriptionCreatedEmail from '@/emails/subscription-created';
import SubscriptionCancelledEmail from '@/emails/subscription-cancelled';
import PaymentFailedEmail from '@/emails/payment-failed';
import InvoicePaidEmail from '@/emails/invoice-paid';
import AccountDeletedEmail from '@/emails/account-deleted';
import SupportTicketCreatedEmail from '@/emails/support-ticket-created';
import SupportTicketReplyEmail from '@/emails/support-ticket-reply';
import NewsletterEmail from '@/emails/newsletter';
import WaitlistWelcomeEmail from '@/emails/waitlist-welcome';

// =============================================================================
// TYPES
// =============================================================================

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react?: React.ReactElement;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

interface ResendEmailOptions {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

// =============================================================================
// EMAIL SERVICE CLASS
// =============================================================================

export class EmailService {
  private defaultFrom: string;
  private replyTo: string;

  constructor() {
    this.defaultFrom = emailConfig.from.default;
    this.replyTo = emailConfig.replyTo;
  }

  // ===========================================================================
  // CORE SEND METHOD
  // ===========================================================================

  async send(options: SendEmailOptions): Promise<EmailResult> {
    try {
      let htmlContent = options.html;
      let textContent = options.text;

      if (options.react) {
        htmlContent = await render(options.react);
        textContent = textContent || await render(options.react, { plainText: true });
      }

      if (!htmlContent) {
        throw new Error('Either html or react content must be provided');
      }

      // Build email options with proper types
      const emailOptions: ResendEmailOptions = {
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: htmlContent,
      };

      if (textContent) {
        emailOptions.text = textContent;
      }

      if (options.replyTo || this.replyTo) {
        emailOptions.replyTo = options.replyTo || this.replyTo;
      }

      const { data, error } = await resend.emails.send(emailOptions);

      if (error) {
        logger.error('Failed to send email', { error, to: options.to, subject: options.subject });
        return { success: false, error: error.message, provider: 'resend' };
      }

      logger.info('Email sent successfully', { messageId: data?.id, to: options.to, subject: options.subject });
      return { success: true, messageId: data?.id, provider: 'resend' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Email service error', { error: message, to: options.to, subject: options.subject });
      return { success: false, error: message, provider: 'resend' };
    }
  }

  // ===========================================================================
  // AUTHENTICATION EMAILS
  // ===========================================================================

  async sendWelcome(
    to: string,
    data: { userName: string; email?: string; onboardingUrl?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `Welcome to ${emailConfig.appName}! 🚀`,
      react: (
        <WelcomeEmail 
          userName={data.userName} 
          email={data.email || to} 
          onboardingUrl={data.onboardingUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`} 
        />
      ),
    });
  }

  async sendVerificationEmail(
    to: string,
    data: { userName: string; verificationUrl: string; verificationCode?: string; expiresIn?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Verify your email address',
      react: (
        <VerifyEmailEmail 
          userName={data.userName} 
          verificationUrl={data.verificationUrl} 
          verificationCode={data.verificationCode} 
          expiresIn={data.expiresIn || '24 hours'} 
        />
      ),
    });
  }

  async sendPasswordResetEmail(
    to: string,
    data: { userName: string; resetUrl: string; expiresIn?: string; ipAddress?: string; device?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Reset your password',
      react: (
        <PasswordResetEmail 
          userName={data.userName} 
          resetUrl={data.resetUrl} 
          expiresIn={data.expiresIn || '1 hour'} 
          ipAddress={data.ipAddress} 
          device={data.device} 
        />
      ),
    });
  }

  async sendPasswordChangedEmail(
    to: string,
    data: { userName: string; changedAt?: string; ipAddress?: string; device?: string; location?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Your password has been changed',
      react: (
        <PasswordChangedEmail 
          userName={data.userName} 
          changedAt={data.changedAt || new Date().toISOString()} 
          ipAddress={data.ipAddress || 'Unknown'} 
          device={data.device || 'Unknown'} 
          location={data.location} 
        />
      ),
    });
  }

  async sendEmailChangeRequest(
    to: string,
    data: { userName: string; currentEmail?: string; newEmail: string; verificationUrl: string; expiresIn?: string; requestedAt?: string; ipAddress?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Confirm your email change',
      react: (
        <EmailChangeRequestEmail 
          userName={data.userName} 
          currentEmail={data.currentEmail || to} 
          newEmail={data.newEmail} 
          verificationUrl={data.verificationUrl} 
          expiresIn={data.expiresIn || '24 hours'} 
          requestedAt={data.requestedAt || new Date().toISOString()} 
          ipAddress={data.ipAddress || 'Unknown'} 
        />
      ),
    });
  }

  async sendEmailChanged(
    to: string,
    data: { userName: string; oldEmail: string; newEmail: string; changedAt?: string; ipAddress?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Your email has been changed',
      react: (
        <EmailChangedEmail 
          userName={data.userName} 
          oldEmail={data.oldEmail} 
          newEmail={data.newEmail} 
          changedAt={data.changedAt || new Date().toISOString()} 
          ipAddress={data.ipAddress || 'Unknown'} 
        />
      ),
    });
  }

  // ===========================================================================
  // SECURITY EMAILS
  // ===========================================================================

  async sendLoginAlert(
    to: string,
    data: {
      userName: string;
      loginTime?: string;
      ipAddress?: string;
      device?: string;
      browser?: string;
      location?: string;
      isNewDevice?: boolean;
      isNewLocation?: boolean;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'New login detected',
      react: (
        <LoginAlertEmail 
          userName={data.userName} 
          loginTime={data.loginTime || new Date().toISOString()} 
          ipAddress={data.ipAddress || 'Unknown'} 
          device={data.device || 'Unknown'} 
          browser={data.browser || 'Unknown'} 
          location={data.location || 'Unknown'} 
          isNewDevice={data.isNewDevice ?? false} 
          isNewLocation={data.isNewLocation ?? false} 
        />
      ),
    });
  }

  async sendTwoFactorEnabled(
    to: string,
    data: { userName: string; enabledAt?: string; method?: string; ipAddress?: string; device?: string; backupCodesGenerated?: boolean }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Two-factor authentication enabled',
      react: (
        <TwoFactorEnabledEmail 
          userName={data.userName} 
          enabledAt={data.enabledAt || new Date().toISOString()} 
          method={(data.method as 'authenticator' | 'sms' | 'email') || 'authenticator'} 
          ipAddress={data.ipAddress} 
          device={data.device} 
          backupCodesGenerated={data.backupCodesGenerated ?? false} 
        />
      ),
    });
  }

  async sendTwoFactorDisabled(
    to: string,
    data: { userName: string; disabledAt?: string; ipAddress?: string; device?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Two-factor authentication disabled',
      react: (
        <TwoFactorDisabledEmail 
          userName={data.userName} 
          disabledAt={data.disabledAt || new Date().toISOString()} 
          ipAddress={data.ipAddress} 
          device={data.device} 
        />
      ),
    });
  }

  async sendBackupCodesGenerated(
    to: string,
    data: { userName?: string; generatedAt?: string; codesCount?: number; ipAddress?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'New backup codes generated',
      react: <BackupCodesGeneratedEmail {...data} />,
    });
  }

  // ===========================================================================
  // STREAK EMAILS
  // ===========================================================================

  async sendStreakAtRisk(
    to: string,
    data: { userName: string; currentStreak: number; hoursRemaining?: number; suggestedActions?: string[] }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `⚠️ Your ${data.currentStreak}-day streak is at risk!`,
      react: (
        <StreakAtRiskEmail 
          userName={data.userName} 
          currentStreak={data.currentStreak} 
          hoursRemaining={data.hoursRemaining || 12} 
          suggestedActions={data.suggestedActions} 
        />
      ),
    });
  }

  async sendStreakBroken(
    to: string,
    data: { userName: string; brokenStreak: number; longestStreak?: number; lastActivityDate?: string; encouragementMessage?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Your streak has ended 💔',
      react: (
        <StreakBrokenEmail 
          userName={data.userName} 
          brokenStreak={data.brokenStreak} 
          longestStreak={data.longestStreak || data.brokenStreak} 
          lastActivityDate={data.lastActivityDate || new Date(Date.now() - 86400000).toISOString()} 
          encouragementMessage={data.encouragementMessage} 
        />
      ),
    });
  }

  async sendStreakMilestone(
    to: string,
    data: { userName: string; streakDays: number; milestone: number; nextMilestone: number; totalActivities?: number; startDate?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `🎉 ${data.milestone}-day streak milestone!`,
      react: (
        <StreakMilestoneEmail 
          userName={data.userName} 
          streakDays={data.streakDays} 
          milestone={data.milestone} 
          nextMilestone={data.nextMilestone} 
          totalActivities={data.totalActivities || 0} 
          startDate={data.startDate || new Date(Date.now() - data.streakDays * 86400000).toISOString()} 
        />
      ),
    });
  }

  // ===========================================================================
  // GOAL EMAILS
  // ===========================================================================

  async sendGoalReminder(
    to: string,
    data: {
      userName: string;
      goals: Array<{
        id: string;
        title: string;
        progress: number;
        target: number;
        unit: string;
        deadline: string;
        daysRemaining: number;
      }>;
      reminderType: 'daily' | 'weekly' | 'deadline';
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: '📅 Goal Reminder',
      react: <GoalReminderEmail {...data} />,
    });
  }

  async sendGoalCompleted(
    to: string,
    data: {
      userName: string;
      goalTitle: string;
      goalTarget: number;
      goalUnit: string;
      completedAt: string;
      daysToComplete: number;
      xpEarned?: number;
      achievementUnlocked?: string;
      nextSuggestedGoal?: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `🎯 Goal completed: ${data.goalTitle}`,
      react: (
        <GoalCompletedEmail 
          userName={data.userName} 
          goalTitle={data.goalTitle} 
          goalTarget={data.goalTarget} 
          goalUnit={data.goalUnit} 
          completedAt={data.completedAt} 
          daysToComplete={data.daysToComplete} 
          xpEarned={data.xpEarned || 0} 
          achievementUnlocked={data.achievementUnlocked} 
          nextSuggestedGoal={data.nextSuggestedGoal} 
        />
      ),
    });
  }

  // ===========================================================================
  // ACHIEVEMENT EMAILS
  // ===========================================================================

  async sendAchievementUnlocked(
    to: string,
    data: {
      userName: string;
      achievementTitle: string;
      achievementDescription: string;
      achievementIcon?: string;
      tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
      pointsEarned: number;
      totalAchievements: number;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `🏆 Achievement unlocked: ${data.achievementTitle}`,
      react: <AchievementUnlockedEmail {...data} />,
    });
  }

  // ===========================================================================
  // REPORT EMAILS
  // ===========================================================================

  async sendWeeklyReport(
    to: string,
    data: {
      userName: string;
      weekNumber: number;
      year: number;
      stats: {
        problemsSolved: number;
        problemsChange: number;
        commits: number;
        commitsChange: number;
        timeSpent: number;
        timeChange: number;
        currentStreak: number;
        longestStreak: number;
        goalsCompleted: number;
        goalsTotal: number;
        rank?: number;
        rankChange?: number;
      };
      platformStats: Array<{ name: string; icon: string; value: number; label: string }>;
      topAchievement?: string;
      motivationalQuote?: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `📊 Your Week ${data.weekNumber} Progress Report`,
      react: <WeeklyReportEmail {...data} />,
    });
  }

  async sendMonthlyReport(
    to: string,
    data: {
      userName: string;
      month: string;
      year: number;
      stats: {
        problemsSolved: number;
        commits: number;
        timeSpent: number;
        activeDays: number;
        totalDays: number;
        longestStreak: number;
        goalsCompleted: number;
        achievementsUnlocked: number;
        topPlatform: string;
        topLanguage?: string;
      };
      weeklyBreakdown: Array<{ week: number; problems: number; commits: number }>;
      improvements?: string[];
      downloadUrl: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `📊 Your ${data.month} ${data.year} Progress Report`,
      react: <MonthlyReportEmail {...data} />,
    });
  }

  async sendReportGenerated(
    to: string,
    data: {
      userName: string;
      reportType: 'weekly' | 'monthly' | 'yearly' | 'custom';
      reportId: string;
      periodStart: string;
      periodEnd: string;
      stats: {
        problemsSolved: number;
        commits: number;
        timeSpent: number;
        streak: number;
        goalsCompleted: number;
        achievementsUnlocked: number;
      };
      downloadUrl: string;
      expiresAt: string;
      highlights?: string[];
    }
  ): Promise<EmailResult> {
    const reportTitle = data.reportType.charAt(0).toUpperCase() + data.reportType.slice(1);
    return this.send({
      to,
      subject: `Your ${reportTitle} Report is Ready 📊`,
      react: <ReportGeneratedEmail {...data} />,
    });
  }

  // ===========================================================================
  // SYNC EMAILS
  // ===========================================================================

  async sendSyncFailed(
    to: string,
    data: {
      userName: string;
      platformName: string;
      platformIcon?: string;
      failureReason: string;
      failedAt: string;
      consecutiveFailures: number;
      suggestedActions?: string[];
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `⚠️ ${data.platformName} sync failed`,
      react: (
        <SyncFailedEmail 
          userName={data.userName} 
          platformName={data.platformName} 
          platformIcon={data.platformIcon || '🔗'} 
          failureReason={data.failureReason} 
          failedAt={data.failedAt} 
          consecutiveFailures={data.consecutiveFailures} 
          suggestedActions={data.suggestedActions || []} 
        />
      ),
    });
  }

  // ===========================================================================
  // SYSTEM EMAILS
  // ===========================================================================

  async sendMaintenanceNotification(
    to: string,
    data: {
      userName?: string;
      maintenanceTitle: string;
      maintenanceDescription: string;
      startTime: string;
      endTime: string;
      affectedServices: string[];
      isEmergency?: boolean;
    }
  ): Promise<EmailResult> {
    const emoji = data.isEmergency ? '🚨' : '🔧';
    return this.send({
      to,
      subject: `${emoji} ${data.maintenanceTitle}`,
      react: <MaintenanceNotificationEmail {...data} />,
    });
  }

  // ===========================================================================
  // SUBSCRIPTION/BILLING EMAILS
  // ===========================================================================

  async sendSubscriptionCreated(
    to: string,
    data: {
      userName: string;
      planName: string;
      planPrice: string;
      billingPeriod: 'monthly' | 'yearly';
      features: string[];
      nextBillingDate: string;
      trialEnds?: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `Welcome to ProgressTracker ${data.planName}!`,
      react: <SubscriptionCreatedEmail {...data} />,
    });
  }

  async sendSubscriptionCancelled(
    to: string,
    data: {
      userName: string;
      planName: string;
      cancelledAt: string;
      accessEndsAt: string;
      reason?: string;
      feedbackUrl?: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Your subscription has been cancelled',
      react: <SubscriptionCancelledEmail {...data} />,
    });
  }

  async sendPaymentFailed(
    to: string,
    data: {
      userName: string;
      planName: string;
      amount: string;
      failedAt: string;
      failureReason: string;
      retryDate?: string;
      gracePeriodEnds: string;
      paymentMethodLast4: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: '⚠️ Payment failed - Action required',
      react: <PaymentFailedEmail {...data} />,
    });
  }

  async sendInvoicePaid(
    to: string,
    data: {
      userName: string;
      invoiceNumber: string;
      invoiceDate: string;
      amount: string;
      paymentMethod: string;
      paymentMethodLast4: string;
      planName: string;
      billingPeriodStart: string;
      billingPeriodEnd: string;
      items: Array<{ description: string; amount: string }>;
      invoiceUrl: string;
      nextBillingDate: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `Receipt for your payment - ${data.invoiceNumber}`,
      react: <InvoicePaidEmail {...data} />,
    });
  }

  // ===========================================================================
  // ACCOUNT EMAILS
  // ===========================================================================

  async sendAccountDeleted(
    to: string,
    data: {
      userName: string;
      email: string;
      deletedAt: string;
      dataRetentionDays: number;
      feedbackUrl?: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Your ProgressTracker account has been deleted',
      react: <AccountDeletedEmail {...data} />,
    });
  }

  // ===========================================================================
  // SUPPORT EMAILS
  // ===========================================================================

  async sendSupportTicketCreated(
    to: string,
    data: {
      userName: string;
      ticketNumber: string;
      ticketId: string;
      subject: string;
      category: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      expectedResponseTime: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `Support Ticket Created: ${data.ticketNumber}`,
      react: <SupportTicketCreatedEmail {...data} />,
    });
  }

  async sendSupportTicketReply(
    to: string,
    data: {
      userName: string;
      ticketNumber: string;
      ticketId: string;
      subject: string;
      replierName: string;
      isStaffReply: boolean;
      replyContent: string;
      repliedAt: string;
      previousMessages?: Array<{
        author: string;
        content: string;
        timestamp: string;
        isStaff: boolean;
      }>;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `New reply on ticket ${data.ticketNumber}`,
      react: <SupportTicketReplyEmail {...data} />,
    });
  }

  // ===========================================================================
  // MARKETING EMAILS
  // ===========================================================================

  async sendNewsletter(
    to: string,
    data: {
      subscriberName?: string;
      subject: string;
      introText: string;
      articles: Array<{
        title: string;
        excerpt: string;
        url: string;
        image?: string;
        category: string;
      }>;
      tips?: string[];
      unsubscribeToken: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: data.subject,
      react: <NewsletterEmail {...data} />,
    });
  }

  async sendWaitlistWelcome(
    to: string,
    data: {
      email: string;
      name?: string;
      position: number;
      referralCode: string;
      estimatedLaunchDate?: string;
      features?: string[];
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: "You're on the ProgressTracker waitlist! 🎉",
      react: <WaitlistWelcomeEmail {...data} />,
    });
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const emailService = new EmailService();