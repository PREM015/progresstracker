// src/services/analytics/leaderboardService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { startOfWeek, startOfMonth } from 'date-fns';

const log = logger.child({ service: 'LeaderboardService' });

export interface LeaderboardEntry {
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  rank: number;
  score: number;
  change?: number;
}

export type LeaderboardMetric = 'problems' | 'streak' | 'points' | 'commits';
export type LeaderboardPeriod = 'week' | 'month' | 'all';

export class LeaderboardService {
  /**
   * Get leaderboard
   */
  static async getLeaderboard(
    metric: LeaderboardMetric = 'problems',
    period: LeaderboardPeriod = 'week',
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    try {
      let startDate: Date | undefined;

      if (period === 'week') {
        startDate = startOfWeek(new Date());
      } else if (period === 'month') {
        startDate = startOfMonth(new Date());
      }

      if (metric === 'streak') {
        return this.getStreakLeaderboard(limit);
      }

      if (metric === 'points') {
        return this.getPointsLeaderboard(period, limit);
      }

      if (metric === 'commits') {
        return this.getCommitsLeaderboard(startDate, limit);
      }

      // Default: problems
      return this.getProblemsLeaderboard(startDate, limit);
    } catch (error) {
      log.error('Error fetching leaderboard', { metric, period }, error);
      throw error;
    }
  }

  /**
   * Get user's rank
   */
  static async getUserRank(
    userId: string,
    metric: LeaderboardMetric = 'problems',
    period: LeaderboardPeriod = 'week'
  ): Promise<{ rank: number; total: number; percentile: number }> {
    try {
      const leaderboard = await this.getLeaderboard(metric, period, 1000);
      const userIndex = leaderboard.findIndex((e) => e.userId === userId);

      if (userIndex === -1) {
        return { rank: -1, total: leaderboard.length, percentile: 0 };
      }

      const rank = userIndex + 1;
      const percentile = ((leaderboard.length - rank) / leaderboard.length) * 100;

      log.info('User rank fetched', { userId, metric, rank });

      return { rank, total: leaderboard.length, percentile };
    } catch (error) {
      log.error('Error fetching user rank', { userId, metric }, error);
      throw error;
    }
  }

  /**
   * Get problems leaderboard
   */
  private static async getProblemsLeaderboard(
    startDate: Date | undefined,
    limit: number
  ): Promise<LeaderboardEntry[]> {
    try {
      if (startDate) {
        const aggregated = await prisma.trackerEntry.groupBy({
          by: ['userId'],
          where: {
            date: { gte: startDate },
            user: { isPublic: true, isActive: true },
          },
          _sum: { problemsSolved: true },
          orderBy: { _sum: { problemsSolved: 'desc' } },
          take: limit,
        });

        const userIds = aggregated.map((a) => a.userId);
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, name: true, image: true },
        });

        return aggregated.map((a, index) => {
          const user = users.find((u) => u.id === a.userId);
          return {
            userId: a.userId,
            username: user?.username || null,
            name: user?.name || null,
            image: user?.image || null,
            rank: index + 1,
            score: a._sum.problemsSolved || 0,
          };
        });
      }

      // All-time
      const users = await prisma.user.findMany({
        where: { isPublic: true, isActive: true },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          totalProblems: true,
        },
        orderBy: { totalProblems: 'desc' },
        take: limit,
      });

      return users.map((u, index) => ({
        userId: u.id,
        username: u.username,
        name: u.name,
        image: u.image,
        rank: index + 1,
        score: u.totalProblems,
      }));
    } catch (error) {
      log.error('Error fetching problems leaderboard', {}, error);
      throw error;
    }
  }

  /**
   * Get streak leaderboard
   */
  private static async getStreakLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    try {
      const users = await prisma.user.findMany({
        where: { isPublic: true, isActive: true },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          currentStreak: true,
        },
        orderBy: { currentStreak: 'desc' },
        take: limit,
      });

      return users.map((u, index) => ({
        userId: u.id,
        username: u.username,
        name: u.name,
        image: u.image,
        rank: index + 1,
        score: u.currentStreak,
      }));
    } catch (error) {
      log.error('Error fetching streak leaderboard', {}, error);
      throw error;
    }
  }

  /**
   * Get points leaderboard
   */
  private static async getPointsLeaderboard(
    period: LeaderboardPeriod,
    limit: number
  ): Promise<LeaderboardEntry[]> {
    try {
      const users = await prisma.user.findMany({
        where: { isPublic: true, isActive: true },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          totalPoints: true,
        },
        orderBy: { totalPoints: 'desc' },
        take: limit,
      });

      return users.map((u, index) => ({
        userId: u.id,
        username: u.username,
        name: u.name,
        image: u.image,
        rank: index + 1,
        score: u.totalPoints,
      }));
    } catch (error) {
      log.error('Error fetching points leaderboard', {}, error);
      throw error;
    }
  }

  /**
   * Get commits leaderboard
   */
  private static async getCommitsLeaderboard(
    startDate: Date | undefined,
    limit: number
  ): Promise<LeaderboardEntry[]> {
    try {
      if (startDate) {
        const aggregated = await prisma.trackerEntry.groupBy({
          by: ['userId'],
          where: {
            date: { gte: startDate },
            user: { isPublic: true, isActive: true },
          },
          _sum: { commits: true },
          orderBy: { _sum: { commits: 'desc' } },
          take: limit,
        });

        const userIds = aggregated.map((a) => a.userId);
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, name: true, image: true },
        });

        return aggregated.map((a, index) => {
          const user = users.find((u) => u.id === a.userId);
          return {
            userId: a.userId,
            username: user?.username || null,
            name: user?.name || null,
            image: user?.image || null,
            rank: index + 1,
            score: a._sum.commits || 0,
          };
        });
      }

      // All-time
      const users = await prisma.user.findMany({
        where: { isPublic: true, isActive: true },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          totalCommits: true,
        },
        orderBy: { totalCommits: 'desc' },
        take: limit,
      });

      return users.map((u, index) => ({
        userId: u.id,
        username: u.username,
        name: u.name,
        image: u.image,
        rank: index + 1,
        score: u.totalCommits,
      }));
    } catch (error) {
      log.error('Error fetching commits leaderboard', {}, error);
      throw error;
    }
  }
}

export default LeaderboardService;