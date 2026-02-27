// src/services/streakService.ts
// Complete streak management service with email notifications

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { emailNotificationService } from '@/services/emailNotificationService';

// Streak milestone thresholds
const STREAK_MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365, 500, 1000];

// Hours before midnight to send "at risk" notifications
const STREAK_AT_RISK_HOURS = 6;

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  streakStartDate: Date | null;
  isAtRisk: boolean;
  hoursUntilMidnight: number;
  hadActivityToday: boolean;
}

export interface StreakUpdateResult {
  success: boolean;
  streakBroken: boolean;
  newStreak: number;
  milestoneReached?: number;
  message: string;
}

class StreakService {
  /**
   * Get user's current streak info
   */
  async getStreakInfo(userId: string): Promise<StreakInfo> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
        streakStartDate: true,
        timezone: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate hours until midnight
    const now = new Date();
    const userTimezone = user.timezone || 'UTC';
    const todayStart = this.getStartOfDay(now, userTimezone);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

console.log('todayStart:', todayStart, 'yesterdayStart:', yesterdayStart, 'tomorrowStart:', tomorrowStart);
    function isSameDay(date1: Date, date2: Date): boolean {
         console.log('Comparing dates:', date1, date2, isSameDay(date1, date2));
        return (    
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
           
        
        );
    }

    // Check if user had activity today
    const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayActivity = await prisma.trackerEntry.findFirst({
        
      where: {
        userId,
        date: {
          gte: yesterday,
            lt: todayStart,
        },
      },
      select: {
        date: true,
      },
      
    });
    function yesterdayHadActivity(): boolean {
        if (!yesterdayActivity) {
            return false;
        }
        return isSameDay(yesterdayActivity.date, yesterday);

    }
    console.log('yesterdayHadActivity:', yesterdayHadActivity());
    
    

    // Check if user had activity today
    const hadActivityToday = user.lastActivityDate
      ? user.lastActivityDate >= todayStart
      : false;

    // Calculate hours until midnight
    const hoursUntilMidnight = this.calculateHoursUntilMidnight(userTimezone);

