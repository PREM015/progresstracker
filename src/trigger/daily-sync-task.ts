// src/trigger/daily-sync-task.ts

import type { UserPlatform } from '@prisma/client';
import { schedules } from "@trigger.dev/sdk/v3";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { syncUserPlatformsTask } from "./sync-all-platforms";

export const dailySyncTask = schedules.task({
  id: "daily-platform-sync",
  cron: "0 2 * * *", // 2 AM UTC
  run: async () => {
    logger.info("Running daily sync task...");

    const usersWithAutoSync = await prisma.userSettings.findMany({
      where: { autoSync: true },
      select: { userId: true },
    });

    let triggered = 0;
    let failed = 0;

    for (const { userId } of usersWithAutoSync) {
      try {
        await syncUserPlatformsTask.trigger({ userId });
        triggered++;
      } catch (error) {
        logger.error(`Failed to trigger sync for ${userId}:`, error instanceof Error ? error : new Error(String(error)));
        failed++;
      }
    }

    return {
      usersProcessed: usersWithAutoSync.length,
      triggered,
      failed,
      timestamp: new Date().toISOString(),
    };
  },
});