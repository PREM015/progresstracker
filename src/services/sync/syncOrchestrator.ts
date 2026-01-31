// src/services/sync/syncOrchestrator.ts

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ScraperFactory } from '../scrapers';
import { SyncService } from '../syncService';
import type { SyncJob, SyncStatus, SyncQueueStatus, SyncRequestOptions } from '@/types/sync';

interface SyncQueueItem {
  id: string;
  jobId: string;
  userId: string;
  platformId: string;
  platformSlug: string;
  priority: number;
  createdAt: Date;
  status: SyncStatus;
  retries: number;
}

class SyncOrchestrator {
  private queue: SyncQueueItem[] = [];
  private isProcessing: boolean = false;
  private readonly maxConcurrent: number = 5;
  private readonly maxRetries: number = 3;
  private readonly activeJobs: Map<string, SyncJob> = new Map();
  private readonly log = logger.child({ service: 'SyncOrchestrator' });

  /**
   * Add sync job to queue
   */
  async enqueue(options: SyncRequestOptions): Promise<string> {
    const { userId, platformIds, priority = 'normal', force = false } = options;

    this.log.info('Enqueueing sync job', { userId, platformIds, priority, force });

    // Get platforms to sync
    let platforms: Array<{ id: string; slug: string; name: string }>;

    if (platformIds && platformIds.length > 0) {
      platforms = await prisma.platform.findMany({
        where: { 
          id: { in: platformIds },
          isActive: true,
        },
        select: { id: true, slug: true, name: true },
      });
    } else {
      // Get all connected platforms for user
      const userPlatforms = await prisma.userPlatform.findMany({
        where: { 
          userId,
          isActive: true,
        },
        include: { 
          platform: { 
            select: { id: true, slug: true, name: true, isActive: true } 
          } 
        },
      });
      platforms = userPlatforms
        .filter(up => up.platform.isActive)
        .map((up) => up.platform);
    }

    // Filter to auto-syncable platforms (those with working scrapers)
    const syncablePlatforms = platforms.filter((p) => 
      ScraperFactory.isScraperWorking(p.slug)
    );

    if (syncablePlatforms.length === 0) {
      this.log.warn('No auto-syncable platforms found', { userId, requestedPlatforms: platforms.length });
      throw new Error('No auto-syncable platforms found');
    }

    // Create job ID
    const jobId = `sync_${userId}_${Date.now()}`;

    // Create job
    const job: SyncJob = {
      id: jobId,
      userId,
      status: 'pending',
      progress: 0,
      totalPlatforms: syncablePlatforms.length,
      completedPlatforms: 0,
      failedPlatforms: 0,
      startedAt: new Date(),
      platforms: syncablePlatforms.map(p => ({
        platformId: p.id,
        platformName: p.name,
        status: 'pending' as SyncStatus,
      })),
    };

    this.activeJobs.set(jobId, job);

    // Add platforms to queue
    const priorityMap: Record<string, number> = { high: 3, normal: 2, low: 1 };

    for (const platform of syncablePlatforms) {
      this.queue.push({
        id: `${jobId}_${platform.id}`,
        jobId,
        userId,
        platformId: platform.id,
        platformSlug: platform.slug,
        priority: priorityMap[priority] || 2,
        createdAt: new Date(),
        status: 'pending',
        retries: 0,
      });
    }

    // Sort queue by priority (highest first)
    this.queue.sort((a, b) => b.priority - a.priority);

    this.log.info('Sync job enqueued', { 
      jobId, 
      platformCount: syncablePlatforms.length,
      queueLength: this.queue.length,
    });

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    this.log.debug('Starting queue processing', { queueLength: this.queue.length });

    while (this.queue.length > 0) {
      // Get batch of items
      const batch = this.queue.splice(0, this.maxConcurrent);

      this.log.debug('Processing batch', { batchSize: batch.length });

      // Process batch in parallel
      await Promise.allSettled(
        batch.map((item) => this.processItem(item))
      );

      // Small delay between batches to prevent overwhelming
      await new Promise((r) => setTimeout(r, 500));
    }

    this.isProcessing = false;
    this.log.debug('Queue processing complete');
  }

