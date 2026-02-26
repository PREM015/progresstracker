// src/workers/scrapers/processor.ts

import { Job } from 'bull';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { rateLimitManager } from '@/services/scrapers/rateLimitManager';
import { syncPlatformData, SyncResult } from '@/lib/sync-platform';
import { ScraperJobData } from './types';

class RateLimitError extends Error {
    constructor(platform: string) {
        super(`Rate limit exceeded for ${platform}`);
        this.name = 'RateLimitError';
    }
}

/**
 * Main processor function for scraper jobs
 */
export async function processScraperJob(job: Job<ScraperJobData>): Promise<SyncResult> {
    const { userId, platformId, userPlatformId, triggeredBy } = job.data;
    const jobId = job.id;

    logger.info(`Starting scraper job ${jobId}`, {
        userId,
        platformId,
        userPlatformId,
        triggeredBy,
        queue: job.queue.name,
    });

    try {
        // Fetch platform slug
        const platform = await prisma.platform.findUnique({
            where: { id: platformId },
            select: { slug: true },
        });

        if (!platform) throw new Error(`Platform not found: ${platformId}`);

        // Rate-limit check
        const canAcquire = await rateLimitManager.tryAcquire(platform.slug);
        if (!canAcquire) {
            logger.warn(`Rate limit hit for ${platform.slug}, job ${jobId} delayed`);
            throw new RateLimitError(platform.slug);
        }

        // Perform sync
        const result: SyncResult = await syncPlatformData(userId, platformId, userPlatformId);

        if (!result.success) {
            throw new Error(result.error || 'Sync failed unknown error');
        }

        logger.info(`Scraper job ${jobId} completed successfully`, {
            platform: platform.slug,
            items: result.itemsFound,
        });

        return result;
    } catch (error: unknown) {
        if (error instanceof RateLimitError) throw error;

        const errMessage =
            error instanceof Error ? error.message : JSON.stringify(error);
        logger.error(`Scraper job ${jobId} failed`, { jobId, error: errMessage });

        throw error;
    }
}
