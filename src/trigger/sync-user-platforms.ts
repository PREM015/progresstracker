// src/trigger/sync-user-platforms.ts
// This file can be simplified since sync-all-platforms.ts has the main task
// Keeping for backward compatibility

import { task } from "@trigger.dev/sdk/v3";
import { logger } from "@/lib/logger";
import { SyncService } from "@/services/syncService";

interface SyncSingleUserPayload {
  userId: string;
  platformIds?: string[];
}

export const syncSingleUserTask = task({
  id: "sync-single-user",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
  },
  run: async (payload: SyncSingleUserPayload) => {
    const { userId, platformIds } = payload;

    logger.info(`Syncing platforms for user`, { userId, platformIds });

    if (platformIds && platformIds.length > 0) {
      // Sync specific platforms
      const results: Array<{ platformId: string; success: boolean; error?: string }> = [];

      for (const platformId of platformIds) {
        try {
          await SyncService.syncPlatform(userId, platformId);
          results.push({ platformId, success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.push({ platformId, success: false, error: errorMessage });
          logger.error(`Failed to sync platform`, { userId, platformId }, error instanceof Error ? error : new Error(errorMessage));
        }
      }

      const successCount = results.filter((r) => r.success).length;

      return {
        userId,
        totalPlatforms: platformIds.length,
        successCount,
        failedCount: platformIds.length - successCount,
        results,
        status: successCount === platformIds.length ? "success" : "partial",
      };
    }

    // Sync all platforms
    const result = await SyncService.syncAllPlatforms(userId);

    return {
      userId,
      jobId: result.jobId,
      totalPlatforms: result.platformCount,
      successCount: result.successCount,
      failedCount: result.failCount,
      status: result.failCount === 0 ? "success" : "partial",
    };
  },
});