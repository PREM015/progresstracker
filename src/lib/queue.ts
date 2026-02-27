// src/lib/queue.ts
import Bull, { Job } from 'bull';
import { logger } from './logger';
import { prisma } from './prisma';
import { generateAndSaveReport } from './pdf-generator';
import { broadcastEmail } from './email-admin';
import { syncPlatformData } from './sync-platform';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Redis connection
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// =============================================================================
// QUEUE DEFINITIONS
// =============================================================================

export const queues = {
  reports: new Bull('reports', REDIS_URL, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  }),

  emails: new Bull('emails', REDIS_URL, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  }),

  sync: new Bull('sync', REDIS_URL, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  }),

  notifications: new Bull('notifications', REDIS_URL, {
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  }),

  exports: new Bull('exports', REDIS_URL, {
    defaultJobOptions: {
      attempts: 2,
      timeout: 300000, // 5 minutes
      removeOnComplete: false,
      removeOnFail: false,
    },
  }),
};

// =============================================================================
// JOB TYPES
// =============================================================================

export interface ReportJobData {
  userId: string;
  reportType: string;
  periodStart: Date;
  periodEnd: Date;
  requestedBy: string;
}

export interface EmailJobData {
  userIds: string[];
  subject: string;
  htmlTemplate: string;
  variables?: Record<string, string>;
}

export interface SyncJobData {
  userId: string;
  platformId: string;
  userPlatformId: string;
  triggeredBy: string;
}

export interface NotificationJobData {
  userIds: string[];
  notification: {
    type: string;
    title: string;
    message: string;
    priority: string;
    actionUrl?: string;
    actionLabel?: string;
  };
}

export interface ExportJobData {
  userId: string;
  exportJobId: string;
  format: string;
  dateFrom?: Date;
  dateTo?: Date;
  platforms?: string[];
  categories?: string[];
}

// =============================================================================
// QUEUE PROCESSORS
// =============================================================================

// Report Generation Processor
queues.reports.process(5, async (job: Job<ReportJobData>) => {
  logger.info('Processing report job', { jobId: job.id, userId: job.data.userId });

  try {
    const { userId, reportType, periodStart, periodEnd } = job.data;

    await job.progress(10);

    const result = await generateAndSaveReport(
      userId,
      new Date(periodStart),
      new Date(periodEnd),
      reportType
    );

    await job.progress(90);

    await prisma.report.update({
      where: { id: result.reportId },
      data: {
        status: 'generated',
        pdfUrl: result.pdfUrl,
      },
    });

    await job.progress(100);

    logger.info('Report job completed', { jobId: job.id, reportId: result.reportId });

    return result;
  } catch (error) {
    logger.error('Report job failed', { jobId: job.id }, error);
    throw error;
  }
});

// Email Broadcasting Processor
queues.emails.process(3, async (job: Job<EmailJobData>) => {
  logger.info('Processing email job', { jobId: job.id, recipients: job.data.userIds.length });

  try {
    const { userIds, subject, htmlTemplate, variables } = job.data;

    await job.progress(10);

    const result = await broadcastEmail(userIds, subject, htmlTemplate, variables);

    await job.progress(100);

    logger.info('Email job completed', {
      jobId: job.id,
      sent: result.sent,
      failed: result.failed,
    });

    return result;
  } catch (error) {
    logger.error('Email job failed', { jobId: job.id }, error);
    throw error;
  }
});

// Sync Processor - Uses imported syncPlatformData from sync-platform.ts
queues.sync.process(10, async (job: Job<SyncJobData>) => {
  logger.info('Processing sync job', { jobId: job.id, platformId: job.data.platformId });

  try {
    const { userId, platformId, userPlatformId, triggeredBy } = job.data;

    await job.progress(10);

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        userId,
        platformId,
        userPlatformId,
        status: 'IN_PROGRESS',
        triggeredBy,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsFound: 0,
      },
    });

    await job.progress(20);

    // Perform actual sync using imported function
    const syncResult = await syncPlatformData(userId, platformId, userPlatformId);

    await job.progress(80);

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: syncResult.success ? 'SUCCESS' : 'FAILED',
        completedAt: new Date(),
        duration: syncResult.duration,
        itemsFound: syncResult.itemsFound,
        itemsCreated: syncResult.itemsCreated,
        itemsUpdated: syncResult.itemsUpdated,
        hasError: !syncResult.success,
        errorMessage: syncResult.error,
      },
    });

    await job.progress(100);

    logger.info('Sync job completed', { jobId: job.id, success: syncResult.success });

    return syncResult;
  } catch (error) {
    logger.error('Sync job failed', { jobId: job.id }, error);
    throw error;
  }
});

