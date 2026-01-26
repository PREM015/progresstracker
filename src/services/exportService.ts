// src/services/exportService.ts

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { ExportOptions, ExportData, ExportResult } from '@/types/export';
import { generateCSV } from './export/csvExport';
import { generateJSON } from './export/jsonExport';
import { generatePDF } from './export/pdfExport';

export class ExportService {
  /**
   * Get all data for export
   */
  static async getExportData(
    userId: string,
    options: ExportOptions
  ): Promise<ExportData> {
    const { startDate, endDate, includeGoals, includeAchievements, includePlatforms, includeStats } = options;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Build date filter
    const dateFilter = startDate && endDate
      ? {
          date: {
            gte: startDate,
            lte: endDate,
          },
        }
      : {};

    // Get tracker entries
    const trackerEntries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        ...dateFilter,
      },
      include: {
        platform: {
          select: {
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Get goals (optional)
    const goals = includeGoals
      ? await prisma.goal.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // Get achievements (optional)
    const achievements = includeAchievements
      ? await prisma.userAchievement.findMany({
          where: { userId },
          include: {
            achievement: true,
          },
          orderBy: { unlockedAt: 'desc' },
        })
      : [];

    // Get platforms (optional)
    const platforms = includePlatforms
      ? await prisma.userPlatform.findMany({
          where: { userId },
          include: {
            platform: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        })
      : [];

    // Calculate stats (optional)
    let stats = undefined;
    if (includeStats) {
      const [totalGoals, completedGoals, totalAchievements] = await Promise.all([
        prisma.goal.count({ where: { userId } }),
        prisma.goal.count({ where: { userId, status: 'COMPLETED' } }),
        prisma.userAchievement.count({ where: { userId } }),
      ]);

      const currentStreak = await this.calculateStreak(userId);
      const totalProblemsSolved = trackerEntries.reduce(
        (sum, entry) => sum + (entry.problemsSolved || 0),
        0
      );
      const totalTimeSpent = trackerEntries.reduce(
        (sum, entry) => sum + (entry.timeSpent || 0),
        0
      );

      stats = {
        totalEntries: trackerEntries.length,
        totalGoals,
        completedGoals,
        achievements: totalAchievements,
        currentStreak,
        longestStreak: currentStreak, // Simplified
        totalProblemsSolved,
        totalTimeSpent,
      };
    }

    return {
      user: {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
      },
      exportDate: new Date(),
      dateRange: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
      trackerEntries: trackerEntries.map((entry) => ({
        date: entry.date.toISOString(),
        platform: entry.platform?.name || 'Manual Entry',
        category: entry.platform?.category || 'OTHER',
        problemsSolved: entry.problemsSolved || undefined,
        projectsCompleted: entry.projectsCompleted || undefined,
        applicationsSubmitted: entry.applicationsSubmitted || undefined,
        coursesCompleted: entry.coursesCompleted || undefined,
        timeSpent: entry.timeSpent || undefined,
        mood: entry.mood || undefined,
        notes: entry.notes || undefined,
      })),
      goals: goals.map((goal) => ({
        title: goal.title,
        description: goal.description || '',
        category: goal.category,
        target: goal.target,
        progress: goal.progress,
        status: goal.status,
        deadline: goal.deadline?.toISOString(),
        completedAt: goal.completedAt?.toISOString(),
      })),
      achievements: achievements.map((ua) => ({
        title: ua.achievement.title,
        description: ua.achievement.description,
        category: ua.achievement.category,
        unlockedAt: ua.unlockedAt.toISOString(),
      })),
      platforms: platforms.map((up) => ({
        name: up.platform.name,
        category: up.platform.category,
        isConnected: up.isActive,
        lastSynced: up.lastSyncedAt?.toISOString(),
      })),
      stats,
    };
  }

  /**
   * Export data in specified format
   */
  static async exportData(
    userId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const data = await this.getExportData(userId, options);

      switch (options.format) {
        case 'csv':
          return await generateCSV(data);
        case 'json':
          return await generateJSON(data);
        case 'pdf':
          return await generatePDF(data);
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
    } catch (error) {
      logger.error('Export error:', error as Error);
      return {
        success: false,
        format: options.format,
        fileName: '',
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Calculate current streak
   */
  private static async calculateStreak(userId: string): Promise<number> {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (entries.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}