    // Determine if streak is at risk
    const isAtRisk =
      user.currentStreak > 0 &&
      !hadActivityToday &&
      hoursUntilMidnight <= STREAK_AT_RISK_HOURS;

    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastActivityDate: user.lastActivityDate,
      streakStartDate: user.streakStartDate,
      isAtRisk,
      hoursUntilMidnight,
      hadActivityToday,
    };
  }

  /**
   * Record activity and update streak
   */
  async recordActivity(userId: string): Promise<StreakUpdateResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
        streakStartDate: true,
        timezone: true,
      },
    });

    if (!user) {
      return { success: false, streakBroken: false, newStreak: 0, message: 'User not found' };
    }

    const now = new Date();
    const userTimezone = user.timezone || 'UTC';
    const todayStart = this.getStartOfDay(now, userTimezone);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    let newStreak = user.currentStreak;
    let streakBroken = false;
    let milestoneReached: number | undefined;
    let streakStartDate = user.streakStartDate;

    // Already recorded activity today
    if (user.lastActivityDate && user.lastActivityDate >= todayStart) {
      return {
        success: true,
        streakBroken: false,
        newStreak: user.currentStreak,
        message: 'Activity already recorded today',
      };
    }

    // Check if continuing streak from yesterday
    if (user.lastActivityDate && user.lastActivityDate >= yesterdayStart) {
      // Continue streak
      newStreak = user.currentStreak + 1;
    } else if (user.lastActivityDate && user.lastActivityDate < yesterdayStart) {
      // Streak was broken - save to history first
      if (user.currentStreak > 0) {
        await this.saveStreakToHistory(userId, user.currentStreak, user.streakStartDate, 'broken');
        streakBroken = true;
      }
      // Start new streak
      newStreak = 1;
      streakStartDate = now;
    } else {
      // First ever activity
      newStreak = 1;
      streakStartDate = now;
    }

    // Check for milestone
    if (STREAK_MILESTONES.includes(newStreak)) {
      milestoneReached = newStreak;
    }

    // Update user
    const newLongestStreak = Math.max(user.longestStreak, newStreak);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastActivityDate: now,
        streakStartDate: streakStartDate,
        lastActiveAt: now,
      },
    });

    // Update daily stats
    await this.updateDailyStats(userId, todayStart);

    // Send milestone notification if applicable
    if (milestoneReached) {
      await emailNotificationService.sendStreakMilestoneNotification(userId, milestoneReached);
      logger.info('Streak milestone reached', { userId, milestone: milestoneReached });
    }

    logger.info('Activity recorded', {
      userId,
      newStreak,
      streakBroken,
      milestoneReached,
    });

    return {
      success: true,
      streakBroken,
      newStreak,
      milestoneReached,
      message: milestoneReached
        ? `Congratulations! You've reached a ${milestoneReached}-day streak!`
        : streakBroken
        ? 'New streak started!'
        : 'Streak continued!',
    };
  }

  /**
   * Check all users for streak at risk and send notifications
   * Called by cron job
   */
  async checkStreaksAtRisk(): Promise<{ notified: number; errors: number }> {
    let notified = 0;
    let errors = 0;

    try {
      // Get users with active streaks who haven't had activity today
      const users = await prisma.user.findMany({
        where: {
          currentStreak: { gt: 0 },
          isActive: true,
          isBanned: false,
        },
        select: {
          id: true,
          timezone: true,
          lastActivityDate: true,
          currentStreak: true,
          notificationPrefs: {
            select: {
              streakAlerts: true,
              emailEnabled: true,
              enabled: true,
            },
          },
        },
      });

      for (const user of users) {
        try {
          // Skip if user doesn't want streak alerts
          if (
            !user.notificationPrefs?.enabled ||
            !user.notificationPrefs?.emailEnabled ||
            !user.notificationPrefs?.streakAlerts
          ) {
            continue;
          }

          const userTimezone = user.timezone || 'UTC';
          const todayStart = this.getStartOfDay(new Date(), userTimezone);
          const hoursUntilMidnight = this.calculateHoursUntilMidnight(userTimezone);

          // Check if already had activity today
          const hadActivityToday =
            user.lastActivityDate && user.lastActivityDate >= todayStart;

          // Send notification if at risk
          if (!hadActivityToday && hoursUntilMidnight <= STREAK_AT_RISK_HOURS) {
            await emailNotificationService.sendStreakAtRiskNotification(user.id);
            notified++;
            
            logger.info('Streak at risk notification sent', {
              userId: user.id,
              currentStreak: user.currentStreak,
              hoursUntilMidnight,
            });
          }
        } catch (error) {
          errors++;
          logger.error('Failed to check streak for user', { userId: user.id }, error);
        }
      }

      logger.info('Streak at risk check completed', { notified, errors, totalChecked: users.length });
    } catch (error) {
      logger.error('Failed to check streaks at risk', {}, error);
      throw error;
    }

    return { notified, errors };
  }

  /**
   * Check all users for broken streaks at midnight
   * Called by cron job at midnight
   */
  async checkBrokenStreaks(): Promise<{ broken: number; errors: number }> {
    let broken = 0;
    let errors = 0;

    try {
      // Get all users with active streaks
      const users = await prisma.user.findMany({
        where: {
          currentStreak: { gt: 0 },
          isActive: true,
        },
        select: {
          id: true,
          timezone: true,
          lastActivityDate: true,
          currentStreak: true,
          streakStartDate: true,
          notificationPrefs: {
            select: {
              streakAlerts: true,
              emailEnabled: true,
              enabled: true,
            },
          },
        },
      });

      for (const user of users) {
        try {
          const userTimezone = user.timezone || 'UTC';
          const todayStart = this.getStartOfDay(new Date(), userTimezone);
          const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

          // Check if last activity was before yesterday (streak broken)
          if (user.lastActivityDate && user.lastActivityDate < yesterdayStart) {
            const brokenStreak = user.currentStreak;

            // Save to history
            await this.saveStreakToHistory(
              user.id,
              brokenStreak,
              user.streakStartDate,
              'broken'
            );

            // Reset streak
            await prisma.user.update({
              where: { id: user.id },
              data: {
                currentStreak: 0,
                streakStartDate: null,
              },
            });

            broken++;

            // Send notification if enabled
            if (
              user.notificationPrefs?.enabled &&
              user.notificationPrefs?.emailEnabled &&
              user.notificationPrefs?.streakAlerts
            ) {
              await emailNotificationService.sendStreakBrokenNotification(user.id, brokenStreak);
            }

            logger.info('Streak broken', { userId: user.id, brokenStreak });
          }
        } catch (error) {
          errors++;
          logger.error('Failed to check broken streak for user', { userId: user.id }, error);
        }
      }

      logger.info('Broken streaks check completed', { broken, errors, totalChecked: users.length });
    } catch (error) {
      logger.error('Failed to check broken streaks', {}, error);
      throw error;
    }

    return { broken, errors };
  }

  /**
   * Use streak freeze to protect streak
   */
  async useStreakFreeze(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        streakFreezeCount: true,
        streakFreezeUsedAt: true,
        currentStreak: true,
        lastActivityDate: true,
        timezone: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.streakFreezeCount <= 0) {
      return false; // No freezes available
    }

    const now = new Date();
    const userTimezone = user.timezone || 'UTC';
    const todayStart = this.getStartOfDay(now, userTimezone);

    // Check if already used freeze today
    if (user.streakFreezeUsedAt && user.streakFreezeUsedAt >= todayStart) {
      return false; // Already used today
    }

    // Use freeze
    await prisma.user.update({
      where: { id: userId },
      data: {
        streakFreezeCount: user.streakFreezeCount - 1,
        streakFreezeUsedAt: now,
        lastActivityDate: now, // Count as activity
      },
    });

    logger.info('Streak freeze used', { userId, remainingFreezes: user.streakFreezeCount - 1 });

    return true;
  }

  /**
   * Add streak freezes to user (e.g., from subscription)
   */
  async addStreakFreezes(userId: string, count: number): Promise<number> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        streakFreezeCount: { increment: count },
      },
      select: { streakFreezeCount: true },
    });

    logger.info('Streak freezes added', { userId, added: count, total: user.streakFreezeCount });

    return user.streakFreezeCount;
  }

  /**
   * Get streak history for user
   */
  async getStreakHistory(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ) {
    const { limit = 10, offset = 0 } = options;

    const [streaks, total] = await Promise.all([
      prisma.streakHistory.findMany({
        where: { userId },
        orderBy: { endDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.streakHistory.count({ where: { userId } }),
    ]);

    return { streaks, total, limit, offset };
  }

  /**
   * Get streak leaderboard
   */
  async getLeaderboard(options: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = options;

    const users = await prisma.user.findMany({
      where: {
        isPublic: true,
        isActive: true,
        currentStreak: { gt: 0 },
      },
      orderBy: { currentStreak: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    return users.map((user, index) => ({
      rank: offset + index + 1,
      ...user,
    }));
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getStartOfDay(date: Date, timezone: string): Date {
    try {
      const dateStr = date.toLocaleDateString('en-CA', { timeZone: timezone });
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    } catch {
      // Fallback to UTC
      const d = new Date(date);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
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
      // Fallback
      return 6;
    }
  }

  private async saveStreakToHistory(
    userId: string,
    length: number,
    startDate: Date | null,
    endReason: string
  ): Promise<void> {
    const now = new Date();

    // Get stats during streak
    const stats = await prisma.trackerEntry.aggregate({
      where: {
        userId,
        date: {
          gte: startDate || now,
          lte: now,
        },
      },
      _sum: {
        problemsSolved: true,
        commits: true,
      },
    });

    await prisma.streakHistory.create({
      data: {
        userId,
        startDate: startDate || now,
        endDate: now,
        length,
        endReason,
        totalProblems: stats._sum.problemsSolved || 0,
        totalCommits: stats._sum.commits || 0,
        isActive: false,
        isCurrent: false,
      },
    });
  }

  private async updateDailyStats(userId: string, date: Date): Promise<void> {
    const dateOnly = new Date(date);
    dateOnly.setUTCHours(0, 0, 0, 0);

    // Upsert daily stats
    await prisma.dailyStats.upsert({
      where: {
        userId_date: {
          userId,
          date: dateOnly,
        },
      },
      create: {
        userId,
        date: dateOnly,
        hadActivity: true,
      },
      update: {
        hadActivity: true,
      },
    });
  }
}

// Export singleton
export const streakService = new StreakService();
export default streakService;