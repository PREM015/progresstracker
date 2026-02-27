// src/workers/scrapers/queues.ts

import Bull from 'bull';
import { logger } from '@/lib/logger';
import { ScraperJobData } from './types';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const scraperQueues = {
    heavy: new Bull<ScraperJobData>('scraper.heavy', REDIS_URL, {
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: false,
        },
        settings: { maxStalledCount: 1 },
    }),

    light: new Bull<ScraperJobData>('scraper.light', REDIS_URL, {
        defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
        },
    }),

    priority: new Bull<ScraperJobData>('scraper.priority', REDIS_URL, {
        defaultJobOptions: {
            attempts: 3,
            priority: 1,
        },
    }),
};

/**
 * Graceful shutdown for all queues
 */
export async function closeScraperQueues() {
    await Promise.all([
        scraperQueues.heavy.close(),
        scraperQueues.light.close(),
        scraperQueues.priority.close(),
    ]);
    logger.info('Scraper queues closed gracefully.');
}
