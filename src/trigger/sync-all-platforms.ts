// src/trigger/sync-all-platforms.ts

import { task, schedules } from "@trigger.dev/sdk/v3";
import{ prisma} from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { SyncService } from "@/services/syncService";

// Task to sync all platforms for a single user
export const syncUserPlatformsTask = task({
  id: "sync-user-platforms",
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: { userId: string }) => {
    const { userId } = payload;

    logger.info(`Starting sync for user: ${userId}`);

    try {
      const job = await SyncService.syncAllPlatforms(userId);

      return {
        success: true,
        jobId: job.id,
        platformCount: job.totalPlatforms,
      };
    } catch (error: any) {
      logger.error(`Sync failed for user ${userId}:`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  },
});

// Scheduled task to sync all users
export const dailySyncAllUsersTask = schedules.task({
  id: "daily-sync-all-users",
  cron: "0 2 * * *", // 2 AM UTC daily
  maxDuration: 1800, // 30 minutes
  run: async () => {
    logger.info("Starting daily sync for all users...");

    // Get users with auto-sync enabled
    const users = await prisma.userSettings.findMany({
      where: { autoSync: true },
      select: { userId: true },
    });

    logger.info(`Found ${users.length} users with auto-sync enabled`);

    const results: Array<{ userId: string; success: boolean; error?: string }> = [];

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async ({ userId }) => {
          try {
            await syncUserPlatformsTask.trigger({ userId });
            results.push({ userId, success: true });
          } catch (error: any) {
            results.push({ userId, success: false, error: error.message });
          }
        })
      );

      // Rate limiting between batches
      if (i + batchSize < users.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    logger.info(`Daily sync complete: ${successCount} success, ${failCount} failed`);

    return {
      totalUsers: users.length,
      successCount,
      failCount,
      results,
    };
  },
});