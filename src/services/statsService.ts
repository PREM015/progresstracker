// src/services/statsService.ts

import { prisma } from '@/lib/prisma';
import {
  subDays,
  startOfDay,
  endOfDay,
  format,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
} from 'date-fns';
import type {
  TrackerEntry,
  PlatformCategory,
  GoalStatus,
  Platform,
} from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface OverallStatsResponse {
  totalProblems: number;
  totalCommits: number;
  totalPullRequests: number;
  totalTimeSpent: number;
  totalPoints: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  avgProblemsPerDay: number;
  avgTimePerDay: number;
  avgCommitsPerDay: number;
  platformStats: PlatformBreakdownItem[];
  categoryStats: CategoryBreakdownItem[];
  difficultyBreakdown: DifficultyBreakdown;
  recentActivity: RecentActivityItem[];
}

export interface PlatformBreakdownItem {
  platformId: string;
  platformName?: string;
  slug?: string;
  icon?: string | null;
  problems: number;
  commits: number;
  time: number;
  count: number;
}

export interface CategoryBreakdownItem {
  category: PlatformCategory;
  problems: number;
  commits: number;
  time: number;
  count: number;
}

export interface DifficultyBreakdown {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

export interface RecentActivityItem {
  id: string;
  date: Date;
  platformId: string | null;
  platformName?: string;
  category: PlatformCategory | null;
  problemsSolved: number;
  commits: number;
  timeSpent: number;
  notes: string | null;
}

export interface StreakData {
  current: number;
  longest: number;
  lastActivityDate: Date | null;
  streakStartDate: Date | null;
}

export interface HeatmapDataPoint {
  date: string;
  count: number;
  level: number; // 0-4 for intensity
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface MonthlyBreakdownItem {
  month: string;
  year: number;
  problems: number;
  commits: number;
  time: number;
  activeDays: number;
  avgProblemsPerDay: number;
}

export interface WeeklyComparisonResult {
  thisWeek: number;
  lastWeek: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SummaryStatsResponse {
  totalProblems: number;
  totalCommits: number;
  totalPullRequests: number;
  totalTimeSpent: number;
  totalPoints: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  connectedPlatforms: number;
  activeGoals: number;
  completedGoals: number;
  achievementsUnlocked: number;
  avgProblemsPerDay: number;
  avgTimePerDay: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface PlatformTrendItem {
  platformId: string;
  platformName?: string;
  total: number;
  data: TrendDataPoint[];
}

// =============================================================================
// STATS SERVICE CLASS
// =============================================================================

export class StatsService {
  // ===========================================================================
  // OVERALL STATS
  // ===========================================================================

  /**
   * Get comprehensive overall stats for a user
   */
  static async getOverallStats(
    userId: string,
    days: number = 30
  ): Promise<OverallStatsResponse> {
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Fetch entries with platform info
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        platform: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Get user's cached streak data for performance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
        streakStartDate: true,
      },
    });

    // Calculate totals
    const totalProblems = entries.reduce((sum, e) => sum + e.problemsSolved, 0);
    const totalCommits = entries.reduce((sum, e) => sum + e.commits, 0);
    const totalPullRequests = entries.reduce((sum, e) => sum + e.pullRequests, 0);
    const totalTimeSpent = entries.reduce((sum, e) => sum + e.timeSpent, 0);
    const totalPoints = entries.reduce((sum, e) => sum + (e.points ?? 0), 0);

    // Difficulty breakdown
    const difficultyBreakdown: DifficultyBreakdown = {
      easy: entries.reduce((sum, e) => sum + e.easyProblems, 0),
      medium: entries.reduce((sum, e) => sum + e.mediumProblems, 0),
      hard: entries.reduce((sum, e) => sum + e.hardProblems, 0),
      total: totalProblems,
    };

    // Unique active days
    const uniqueDays = new Set(
      entries.map((e) => format(e.date, 'yyyy-MM-dd'))
    ).size;

    // Get streak (use cached or calculate)
    const streak = user?.currentStreak !== undefined && user?.longestStreak !== undefined
      ? { current: user.currentStreak, longest: user.longestStreak }
      : await this.calculateStreak(userId);

    // Platform breakdown
    const platformStats = await this.getPlatformBreakdown(userId, startDate, endDate);

    // Category breakdown
    const categoryStats = await this.getCategoryBreakdown(userId, startDate, endDate);

    // Recent activity
    const recentActivity: RecentActivityItem[] = entries.slice(0, 10).map((entry) => ({
      id: entry.id,
      date: entry.date,
      platformId: entry.platformId,
      platformName: entry.platform?.name,
      category: entry.category,
      problemsSolved: entry.problemsSolved,
      commits: entry.commits,
      timeSpent: entry.timeSpent,
      notes: entry.notes,
    }));

