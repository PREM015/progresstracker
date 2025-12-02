import {prisma} from '@/lib/prisma';
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval } from 'date-fns';

export class StatsService {
  // Get overall statistics
  static async getOverallStats(userId: string, days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Get tracker entries
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate totals
    const totalProblems = entries.reduce((sum, e) => sum + (e.problems || 0), 0);
    const totalTime = entries.reduce((sum, e) => sum + (e.timeSpent || 0), 0);
    const uniqueDays = new Set(entries.map((e) => format(e.date, 'yyyy-MM-dd'))).size;

    // Calculate streak
    const streak = await this.calculateStreak(userId);

    // Get platform breakdown
    const platformStats = await this.getPlatformBreakdown(userId, startDate, endDate);

    // Get recent activity
    const recentActivity = entries.slice(0, 10).map((entry) => ({
      id: entry.id,
      date: entry.date,
      platform: entry.platform,
      problems: entry.problems,
      timeSpent: entry.timeSpent,
      notes: entry.notes,
    }));

    return {
      totalProblems,
      totalTime,
      activeDays: uniqueDays,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      avgProblemsPerDay: uniqueDays > 0 ? Math.round(totalProblems / uniqueDays) : 0,
      avgTimePerDay: uniqueDays > 0 ? Math.round(totalTime / uniqueDays) : 0,
      platformStats,
      recentActivity,
    };
  }

