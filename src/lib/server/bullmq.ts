import 'server-only';
import { Queue, QueueEvents, Worker } from 'bullmq';
import { connection, defaultOptions } from '@/lib/bullmq';

// Re-export specific server-side only functionality if needed
// This file ensures that these imports are only used on the server
// and won't inadvertently be included in client bundles.

export const createQueue = (name: string) => {
    return new Queue(name, defaultOptions);
};

export const createWorker = (name: string, processor: any, options: any = {}) => {
    return new Worker(name, processor, {
        connection,
        ...options,
    });
};

export const createQueueEvents = (name: string) => {
    return new QueueEvents(name, { connection });
};