    return {
      totalProblems,
      totalCommits,
      totalPullRequests,
      totalTimeSpent,
      totalPoints,
      activeDays: uniqueDays,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      avgProblemsPerDay: uniqueDays > 0 ? Math.round(totalProblems / uniqueDays) : 0,
      avgTimePerDay: uniqueDays > 0 ? Math.round(totalTimeSpent / uniqueDays) : 0,
      avgCommitsPerDay: uniqueDays > 0 ? Math.round(totalCommits / uniqueDays) : 0,
      platformStats,
      categoryStats,
      difficultyBreakdown,
      recentActivity,
    };
  }

  // ===========================================================================
  // STREAK CALCULATION
  // ===========================================================================

  /**
   * Calculate current and longest streak from entries
   */
  static async calculateStreak(userId: string): Promise<StreakData> {
    // First check if we have cached streak data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
        streakStartDate: true,
      },
    });

    // Try to get from StreakHistory for most accurate data
    const currentStreakRecord = await prisma.streakHistory.findFirst({
      where: { userId, isCurrent: true },
      orderBy: { startDate: 'desc' },
    });

    const longestStreakRecord = await prisma.streakHistory.findFirst({
      where: { userId },
      orderBy: { length: 'desc' },
    });

    if (currentStreakRecord && longestStreakRecord) {
      return {
        current: currentStreakRecord.length,
        longest: longestStreakRecord.length,
        lastActivityDate: user?.lastActivityDate ?? null,
        streakStartDate: currentStreakRecord.startDate,
      };
    }

    // Fallback: Calculate from entries
    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (!entries.length) {
      return {
        current: 0,
        longest: 0,
        lastActivityDate: null,
        streakStartDate: null
      };
    }

    // Get unique dates sorted descending
    const uniqueDates = [
      ...new Set(entries.map((e) => format(e.date, 'yyyy-MM-dd'))),
    ].sort((a, b) => b.localeCompare(a));

    // Calculate current streak
    let current = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      current = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const expected = format(
          subDays(new Date(uniqueDates[i - 1]), 1),
          'yyyy-MM-dd'
        );
        if (uniqueDates[i] === expected) {
          current++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longest = uniqueDates.length > 0 ? 1 : 0;
    let temp = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const expected = format(
        subDays(new Date(uniqueDates[i - 1]), 1),
        'yyyy-MM-dd'
      );
      if (uniqueDates[i] === expected) {
        temp++;
        longest = Math.max(longest, temp);
      } else {
        temp = 1;
      }
    }

    // Calculate streak start date
    let streakStartDate: Date | null = null;
    if (current > 0) {
      streakStartDate = subDays(new Date(uniqueDates[0]), current - 1);
    }

    // Update user's cached streak data
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: current,
        longestStreak: Math.max(longest, user?.longestStreak ?? 0),
        lastActivityDate: entries[0]?.date,
        streakStartDate,
      },
    }).catch(() => {
      // Ignore update errors
    });

    return {
      current,
      longest: Math.max(longest, user?.longestStreak ?? 0),
      lastActivityDate: entries[0]?.date ?? null,
      streakStartDate,
    };
  }

  /**
   * Check if user has activity today
   */
  static async hasActivityToday(userId: string): Promise<boolean> {
    const today = startOfDay(new Date());
    const tomorrow = endOfDay(new Date());

    const entry = await prisma.trackerEntry.findFirst({
      where: {
        userId,
        date: { gte: today, lte: tomorrow },
      },
    });

    return !!entry;
  }

  // ===========================================================================
  // PLATFORM BREAKDOWN
  // ===========================================================================

  /**
   * Get stats breakdown by platform
   */
  static async getPlatformBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PlatformBreakdownItem[]> {
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        platformId: { not: null },
      },
      include: {
        platform: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
    });

    const breakdown: Record<string, PlatformBreakdownItem> = {};

    entries.forEach((entry) => {
      const key = entry.platformId!;
      if (!breakdown[key]) {
        breakdown[key] = {
          platformId: key,
          platformName: entry.platform?.name,
          slug: entry.platform?.slug,
          icon: entry.platform?.icon,
          problems: 0,
          commits: 0,
          time: 0,
          count: 0,
        };
      }
      breakdown[key].problems += entry.problemsSolved;
      breakdown[key].commits += entry.commits;
      breakdown[key].time += entry.timeSpent;
      breakdown[key].count++;
    });

    return Object.values(breakdown).sort((a, b) => b.problems - a.problems);
  }

  // ===========================================================================
  // CATEGORY BREAKDOWN
  // ===========================================================================

  /**
   * Get stats breakdown by category
   */
  static async getCategoryBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CategoryBreakdownItem[]> {
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        category: { not: null },
      },
    });

    const breakdown: Record<string, CategoryBreakdownItem> = {};

    entries.forEach((entry) => {
      if (!entry.category) return;

      const key = entry.category;
      if (!breakdown[key]) {
        breakdown[key] = {
          category: key,
          problems: 0,
          commits: 0,
          time: 0,
          count: 0,
        };
      }
      breakdown[key].problems += entry.problemsSolved;
      breakdown[key].commits += entry.commits;
      breakdown[key].time += entry.timeSpent;
      breakdown[key].count++;
    });

    return Object.values(breakdown).sort((a, b) => b.problems - a.problems);
  }

  // ===========================================================================
  // MONTHLY BREAKDOWN
  // ===========================================================================

  /**
   * Get monthly breakdown of activity
   */
  static async getMonthlyBreakdown(
    userId: string,
    months: number = 6
  ): Promise<MonthlyBreakdownItem[]> {
    const startDate = startOfDay(subDays(new Date(), months * 30));
    const endDate = endOfDay(new Date());

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const monthly: Record<
      string,
      {
        problems: number;
        commits: number;
        time: number;
        days: Set<string>;
        year: number;
      }
    > = {};

    entries.forEach((entry) => {
      const key = format(entry.date, 'yyyy-MM');
      const year = entry.date.getFullYear();

      if (!monthly[key]) {
        monthly[key] = {
          problems: 0,
          commits: 0,
          time: 0,
          days: new Set(),
          year,
        };
      }
      monthly[key].problems += entry.problemsSolved;
      monthly[key].commits += entry.commits;
      monthly[key].time += entry.timeSpent;
      monthly[key].days.add(format(entry.date, 'yyyy-MM-dd'));
    });

    return Object.entries(monthly)
      .map(([month, data]) => ({
        month,
        year: data.year,
        problems: data.problems,
        commits: data.commits,
        time: data.time,
        activeDays: data.days.size,
        avgProblemsPerDay: data.days.size > 0
          ? Math.round(data.problems / data.days.size)
          : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // ===========================================================================
  // HEATMAP DATA
  // ===========================================================================

  /**
   * Get heatmap data for the last 365 days
   */
  static async getHeatmapData(userId: string): Promise<HeatmapDataPoint[]> {
    const startDate = startOfDay(subDays(new Date(), 365));
    const endDate = endOfDay(new Date());

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    });

    // Aggregate by day
    const daily: Record<string, number> = {};
    entries.forEach((entry) => {
      const key = format(entry.date, 'yyyy-MM-dd');
      daily[key] = (daily[key] || 0) + entry.problemsSolved + entry.commits;
    });

    // Find max for level calculation
    const maxCount = Math.max(...Object.values(daily), 1);

    // Generate all days
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return allDays.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const count = daily[key] || 0;

      // Calculate level (0-4)
      let level = 0;
      if (count > 0) {
        const ratio = count / maxCount;
        if (ratio > 0.75) level = 4;
        else if (ratio > 0.5) level = 3;
        else if (ratio > 0.25) level = 2;
        else level = 1;
      }

      return { date: key, count, level };
    });
  }

  // ===========================================================================
  // SUMMARY STATS
  // ===========================================================================

  /**
   * Get comprehensive summary stats
   */
  static async getSummaryStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SummaryStatsResponse> {
    const [
      entries,
      connectedPlatforms,
      activeGoals,
      completedGoals,
      achievementsUnlocked,
      user,
    ] = await Promise.all([
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
      }),
      prisma.userPlatform.count({
        where: { userId, isActive: true },
      }),
      prisma.goal.count({
        where: { userId, status: 'ACTIVE' },
      }),
      prisma.goal.count({
        where: { userId, status: 'COMPLETED' },
      }),
      prisma.userAchievement.count({
        where: { userId },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
        },
      }),
    ]);

    const totalProblems = entries.reduce((s, e) => s + e.problemsSolved, 0);
    const totalCommits = entries.reduce((s, e) => s + e.commits, 0);
    const totalPullRequests = entries.reduce((s, e) => s + e.pullRequests, 0);
    const totalTimeSpent = entries.reduce((s, e) => s + e.timeSpent, 0);
    const totalPoints = entries.reduce((s, e) => s + (e.points ?? 0), 0);

    const activeDays = new Set(
      entries.map((e) => format(e.date, 'yyyy-MM-dd'))
    ).size;

    // Get streak from user or calculate
    const streak = user?.currentStreak !== undefined
      ? { current: user.currentStreak, longest: user.longestStreak ?? 0 }
      : await this.calculateStreak(userId);

    return {
      totalProblems,
      totalCommits,
      totalPullRequests,
      totalTimeSpent,
      totalPoints,
      activeDays,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      connectedPlatforms,
      activeGoals,
      completedGoals,
      achievementsUnlocked,
      avgProblemsPerDay: activeDays > 0 ? Math.round(totalProblems / activeDays) : 0,
      avgTimePerDay: activeDays > 0 ? Math.round(totalTimeSpent / activeDays) : 0,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  // ===========================================================================
  // TREND DATA
  // ===========================================================================

  /**
   * Get trend data for a specific metric
   */
  static async getTrendData(
    userId: string,
    startDate: Date,
    endDate: Date,
    metric: 'problems' | 'time' | 'commits' | 'pullRequests' | 'points' = 'problems'
  ): Promise<TrendDataPoint[]> {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
    });

    const daily: Record<string, number> = {};

    entries.forEach((entry) => {
      const key = format(entry.date, 'yyyy-MM-dd');
      if (!daily[key]) daily[key] = 0;

      switch (metric) {
        case 'problems':
          daily[key] += entry.problemsSolved;
          break;
        case 'time':
          daily[key] += entry.timeSpent;
          break;
        case 'commits':
          daily[key] += entry.commits;
          break;
        case 'pullRequests':
          daily[key] += entry.pullRequests;
          break;
        case 'points':
          daily[key] += entry.points ?? 0;
          break;
      }
    });

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map((d) => ({
      date: format(d, 'yyyy-MM-dd'),
      value: daily[format(d, 'yyyy-MM-dd')] || 0,
    }));
  }

  /**
   * Get cumulative trend data
   */
  static async getCumulativeTrendData(
    userId: string,
    startDate: Date,
    endDate: Date,
    metric: 'problems' | 'time' | 'commits' = 'problems'
  ): Promise<TrendDataPoint[]> {
    const dailyData = await this.getTrendData(userId, startDate, endDate, metric);

    let cumulative = 0;
    return dailyData.map((point) => {
      cumulative += point.value;
      return {
        date: point.date,
        value: cumulative,
      };
    });
  }

  // ===========================================================================
  // WEEKLY COMPARISON
  // ===========================================================================

  /**
   * Compare this week vs last week
   */
  static async getWeeklyComparison(
    userId: string,
    metric: 'problems' | 'commits' | 'time' = 'problems'
  ): Promise<WeeklyComparisonResult> {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = startOfWeek(subDays(now, 7));
    const lastWeekEnd = endOfWeek(subDays(now, 7));

    const [thisWeekEntries, lastWeekEntries] = await Promise.all([
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: thisWeekStart, lte: thisWeekEnd } },
      }),
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: lastWeekStart, lte: lastWeekEnd } },
      }),
    ]);

    const sum = (entries: TrackerEntry[]): number => {
      return entries.reduce((s, e) => {
        switch (metric) {
          case 'problems':
            return s + e.problemsSolved;
          case 'commits':
            return s + e.commits;
          case 'time':
            return s + e.timeSpent;
          default:
            return s + e.problemsSolved;
        }
      }, 0);
    };

    const thisWeekTotal = sum(thisWeekEntries);
    const lastWeekTotal = sum(lastWeekEntries);
    const change = thisWeekTotal - lastWeekTotal;
    const changePercent = lastWeekTotal > 0
      ? Math.round((change / lastWeekTotal) * 100)
      : thisWeekTotal > 0 ? 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 5) trend = 'up';
    else if (changePercent < -5) trend = 'down';

    return {
      thisWeek: thisWeekTotal,
      lastWeek: lastWeekTotal,
      change,
      changePercent,
      trend,
    };
  }
  // Add these methods to the StatsService class

  // ===========================================================================
  // MONTHLY STATS (Uses endOfMonth)
  // ===========================================================================

  /**
   * Get stats for a specific month
   */
  static async getMonthStats(userId: string, year: number, month: number) {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        platform: {
          select: { id: true, name: true },
        },
      },
    });

    const totalProblems = entries.reduce((s, e) => s + e.problemsSolved, 0);
    const totalCommits = entries.reduce((s, e) => s + e.commits, 0);
    const totalPullRequests = entries.reduce((s, e) => s + e.pullRequests, 0);
    const totalTimeSpent = entries.reduce((s, e) => s + e.timeSpent, 0);
    const totalPoints = entries.reduce((s, e) => s + (e.points ?? 0), 0);

    const activeDays = new Set(
      entries.map((e) => format(e.date, 'yyyy-MM-dd'))
    ).size;

    const daysInMonth = differenceInDays(endDate, startDate) + 1;

    // Daily breakdown for the month
    const dailyBreakdown: Record<string, {
      problems: number;
      commits: number;
      time: number;
    }> = {};

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    allDays.forEach((day) => {
      dailyBreakdown[format(day, 'yyyy-MM-dd')] = {
        problems: 0,
        commits: 0,
        time: 0,
      };
    });

    entries.forEach((entry) => {
      const key = format(entry.date, 'yyyy-MM-dd');
      if (dailyBreakdown[key]) {
        dailyBreakdown[key].problems += entry.problemsSolved;
        dailyBreakdown[key].commits += entry.commits;
        dailyBreakdown[key].time += entry.timeSpent;
      }
    });

    // Best day of the month
    let bestDay = { date: '', problems: 0 };
    Object.entries(dailyBreakdown).forEach(([date, stats]) => {
      if (stats.problems > bestDay.problems) {
        bestDay = { date, problems: stats.problems };
      }
    });

    return {
      year,
      month,
      monthName: format(startDate, 'MMMM'),
      startDate,
      endDate,
      daysInMonth,
      activeDays,
      activityRate: Math.round((activeDays / daysInMonth) * 100),
      totalProblems,
      totalCommits,
      totalPullRequests,
      totalTimeSpent,
      totalPoints,
      avgProblemsPerDay: activeDays > 0 ? Math.round(totalProblems / activeDays) : 0,
      avgProblemsPerMonthDay: Math.round(totalProblems / daysInMonth),
      bestDay,
      dailyBreakdown: Object.entries(dailyBreakdown).map(([date, stats]) => ({
        date,
        ...stats,
      })),
    };
  }

  /**
   * Compare two months
   */
  static async compareMonths(
    userId: string,
    year1: number,
    month1: number,
    year2: number,
    month2: number
  ) {
    const [stats1, stats2] = await Promise.all([
      this.getMonthStats(userId, year1, month1),
      this.getMonthStats(userId, year2, month2),
    ]);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      month1: stats1,
      month2: stats2,
      comparison: {
        problems: {
          change: stats1.totalProblems - stats2.totalProblems,
          changePercent: calculateChange(stats1.totalProblems, stats2.totalProblems),
        },
        commits: {
          change: stats1.totalCommits - stats2.totalCommits,
          changePercent: calculateChange(stats1.totalCommits, stats2.totalCommits),
        },
        time: {
          change: stats1.totalTimeSpent - stats2.totalTimeSpent,
          changePercent: calculateChange(stats1.totalTimeSpent, stats2.totalTimeSpent),
        },
        activeDays: {
          change: stats1.activeDays - stats2.activeDays,
          changePercent: calculateChange(stats1.activeDays, stats2.activeDays),
        },
      },
    };
  }

  // ===========================================================================
  // STREAK ANALYSIS (Uses differenceInDays)
  // ===========================================================================

  /**
   * Get detailed streak analysis
   */
  static async getStreakAnalysis(userId: string) {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (!entries.length) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        firstActivityDate: null,
        lastActivityDate: null,
        daysSinceFirstActivity: 0,
        averageGapBetweenSessions: 0,
        streakHistory: [],
        isAtRisk: false,
        daysUntilStreakBreaks: 0,
      };
    }

    // Get unique dates
    const uniqueDatesSet = new Set(
      entries.map((e) => format(e.date, 'yyyy-MM-dd'))
    );
    const uniqueDates = Array.from(uniqueDatesSet).sort((a, b) =>
      b.localeCompare(a)
    );

    const firstActivityDate = new Date(uniqueDates[uniqueDates.length - 1]);
    const lastActivityDate = new Date(uniqueDates[0]);
    const today = new Date();

    const daysSinceFirstActivity = differenceInDays(today, firstActivityDate);
    const daysSinceLastActivity = differenceInDays(today, lastActivityDate);

    // Calculate gaps between sessions
    const gaps: number[] = [];
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const gap = differenceInDays(
        new Date(uniqueDates[i]),
        new Date(uniqueDates[i + 1])
      );
      if (gap > 1) {
        gaps.push(gap - 1);
      }
    }

    const averageGapBetweenSessions = gaps.length > 0
      ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
      : 0;

    // Calculate current streak
    let currentStreak = 0;
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const expected = format(
          subDays(new Date(uniqueDates[i - 1]), 1),
          'yyyy-MM-dd'
        );
        if (uniqueDates[i] === expected) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate all streaks for history
    const streakHistory: Array<{
      startDate: string;
      endDate: string;
      length: number;
    }> = [];

    let streakStart = 0;
    for (let i = 1; i <= uniqueDates.length; i++) {
      if (
        i === uniqueDates.length ||
        differenceInDays(
          new Date(uniqueDates[i - 1]),
          new Date(uniqueDates[i])
        ) > 1
      ) {
        const length = i - streakStart;
        streakHistory.push({
          startDate: uniqueDates[i - 1],
          endDate: uniqueDates[streakStart],
          length,
        });
        streakStart = i;
      }
    }

    const longestStreak = Math.max(...streakHistory.map((s) => s.length), 0);

    // Streak risk assessment
    const isAtRisk = daysSinceLastActivity >= 1 && currentStreak > 0;
    const daysUntilStreakBreaks = currentStreak > 0
      ? Math.max(0, 1 - daysSinceLastActivity)
      : 0;

    return {
      currentStreak,
      longestStreak,
      totalActiveDays: uniqueDates.length,
      firstActivityDate,
      lastActivityDate,
      daysSinceFirstActivity,
      daysSinceLastActivity,
      averageGapBetweenSessions,
      activityConsistency: daysSinceFirstActivity > 0
        ? Math.round((uniqueDates.length / daysSinceFirstActivity) * 100)
        : 0,
      streakHistory: streakHistory.slice(0, 10), // Last 10 streaks
      topStreaks: streakHistory
        .sort((a, b) => b.length - a.length)
        .slice(0, 5),
      isAtRisk,
      daysUntilStreakBreaks,
    };
  }

  /**
   * Get streak milestones
   */
  static async getStreakMilestones(userId: string) {
    const analysis = await this.getStreakAnalysis(userId);

    const milestones = [
      { days: 7, name: 'Week Warrior', icon: '🔥' },
      { days: 14, name: 'Two Week Champion', icon: '⚡' },
      { days: 30, name: 'Monthly Master', icon: '🏆' },
      { days: 60, name: 'Consistency King', icon: '👑' },
      { days: 90, name: 'Quarter Crusher', icon: '💎' },
      { days: 180, name: 'Half Year Hero', icon: '🌟' },
      { days: 365, name: 'Year Legend', icon: '🎯' },
    ];

    return milestones.map((milestone) => ({
      ...milestone,
      achieved: analysis.longestStreak >= milestone.days,
      currentProgress: analysis.currentStreak,
      progressPercent: Math.min(
        100,
        Math.round((analysis.currentStreak / milestone.days) * 100)
      ),
      daysRemaining: Math.max(0, milestone.days - analysis.currentStreak),
    }));
  }

  // ===========================================================================
  // PLATFORM ANALYSIS (Uses Platform type)
  // ===========================================================================

  /**
   * Get detailed platform statistics
   */
  static async getPlatformStats(userId: string): Promise<{
    platforms: Array<{
      platform: Pick<Platform, 'id' | 'name' | 'slug' | 'category' | 'icon' | 'color'>;
      stats: {
        totalProblems: number;
        totalCommits: number;
        totalTime: number;
        totalEntries: number;
        lastActivity: Date | null;
        streak: number;
        avgProblemsPerSession: number;
      };
      trend: 'up' | 'down' | 'stable';
    }>;
    mostActive: string | null;
    leastActive: string | null;
    totalPlatforms: number;
  }> {
    // Get user's connected platforms
    const userPlatforms = await prisma.userPlatform.findMany({
      where: { userId, isActive: true },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    // Get entries for the last 30 days for trend calculation
    const thirtyDaysAgo = subDays(new Date(), 30);
    const fifteenDaysAgo = subDays(new Date(), 15);

    const platformStats = await Promise.all(
      userPlatforms.map(async (up) => {
        // Get all entries for this platform
        const allEntries = await prisma.trackerEntry.findMany({
          where: { userId, platformId: up.platformId },
          orderBy: { date: 'desc' },
        });

        // Get recent entries for trend
        const recentEntries = allEntries.filter(
          (e) => e.date >= thirtyDaysAgo
        );
        const firstHalf = recentEntries.filter(
          (e) => e.date < fifteenDaysAgo
        );
        const secondHalf = recentEntries.filter(
          (e) => e.date >= fifteenDaysAgo
        );

        const firstHalfProblems = firstHalf.reduce(
          (s, e) => s + e.problemsSolved, 0
        );
        const secondHalfProblems = secondHalf.reduce(
          (s, e) => s + e.problemsSolved, 0
        );

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (secondHalfProblems > firstHalfProblems * 1.1) trend = 'up';
        else if (secondHalfProblems < firstHalfProblems * 0.9) trend = 'down';

        // Calculate platform streak
        const uniqueDates = [
          ...new Set(allEntries.map((e) => format(e.date, 'yyyy-MM-dd'))),
        ].sort((a, b) => b.localeCompare(a));

        let platformStreak = 0;
        const today = format(new Date(), 'yyyy-MM-dd');
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

        if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
          platformStreak = 1;
          for (let i = 1; i < uniqueDates.length; i++) {
            const expected = format(
              subDays(new Date(uniqueDates[i - 1]), 1),
              'yyyy-MM-dd'
            );
            if (uniqueDates[i] === expected) {
              platformStreak++;
            } else {
              break;
            }
          }
        }

        const totalProblems = allEntries.reduce(
          (s, e) => s + e.problemsSolved, 0
        );

        return {
          platform: up.platform,
          stats: {
            totalProblems,
            totalCommits: allEntries.reduce((s, e) => s + e.commits, 0),
            totalTime: allEntries.reduce((s, e) => s + e.timeSpent, 0),
            totalEntries: allEntries.length,
            lastActivity: allEntries[0]?.date ?? null,
            streak: platformStreak,
            avgProblemsPerSession: allEntries.length > 0
              ? Math.round(totalProblems / allEntries.length)
              : 0,
          },
          trend,
        };
      })
    );

    // Sort by total problems to find most/least active
    const sorted = [...platformStats].sort(
      (a, b) => b.stats.totalProblems - a.stats.totalProblems
    );

    return {
      platforms: platformStats,
      mostActive: sorted[0]?.platform.name ?? null,
      leastActive: sorted[sorted.length - 1]?.platform.name ?? null,
      totalPlatforms: platformStats.length,
    };
  }

  /**
   * Get platform recommendations based on activity
   */
  static async getPlatformRecommendations(userId: string) {
    const platformStats = await this.getPlatformStats(userId);
    const recommendations: Array<{
      type: 'inactive' | 'trending_down' | 'new_suggestion';
      platform?: string;
      message: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // Check for inactive platforms (no activity in 7 days)
    const sevenDaysAgo = subDays(new Date(), 7);
    platformStats.platforms.forEach((p) => {
      if (p.stats.lastActivity && p.stats.lastActivity < sevenDaysAgo) {
        const daysSince = differenceInDays(new Date(), p.stats.lastActivity);
        recommendations.push({
          type: 'inactive',
          platform: p.platform.name,
          message: `You haven't practiced on ${p.platform.name} for ${daysSince} days`,
          priority: daysSince > 14 ? 'high' : 'medium',
        });
      }
    });

    // Check for declining platforms
    platformStats.platforms
      .filter((p) => p.trend === 'down')
      .forEach((p) => {
        recommendations.push({
          type: 'trending_down',
          platform: p.platform.name,
          message: `Your activity on ${p.platform.name} has decreased recently`,
          priority: 'medium',
        });
      });

    // Suggest exploring other platforms if user has few
    if (platformStats.totalPlatforms < 3) {
      recommendations.push({
        type: 'new_suggestion',
        message: 'Consider connecting more platforms to diversify your practice',
        priority: 'low',
      });
    }

    return recommendations;
  }
  // ===========================================================================
  // PLATFORM TRENDS
  // ===========================================================================

  /**
   * Get trend data grouped by platform
   */
  static async getPlatformTrends(
    userId: string,
    days: number = 30
  ): Promise<PlatformTrendItem[]> {
    const startDate = startOfDay(subDays(new Date(), days));

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate },
        platformId: { not: null },
      },
      include: {
        platform: {
          select: { id: true, name: true },
        },
      },
    });

    const platformMap: Record<string, {
      name?: string;
      dates: Record<string, number>;
    }> = {};

    entries.forEach((e) => {
      const platform = e.platformId!;
      const dateKey = format(e.date, 'yyyy-MM-dd');

      if (!platformMap[platform]) {
        platformMap[platform] = {
          name: e.platform?.name,
          dates: {},
        };
      }

      platformMap[platform].dates[dateKey] =
        (platformMap[platform].dates[dateKey] || 0) + e.problemsSolved;
    });

    return Object.entries(platformMap).map(([platformId, data]) => ({
      platformId,
      platformName: data.name,
      total: Object.values(data.dates).reduce((a, b) => a + b, 0),
      data: Object.entries(data.dates)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }

  // ===========================================================================
  // DIFFICULTY STATS
  // ===========================================================================

  /**
   * Get difficulty breakdown over time
   */
  static async getDifficultyStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    breakdown: DifficultyBreakdown;
    trend: Array<{ date: string; easy: number; medium: number; hard: number }>;
  }> {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
    });

    const breakdown: DifficultyBreakdown = {
      easy: entries.reduce((s, e) => s + e.easyProblems, 0),
      medium: entries.reduce((s, e) => s + e.mediumProblems, 0),
      hard: entries.reduce((s, e) => s + e.hardProblems, 0),
      total: entries.reduce((s, e) => s + e.problemsSolved, 0),
    };

    const daily: Record<string, { easy: number; medium: number; hard: number }> = {};

    entries.forEach((entry) => {
      const key = format(entry.date, 'yyyy-MM-dd');
      if (!daily[key]) {
        daily[key] = { easy: 0, medium: 0, hard: 0 };
      }
      daily[key].easy += entry.easyProblems;
      daily[key].medium += entry.mediumProblems;
      daily[key].hard += entry.hardProblems;
    });

    const trend = Object.entries(daily)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { breakdown, trend };
  }

  // ===========================================================================
  // GOAL PROGRESS STATS
  // ===========================================================================

  /**
   * Get goal-related stats
   */
  static async getGoalStats(userId: string) {
    const goals = await prisma.goal.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        target: true,
        progress: true,
        progressPercentage: true,
        status: true,
        category: true,
        startDate: true,
        endDate: true,
        deadline: true,
        completedAt: true,
      },
    });

    const byStatus: Record<GoalStatus, number> = {
      DRAFT: 0,
      ACTIVE: 0,
      PAUSED: 0,
      COMPLETED: 0,
      FAILED: 0,
      ARCHIVED: 0,
      CANCELLED: 0,
    };

    goals.forEach((g) => {
      byStatus[g.status]++;
    });

    const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
    const avgProgress = activeGoals.length > 0
      ? activeGoals.reduce((s, g) => s + g.progressPercentage, 0) / activeGoals.length
      : 0;

    const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
    const completionRate = goals.length > 0
      ? (completedGoals.length / goals.length) * 100
      : 0;

    return {
      total: goals.length,
      byStatus,
      activeCount: byStatus.ACTIVE,
      completedCount: byStatus.COMPLETED,
      avgProgress: Math.round(avgProgress),
      completionRate: Math.round(completionRate),
      activeGoals: activeGoals.map((g) => ({
        id: g.id,
        title: g.title,
        progress: g.progress,
        target: g.target,
        progressPercentage: g.progressPercentage,
        deadline: g.deadline,
      })),
    };
  }

  // ===========================================================================
  // LEADERBOARD STATS
  // ===========================================================================

  /**
   * Get leaderboard data
   */
  static async getLeaderboard(
    limit: number = 10,
    metric: 'problems' | 'streak' | 'points' = 'problems',
    period: 'week' | 'month' | 'all' = 'week'
  ) {
    let startDate: Date | undefined;

    if (period === 'week') {
      startDate = startOfWeek(new Date());
    } else if (period === 'month') {
      startDate = startOfMonth(new Date());
    }

    if (metric === 'streak') {
      return prisma.user.findMany({
        where: {
          isPublic: true,
          isActive: true,
          showStreak: true,
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          currentStreak: true,
          totalPoints: true,
        },
        orderBy: { currentStreak: 'desc' },
        take: limit,
      });
    }

    if (metric === 'points') {
      return prisma.user.findMany({
        where: {
          isPublic: true,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          totalPoints: true,
          currentStreak: true,
        },
        orderBy: { totalPoints: 'desc' },
        take: limit,
      });
    }

    // Problems metric
    if (startDate) {
      const aggregation = await prisma.trackerEntry.groupBy({
        by: ['userId'],
        where: {
          date: { gte: startDate },
          user: {
            isPublic: true,
            isActive: true,
          },
        },
        _sum: { problemsSolved: true },
        orderBy: {
          _sum: {
            problemsSolved: 'desc',
          },
        },
        take: limit,
      });

      const userIds = aggregation.map((a) => a.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          currentStreak: true,
        },
      });

      return aggregation.map((a) => {
        const user = users.find((u) => u.id === a.userId);
        return {
          ...user,
          problemsSolved: a._sum.problemsSolved ?? 0,
        };
      });
    }

    // All time
    return prisma.user.findMany({
      where: {
        isPublic: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        totalProblems: true,
        currentStreak: true,
      },
      orderBy: { totalProblems: 'desc' },
      take: limit,
    });
  }

  // ===========================================================================
  // TIME-BASED ANALYSIS
  // ===========================================================================

  /**
   * Get activity by day of week
   */
  static async getActivityByDayOfWeek(userId: string, days: number = 90) {
    const startDate = subDays(new Date(), days);

    const entries = await prisma.trackerEntry.findMany({
      where: { userId, date: { gte: startDate } },
    });

    const byDay: Record<number, { count: number; problems: number; time: number }> = {
      0: { count: 0, problems: 0, time: 0 }, // Sunday
      1: { count: 0, problems: 0, time: 0 },
      2: { count: 0, problems: 0, time: 0 },
      3: { count: 0, problems: 0, time: 0 },
      4: { count: 0, problems: 0, time: 0 },
      5: { count: 0, problems: 0, time: 0 },
      6: { count: 0, problems: 0, time: 0 }, // Saturday
    };

    entries.forEach((e) => {
      const day = e.date.getDay();
      byDay[day].count++;
      byDay[day].problems += e.problemsSolved;
      byDay[day].time += e.timeSpent;
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return Object.entries(byDay).map(([day, stats]) => ({
      day: parseInt(day),
      dayName: dayNames[parseInt(day)],
      ...stats,
      avgProblems: stats.count > 0 ? Math.round(stats.problems / stats.count) : 0,
    }));
  }

  /**
   * Get most productive day
   */
  static async getMostProductiveDay(userId: string) {
    const activityByDay = await this.getActivityByDayOfWeek(userId);
    return activityByDay.reduce((max, day) =>
      day.problems > max.problems ? day : max
      , activityByDay[0]);
  }

  // ===========================================================================
  // DAILY STATS (Using DailyStats model)
  // ===========================================================================

  /**
   * Get or compute daily stats
   */
  static async getDailyStats(userId: string, date: Date) {
    const dateStart = startOfDay(date);

    // Try to get from DailyStats
    let dailyStats = await prisma.dailyStats.findUnique({
      where: {
        userId_date: {
          userId,
          date: dateStart,
        },
      },
    });

    // If not found or not complete, compute
    if (!dailyStats || !dailyStats.isComplete) {
      const entries = await prisma.trackerEntry.findMany({
        where: {
          userId,
          date: dateStart,
        },
      });

      const stats = {
        totalProblems: entries.reduce((s, e) => s + e.problemsSolved, 0),
        totalCommits: entries.reduce((s, e) => s + e.commits, 0),
        totalPullRequests: entries.reduce((s, e) => s + e.pullRequests, 0),
        totalTimeSpent: entries.reduce((s, e) => s + e.timeSpent, 0),
        totalPoints: entries.reduce((s, e) => s + (e.points ?? 0), 0),
        hadActivity: entries.length > 0,
      };

      // Upsert daily stats
      dailyStats = await prisma.dailyStats.upsert({
        where: {
          userId_date: { userId, date: dateStart },
        },
        create: {
          userId,
          date: dateStart,
          ...stats,
        },
        update: stats,
      });
    }

    return dailyStats;
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export default StatsService;