  // Calculate current and longest streak
  static async calculateStreak(userId: string) {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (entries.length === 0) {
      return { current: 0, longest: 0 };
    }

    const dates = entries.map((e) => format(e.date, 'yyyy-MM-dd'));
    const uniqueDates = [...new Set(dates)].sort().reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    // Check current streak
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      currentStreak = 1;

      for (let i = 1; i < uniqueDates.length; i++) {
        const expectedDate = format(subDays(new Date(uniqueDates[i - 1]), 1), 'yyyy-MM-dd');
        if (uniqueDates[i] === expectedDate) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 1; i < uniqueDates.length; i++) {
      const expectedDate = format(subDays(new Date(uniqueDates[i - 1]), 1), 'yyyy-MM-dd');
      if (uniqueDates[i] === expectedDate) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { current: currentStreak, longest: longestStreak };
  }

  // Get platform breakdown
  static async getPlatformBreakdown(userId: string, startDate: Date, endDate: Date) {
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        platform: { not: null },
      },
    });

    const breakdown: Record<string, { problems: number; time: number; count: number }> = {};

    entries.forEach((entry) => {
      const platform = entry.platform || 'Other';
      if (!breakdown[platform]) {
        breakdown[platform] = { problems: 0, time: 0, count: 0 };
      }
      breakdown[platform].problems += entry.problems || 0;
      breakdown[platform].time += entry.timeSpent || 0;
      breakdown[platform].count += 1;
    });

    return Object.entries(breakdown)
      .map(([platform, stats]) => ({
        platform,
        ...stats,
      }))
      .sort((a, b) => b.problems - a.problems);
  }

  // Get monthly breakdown
  static async getMonthlyBreakdown(userId: string, months: number = 6) {
    const startDate = startOfDay(subDays(new Date(), months * 30));
    const endDate = endOfDay(new Date());

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const monthlyData: Record<string, { problems: number; time: number; days: Set<string> }> = {};

    entries.forEach((entry) => {
      const monthKey = format(entry.date, 'yyyy-MM');
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { problems: 0, time: 0, days: new Set() };
      }
      monthlyData[monthKey].problems += entry.problems || 0;
      monthlyData[monthKey].time += entry.timeSpent || 0;
      monthlyData[monthKey].days.add(format(entry.date, 'yyyy-MM-dd'));
    });

    return Object.entries(monthlyData)
      .map(([month, stats]) => ({
        month,
        problems: stats.problems,
        time: stats.time,
        activeDays: stats.days.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // Get heatmap data (365 days)
  static async getHeatmapData(userId: string) {
    const startDate = startOfDay(subDays(new Date(), 365));
    const endDate = endOfDay(new Date());

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const dailyData: Record<string, number> = {};

    entries.forEach((entry) => {
      const dateKey = format(entry.date, 'yyyy-MM-dd');
      dailyData[dateKey] = (dailyData[dateKey] || 0) + (entry.problems || 0);
    });

    // Fill in all days
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    return allDays.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        date: dateKey,
        count: dailyData[dateKey] || 0,
      };
    });
  }

  // Get summary statistics
  static async getSummaryStats(userId: string, startDate: Date, endDate: Date) {
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });

    const totalProblems = entries.reduce((sum, e) => sum + (e.problems || 0), 0);
    const totalTime = entries.reduce((sum, e) => sum + (e.timeSpent || 0), 0);
    const uniqueDays = new Set(entries.map((e) => format(e.date, 'yyyy-MM-dd'))).size;

    // Get connected platforms count
    const connectedPlatforms = await prisma.userPlatform.count({
      where: { userId },
    });

    // Get active goals count
    const activeGoals = await prisma.goal.count({
      where: {
        userId,
        completedAt: null,
      },
    });

    // Get achievements count
    const achievementsUnlocked = await prisma.userAchievement.count({
      where: { userId },
    });

    // Calculate streak
    const streak = await this.calculateStreak(userId);

    return {
      totalProblems,
      totalTime,
      activeDays: uniqueDays,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      connectedPlatforms,
      activeGoals,
      achievementsUnlocked,
      avgProblemsPerDay: uniqueDays > 0 ? Math.round(totalProblems / uniqueDays) : 0,
      avgTimePerDay: uniqueDays > 0 ? Math.round(totalTime / uniqueDays) : 0,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  // Get trend data for charts
  static async getTrendData(
    userId: string,
    startDate: Date,
    endDate: Date,
    metric: 'problems' | 'time' | 'commits' = 'problems'
  ) {
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group by date
    const dailyData: Record<string, number> = {};

    entries.forEach((entry) => {
      const dateKey = format(entry.date, 'yyyy-MM-dd');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = 0;
      }

      switch (metric) {
        case 'problems':
          dailyData[dateKey] += entry.problems || 0;
          break;
        case 'time':
          dailyData[dateKey] += entry.timeSpent || 0;
          break;
        case 'commits':
          // TODO: Implement commits tracking
          dailyData[dateKey] += 0;
          break;
      }
    });

    // Fill in missing days with 0
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    return allDays.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        date: dateKey,
        value: dailyData[dateKey] || 0,
      };
    });
  }

  // Get weekly comparison
  static async getWeeklyComparison(userId: string) {
    const thisWeekStart = startOfDay(subDays(new Date(), 7));
    const thisWeekEnd = endOfDay(new Date());
    const lastWeekStart = startOfDay(subDays(new Date(), 14));
    const lastWeekEnd = endOfDay(subDays(new Date(), 7));

    const thisWeekEntries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: thisWeekStart, lte: thisWeekEnd },
      },
    });

    const lastWeekEntries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: lastWeekStart, lte: lastWeekEnd },
      },
    });

    const thisWeekProblems = thisWeekEntries.reduce((sum, e) => sum + (e.problems || 0), 0);
    const lastWeekProblems = lastWeekEntries.reduce((sum, e) => sum + (e.problems || 0), 0);

    const thisWeekTime = thisWeekEntries.reduce((sum, e) => sum + (e.timeSpent || 0), 0);
    const lastWeekTime = lastWeekEntries.reduce((sum, e) => sum + (e.timeSpent || 0), 0);

    const problemsChange = lastWeekProblems > 0
      ? ((thisWeekProblems - lastWeekProblems) / lastWeekProblems) * 100
      : 0;

    const timeChange = lastWeekTime > 0
      ? ((thisWeekTime - lastWeekTime) / lastWeekTime) * 100
      : 0;

    return {
      thisWeek: {
        problems: thisWeekProblems,
        time: thisWeekTime,
        days: thisWeekEntries.length,
      },
      lastWeek: {
        problems: lastWeekProblems,
        time: lastWeekTime,
        days: lastWeekEntries.length,
      },
      changes: {
        problems: Math.round(problemsChange * 10) / 10,
        time: Math.round(timeChange * 10) / 10,
      },
    };
  }

  // Get platform-wise trends
  static async getPlatformTrends(userId: string, days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        platform: { not: null },
      },
    });

    const platformData: Record<string, { dates: Record<string, number> }> = {};

    entries.forEach((entry) => {
      const platform = entry.platform || 'Other';
      const dateKey = format(entry.date, 'yyyy-MM-dd');

      if (!platformData[platform]) {
        platformData[platform] = { dates: {} };
      }
      if (!platformData[platform].dates[dateKey]) {
        platformData[platform].dates[dateKey] = 0;
      }

      platformData[platform].dates[dateKey] += entry.problems || 0;
    });

    return Object.entries(platformData).map(([platform, data]) => ({
      platform,
      data: Object.entries(data.dates).map(([date, value]) => ({
        date,
        value,
      })),
      total: Object.values(data.dates).reduce((sum, val) => sum + val, 0),
    }));
  }
} // ✅ CLOSING BRACE WAS MISSING - NOW FIXED