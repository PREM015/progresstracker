import { Worker, Job } from 'bullmq';
import { connection } from '@/lib/bullmq';
import { logger } from '@/lib/logger';
import { SyncService } from '@/services/syncService';

import { prisma } from '@/lib/prisma';
import { rateLimitManager } from '@/services/scrapers/rateLimitManager';

interface ScraperJobData {
    userId: string;
    platformId: string;
    userPlatformId: string;
    triggeredBy: string;
}

const processScraperJob = async (job: Job<ScraperJobData>) => {
    const { userId, platformId, triggeredBy } = job.data;

    logger.info(`Worker processing job ${job.id} (${job.name})`, {
        jobId: job.id,
        userId,
        platformId,
        triggeredBy
    });

    try {
        // 1. Get Platform Slug
        const platform = await prisma.platform.findUnique({
            where: { id: platformId },
            select: { slug: true }
        });

        if (!platform) throw new Error(`Platform ${platformId} not found`);

        // 2. Check Rate Limits
        const canAcquire = await rateLimitManager.tryAcquire(platform.slug);
        if (!canAcquire) {
            logger.warn(`Rate limit hit for ${platform.slug}, job ${job.id} will retry via backoff`);
            throw new Error(`RATE_LIMIT_EXCEEDED:${platform.slug}`);
        }

        const result = await SyncService.internalSync(userId, platformId, { triggeredBy });
        return result;
    } catch (error) {
        logger.error(`Worker job ${job.id} failed`, { jobId: job.id, error });
        throw error;
    }
};

// =============================================================================
// WORKERS
// =============================================================================

// Heavy Queue Worker: 2 concurrent jobs (Puppeteer)
export const heavyWorker = new Worker<ScraperJobData>(
    'scraper.heavy',
    processScraperJob,
    {
        connection,
        concurrency: 2,
    }
);

// Light Queue Worker: 10 concurrent jobs (API/HTML)
export const lightWorker = new Worker<ScraperJobData>(
    'scraper.light',
    processScraperJob,
    {
        connection,
        concurrency: 10,
    }
);

// Priority Queue Worker: 5 concurrent jobs (Direct user triggers)
export const priorityWorker = new Worker<ScraperJobData>(
    'scraper.priority',
    processScraperJob,
    {
        connection,
        concurrency: 5,
    }
);

// =============================================================================
// EVENT LISTENERS
// =============================================================================

const setupListeners = (worker: Worker) => {
    worker.on('completed', (job) => {
        logger.info(`Job ${job.id} has completed successfully`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Job ${job?.id} failed with ${err.message}`);
    });

    worker.on('error', (err) => {
        logger.error(`Worker error: ${err.message}`);
    });
};

setupListeners(heavyWorker);
setupListeners(lightWorker);
setupListeners(priorityWorker);

logger.info('BullMQ Scraper Workers initialized');
