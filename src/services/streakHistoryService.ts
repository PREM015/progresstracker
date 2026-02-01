// src/services/streakHistoryService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {  format } from 'date-fns';

const log = logger.child({ service: 'StreakHistoryService' });

export interface CreateStreakInput {
  userId: string;
  startDate: Date;
  endDate: Date;
  length: number;
  endReason?: string;
  totalProblems?: number;
  totalCommits?: number;
}

class StreakHistoryService {
  /**
   * Record a streak
   */
  async create(data: CreateStreakInput) {
    try {
      // Mark any current active streak as not current
      await prisma.streakHistory.updateMany({
        where: { userId: data.userId, isCurrent: true },
        data: { isCurrent: false },
      });

      const streak = await prisma.streakHistory.create({
        data: {
          userId: data.userId,
          startDate: data.startDate,
          endDate: data.endDate,
          length: data.length,
          isActive: data.endReason ? false : true,
          isCurrent: data.endReason ? false : true,
          endReason: data.endReason,
          totalProblems: data.totalProblems || 0,
          totalCommits: data.totalCommits || 0,
        },
      });

      log.info('Streak recorded', { id: streak.id, userId: data.userId, length: data.length });

      return streak;
    } catch (error) {
      log.error('Error recording streak', { userId: data.userId }, error);
      throw error;
    }
  }

  /**
   * Get user's streak history
   */
  async getHistory(userId: string, limit: number = 10) {
    try {
      const streaks = await prisma.streakHistory.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: limit,
      });

      log.info('Streak history fetched', { userId, count: streaks.length });

