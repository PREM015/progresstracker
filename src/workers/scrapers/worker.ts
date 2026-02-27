// src/workers/scrapers/worker.ts

import { scraperQueues } from './queues';
import { processScraperJob } from './processor';
import { logger } from '@/lib/logger';
import Bull from 'bull';

/**
 * Setup event listeners for a queue
 */
function setupListeners(queue: Bull.Queue) {
    queue.on('completed', (job) => {
        logger.info(`Job ${job.id} completed successfully.`);
    });

    queue.on('failed', (job, err) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Job ${job?.id} failed`, { error: message });
    });

    queue.on('error', (err) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Queue error: ${message}`);
    });
}

/**
 * Initialize all scraper workers
 */
export function initScraperWorkers() {
    scraperQueues.heavy.process(2, processScraperJob);
    scraperQueues.light.process(10, processScraperJob);
    scraperQueues.priority.process(5, processScraperJob);

    setupListeners(scraperQueues.heavy);
    setupListeners(scraperQueues.light);
    setupListeners(scraperQueues.priority);

    logger.info('Scraper workers initialized.');
}
