import { statsQueue } from '@/lib/queues/statsQueue';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Queue } from 'bullmq';

// ---------------------------------------------------------------------------
// Scheduler Logic for Stats Precomputation
// ---------------------------------------------------------------------------

/**
 * Schedule a daily batch job for all active users.
 * This should be called by a cron job (e.g., via a separate worker or external trigger)
 * or triggered on server startup if no job exists.
 */
export async function scheduleDailyBatch() {
    const startTime = Date.now();
    logger.info('Starting daily stats batch scheduling...');

    try {
        // 1. Find all users who have been active in the last 30 days
        // We prioritize active users to save resources
        const activeUsers = await prisma.user.findMany({
            where: {
                lastActiveAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            },
            select: { id: true }
        });

        logger.info(`Found ${activeUsers.length} active users for daily stats update`);

        // 2. Add jobs to queue
        // Use bulk add for efficiency
        const jobs = activeUsers.map(user => ({
            name: 'daily-stats-update',
            data: {
                userId: user.id,
                date: new Date().toISOString()
            },
            opts: {
                jobId: `daily-stats-${user.id}-${new Date().toISOString().split('T')[0]}`, // Dedup for today
                removeOnComplete: true,
                removeOnFail: { count: 3 } // Keep last 3 failures
            }
        }));

        if (jobs.length > 0) {
            await statsQueue.addBulk(jobs);
        }

        logger.info(`Scheduled ${jobs.length} daily stats jobs`, {
            duration: Date.now() - startTime
        });

    } catch (error) {
        logger.error('Failed to schedule daily stats batch', { error: String(error) });
    }
}

/**
 * Schedule a single user update (e.g., after they log in or perform an action).
 * This acts as a "warmup" or "refresh" trigger.
 */
export async function scheduleUserStatsUpdate(userId: string) {
    try {
        await statsQueue.add(
            'user-stats-update',
            { userId, date: new Date().toISOString() },
            {
                jobId: `user-stats-${userId}-${Date.now()}`, // Unique ID for immediate run
                removeOnComplete: true
            }
        );
        logger.debug(`Scheduled immediate stats update for user ${userId}`);
    } catch (error) {
        logger.error(`Failed to schedule stats update for user ${userId}`, { error: String(error) });
    }
}