// Notification Processor
queues.notifications.process(10, async (job: Job<NotificationJobData>) => {
  logger.info('Processing notification job', {
    jobId: job.id,
    recipients: job.data.userIds.length,
  });

  try {
    const { userIds, notification } = job.data;

    await job.progress(10);

    // Create notifications in batches
    const BATCH_SIZE = 1000;
    let created = 0;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);

      await prisma.notification.createMany({
        data: batch.map((userId) => ({
          userId,
          type: notification.type as any,
          priority: notification.priority as any,
          channel: 'IN_APP' as const,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          actionLabel: notification.actionLabel,
        })),
      });

      created += batch.length;
      await job.progress(10 + (created / userIds.length) * 90);
    }

    await job.progress(100);

    logger.info('Notification job completed', { jobId: job.id, created });

    return { created };
  } catch (error) {
    logger.error('Notification job failed', { jobId: job.id }, error);
    throw error;
  }
});

// =============================================================================
// JOB ENQUEUERS
// =============================================================================

export async function queueReportGeneration(data: ReportJobData) {
  const job = await queues.reports.add(data, {
    priority: 2,
  });

  logger.info('Report job queued', { jobId: job.id, userId: data.userId });

  return job.id;
}

export async function queueEmailBroadcast(data: EmailJobData) {
  const job = await queues.emails.add(data, {
    priority: 3,
  });

  logger.info('Email job queued', { jobId: job.id, recipients: data.userIds.length });

  return job.id;
}

export async function queueSync(data: SyncJobData) {
  const job = await queues.sync.add(data, {
    priority: 1,
  });

  logger.info('Sync job queued', { jobId: job.id, platformId: data.platformId });

  return job.id;
}

export async function queueNotifications(data: NotificationJobData) {
  const job = await queues.notifications.add(data, {
    priority: 2,
  });

  logger.info('Notification job queued', { jobId: job.id, recipients: data.userIds.length });

  return job.id;
}

export async function queueExport(data: ExportJobData) {
  const job = await queues.exports.add(data, {
    priority: 2,
  });

  logger.info('Export job queued', { jobId: job.id, exportJobId: data.exportJobId });

  return job.id;
}

// =============================================================================
// QUEUE MONITORING
// =============================================================================

export async function getQueueStats() {
  const stats = await Promise.all(
    Object.entries(queues).map(async ([name, queue]) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return {
        name,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    })
  );

  return stats;
}

export async function getJobStatus(queueName: string, jobId: string) {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const state = await job.getState();
  const progress = job.progress();

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
    timestamp: job.timestamp,
    attemptsMade: job.attemptsMade,
  };
}

export async function retryFailedJob(queueName: string, jobId: string) {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await job.retry();
  logger.info('Job retry queued', { queueName, jobId });

  return { success: true };
}

export async function removeJob(queueName: string, jobId: string) {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await job.remove();
  logger.info('Job removed', { queueName, jobId });

  return { success: true };
}

export async function cleanQueue(queueName: string, status: 'completed' | 'failed', olderThanMs: number = 86400000) {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const removed = await queue.clean(olderThanMs, status);
  logger.info('Queue cleaned', { queueName, status, removed: removed.length });

  return { removed: removed.length };
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

export async function closeQueues() {
  logger.info('Closing all queues');

  await Promise.all(Object.values(queues).map((queue) => queue.close()));

  logger.info('All queues closed');
}

// Handle process signals
if (typeof process !== 'undefined') {
  process.on('SIGTERM', closeQueues);
  process.on('SIGINT', closeQueues);
}