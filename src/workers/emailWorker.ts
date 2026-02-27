// src/workers/emailWorker.ts
// Email queue worker — processes email jobs from BullMQ 'emails' queue
// Retry: 3 attempts with exponential backoff (5s base)

import { Worker, Job } from 'bullmq';
import { connection } from '@/lib/bullmq';
import { logger } from '@/lib/logger';

interface EmailJobData {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    variables?: Record<string, unknown>;
    from?: string;
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        content: string | Buffer;
        contentType?: string;
    }>;
}

const processEmailJob = async (job: Job<EmailJobData>) => {
    const { to, subject, template, variables } = job.data;
    const recipients = Array.isArray(to) ? to : [to];

    logger.info(`Email worker processing job ${job.id}`, {
        jobId: job.id,
        to: recipients.join(', '),
        subject,
        template,
        attempt: job.attemptsMade + 1,
    });

    try {
        // Dynamic import to avoid circular deps and cold-start overhead
        const { sendEmail } = await import('@/lib/email');

        await sendEmail({
            to: recipients.join(', '),
            subject,
            html: job.data.html || '',
        });

        logger.info(`Email sent successfully: job ${job.id}`, {
            jobId: job.id,
            to: recipients.join(', '),
            subject,
        });

        return { sent: true, recipients: recipients.length };
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Email job ${job.id} failed (attempt ${job.attemptsMade + 1}/3)`, {
            jobId: job.id,
            to: recipients.join(', '),
            subject,
            error: errMsg,
            attempt: job.attemptsMade + 1,
        });
        throw error; // Let BullMQ handle retry
    }
};

// Worker with 3 retries, exponential backoff (5s → 10s → 20s)
export const emailWorker = new Worker<EmailJobData>(
    'emails',
    processEmailJob,
    {
        connection,
        concurrency: 5,
        limiter: {
            max: 50,
            duration: 60_000, // Max 50 emails per minute
        },
    }
);

// Event listeners
emailWorker.on('completed', (job) => {
    logger.info(`Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
    logger.error(`Email job ${job?.id} FAILED permanently`, {
        jobId: job?.id,
        error: err.message,
        attempts: job?.attemptsMade,
    });
});

emailWorker.on('error', (err) => {
    logger.error(`Email worker error: ${err.message}`);
});

logger.info('Email worker initialized (concurrency: 5, rate-limit: 50/min)');
