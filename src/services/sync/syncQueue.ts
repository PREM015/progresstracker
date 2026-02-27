// src/services/sync/syncQueue.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SyncStatus } from '@prisma/client';

const log = logger.child({ service: 'SyncQueue' });

export interface SyncJob {
  id: string;
  userId: string;
  platformId: string;
  userPlatformId: string;
  status: SyncStatus;
  priority: number;
  createdAt: Date;
  attemptNumber: number;
  maxAttempts: number;
}

export interface EnqueueJobInput {
  userId: string;
  platformId: string;
  userPlatformId: string;
  priority?: number;
  triggeredBy?: string;
  triggerSource?: string;
}

export interface QueueStats {
  pending: number;
  inProgress: number;
  total: number;
  avgWaitTime: number;
}

export class SyncQueue {
  private static readonly DEFAULT_PRIORITY = 5;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 5000;

  /**
   * Add sync job to queue
   */
  static async enqueue(data: EnqueueJobInput): Promise<string> {
    const startTime = Date.now();
    
    try {
      log.info('Enqueueing sync job', { 
        userId: data.userId, 
        platformId: data.platformId 
      });

      // Check if already in queue
      const existing = await prisma.syncLog.findFirst({
        where: {
          userId: data.userId,
          platformId: data.platformId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      });

      if (existing) {
        log.info('Sync job already queued', { 
          syncLogId: existing.id,
          userId: data.userId, 
          platformId: data.platformId 
        });
        return existing.id;
      }

      // Update user platform status
      await prisma.userPlatform.update({
        where: { id: data.userPlatformId },
        data: {
          syncStatus: 'PENDING',
          nextSyncAt: new Date(),
        },
      });

      // Create sync log entry
      const syncLog = await prisma.syncLog.create({
        data: {
          userId: data.userId,
          platformId: data.platformId,
          userPlatformId: data.userPlatformId,
          status: 'PENDING',
          triggeredBy: data.triggeredBy || 'manual',
          triggerSource: data.triggerSource,
          attemptNumber: 1,
          maxAttempts: this.MAX_ATTEMPTS,
          startedAt: new Date(),
        },
      });

      const duration = Date.now() - startTime;
      log.info('Sync job enqueued successfully', { 
        syncLogId: syncLog.id,
        duration 
      });

      return syncLog.id;

    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Failed to enqueue sync job', { 
        userId: data.userId, 
        platformId: data.platformId,
        duration 
      }, error);
      throw error;
    }
  }

  /**
   * Get next job from queue (FIFO with priority)
   */
  static async dequeue(): Promise<SyncJob | null> {
    try {
      // Find highest priority pending job
      const syncLog = await prisma.syncLog.findFirst({
        where: {
          status: 'PENDING',
          attemptNumber: { lte: this.MAX_ATTEMPTS },
        },
        orderBy: [
          { userPlatform: { syncPriority: 'desc' } },
          { createdAt: 'asc' },
        ],
        include: {
          userPlatform: true,
        },
      });

      if (!syncLog) {
        return null;
      }

      // Mark as in progress
      const updatedLog = await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      // Update user platform
      await prisma.userPlatform.update({
        where: { id: syncLog.userPlatformId! },
        data: { syncStatus: 'IN_PROGRESS' },
      });

      log.info('Dequeued sync job', { syncLogId: updatedLog.id });

      return {
        id: updatedLog.id,
        userId: updatedLog.userId,
        platformId: updatedLog.platformId!,
        userPlatformId: updatedLog.userPlatformId!,
        status: updatedLog.status,
        priority: syncLog.userPlatform?.syncPriority || 0,
        createdAt: updatedLog.createdAt,
        attemptNumber: updatedLog.attemptNumber,
        maxAttempts: updatedLog.maxAttempts,
      };

    } catch (error) {
      log.error('Failed to dequeue sync job', {}, error);
      return null;
    }
  }

  /**
   * Mark job as complete
   */
  static async complete(
    syncLogId: string, 
    result: {
      itemsFound?: number;
      itemsCreated?: number;
      itemsUpdated?: number;
      itemsSkipped?: number;
    }
  ): Promise<void> {
    try {
      const syncLog = await prisma.syncLog.findUnique({
        where: { id: syncLogId },
      });

      if (!syncLog) {
        throw new Error('Sync log not found');
      }

      const duration = Date.now() - syncLog.startedAt.getTime();

      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          duration,
          itemsFound: result.itemsFound || 0,
          itemsCreated: result.itemsCreated || 0,
          itemsUpdated: result.itemsUpdated || 0,
          itemsSkipped: result.itemsSkipped || 0,
        },
      });

      // Update user platform
      if (syncLog.userPlatformId) {
        await prisma.userPlatform.update({
          where: { id: syncLog.userPlatformId },
          data: {
            syncStatus: 'SUCCESS',
            lastSyncedAt: new Date(),
            lastSyncDuration: duration,
            consecutiveFailures: 0,
            syncAttempts: { increment: 1 },
          },
        });
      }

      log.info('Sync job completed', { syncLogId, duration, result });

    } catch (error) {
      log.error('Failed to mark sync as complete', { syncLogId }, error);
      throw error;
    }
  }

  /**
   * Mark job as failed
   */
  static async fail(
    syncLogId: string, 
    error: {
      code?: string;
      message: string;
      stack?: string;
    }
  ): Promise<void> {
    try {
      const syncLog = await prisma.syncLog.findUnique({
        where: { id: syncLogId },
      });

      if (!syncLog) {
        throw new Error('Sync log not found');
      }

      const shouldRetry = syncLog.attemptNumber < this.MAX_ATTEMPTS;
      const nextRetryAt = shouldRetry 
        ? new Date(Date.now() + this.RETRY_DELAY_MS * syncLog.attemptNumber)
        : null;

      const duration = Date.now() - syncLog.startedAt.getTime();

      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: shouldRetry ? 'PENDING' : 'FAILED',
          completedAt: shouldRetry ? null : new Date(),
          duration,
          hasError: true,
          errorCode: error.code,
          errorMessage: error.message,
          errorStack: error.stack,
          attemptNumber: { increment: 1 },
          nextRetryAt,
        },
      });

      // Update user platform
      if (syncLog.userPlatformId) {
        await prisma.userPlatform.update({
          where: { id: syncLog.userPlatformId },
          data: {
            syncStatus: shouldRetry ? 'PENDING' : 'FAILED',
            lastSyncError: error.message,
            consecutiveFailures: { increment: 1 },
            nextSyncAt: nextRetryAt,
          },
        });
      }

      log.error('Sync job failed', { 
        syncLogId, 
        duration, 
        shouldRetry,
        attemptNumber: syncLog.attemptNumber 
      }, error);

    } catch (err) {
      log.error('Failed to mark sync as failed', { syncLogId }, err);
      throw err;
    }
  }

  /**
   * Cancel a job
   */
  static async cancel(syncLogId: string, reason?: string): Promise<void> {
    try {
      const syncLog = await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          errorMessage: reason,
        },
      });

      if (syncLog.userPlatformId) {
        await prisma.userPlatform.update({
          where: { id: syncLog.userPlatformId },
          data: { syncStatus: 'IDLE' },
        });
      }

      log.info('Sync job cancelled', { syncLogId, reason });

    } catch (error) {
      log.error('Failed to cancel sync job', { syncLogId }, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  static async getStats(): Promise<QueueStats> {
    try {
      const [pending, inProgress, total] = await Promise.all([
        prisma.syncLog.count({ where: { status: 'PENDING' } }),
        prisma.syncLog.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.syncLog.count(),
      ]);

      // Calculate average wait time
      const pendingJobs = await prisma.syncLog.findMany({
        where: { status: 'PENDING' },
        select: { createdAt: true },
        take: 100,
      });

      const avgWaitTime = pendingJobs.length > 0
        ? pendingJobs.reduce((sum, job) => {
            return sum + (Date.now() - job.createdAt.getTime());
          }, 0) / pendingJobs.length
        : 0;

      return {
        pending,
        inProgress,
        total,
        avgWaitTime: Math.round(avgWaitTime),
      };

    } catch (error) {
      log.error('Failed to get queue stats', {}, error);
      return { pending: 0, inProgress: 0, total: 0, avgWaitTime: 0 };
    }
  }

  /**
   * Clear stale jobs (stuck in IN_PROGRESS for > 30 minutes)
   */
  static async clearStaleJobs(): Promise<number> {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const result = await prisma.syncLog.updateMany({
        where: {
          status: 'IN_PROGRESS',
          startedAt: { lt: thirtyMinutesAgo },
        },
        data: {
          status: 'FAILED',
          errorMessage: 'Job timeout - exceeded 30 minutes',
          completedAt: new Date(),
        },
      });

      if (result.count > 0) {
        log.warn('Cleared stale sync jobs', { count: result.count });
      }

      return result.count;

    } catch (error) {
      log.error('Failed to clear stale jobs', {}, error);
      return 0;
    }
  }

  /**
   * Get user's pending jobs
   */
  static async getUserJobs(userId: string): Promise<SyncJob[]> {
    try {
      const syncLogs = await prisma.syncLog.findMany({
        where: {
          userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          userPlatform: true,
        },
      });

      return syncLogs.map(log => ({
        id: log.id,
        userId: log.userId,
        platformId: log.platformId!,
        userPlatformId: log.userPlatformId!,
        status: log.status,
        priority: log.userPlatform?.syncPriority || 0,
        createdAt: log.createdAt,
        attemptNumber: log.attemptNumber,
        maxAttempts: log.maxAttempts,
      }));

    } catch (error) {
      log.error('Failed to get user jobs', { userId }, error);
      return [];
    }
  }
}