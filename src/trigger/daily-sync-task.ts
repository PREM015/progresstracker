// src/trigger/daily-sync-task.ts

import { schedules } from "@trigger.dev/sdk/v3";
import prisma from "@/lib/prisma";
import { syncUserPlatformsTask } from "./sync-all-platforms";

export const dailySyncTask = schedules.task({
  id: "daily-platform-sync",
  cron: "0 2 * * *", // 2 AM UTC
  run: async () => {
    console.log("Running daily sync task...");

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
        console.error(`Failed to trigger sync for ${userId}:`, error);
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