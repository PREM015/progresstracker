// src/services/export/exportScheduler.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ExportQueue } from './exportQueue';

const log = logger.child({ service: 'ExportScheduler' });

export class ExportScheduler {
  /**
   * Process scheduled exports
   */
  static async processScheduledExports() {
    try {
      const now = new Date();

      const scheduledExports = await prisma.scheduledExport.findMany({
        where: {
          isActive: true,
          nextRunAt: { lte: now },
        },
      });

      log.info('Processing scheduled exports', { count: scheduledExports.length });

      for (const scheduled of scheduledExports) {
        try {
          const { startDate, endDate } = this.calculateDateRange(scheduled.relativeDateRange);

          await ExportQueue.enqueue({
            userId: scheduled.userId,
            format: scheduled.format,
            name: scheduled.name,
            dateFrom: startDate,
            dateTo: endDate,
            platforms: scheduled.platforms,
            categories: scheduled.categories,
          });

          const nextRunAt = this.calculateNextRun(scheduled.frequency, scheduled.dayOfWeek, scheduled.dayOfMonth, scheduled.time);

          await prisma.scheduledExport.update({
            where: { id: scheduled.id },
            data: {
              lastRunAt: now,
              lastRunStatus: 'success',
              nextRunAt,
              runCount: { increment: 1 },
            },
          });

          log.info('Scheduled export processed', { id: scheduled.id, userId: scheduled.userId });
        } catch (error) {
          await prisma.scheduledExport.update({
            where: { id: scheduled.id },
            data: {
              lastRunAt: now,
              lastRunStatus: 'failed',
              failureCount: { increment: 1 },
            },
          });

          log.error('Error processing scheduled export', { id: scheduled.id }, error);
        }
      }

      return { processed: scheduledExports.length };
    } catch (error) {
      log.error('Error processing scheduled exports', {}, error);
      throw error;
    }
  }

  /**
   * Calculate date range from relative string
   */
  private static calculateDateRange(relative: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate = new Date();

    switch (relative) {
      case 'last_7_days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'last_30_days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'last_90_days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'this_month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        endDate.setDate(0); // Last day of previous month
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  /**
   * Calculate next run time
   */
  private static calculateNextRun(
    frequency: string,
    dayOfWeek: number | null,
    dayOfMonth: number | null,
    time: string
  ): Date {
    const next = new Date();
    const [hours, minutes] = time.split(':').map(Number);

    next.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        if (dayOfWeek !== null) {
          const currentDay = next.getDay();
          const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
          next.setDate(next.getDate() + daysToAdd);
        }
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        if (dayOfMonth !== null) {
          next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
        }
        break;
    }

    // If calculated time is in the past, add one period
    if (next <= new Date()) {
      switch (frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
      }
    }

    return next;
  }
}

export default ExportScheduler;