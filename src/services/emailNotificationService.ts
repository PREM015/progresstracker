// src/services/emailNotificationService.ts
// Complete email notification service with all methods

import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email';
import { logger } from '@/lib/logger';
import type { NotificationType } from '@prisma/client';

class EmailNotificationService {
  /**
   * Check if user wants email notifications for this type
   */
  private async shouldSendEmail(userId: string, notificationType: NotificationType): Promise<boolean> {
    const prefs = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    if (!prefs || !prefs.enabled || !prefs.emailEnabled) {
      return false;
    }

    const typeToPreference: Partial<Record<NotificationType, keyof typeof prefs>> = {
      ACHIEVEMENT_UNLOCKED: 'achievementAlerts',
      GOAL_REMINDER: 'goalReminders',
      GOAL_COMPLETED: 'goalCompleted',
      GOAL_FAILED: 'goalCompleted',
      STREAK_AT_RISK: 'streakAlerts',
      STREAK_BROKEN: 'streakAlerts',
      STREAK_MILESTONE: 'streakAlerts',
      SYNC_COMPLETE: 'syncComplete',
      SYNC_FAILED: 'syncFailed',
      WEEKLY_REPORT: 'weeklyReport',
      MONTHLY_REPORT: 'monthlyReport',
      SECURITY_ALERT: 'securityAlerts',
      BILLING_ALERT: 'billingAlerts',
      NEW_FEATURE: 'newFeatures',
    };

    const prefField = typeToPreference[notificationType];
    if (prefField && prefs[prefField] === false) {
      return false;
    }

    // Check quiet hours
    if (prefs.quietHoursEnabled) {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: prefs.quietHoursTimezone,
      });

      const startTime = prefs.quietHoursStart;
      const endTime = prefs.quietHoursEnd;