      return streaks;
    } catch (error) {
      log.error('Error fetching streak history', { userId }, error);
      throw error;
    }
  }

  /**
   * Get current active streak
   */
  async getCurrentStreak(userId: string) {
    try {
      const streak = await prisma.streakHistory.findFirst({
        where: { userId, isCurrent: true },
        orderBy: { startDate: 'desc' },
      });

      if (streak) {
        log.info('Current streak fetched', { userId, length: streak.length });
      }

      return streak;
    } catch (error) {
      log.error('Error fetching current streak', { userId }, error);
      throw error;
    }
  }

  /**
   * Get longest streak
   */
  async getLongestStreak(userId: string) {
    try {
      const streak = await prisma.streakHistory.findFirst({
        where: { userId },
        orderBy: { length: 'desc' },
      });

      if (streak) {
        log.info('Longest streak fetched', { userId, length: streak.length });
      }

      return streak;
    } catch (error) {
      log.error('Error fetching longest streak', { userId }, error);
      throw error;
    }
  }

  /**
   * Update current streak
   */
  async updateCurrentStreak(userId: string, length: number, stats?: { problems?: number; commits?: number }) {
    try {
      const current = await this.getCurrentStreak(userId);

      if (!current) {
        // Create new streak
        return this.create({
          userId,
          startDate: new Date(),
          endDate: new Date(),
          length,
          totalProblems: stats?.problems,
          totalCommits: stats?.commits,
        });
      }

      const updated = await prisma.streakHistory.update({
        where: { id: current.id },
        data: {
          length,
          endDate: new Date(),
          totalProblems: stats?.problems ?? current.totalProblems,
          totalCommits: stats?.commits ?? current.totalCommits,
        },
      });

      log.info('Current streak updated', { userId, length });

      return updated;
    } catch (error) {
      log.error('Error updating current streak', { userId }, error);
      throw error;
    }
  }

  /**
   * End current streak
   */
  async endCurrentStreak(userId: string, reason: string) {
    try {
      const current = await this.getCurrentStreak(userId);

      if (!current) {
        log.warn('No current streak to end', { userId });
        return null;
      }

      const updated = await prisma.streakHistory.update({
        where: { id: current.id },
        data: {
          isActive: false,
          isCurrent: false,
          endReason: reason,
        },
      });

      log.info('Streak ended', { userId, length: current.length, reason });

      return updated;
    } catch (error) {
      log.error('Error ending current streak', { userId }, error);
      throw error;
    }
  }

  /**
   * Calculate and sync streak from tracker entries
   */
  async syncFromTrackerEntries(userId: string) {
    try {
      const entries = await prisma.trackerEntry.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        select: { 
          date: true, 
          problemsSolved: true, 
          commits: true 
        },
      });

      if (entries.length === 0) {
        log.info('No entries to sync streak from', { userId });
        return null;
      }

      // Get unique dates sorted descending
      const uniqueDates = [
        ...new Set(entries.map((e) => format(e.date, 'yyyy-MM-dd'))),
      ].sort((a, b) => b.localeCompare(a));

      // Calculate current streak
      let currentStreak = 0;
      let streakStart: Date | null = null;
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        currentStreak = 1;
        streakStart = new Date(uniqueDates[0]);

        for (let i = 1; i < uniqueDates.length; i++) {
          const expected = format(
            new Date(new Date(uniqueDates[i - 1]).getTime() - 86400000),
            'yyyy-MM-dd'
          );

          if (uniqueDates[i] === expected) {
            currentStreak++;
            streakStart = new Date(uniqueDates[i]);
          } else {
            break;
          }
        }
      }

      // Calculate stats for current streak
      let totalProblems = 0;
      let totalCommits = 0;

      if (currentStreak > 0 && streakStart) {
        const streakEntries = entries.filter(
          (e) => e.date >= streakStart
        );
        totalProblems = streakEntries.reduce((s, e) => s + e.problemsSolved, 0);
        totalCommits = streakEntries.reduce((s, e) => s + e.commits, 0);
      }

      // Update or create streak
      if (currentStreak > 0 && streakStart) {
        await this.updateCurrentStreak(userId, currentStreak, {
          problems: totalProblems,
          commits: totalCommits,
        });
      }

      // Update user's cached streak
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak,
          streakStartDate: streakStart,
          lastActivityDate: entries[0]?.date,
        },
      });

      log.info('Streak synced from tracker entries', { userId, currentStreak });

      return { currentStreak, streakStart, totalProblems, totalCommits };
    } catch (error) {
      log.error('Error syncing streak from tracker', { userId }, error);
      throw error;
    }
  }

  /**
   * Get streak statistics
   */
  async getStats(userId: string) {
    try {
      const [current, longest, allStreaks] = await Promise.all([
        this.getCurrentStreak(userId),
        this.getLongestStreak(userId),
        prisma.streakHistory.findMany({
          where: { userId },
          orderBy: { startDate: 'desc' },
        }),
      ]);

      const totalStreaks = allStreaks.length;
      const avgLength = totalStreaks > 0
        ? Math.round(allStreaks.reduce((s, st) => s + st.length, 0) / totalStreaks)
        : 0;

      const totalDaysInStreaks = allStreaks.reduce((s, st) => s + st.length, 0);

      log.info('Streak stats fetched', { userId });

      return {
        current: current?.length || 0,
        longest: longest?.length || 0,
        totalStreaks,
        avgLength,
        totalDaysInStreaks,
        streaks: allStreaks.slice(0, 5),
      };
    } catch (error) {
      log.error('Error fetching streak stats', { userId }, error);
      throw error;
    }
  }

  /**
   * Delete old streaks (cleanup)
   */
  async deleteOldStreaks(daysOld: number = 365) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await prisma.streakHistory.deleteMany({
        where: {
          isActive: false,
          isCurrent: false,
          endDate: { lt: cutoffDate },
        },
      });

      log.info('Old streaks deleted', { count: result.count, daysOld });

      return { deleted: result.count };
    } catch (error) {
      log.error('Error deleting old streaks', { daysOld }, error);
      throw error;
    }
  }
}

export const streakHistoryService = new StreakHistoryService();
export default streakHistoryService;