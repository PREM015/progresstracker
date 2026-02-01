// src/lib/analytics.ts
/**
 * Analytics utilities for tracking and reporting
 * Synced with Prisma schema: TrackerEntry, DailyStats, Goal
 */

import { PlatformCategory, GoalStatus, GoalType, GoalMetric } from '@prisma/client';
import { prisma } from './prisma';
import { logger } from './logger';

// =============================================================================
// TYPES (Synced with Prisma Schema)
// =============================================================================

export interface AnalyticsPeriod {
  startDate: Date;
  endDate: Date;
}

export interface UserStats {
  totalProblems: number;
  totalCommits: number;
  totalPullRequests: number;
  totalTimeSpent: number;
  totalProjects: number;
  totalCertifications: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  rank: number | null;
}

export interface PlatformStats {
  platformId: string;
  platformName: string;
  category: PlatformCategory;
  problemsSolved: number;
  commits: number;
  timeSpent: number;
  lastSyncedAt: Date | null;
}

export interface DailyActivity {
  date: Date;
  totalProblems: number;
  totalCommits: number;
  totalTimeSpent: number;
  hadActivity: boolean;
  platformBreakdown: Record<string, number>;
}

export interface GoalProgress {
  goalId: string;
  title: string;
  status: GoalStatus;
  type: GoalType;
  metric: GoalMetric;
  target: number;
  progress: number;
  progressPercentage: number;
  deadline: Date | null;
  daysRemaining: number | null;
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercentage: number;
}

export interface CategoryBreakdown {
  category: PlatformCategory;
  count: number;
  percentage: number;
  timeSpent: number;
}

export interface StreakData {
  current: number;
  longest: number;
  startDate: Date | null;
  lastActivityDate: Date | null;
  freezeCount: number;
  isAtRisk: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  totalPoints: number;
  currentStreak: number;
  rank: number;
}

export interface Insight {
  type: 'achievement' | 'streak' | 'goal' | 'trend' | 'suggestion';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// ANALYTICS SERVICE
// =============================================================================

class AnalyticsService {
  private log = logger.child({ service: 'analytics' });

  /**
   * Get user statistics summary
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const startTime = Date.now();

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          totalProblems: true,
          totalCommits: true,
          totalProjects: true,
          totalCertifications: true,
          totalPoints: true,
          currentStreak: true,
          longestStreak: true,
          rank: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get aggregated stats from tracker entries
      const aggregated = await prisma.trackerEntry.aggregate({
        where: { userId },
        _sum: {
          pullRequests: true,
          timeSpent: true,
        },
      });

      const stats: UserStats = {
        totalProblems: user.totalProblems,
        totalCommits: user.totalCommits,
        totalPullRequests: aggregated._sum.pullRequests || 0,
        totalTimeSpent: aggregated._sum.timeSpent || 0,
        totalProjects: user.totalProjects,
        totalCertifications: user.totalCertifications,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalPoints: user.totalPoints,
        rank: user.rank,
      };

      this.log.debug('User stats fetched', {
        userId,
        duration: Date.now() - startTime,
      });

      return stats;
    } catch (error) {
      this.log.error('Failed to fetch user stats', { userId }, error);
      throw error;
    }
  }

  /**
   * Get daily activity for a date range
   */
  async getDailyActivity(
    userId: string,
    period: AnalyticsPeriod
  ): Promise<DailyActivity[]> {
    const startTime = Date.now();

    try {
      const dailyStats = await prisma.dailyStats.findMany({
        where: {
          userId,
          date: {
            gte: period.startDate,
            lte: period.endDate,
          },
        },
        orderBy: { date: 'asc' },
      });

      const activities: DailyActivity[] = dailyStats.map((stat) => ({
        date: stat.date,
        totalProblems: stat.totalProblems,
        totalCommits: stat.totalCommits,
        totalTimeSpent: stat.totalTimeSpent,
        hadActivity: stat.hadActivity,
        platformBreakdown: (stat.platformBreakdown as Record<string, number>) || {},
      }));

      this.log.debug('Daily activity fetched', {
        userId,
        days: activities.length,
        duration: Date.now() - startTime,
      });

      return activities;
    } catch (error) {
      this.log.error('Failed to fetch daily activity', { userId, period }, error);
      throw error;
    }
  }

  /**
   * Get platform-wise statistics
   */
  async getPlatformStats(userId: string): Promise<PlatformStats[]> {
    const startTime = Date.now();

    try {
      const userPlatforms = await prisma.userPlatform.findMany({
        where: { userId, isActive: true },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      });

      const platformStatsPromises = userPlatforms.map(async (up) => {
        const aggregated = await prisma.trackerEntry.aggregate({
          where: {
            userId,
            platformId: up.platformId,
          },
          _sum: {
            problemsSolved: true,
            commits: true,
            timeSpent: true,
          },
        });

        return {
          platformId: up.platformId,
          platformName: up.platform.name,
          category: up.platform.category,
          problemsSolved: aggregated._sum.problemsSolved || 0,
          commits: aggregated._sum.commits || 0,
          timeSpent: aggregated._sum.timeSpent || 0,
          lastSyncedAt: up.lastSyncedAt,
        };
      });

      const stats = await Promise.all(platformStatsPromises);

      this.log.debug('Platform stats fetched', {
        userId,
        platformCount: stats.length,
        duration: Date.now() - startTime,
      });

      return stats;
    } catch (error) {
      this.log.error('Failed to fetch platform stats', { userId }, error);
      throw error;
    }
  }

