// src/trigger/daily-sync-task.ts
// Fixed: Corrected SyncService usage and return types

import { schedules } from "@trigger.dev/sdk/v3";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { syncUserPlatformsTask } from "./sync-all-platforms";

export const dailySyncTask = schedules.task({
  id: "daily-platform-sync",
  cron: "0 2 * * *", // 2 AM UTC daily
  maxDuration: 1800, // 30 minutes
  run: async () => {
    logger.info("Running daily sync task...");

    const usersWithAutoSync = await prisma.userSettings.findMany({
      where: { autoSync: true },
      select: { userId: true },
    });

    let triggered = 0;
    let failed = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const { userId } of usersWithAutoSync) {
      try {
        await syncUserPlatformsTask.trigger({ userId });
        triggered++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to trigger sync for user ${userId}`, { userId }, error instanceof Error ? error : new Error(errorMessage));
        errors.push({ userId, error: errorMessage });
        failed++;
      }
    }

    logger.info(`Daily sync task completed`, {
      usersProcessed: usersWithAutoSync.length,
      triggered,
      failed,
    });

    return {
      usersProcessed: usersWithAutoSync.length,
      triggered,
      failed,
      errors: errors.slice(0, 10), // Limit errors in response
      timestamp: new Date().toISOString(),
    };
  },
});