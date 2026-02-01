// src/services/sync/syncScheduler.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SyncQueue } from './syncQueue';
import { addMinutes } from 'date-fns';

const log = logger.child({ service: 'SyncScheduler' });

export interface ScheduledSync {
  id: string;
  userId: string;
  platformId: string;
  userPlatformId: string;
  nextSyncAt: Date;
  syncInterval: number; // in minutes
  isActive: boolean;
}

export interface SchedulerStats {
  totalScheduled: number;
  dueNow: number;
  nextHour: number;
  paused: number;
}

export class SyncScheduler {
  private static readonly DEFAULT_INTERVAL = 1440; // 24 hours in minutes
  private static readonly MIN_INTERVAL = 60; // 1 hour
  private static readonly MAX_INTERVAL = 10080; // 7 days

  /**
   * Schedule sync for a platform
   */
  static async schedule(
    userId: string,
    platformId: string,
    userPlatformId: string,
    intervalMinutes?: number
  ): Promise<void> {
    try {
      const interval = this.validateInterval(intervalMinutes);
      const nextSyncAt = addMinutes(new Date(), interval);

      await prisma.userPlatform.update({
        where: { id: userPlatformId },
        data: {
          nextSyncAt,
          autoSync: true,
        },
      });

      log.info('Sync scheduled', { 
        userId, 
        platformId, 
        nextSyncAt,
        intervalMinutes: interval 
      });

    } catch (error) {
      log.error('Failed to schedule sync', { userId, platformId }, error);
      throw error;
    }
  }

  /**
   * Unschedule (pause) sync for a platform
   */
  static async unschedule(userPlatformId: string): Promise<void> {
    try {
      await prisma.userPlatform.update({
        where: { id: userPlatformId },
        data: {
          nextSyncAt: null,
          autoSync: false,
        },
      });

      log.info('Sync unscheduled', { userPlatformId });

    } catch (error) {
      log.error('Failed to unschedule sync', { userPlatformId }, error);
      throw error;
    }
  }

  /**
   * Process due syncs (called by cron job)
   */
  static async processDueSyncs(limit: number = 50): Promise<number> {
    try {
      log.info('Processing due syncs', { limit });

      const now = new Date();
      
      const duePlatforms = await prisma.userPlatform.findMany({
        where: {
          isActive: true,
          autoSync: true,
          nextSyncAt: { lte: now },
          syncStatus: { notIn: ['IN_PROGRESS', 'PENDING'] },
        },
        take: limit,
        orderBy: { nextSyncAt: 'asc' },
        include: {
          platform: true,
        },
      });

      let processed = 0;

      for (const userPlatform of duePlatforms) {
        try {
          // Enqueue sync job
          await SyncQueue.enqueue({
            userId: userPlatform.userId,
            platformId: userPlatform.platformId,
            userPlatformId: userPlatform.id,
            triggeredBy: 'scheduled',
            triggerSource: 'cron',
          });

          // Update next sync time
          const interval = userPlatform.platform?.syncInterval || this.DEFAULT_INTERVAL;
          const nextSyncAt = addMinutes(new Date(), interval);

          await prisma.userPlatform.update({
            where: { id: userPlatform.id },
            data: { nextSyncAt },
          });

          processed++;

        } catch (error) {
          log.error('Failed to enqueue scheduled sync', { 
            userPlatformId: userPlatform.id 
          }, error);
        }
      }

      log.info('Processed due syncs', { processed, total: duePlatforms.length });

      return processed;

    } catch (error) {
      log.error('Failed to process due syncs', {}, error);
      return 0;
    }
  }

  /**
   * Reschedule failed syncs
   */
  static async rescheduleFailedSyncs(): Promise<number> {
    try {
      const failedPlatforms = await prisma.userPlatform.findMany({
        where: {
          syncStatus: 'FAILED',
          consecutiveFailures: { lt: 3 },
          autoSync: true,
        },
      });

      let rescheduled = 0;

      for (const platform of failedPlatforms) {
        // Exponential backoff: 1h, 2h, 4h
        const backoffMinutes = 60 * Math.pow(2, platform.consecutiveFailures);
        const nextSyncAt = addMinutes(new Date(), backoffMinutes);

        await prisma.userPlatform.update({
          where: { id: platform.id },
          data: { 
            nextSyncAt,
            syncStatus: 'IDLE',
          },
        });

        rescheduled++;
      }

      if (rescheduled > 0) {
        log.info('Rescheduled failed syncs', { count: rescheduled });
      }

      return rescheduled;

    } catch (error) {
      log.error('Failed to reschedule failed syncs', {}, error);
      return 0;
    }
  }

  /**
   * Get scheduler statistics
   */
  static async getStats(): Promise<SchedulerStats> {
    try {
      const now = new Date();
      const oneHourLater = addMinutes(now, 60);

      const [totalScheduled, dueNow, nextHour, paused] = await Promise.all([
        prisma.userPlatform.count({
          where: { autoSync: true, isActive: true },
        }),
        prisma.userPlatform.count({
          where: {
            autoSync: true,
            isActive: true,
            nextSyncAt: { lte: now },
          },
        }),
        prisma.userPlatform.count({
          where: {
            autoSync: true,
            isActive: true,
            nextSyncAt: { gt: now, lte: oneHourLater },
          },
        }),
        prisma.userPlatform.count({
          where: { autoSync: false, isActive: true },
        }),
      ]);

      return {
        totalScheduled,
        dueNow,
        nextHour,
        paused,
      };

    } catch (error) {
      log.error('Failed to get scheduler stats', {}, error);
      return { totalScheduled: 0, dueNow: 0, nextHour: 0, paused: 0 };
    }
  }

  /**
   * Validate sync interval
   */
  private static validateInterval(minutes?: number): number {
    if (!minutes) return this.DEFAULT_INTERVAL;
    
    if (minutes < this.MIN_INTERVAL) return this.MIN_INTERVAL;
    if (minutes > this.MAX_INTERVAL) return this.MAX_INTERVAL;
    
    return minutes;
  }

  /**
   * Get user's scheduled syncs
   */
  static async getUserSchedules(userId: string): Promise<ScheduledSync[]> {
    try {
      const userPlatforms = await prisma.userPlatform.findMany({
        where: { userId, isActive: true },
        include: { platform: true },
      });

      return userPlatforms.map(up => ({
        id: up.id,
        userId: up.userId,
        platformId: up.platformId,
        userPlatformId: up.id,
        nextSyncAt: up.nextSyncAt || new Date(),
        syncInterval: up.platform?.syncInterval || this.DEFAULT_INTERVAL,
        isActive: up.autoSync,
      }));

    } catch (error) {
      log.error('Failed to get user schedules', { userId }, error);
      return [];
    }
  }
}