  /**
   * Process single queue item
   */
  private async processItem(item: SyncQueueItem): Promise<void> {
    const job = this.activeJobs.get(item.jobId);

    if (!job) {
      this.log.warn('Job not found for queue item', { itemId: item.id, jobId: item.jobId });
      return;
    }

    const startTime = Date.now();

    try {
      item.status = 'running';
      
      // Update platform status in job
      const platformStatus = job.platforms?.find(p => p.platformId === item.platformId);
      if (platformStatus) {
        platformStatus.status = 'running';
      }

      this.log.debug('Processing sync item', { 
        itemId: item.id, 
        platformId: item.platformId,
        platformSlug: item.platformSlug,
      });

      // Execute sync
      const result = await SyncService.syncPlatform(item.userId, item.platformId);

      const duration = Date.now() - startTime;

      // Update job
      job.completedPlatforms++;
      job.progress = Math.round(
        ((job.completedPlatforms + job.failedPlatforms) / job.totalPlatforms) * 100
      );

      // Update platform status
      if (platformStatus) {
        platformStatus.status = 'success';
        platformStatus.duration = duration;
        platformStatus.itemsFound = result?.itemsFound || 0;
        platformStatus.itemsCreated = result?.itemsCreated || 0;
        platformStatus.itemsUpdated = result?.itemsUpdated || 0;
      }

      item.status = 'success';

      this.log.info('Sync item completed', {
        itemId: item.id,
        platformId: item.platformId,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.log.error('Sync item failed', { 
        itemId: item.id, 
        platformId: item.platformId,
        retries: item.retries,
        duration,
      }, error);

      // Retry logic
      if (item.retries < this.maxRetries) {
        item.retries++;
        item.status = 'pending';
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.push(item);
          if (!this.isProcessing) {
            this.processQueue();
          }
        }, 1000 * item.retries); // Exponential backoff
        
        this.log.debug('Retrying sync item', { 
          itemId: item.id, 
          retryCount: item.retries 
        });
      } else {
        job.failedPlatforms++;
        job.progress = Math.round(
          ((job.completedPlatforms + job.failedPlatforms) / job.totalPlatforms) * 100
        );
        
        // Update platform status
        const platformStatus = job.platforms?.find(p => p.platformId === item.platformId);
        if (platformStatus) {
          platformStatus.status = 'failed';
          platformStatus.error = errorMessage;
          platformStatus.duration = duration;
        }

        item.status = 'failed';
      }
    }

    // Check if job is complete
    if (job.completedPlatforms + job.failedPlatforms >= job.totalPlatforms) {
      job.status =
        job.failedPlatforms === 0
          ? 'success'
          : job.completedPlatforms === 0
          ? 'failed'
          : 'partial';
      job.completedAt = new Date();
      job.progress = 100;

      this.log.info('Sync job completed', {
        jobId: job.id,
        status: job.status,
        completed: job.completedPlatforms,
        failed: job.failedPlatforms,
        duration: Date.now() - job.startedAt.getTime(),
      });

      // Clean up job after 5 minutes
      setTimeout(() => {
        this.activeJobs.delete(job.id);
        this.log.debug('Cleaned up completed job', { jobId: job.id });
      }, 5 * 60 * 1000);
    }

    this.activeJobs.set(job.id, job);
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): SyncJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): SyncQueueStatus {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs.size,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Get all active jobs for a user
   */
  getUserJobs(userId: string): SyncJob[] {
    return Array.from(this.activeJobs.values())
      .filter(job => job.userId === userId);
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      this.log.warn('Cannot cancel - job not found', { jobId });
      return false;
    }

    if (job.status !== 'pending' && job.status !== 'running') {
      this.log.warn('Cannot cancel - job already completed', { jobId, status: job.status });
      return false;
    }

    // Remove pending items from queue
    const removedCount = this.queue.length;
    this.queue = this.queue.filter(
      (item) => item.jobId !== jobId
    );
    const actualRemoved = removedCount - this.queue.length;

    job.status = 'cancelled';
    job.error = 'Cancelled by user';
    job.completedAt = new Date();
    this.activeJobs.set(jobId, job);

    this.log.info('Job cancelled', { jobId, removedFromQueue: actualRemoved });

    return true;
  }

  /**
   * Clear entire queue
   */
  clearQueue(): void {
    const queueLength = this.queue.length;
    this.queue = [];
    this.log.info('Queue cleared', { removedItems: queueLength });
  }

  /**
   * Get queue items for debugging
   */
  getQueueItems(): SyncQueueItem[] {
    return [...this.queue];
  }
}

// Singleton instance
export const syncOrchestrator = new SyncOrchestrator();
export default syncOrchestrator;