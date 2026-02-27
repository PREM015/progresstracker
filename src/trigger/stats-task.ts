// src/trigger/stats-task.ts
// Trigger.dev task for stats precomputation — replaces BullMQ statsWorker + statsScheduler

import { task, schedules, logger } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { CacheService } from "@/services/cacheService";

export interface StatsTaskPayload {
    userId: string;
    date?: string; // ISO date string
    type?: "daily-stats" | "user-stats";
}

export const statsTask = task({
    id: "precompute-stats",
    maxDuration: 60, // 1 min
    retry: {
        maxAttempts: 5,
        minTimeoutInMs: 1000,
        maxTimeoutInMs: 10000,
        factor: 2,
    },
    run: async (payload: StatsTaskPayload) => {
        const { userId, date, type = "daily-stats" } = payload;

        logger.info("Processing stats task", { userId, type });

        if (type === "daily-stats" && date) {
            // Daily stats computation
            const { TrackerService } = await import("@/services/trackerService");
            await TrackerService.processDailyStats(userId, new Date(date));
            logger.info("Daily stats updated", { userId, date });
        }

        // Always invalidate cache
        await CacheService.invalidateStats(userId);

        return { userId, type, updated: true };
    },
});

// Scheduled: Daily batch stats update for all active users
export const dailyStatsBatchTask = schedules.task({
    id: "daily-stats-batch",
    cron: "30 3 * * *", // 3:30 AM UTC daily
    maxDuration: 600, // 10 min
    run: async () => {
        logger.info("Starting daily stats batch...");

        const users = await prisma.user.findMany({
            where: {
                isActive: true,
                lastActivityDate: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Active in last 7 days
                },
            },
            select: { id: true },
        });

        logger.info(`Found ${users.length} active users for stats update`);

        let triggered = 0;
        for (const user of users) {
            try {
                await statsTask.trigger({
                    userId: user.id,
                    date: new Date().toISOString(),
                    type: "daily-stats",
                });
                triggered++;
            } catch (error) {
                logger.error("Failed to trigger stats for user", {
                    userId: user.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        logger.info("Daily stats batch completed", { triggered, total: users.length });
        return { triggered, total: users.length };
    },
});