  /**
   * Get goal progress for user
   */
  async getGoalProgress(userId: string): Promise<GoalProgress[]> {
    const startTime = Date.now();

    try {
      const goals = await prisma.goal.findMany({
        where: {
          userId,
          status: { in: ['ACTIVE', 'PAUSED'] },
        },
        orderBy: { deadline: 'asc' },
      });

      const now = new Date();
      const progress: GoalProgress[] = goals.map((goal) => {
        let daysRemaining: number | null = null;
        if (goal.deadline) {
          const diff = goal.deadline.getTime() - now.getTime();
          daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }

        return {
          goalId: goal.id,
          title: goal.title,
          status: goal.status,
          type: goal.goalType,
          metric: goal.metric,
          target: goal.target,
          progress: goal.progress,
          progressPercentage: goal.progressPercentage,
          deadline: goal.deadline,
          daysRemaining,
        };
      });

      this.log.debug('Goal progress fetched', {
        userId,
        goalCount: progress.length,
        duration: Date.now() - startTime,
      });

      return progress;
    } catch (error) {
      this.log.error('Failed to fetch goal progress', { userId }, error);
      throw error;
    }
  }

  /**
   * Get trend data for a metric
   */
  async getTrends(
    userId: string,
    metric: 'problems' | 'commits' | 'timeSpent',
    period: AnalyticsPeriod,
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<TrendData[]> {
    const startTime = Date.now();

    try {
      const dailyStats = await prisma.dailyStats.findMany({
        where: {
          userId,
          date: {
            gte: period.startDate,
            lte: period.endDate,
          },
        },
        orderBy: { date: 'asc' },
      });

      // Map metric to field
      const metricField = {
        problems: 'totalProblems',
        commits: 'totalCommits',
        timeSpent: 'totalTimeSpent',
      }[metric] as keyof typeof dailyStats[0];

      // Group by granularity
      const grouped = this.groupByGranularity(dailyStats, granularity, metricField);

      // Calculate changes
      const trends: TrendData[] = grouped.map((item, index) => {
        const previousValue = index > 0 ? grouped[index - 1].value : 0;
        const change = item.value - previousValue;
        const changePercentage = previousValue > 0
          ? Math.round((change / previousValue) * 100)
          : item.value > 0 ? 100 : 0;

        return {
          period: item.period,
          value: item.value,
          change,
          changePercentage,
        };
      });

      this.log.debug('Trends calculated', {
        userId,
        metric,
        dataPoints: trends.length,
        duration: Date.now() - startTime,
      });

      return trends;
    } catch (error) {
      this.log.error('Failed to calculate trends', { userId, metric }, error);
      throw error;
    }
  }

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown(userId: string): Promise<CategoryBreakdown[]> {
    const startTime = Date.now();

    try {
      const entries = await prisma.trackerEntry.groupBy({
        by: ['category'],
        where: {
          userId,
          category: { not: null },
        },
        _count: { id: true },
        _sum: { timeSpent: true },
      });

      const total = entries.reduce((sum, e) => sum + e._count.id, 0);

      const breakdown: CategoryBreakdown[] = entries
        .filter((e) => e.category !== null)
        .map((e) => ({
          category: e.category as PlatformCategory,
          count: e._count.id,
          percentage: total > 0 ? Math.round((e._count.id / total) * 100) : 0,
          timeSpent: e._sum.timeSpent || 0,
        }))
        .sort((a, b) => b.count - a.count);

      this.log.debug('Category breakdown calculated', {
        userId,
        categories: breakdown.length,
        duration: Date.now() - startTime,
      });

      return breakdown;
    } catch (error) {
      this.log.error('Failed to calculate category breakdown', { userId }, error);
      throw error;
    }
  }

  /**
   * Get streak data
   */
  async getStreakData(userId: string): Promise<StreakData> {
    const startTime = Date.now();

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          streakStartDate: true,
          lastActivityDate: true,
          streakFreezeCount: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if streak is at risk (no activity today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastActivity = user.lastActivityDate
        ? new Date(user.lastActivityDate)
        : null;
      
      let isAtRisk = false;
      if (lastActivity && user.currentStreak > 0) {
        lastActivity.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor(
          (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        );
        isAtRisk = daysDiff >= 1;
      }

      const streakData: StreakData = {
        current: user.currentStreak,
        longest: user.longestStreak,
        startDate: user.streakStartDate,
        lastActivityDate: user.lastActivityDate,
        freezeCount: user.streakFreezeCount,
        isAtRisk,
      };

      this.log.debug('Streak data fetched', {
        userId,
        currentStreak: streakData.current,
        isAtRisk: streakData.isAtRisk,
        duration: Date.now() - startTime,
      });

      return streakData;
    } catch (error) {
      this.log.error('Failed to fetch streak data', { userId }, error);
      throw error;
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    options: {
      limit?: number;
      metric?: 'points' | 'streak' | 'problems';
      period?: 'all' | 'month' | 'week';
    } = {}
  ): Promise<LeaderboardEntry[]> {
    const { limit = 10, metric = 'points' } = options;
    const startTime = Date.now();

    try {
      const orderBy = {
        points: { totalPoints: 'desc' as const },
        streak: { currentStreak: 'desc' as const },
        problems: { totalProblems: 'desc' as const },
      }[metric];

      const users = await prisma.user.findMany({
        where: {
          isPublic: true,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          totalPoints: true,
          currentStreak: true,
        },
        orderBy,
        take: limit,
      });

      const leaderboard: LeaderboardEntry[] = users.map((user, index) => ({
        userId: user.id,
        username: user.username,
        name: user.name,
        image: user.image,
        totalPoints: user.totalPoints,
        currentStreak: user.currentStreak,
        rank: index + 1,
      }));

      this.log.debug('Leaderboard fetched', {
        metric,
        entries: leaderboard.length,
        duration: Date.now() - startTime,
      });

      return leaderboard;
    } catch (error) {
      this.log.error('Failed to fetch leaderboard', { metric }, error);
      throw error;
    }
  }

  /**
   * Generate insights for user
   */
  async generateInsights(userId: string): Promise<Insight[]> {
    const startTime = Date.now();
    const insights: Insight[] = [];

    try {
      // Get user data
      const [user, goals, streakData] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            currentStreak: true,
            longestStreak: true,
            lastActivityDate: true,
            totalProblems: true,
          },
        }),
        this.getGoalProgress(userId),
        this.getStreakData(userId),
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      // Streak insights
      if (streakData.isAtRisk) {
        insights.push({
          type: 'streak',
          title: '🔥 Streak at Risk!',
          message: `Your ${streakData.current}-day streak will break if you don't log activity today!`,
          priority: 'high',
          actionUrl: '/tracker',
        });
      }

      if (streakData.current > 0 && streakData.current % 7 === 0) {
        insights.push({
          type: 'streak',
          title: '🎉 Streak Milestone!',
          message: `Amazing! You've maintained a ${streakData.current}-day streak!`,
          priority: 'medium',
        });
      }

      // Goal insights
      const urgentGoals = goals.filter(
        (g) => g.daysRemaining !== null && g.daysRemaining <= 3 && g.progressPercentage < 100
      );

      for (const goal of urgentGoals) {
        insights.push({
          type: 'goal',
          title: '⚠️ Goal Deadline Approaching',
          message: `"${goal.title}" is due in ${goal.daysRemaining} day(s) - ${goal.progressPercentage}% complete`,
          priority: 'high',
          actionUrl: `/goals/${goal.goalId}`,
          metadata: { goalId: goal.goalId },
        });
      }

      // Achievement suggestions
      if (user.totalProblems >= 90 && user.totalProblems < 100) {
        insights.push({
          type: 'achievement',
          title: '🏆 Almost There!',
          message: `Solve ${100 - user.totalProblems} more problems to unlock the "Century Solver" achievement!`,
          priority: 'medium',
          actionUrl: '/achievements',
        });
      }

      this.log.debug('Insights generated', {
        userId,
        insightCount: insights.length,
        duration: Date.now() - startTime,
      });

      return insights;
    } catch (error) {
      this.log.error('Failed to generate insights', { userId }, error);
      throw error;
    }
  }

  /**
   * Helper: Group data by time granularity
   */
  private groupByGranularity(
    data: Array<{ date: Date; [key: string]: unknown }>,
    granularity: 'day' | 'week' | 'month',
    metricField: string
  ): Array<{ period: string; value: number }> {
    const grouped = new Map<string, number>();

    for (const item of data) {
      let periodKey: string;
      const date = new Date(item.date);

      switch (granularity) {
        case 'day':
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = `W${weekStart.toISOString().split('T')[0]}`;
          break;
        case 'month':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          periodKey = date.toISOString().split('T')[0];
      }

      const currentValue = grouped.get(periodKey) || 0;
      const itemValue = (item as Record<string, unknown>)[metricField] as number || 0;
      grouped.set(periodKey, currentValue + itemValue);
    }

    return Array.from(grouped.entries())
      .map(([period, value]) => ({ period, value }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }
}

// Export singleton
export const analytics = new AnalyticsService();
export default analytics;