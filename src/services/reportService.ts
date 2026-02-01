// src/services/reportService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const log = logger.child({ service: 'ReportService' });

export interface GenerateReportInput {
  userId: string;
  type: 'weekly' | 'monthly' | 'yearly' | 'custom';
  periodStart: Date;
  periodEnd: Date;
}

export interface ReportData {
  stats: {
    totalProblems: number;
    totalCommits: number;
    totalPullRequests: number;
    totalTimeSpent: number;
    totalPoints: number;
    activeDays: number;
  };
  highlights: Array<{
    metric: string;
    value: number;
    change: number;
  }>;
  insights: Array<{
    type: string;
    message: string;
  }>;
  recommendations: Array<{
    action: string;
    reason: string;
  }>;
}

class ReportService {
  /**
   * Generate report for user
   */
  async generate(data: GenerateReportInput) {
    try {
      const reportData = await this.calculateReportData(
        data.userId,
        data.periodStart,
        data.periodEnd
      );

      const report = await prisma.report.create({
        data: {
          userId: data.userId,
          type: data.type,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          title: this.generateTitle(data.type, data.periodStart, data.periodEnd),
          summary: this.generateSummary(reportData),
          data: reportData as unknown as Prisma.InputJsonValue,
          highlights: reportData.highlights as Prisma.InputJsonValue,
          insights: reportData.insights as Prisma.InputJsonValue,
          recommendations: reportData.recommendations as Prisma.InputJsonValue,
          status: 'generated',
        },
      });

      log.info('Report generated', { id: report.id, userId: data.userId, type: data.type });

      return report;
    } catch (error) {
      log.error('Error generating report', { userId: data.userId, type: data.type }, error);
      throw error;
    }
  }

  /**
   * Get user reports
   */
  async getUserReports(userId: string, limit: number = 10) {
    try {
      const reports = await prisma.report.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      log.info('User reports fetched', { userId, count: reports.length });

      return reports;
    } catch (error) {
      log.error('Error fetching user reports', { userId }, error);
      throw error;
    }
  }

  /**
   * Get report by ID
   */
  async getById(id: string, userId: string) {
    try {
      const report = await prisma.report.findFirst({
        where: { id, userId },
      });

      if (report) {
        log.info('Report fetched', { id, userId });
      }

      return report;
    } catch (error) {
      log.error('Error fetching report', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(userId: string, date?: Date) {
    try {
      const targetDate = date || new Date();
      const periodStart = startOfWeek(targetDate);
      const periodEnd = endOfWeek(targetDate);

      return this.generate({
        userId,
        type: 'weekly',
        periodStart,
        periodEnd,
      });
    } catch (error) {
      log.error('Error generating weekly report', { userId }, error);
      throw error;
    }
  }

  /**
   * Generate monthly report
   */
  async generateMonthlyReport(userId: string, date?: Date) {
    try {
      const targetDate = date || new Date();
      const periodStart = startOfMonth(targetDate);
      const periodEnd = endOfMonth(targetDate);

      return this.generate({
        userId,
        type: 'monthly',
        periodStart,
        periodEnd,
      });
    } catch (error) {
      log.error('Error generating monthly report', { userId }, error);
      throw error;
    }
  }

  /**
   * Send report to user
   */
  async send(reportId: string, userId: string, sendTo?: string) {
    try {
      const report = await prisma.report.findFirst({
        where: { id: reportId, userId },
      });

      if (!report) {
        throw new Error('Report not found');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      const email = sendTo || user?.email;

      if (!email) {
        throw new Error('No email address available');
      }

      // TODO: Implement email sending logic

      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'sent',
          sentAt: new Date(),
          sentTo: email,
        },
      });

      log.info('Report sent', { reportId, userId, email });

      return { sent: true, email };
    } catch (error) {
      log.error('Error sending report', { reportId, userId }, error);
      throw error;
    }
  }

  /**
   * Delete report
   */
  async delete(id: string, userId: string) {
    try {
      await prisma.report.deleteMany({
        where: { id, userId },
      });

      log.info('Report deleted', { id, userId });

      return { deleted: true };
    } catch (error) {
      log.error('Error deleting report', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Calculate report data
   */
  private async calculateReportData(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ReportData> {
    try {
      const entries = await prisma.trackerEntry.findMany({
        where: {
          userId,
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      const totalProblems = entries.reduce((s, e) => s + e.problemsSolved, 0);
      const totalCommits = entries.reduce((s, e) => s + e.commits, 0);
      const totalPullRequests = entries.reduce((s, e) => s + e.pullRequests, 0);
      const totalTimeSpent = entries.reduce((s, e) => s + e.timeSpent, 0);
      const totalPoints = entries.reduce((s, e) => s + (e.points || 0), 0);

      const uniqueDays = new Set(
        entries.map((e) => e.date.toISOString().split('T')[0])
      ).size;

      const stats = {
        totalProblems,
        totalCommits,
        totalPullRequests,
        totalTimeSpent,
        totalPoints,
        activeDays: uniqueDays,
      };

      const highlights = [
        { metric: 'problems_solved', value: totalProblems, change: 0 },
        { metric: 'commits', value: totalCommits, change: 0 },
        { metric: 'time_spent', value: totalTimeSpent, change: 0 },
      ];

      const insights = this.generateInsights(stats);
      const recommendations = this.generateRecommendations(stats);

      return {
        stats,
        highlights,
        insights,
        recommendations,
      };
    } catch (error) {
      log.error('Error calculating report data', { userId }, error);
      throw error;
    }
  }

  /**
   * Generate insights
   */
  private generateInsights(stats: ReportData['stats']): ReportData['insights'] {
    const insights: ReportData['insights'] = [];

    if (stats.activeDays >= 7) {
      insights.push({
        type: 'consistency',
        message: `Great consistency! You were active for ${stats.activeDays} days.`,
      });
    }

    if (stats.totalProblems > 50) {
      insights.push({
        type: 'achievement',
        message: `Outstanding! You solved ${stats.totalProblems} problems.`,
      });
    }

    if (stats.totalCommits > 20) {
      insights.push({
        type: 'development',
        message: `Strong development activity with ${stats.totalCommits} commits.`,
      });
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(stats: ReportData['stats']): ReportData['recommendations'] {
    const recommendations: ReportData['recommendations'] = [];

    if (stats.activeDays < 3) {
      recommendations.push({
        action: 'Increase activity frequency',
        reason: 'Try to code at least 3-4 days per week for better progress.',
      });
    }

    if (stats.totalProblems < 10) {
      recommendations.push({
        action: 'Solve more problems',
        reason: 'Aim for at least 10 problems per week to build consistency.',
      });
    }

    return recommendations;
  }

  /**
   * Generate report title
   */
  private generateTitle(type: string, start: Date, end: Date): string {
    const startStr = start.toLocaleDateString();
    const endStr = end.toLocaleDateString();

    return `${type.charAt(0).toUpperCase() + type.slice(1)} Report (${startStr} - ${endStr})`;
  }

  /**
   * Generate summary
   */
  private generateSummary(data: ReportData): string {
    return `You solved ${data.stats.totalProblems} problems, made ${data.stats.totalCommits} commits, and were active for ${data.stats.activeDays} days during this period.`;
  }
}

export const reportService = new ReportService();
export default reportService;