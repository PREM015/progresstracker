// src/services/sync/syncOrchestrator.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SyncQueue } from './syncQueue';
import { SyncStatus } from '@prisma/client';

const log = logger.child({ service: 'SyncOrchestrator' });

export class SyncOrchestrator {
  /**
   * Orchestrate sync for all user platforms
   */
  static async syncAllPlatforms(userId: string): Promise<{
    total: number;
    queued: number;
    failed: number;
  }> {
    try {
      const userPlatforms = await prisma.userPlatform.findMany({
        where: {
          userId,
          isActive: true,
          autoSync: true,
        },
        include: {
          platform: true,
        },
      });

      let queued = 0;
      let failed = 0;

      for (const userPlatform of userPlatforms) {
        try {
          await SyncQueue.enqueue({
            userId,
            platformId: userPlatform.platformId,
            userPlatformId: userPlatform.id,
            priority: userPlatform.syncPriority,
          });

          queued++;
        } catch (error) {
          failed++;
          log.error('Error queueing platform sync', {
            userId,
            platformId: userPlatform.platformId,
          }, error);
        }
      }

      log.info('All platforms sync queued', { userId, total: userPlatforms.length, queued, failed });

      return {
        total: userPlatforms.length,
        queued,
        failed,
      };
    } catch (error) {
      log.error('Error syncing all platforms', { userId }, error);
      throw error;
    }
  }

  /**
   * Process sync queue
   */
  static async processQueue(concurrency: number = 5): Promise<void> {
    try {
      const jobs = await SyncQueue.getNextJobs(concurrency);

      if (jobs.length === 0) {
        return;
      }

      log.info('Processing sync queue', { count: jobs.length });

      await Promise.allSettled()=>this.processJob(job.id, job.userId, job.platformId)
      await Promise.all(  
        jobs.map((job) => this.processJob(job.id, job.userId, job.platformId))
      );
    } catch (error) {
      log.error('Error processing sync queue', {}, error);
      throw error;
    }
  }

  /**
   * Process individual sync job
   */
  private static async processJob(jobId: string, userId: string, platformId: string): Promise<void> {
    try {
      // Import sync service dynamically to avoid circular dependency
      const { SyncService } = await import('../syncService');

      await SyncService.syncPlatform(userId, platformId);
      await SyncQueue.complete(jobId);
    } catch (error) {
      await SyncQueue.fail(jobId, error instanceof Error ? error.message : 'Unknown error');
      log.error('Error processing sync job', { jobId, userId, platformId }, error);
    }
  }

  /**
   * Get platforms due for sync
   */
  static async getPlatformsDueForSync(): Promise<Array<{
    userId: string;
    platformId: string;
    userPlatformId: string;
  }>> {
    try {
      const now = new Date();

      const due = await prisma.userPlatform.findMany({
        where: {
          isActive: true,
          autoSync: true,
          syncStatus: { notIn: ['IN_PROGRESS', 'PENDING'] },
          OR: [
            { nextSyncAt: null },
            { nextSyncAt: { lte: now } },
          ],
          consecutiveFailures: { lt: 5 },
        },
        include: {
          user: {
            select: { id: true, isActive: true },
          },
        },
        orderBy: [
          { syncPriority: 'desc' },
          { lastSyncedAt: 'asc' },
        ],
        take: 100,
      });

      log.info('Platforms due for sync fetched', { count: due.length });

      return due
        .filter((up) => up.user.isActive)
        .map((up) => ({
          userId: up.userId,
          platformId: up.platformId,
          userPlatformId: up.id,
        }));
    } catch (error) {
      log.error('Error getting platforms due for sync', {}, error);
      throw error;
    }
  }

  /**
   * Schedule syncs for due platforms
   */
  static async scheduleDueSyncs(): Promise<{ scheduled: number }> {
    try {
      const duePlatforms = await this.getPlatformsDueForSync();

      let scheduled = 0;

      for (const platform of duePlatforms) {
        try {
          await SyncQueue.enqueue({
            userId: platform.userId,
            platformId: platform.platformId,
            userPlatformId: platform.userPlatformId,
          });

          scheduled++;
        } catch (error) {
          log.error('Error scheduling sync', platform, error);
        }
      }

      log.info('Due syncs scheduled', { scheduled });

      return { scheduled };
    } catch (error) {
      log.error('Error scheduling due syncs', {}, error);
      throw error;
    }
  }
}

export default SyncOrchestrator;