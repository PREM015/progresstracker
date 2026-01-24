// src/services/sync/syncOrchestrator.ts

import{ prisma} from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ScraperFactory } from '../scrapers';
import { SyncService } from '../syncService';
import { SyncJob, SyncStatus } from '@/types/sync';

interface SyncJobOptions {
  userId: string;
  platformIds?: string[];
  force?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

interface SyncQueueItem {
  id: string;
  userId: string;
  platformId: string;
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

  // Add job to queue
  async enqueue(options: SyncJobOptions): Promise<string> {
    const { userId, platformIds, priority = 'normal' } = options;

    // Get platforms to sync
    let platforms: Array<{ id: string; slug: string }>;

    if (platformIds && platformIds.length > 0) {
      platforms = await prisma.platform.findMany({
        where: { id: { in: platformIds } },
        select: { id: true, slug: true },
      });
    } else {
      // Get all connected platforms
      const userPlatforms = await prisma.userPlatform.findMany({
        where: { userId },
        include: { platform: { select: { id: true, slug: true } } },
      });
      platforms = userPlatforms.map((up) => up.platform);
    }

    // Filter to auto-syncable platforms
    platforms = platforms.filter((p) => ScraperFactory.isScraperWorking(p.slug));

    if (platforms.length === 0) {
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
      totalPlatforms: platforms.length,
      completedPlatforms: 0,
      failedPlatforms: 0,
      startedAt: new Date(),
    };

    this.activeJobs.set(jobId, job);

    // Add platforms to queue
    const priorityMap = { high: 3, normal: 2, low: 1 };

    for (const platform of platforms) {
      this.queue.push({
        id: `${jobId}_${platform.id}`,
        userId,
        platformId: platform.id,
        priority: priorityMap[priority],
        createdAt: new Date(),
        status: 'pending',
        retries: 0,
      });
    }

    // Sort queue by priority
    this.queue.sort((a, b) => b.priority - a.priority);

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }

    return jobId;
  }

  // Process queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Get batch of items
      const batch = this.queue.splice(0, this.maxConcurrent);

      // Process batch in parallel
      await Promise.allSettled(
        batch.map((item) => this.processItem(item))
      );

      // Small delay between batches
      await new Promise((r) => setTimeout(r, 500));
    }

    this.isProcessing = false;
  }

  // Process single queue item
  private async processItem(item: SyncQueueItem): Promise<void> {
    const jobId = item.id.split('_')[0] + '_' + item.id.split('_')[1];
    const job = this.activeJobs.get(jobId);

    if (!job) return;

    try {
      item.status = 'running';

      // Execute sync
      await SyncService.syncPlatform(item.userId, item.platformId);

      // Update job
      job.completedPlatforms++;
      job.progress = Math.round(
        ((job.completedPlatforms + job.failedPlatforms) / job.totalPlatforms) * 100
      );

      item.status = 'success';
    } catch (error: unknown) {
      logger.error(`Sync failed for platform ${item.platformId}:`, error instanceof Error ? error : new Error(String(error)));

      // Retry logic
      if (item.retries < this.maxRetries) {
        item.retries++;
        item.status = 'pending';
        this.queue.push(item); // Re-add to queue
      } else {
        job.failedPlatforms++;
        job.progress = Math.round(
          ((job.completedPlatforms + job.failedPlatforms) / job.totalPlatforms) * 100
        );
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

      // Clean up job after 5 minutes
      setTimeout(() => {
        this.activeJobs.delete(jobId);
      }, 5 * 60 * 1000);
    }

    this.activeJobs.set(jobId, job);
  }

  // Get job status
  getJobStatus(jobId: string): SyncJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  // Get queue status
  getQueueStatus(): {
    queueLength: number;
    activeJobs: number;
    isProcessing: boolean;
  } {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs.size,
      isProcessing: this.isProcessing,
    };
  }

  // Cancel job
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job?.status !== 'running') return false;

    // Remove pending items from queue
    this.queue = this.queue.filter(
      (item) => !item.id.startsWith(jobId)
    );

    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.completedAt = new Date();
    this.activeJobs.set(jobId, job);

    return true;
  }

  // Clear queue
  clearQueue(): void {
    this.queue = [];
  }
}

// Singleton instance
export const syncOrchestrator = new SyncOrchestrator();
export default syncOrchestrator;