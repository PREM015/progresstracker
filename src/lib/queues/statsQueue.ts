// src/lib/queues/statsQueue.ts
import { Queue, QueueEvents } from 'bullmq';
import { connection, defaultOptions } from '@/lib/bullmq';

// Stats Precomputation Queue
export const statsQueue = new Queue('stats-precompute', {
  ...defaultOptions,
  defaultJobOptions: {
    ...defaultOptions.defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

// Queue Events (for monitoring job completions/failures)
export const statsQueueEvents = new QueueEvents('stats-precompute', { connection });