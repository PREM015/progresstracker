/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/analytics/reportService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, format } from 'date-fns';

const log = logger.child({ service: 'ReportService' });

export interface ReportData {
  id: string;
  userId: string;
  type: 'weekly' | 'monthly' | 'yearly' | 'custom';
  title: string;
  summary: string | null;
  periodStart: Date;
  periodEnd: Date;
  data: ReportDataContent;
  highlights?: ReportHighlight[];
  insights?: ReportInsight[];
  recommendations?: ReportRecommendation[];
  status: string;
  sentAt: Date | null;
  sentTo: string | null;
  pdfUrl: string | null;
  createdAt: Date;
}

export interface ReportDataContent {
  stats: {
    totalProblems: number;
    totalCommits: number;
    totalTimeSpent: number;
    totalPoints: number;
    activeDays: number;
    currentStreak: number;
  };
  charts?: {
    dailyActivity: Array<{ date: string; value: number }>;
    categoryBreakdown: Array<{ category: string; count: number }>;
    platformBreakdown: Array<{ platform: string; count: number }>;
  };
  comparisons?: {
    previousPeriod: {
      problemsChange: number;
      commitsChange: number;
      timeChange: number;
    };
  };
}

export interface ReportHighlight {
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ReportInsight {
  type: 'streak' | 'achievement' | 'warning' | 'tip';
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ReportRecommendation {
  action: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ReportCreateInput {
  type: 'weekly' | 'monthly' | 'yearly' | 'custom';
  periodStart?: Date;
  periodEnd?: Date;
  sendEmail?: boolean;
}

class ReportService {
  /**
   * Get all reports for a user
   */
  async getAll(userId: string, limit: number = 10): Promise<ReportData[]> {
    try {
      log.info('Fetching reports', { userId, limit });

      const reports = await prisma.report.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return reports.map(report => this.mapToReportData(report));

    } catch (error) {
      log.error('Failed to fetch reports', { userId }, error);
      throw error;
    }
  }

  /**
   * Get single report by ID
   */
  async getById(id: string, userId: string): Promise<ReportData | null> {
    try {
      const report = await prisma.report.findFirst({
        where: { id, userId },
      });

      if (!report) {
        return null;
      }

      return this.mapToReportData(report);

    } catch (error) {
      log.error('Failed to fetch report', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Generate new report
   */
  async create(data: ReportCreateInput, userId: string): Promise<ReportData> {
    const startTime = Date.now();
    
    try {
      log.info('Generating report', { userId, type: data.type });

      // Calculate period dates
      const { periodStart, periodEnd } = this.calculatePeriod(
        data.type,
        data.periodStart,
        data.periodEnd
      );

      // Fetch user data for the period
      const reportData = await this.generateReportData(userId, periodStart, periodEnd);

      // Generate insights and recommendations
      const insights = this.generateInsights(reportData);
      const recommendations = this.generateRecommendations(reportData);
      const highlights = this.generateHighlights(reportData);

      // Create title
      const title = this.generateTitle(data.type, periodStart, periodEnd);

      // Create report
      const report = await prisma.report.create({
        data: {
          userId,
          type: data.type,
          title,
          summary: this.generateSummary(reportData),
          periodStart,
          periodEnd,
          data: reportData as never,
          highlights: highlights as never,
          insights: insights as never,
          recommendations: recommendations as never,
          status: 'generated',
        },
      });

      const duration = Date.now() - startTime;
      log.info('Report generated successfully', { reportId: report.id, duration });

      return this.mapToReportData(report);

    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Failed to generate report', { userId, duration }, error);
      throw error;
    }
  }

  /**
   * Delete report
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      await prisma.report.deleteMany({
        where: { id, userId },
      });

      log.info('Report deleted', { id, userId });

    } catch (error) {
      log.error('Failed to delete report', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Generate report data for period
   */
  private async generateReportData(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ReportDataContent> {
    // Fetch tracker entries
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: periodStart, lte: periodEnd },
      },
      include: {
        platform: true,
      },
    });

    // Calculate stats
    const stats = {
      totalProblems: entries.reduce((sum, e) => sum + (e.problemsSolved || 0), 0),
      totalCommits: entries.reduce((sum, e) => sum + (e.commits || 0), 0),
      totalTimeSpent: entries.reduce((sum, e) => sum + (e.timeSpent || 0), 0),
      totalPoints: entries.reduce((sum, e) => sum + (e.pointsEarned || 0), 0),
      activeDays: new Set(entries.map(e => e.date.toDateString())).size,
      currentStreak: await this.getCurrentStreak(userId),
    };

    // Daily activity chart
    const dailyActivity = this.generateDailyActivity(entries, periodStart, periodEnd);

    // Category breakdown
    const categoryBreakdown = this.generateCategoryBreakdown(entries);

    // Platform breakdown
    const platformBreakdown = this.generatePlatformBreakdown(entries);

    // Comparison with previous period
    const comparisons = await this.generateComparisons(userId, periodStart, periodEnd, stats);

    return {
      stats,
      charts: {
        dailyActivity,
        categoryBreakdown,
        platformBreakdown,
      },
      comparisons,
    };
  }

  /**
   * Calculate period dates based on type
   */
  private calculatePeriod(
    type: string,
    customStart?: Date,
    customEnd?: Date
  ): { periodStart: Date; periodEnd: Date } {
    const now = new Date();

    switch (type) {
      case 'weekly':
        return {
          periodStart: startOfWeek(subDays(now, 7)),
          periodEnd: endOfWeek(subDays(now, 7)),
        };
      case 'monthly':
        return {
          periodStart: startOfMonth(subDays(now, 30)),
          periodEnd: endOfMonth(subDays(now, 30)),
        };
      case 'yearly':
        return {
          periodStart: startOfYear(subDays(now, 365)),
          periodEnd: endOfYear(subDays(now, 365)),
        };
      case 'custom':
        return {
          periodStart: customStart || subDays(now, 7),
          periodEnd: customEnd || now,
        };
      default:
        return {
          periodStart: subDays(now, 7),
          periodEnd: now,
        };
    }
  }

  /**
   * Generate daily activity chart data
   */
  private generateDailyActivity(
    entries: any[],
    periodStart: Date,
    periodEnd: Date
  ): Array<{ date: string; value: number }> {
    const dailyMap = new Map<string, number>();

    entries.forEach(entry => {
      const dateKey = format(entry.date, 'yyyy-MM-dd');
      const current = dailyMap.get(dateKey) || 0;
      dailyMap.set(dateKey, current + (entry.problemsSolved || 0));
    });

    return Array.from(dailyMap.entries()).map(([date, value]) => ({
      date,
      value,
    }));
  }

  /**
   * Generate category breakdown
   */
  private generateCategoryBreakdown(entries: any[]): Array<{ category: string; count: number }> {
    const categoryMap = new Map<string, number>();

    entries.forEach(entry => {
      if (entry.category) {
        const current = categoryMap.get(entry.category) || 0;
        categoryMap.set(entry.category, current + (entry.problemsSolved || 0));
      }
    });

    return Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));
  }

  /**
   * Generate platform breakdown
   */
  private generatePlatformBreakdown(entries: any[]): Array<{ platform: string; count: number }> {
    const platformMap = new Map<string, number>();

    entries.forEach(entry => {
      if (entry.platform) {
        const current = platformMap.get(entry.platform.name) || 0;
        platformMap.set(entry.platform.name, current + (entry.problemsSolved || 0));
      }
    });

    return Array.from(platformMap.entries()).map(([platform, count]) => ({
      platform,
      count,
    }));
  }

  /**
   * Generate comparisons with previous period
   */
  private async generateComparisons(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    currentStats: any
  ) {
    const periodLength = periodEnd.getTime() - periodStart.getTime();
    const previousStart = new Date(periodStart.getTime() - periodLength);
    const previousEnd = new Date(periodEnd.getTime() - periodLength);

    const previousEntries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: previousStart, lte: previousEnd },
      },
    });

    const previousStats = {
      totalProblems: previousEntries.reduce((sum, e) => sum + (e.problemsSolved || 0), 0),
      totalCommits: previousEntries.reduce((sum, e) => sum + (e.commits || 0), 0),
      totalTimeSpent: previousEntries.reduce((sum, e) => sum + (e.timeSpent || 0), 0),
    };

    return {
      previousPeriod: {
        problemsChange: this.calculatePercentageChange(currentStats.totalProblems, previousStats.totalProblems),
        commitsChange: this.calculatePercentageChange(currentStats.totalCommits, previousStats.totalCommits),
        timeChange: this.calculatePercentageChange(currentStats.totalTimeSpent, previousStats.totalTimeSpent),
      },
    };
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Get current streak for user
   */
  private async getCurrentStreak(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true },
    });

    return user?.currentStreak || 0;
  }

  /**
   * Generate insights
   */
  private generateInsights(data: ReportDataContent): ReportInsight[] {
    const insights: ReportInsight[] = [];

    // Streak insight
    if (data.stats.currentStreak >= 7) {
      insights.push({
        type: 'streak',
        message: `Amazing! You're on a ${data.stats.currentStreak}-day streak!`,
        priority: 'high',
      });
    }

    // Activity insight
    if (data.stats.activeDays < 3) {
      insights.push({
        type: 'warning',
        message: 'You were only active for a few days this period. Try to be more consistent!',
        priority: 'medium',
      });
    }

    // Progress insight
    if (data.comparisons?.previousPeriod && data.comparisons.previousPeriod.problemsChange > 20) {
      insights.push({
        type: 'achievement',
        message: `Wow! You solved ${data.comparisons.previousPeriod.problemsChange}% more problems than last period!`,
        priority: 'high',
      });
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(data: ReportDataContent): ReportRecommendation[] {
    const recommendations: ReportRecommendation[] = [];

    if (data.stats.activeDays < 5) {
      recommendations.push({
        action: 'Set a daily coding goal',
        reason: 'Consistency is key to improvement',
        impact: 'high',
      });
    }

    if (data.stats.totalProblems < 10) {
      recommendations.push({
        action: 'Try solving at least 2 problems per day',
        reason: 'Regular practice builds muscle memory',
        impact: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Generate highlights
   */
  private generateHighlights(data: ReportDataContent): ReportHighlight[] {
    const highlights: ReportHighlight[] = [];

    if (data.comparisons?.previousPeriod) {
      highlights.push({
        metric: 'Problems Solved',
        value: data.stats.totalProblems,
        change: data.comparisons.previousPeriod.problemsChange,
        trend: data.comparisons.previousPeriod.problemsChange > 0 ? 'up' : 'down',
      });

      highlights.push({
        metric: 'Commits',
        value: data.stats.totalCommits,
        change: data.comparisons.previousPeriod.commitsChange,
        trend: data.comparisons.previousPeriod.commitsChange > 0 ? 'up' : 'down',
      });
    }

    return highlights;
  }

  /**
   * Generate report title
   */
  private generateTitle(type: string, start: Date, end: Date): string {
    const formatStr = 'MMM d, yyyy';
    
    switch (type) {
      case 'weekly':
        return `Weekly Report - ${format(start, formatStr)}`;
      case 'monthly':
        return `Monthly Report - ${format(start, 'MMMM yyyy')}`;
      case 'yearly':
        return `Yearly Report - ${format(start, 'yyyy')}`;
      default:
        return `Custom Report - ${format(start, formatStr)} to ${format(end, formatStr)}`;
    }
  }

  /**
   * Generate summary text
   */
  private generateSummary(data: ReportDataContent): string {
    return `You solved ${data.stats.totalProblems} problems, made ${data.stats.totalCommits} commits, and were active for ${data.stats.activeDays} days this period.`;
  }

  /**
   * Map database model to ReportData
   */
  private mapToReportData(report: any): ReportData {
    return {
      id: report.id,
      userId: report.userId,
      type: report.type,
      title: report.title,
      summary: report.summary,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      data: report.data as ReportDataContent,
      highlights: report.highlights as ReportHighlight[] || undefined,
      insights: report.insights as ReportInsight[] || undefined,
      recommendations: report.recommendations as ReportRecommendation[] || undefined,
      status: report.status,
      sentAt: report.sentAt,
      sentTo: report.sentTo,
      pdfUrl: report.pdfUrl,
      createdAt: report.createdAt,
    };
  }
}

export const reportService = new ReportService();
export default reportService;