      if (startTime < endTime) {
        if (currentTime >= startTime && currentTime <= endTime) return false;
      } else {
        if (currentTime >= startTime || currentTime <= endTime) return false;
      }
    }

    // Check DND
    if (prefs.dndEnabled && prefs.dndUntil && new Date() < prefs.dndUntil) {
      return false;
    }

    return true;
  }

  /**
   * Get user data for email
   */
  private async getUser(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        preferredLanguage: true,
        timezone: true,
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
        streakStartDate: true,
        totalProblems: true,
        totalCommits: true,
        totalAchievements: true,
        totalPoints: true,
      },
    });
  }

  private calculateHoursUntilMidnight(timezone: string): number {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0');
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0');
      return Math.max(0, 23 - hour + (60 - minute) / 60);
    } catch {
      return 6;
    }
  }

  private getNextMilestone(current: number): number {
    const milestones = [7, 14, 30, 50, 100, 150, 200, 365, 500, 1000];
    return milestones.find((m) => m > current) || current + 100;
  }

  // ============================================================================
  // STREAK NOTIFICATIONS
  // ============================================================================

  async sendStreakAtRiskNotification(userId: string): Promise<void> {
    const shouldSend = await this.shouldSendEmail(userId, 'STREAK_AT_RISK');
    if (!shouldSend) return;

    const user = await this.getUser(userId);
    if (!user?.email) return;

    const hoursRemaining = this.calculateHoursUntilMidnight(user.timezone);

    await emailService.sendStreakAtRisk(user.email, {
      userName: user.name || 'there',
      currentStreak: user.currentStreak,
      hoursRemaining,
      suggestedActions: [
        'Solve a quick LeetCode easy problem',
        'Make a small commit on GitHub',
        'Complete a lesson on your learning platform',
      ],
    });

    logger.info('Streak at risk email sent', { userId, currentStreak: user.currentStreak });
  }

  async sendStreakBrokenNotification(userId: string, brokenStreak: number): Promise<void> {
    const shouldSend = await this.shouldSendEmail(userId, 'STREAK_BROKEN');
    if (!shouldSend) return;

    const user = await this.getUser(userId);
    if (!user?.email) return;

    await emailService.sendStreakBroken(user.email, {
      userName: user.name || 'there',
      brokenStreak,
      longestStreak: user.longestStreak,
      lastActivityDate: user.lastActivityDate?.toISOString() || new Date().toISOString(),
    });

    logger.info('Streak broken email sent', { userId, brokenStreak });
  }

  async sendStreakMilestoneNotification(userId: string, milestone: number): Promise<void> {
    const shouldSend = await this.shouldSendEmail(userId, 'STREAK_MILESTONE');
    if (!shouldSend) return;

    const user = await this.getUser(userId);
    if (!user?.email) return;

    await emailService.sendStreakMilestone(user.email, {
      userName: user.name || 'there',
      streakDays: user.currentStreak,
      milestone,
      nextMilestone: this.getNextMilestone(milestone),
      totalActivities: (user.totalProblems || 0) + (user.totalCommits || 0),
      startDate: user.streakStartDate?.toISOString() || new Date().toISOString(),
    });

    logger.info('Streak milestone email sent', { userId, milestone });
  }

  // ============================================================================
  // GOAL NOTIFICATIONS
  // ============================================================================

  async sendGoalCompletedNotification(userId: string, goalId: string): Promise<void> {
    const shouldSend = await this.shouldSendEmail(userId, 'GOAL_COMPLETED');
    if (!shouldSend) return;

    const [user, goal] = await Promise.all([
      this.getUser(userId),
      prisma.goal.findUnique({ where: { id: goalId } }),
    ]);

    if (!user?.email || !goal) return;

    const daysToComplete = Math.ceil(
      (new Date().getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    await emailService.sendGoalCompleted(user.email, {
      userName: user.name || 'there',
      goalTitle: goal.title,
      goalTarget: goal.target,
      goalUnit: goal.unit || 'items',
      completedAt: goal.completedAt?.toISOString() || new Date().toISOString(),
      daysToComplete,
      xpEarned: 100,
    });

    logger.info('Goal completed email sent', { userId, goalId });
  }

  async sendGoalReminderNotification(
    userId: string,
    goalIds: string[],
    reminderType: 'daily' | 'weekly' | 'deadline'
  ): Promise<void> {
    const shouldSend = await this.shouldSendEmail(userId, 'GOAL_REMINDER');
    if (!shouldSend) return;

    const [user, goals] = await Promise.all([
      this.getUser(userId),
      prisma.goal.findMany({
        where: { id: { in: goalIds } },
      }),
    ]);

    if (!user?.email || goals.length === 0) return;

    const now = new Date();
    const goalData = goals.map((goal) => {
      const daysRemaining = goal.deadline
        ? Math.ceil((goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        id: goal.id,
        title: goal.title,
        progress: goal.progress,
        target: goal.target,
        unit: goal.unit || 'items',
        deadline: goal.deadline?.toISOString() || new Date().toISOString(),
        daysRemaining,
      };
    });

    await emailService.sendGoalReminder(user.email, {
      userName: user.name || 'there',
      goals: goalData,
      reminderType,
    });

    logger.info('Goal reminder email sent', { userId, goalCount: goals.length, reminderType });
  }

  // ============================================================================
  // ACHIEVEMENT NOTIFICATIONS
  // ============================================================================

  async sendAchievementUnlockedNotification(userId: string, achievementId: string): Promise<void> {
    const shouldSend = await this.shouldSendEmail(userId, 'ACHIEVEMENT_UNLOCKED');
    if (!shouldSend) return;

    const [user, userAchievement] = await Promise.all([
      this.getUser(userId),
      prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId } },
        include: { achievement: true },
      }),
    ]);

    if (!user?.email || !userAchievement) return;

    await emailService.sendAchievementUnlocked(user.email, {
      userName: user.name || 'there',
      achievementTitle: userAchievement.achievement.title,
      achievementDescription: userAchievement.achievement.description,
      achievementIcon: userAchievement.achievement.icon || '🏆',
      tier: userAchievement.achievement.tier as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
      pointsEarned: userAchievement.achievement.points,
      totalAchievements: user.totalAchievements,
    });

    await prisma.userAchievement.update({
      where: { id: userAchievement.id },
      data: { notified: true, notifiedAt: new Date() },
    });

    logger.info('Achievement unlocked email sent', { userId, achievementId });
  }

  // ============================================================================
  // SYNC NOTIFICATIONS
  // ============================================================================

  async sendSyncFailedNotification(
    userId: string,
    userPlatformId: string,
    syncLogId?: string
  ): Promise<void> {
    const shouldSend = await this.shouldSendEmail(userId, 'SYNC_FAILED');
    if (!shouldSend) return;

    const [user, userPlatform, syncLog] = await Promise.all([
      this.getUser(userId),
      prisma.userPlatform.findUnique({
        where: { id: userPlatformId },
        include: { platform: true },
      }),
      syncLogId ? prisma.syncLog.findUnique({ where: { id: syncLogId } }) : null,
    ]);

    if (!user?.email || !userPlatform) return;
    if (userPlatform.consecutiveFailures < 3) return;

    await emailService.sendSyncFailed(user.email, {
      userName: user.name || 'there',
      platformName: userPlatform.platform.name,
      platformIcon: userPlatform.platform.icon || '🔗',
      failureReason: syncLog?.errorMessage || 'Unknown error',
      failedAt: new Date().toISOString(),
      consecutiveFailures: userPlatform.consecutiveFailures,
      suggestedActions: [
        'Check if your API key or credentials are still valid',
        'Reconnect the platform in your settings',
        'Make sure the platform is not experiencing downtime',
      ],
    });

    logger.info('Sync failed email sent', { userId, userPlatformId });
  }

  // ============================================================================
  // SECURITY NOTIFICATIONS
  // ============================================================================

  async sendLoginAlertNotification(
    userId: string,
    sessionData: {
      ipAddress: string;
      userAgent: string;
      device: string;
      browser: string;
      os: string;
      country?: string;
      city?: string;
      isNewDevice: boolean;
      isNewLocation: boolean;
    }
  ): Promise<void> {
    const shouldSend = await this.shouldSendEmail(userId, 'SECURITY_ALERT');
    if (!shouldSend) return;

    const user = await this.getUser(userId);
    if (!user?.email) return;

    await emailService.sendLoginAlert(user.email, {
      userName: user.name || 'there',
      loginTime: new Date().toISOString(),
      ipAddress: sessionData.ipAddress,
      device: sessionData.device,
      browser: sessionData.browser,
      location:
        sessionData.city && sessionData.country
          ? `${sessionData.city}, ${sessionData.country}`
          : 'Unknown Location',
      isNewDevice: sessionData.isNewDevice,
      isNewLocation: sessionData.isNewLocation,
    });

    logger.info('Login alert email sent', { userId });
  }

  // ============================================================================
  // SUPPORT NOTIFICATIONS
  // ============================================================================

  async sendSupportTicketCreatedNotification(userId: string, ticketId: string): Promise<void> {
    const [user, ticket] = await Promise.all([
      this.getUser(userId),
      prisma.supportTicket.findUnique({ where: { id: ticketId } }),
    ]);

    if (!user?.email || !ticket) return;

    const priorityResponseTimes: Record<string, string> = {
      LOW: '72 hours',
      MEDIUM: '48 hours',
      HIGH: '24 hours',
      CRITICAL: '4 hours',
    };

    await emailService.sendSupportTicketCreated(user.email, {
      userName: user.name || 'there',
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
      description: ticket.description,
      expectedResponseTime: priorityResponseTimes[ticket.priority] || '48 hours',
    });

    logger.info('Support ticket created email sent', { userId, ticketId });
  }

  async sendSupportTicketReplyNotification(
    userId: string,
    ticketId: string,
    replyId: string
  ): Promise<void> {
    const [user, ticket, reply] = await Promise.all([
      this.getUser(userId),
      prisma.supportTicket.findUnique({ where: { id: ticketId } }),
      prisma.ticketReply.findUnique({
        where: { id: replyId },
        include: { user: { select: { name: true } } },
      }),
    ]);

    if (!user?.email || !ticket || !reply) return;

    await emailService.sendSupportTicketReply(user.email, {
      userName: user.name || 'there',
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      subject: ticket.subject,
      replierName: reply.user?.name || 'Support Team',
      isStaffReply: reply.isStaffReply,
      replyContent: reply.message,
      repliedAt: reply.createdAt.toISOString(),
    });

    logger.info('Support ticket reply email sent', { userId, ticketId, replyId });
  }

  // ============================================================================
  // REPORT NOTIFICATIONS
  // ============================================================================

  async sendWeeklyReportNotification(userId: string, reportData: {
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
    };
    platformStats: Array<{ name: string; icon: string; value: number; label: string }>;
  }): Promise<void> {
    const shouldSend = await this.shouldSendEmail(userId, 'WEEKLY_REPORT');
    if (!shouldSend) return;

    const user = await this.getUser(userId);
    if (!user?.email) return;

    await emailService.sendWeeklyReport(user.email, {
      userName: user.name || 'there',
      ...reportData,
    });

    logger.info('Weekly report email sent', { userId, weekNumber: reportData.weekNumber });
  }

  async sendMonthlyReportNotification(userId: string, reportData: {
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
    };
    weeklyBreakdown: Array<{ week: number; problems: number; commits: number }>;
    improvements: string[];
    downloadUrl: string;
  }): Promise<void> {
    const shouldSend = await this.shouldSendEmail(userId, 'MONTHLY_REPORT');
    if (!shouldSend) return;

    const user = await this.getUser(userId);
    if (!user?.email) return;

    await emailService.sendMonthlyReport(user.email, {
      userName: user.name || 'there',
      ...reportData,
    });

    logger.info('Monthly report email sent', { userId, month: reportData.month });
  }
}

export const emailNotificationService = new EmailNotificationService();
export default emailNotificationService;