// src/lib/bullmq.ts
import { Queue, QueueEvents, ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared connection for BullMQ
export const connection: ConnectionOptions = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // Essential for BullMQ
});

// Queue Default Options
export const defaultOptions = {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep for debugging
    },
};

// =============================================================================
// QUEUE DEFINITIONS
// =============================================================================

export const scraperQueues = {
    // Heavy Queue: For Puppeteer-based scrapers (Low concurrency)
    heavy: new Queue('scraper.heavy', defaultOptions),

    // Light Queue: For API/HTML scrapers (High concurrency)
    light: new Queue('scraper.light', {
        ...defaultOptions,
        defaultJobOptions: {
            ...defaultOptions.defaultJobOptions,
            backoff: { type: 'exponential', delay: 1000 },
        },
    }),

    // Priority Queue: For UI-triggered imperative syncs
    priority: new Queue('scraper.priority', defaultOptions),
};

// Generic Queues derived from old queue.ts
export const reportsQueue = new Queue('reports', defaultOptions);
export const emailsQueue = new Queue('emails', {
    ...defaultOptions,
    defaultJobOptions: {
        ...defaultOptions.defaultJobOptions,
        backoff: { type: 'exponential', delay: 5000 },
    },
});
export const notificationsQueue = new Queue('notifications', defaultOptions);
export const exportsQueue = new Queue('exports', defaultOptions);

// =============================================================================
// EVENTS CLEANUP
// =============================================================================

export const queueEvents = {
    heavy: new QueueEvents('scraper.heavy', { connection }),
    light: new QueueEvents('scraper.light', { connection }),
    priority: new QueueEvents('scraper.priority', { connection }),
};

/**
 * Graceful Shutdown
 */
export async function closeBullMQ() {
    logger.info('Closing all BullMQ queues and connections...');

    await Promise.all([
        scraperQueues.heavy.close(),
        scraperQueues.light.close(),
        scraperQueues.priority.close(),
        reportsQueue.close(),
        emailsQueue.close(),
        notificationsQueue.close(),
        exportsQueue.close(),
        queueEvents.heavy.close(),
        queueEvents.light.close(),
        queueEvents.priority.close(),
    ]);

    // Close Redis connection
    if (connection instanceof IORedis) {
        await (connection as IORedis).quit();
    }

    logger.info('All BullMQ resources closed');
}
