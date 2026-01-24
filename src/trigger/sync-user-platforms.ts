// src/trigger/sync-user-platforms.ts

import { task } from "@trigger.dev/sdk/v3";
import { logger } from "@/lib/logger";
import { SyncService } from "@/services/syncService";

export const syncSingleUserTask = task({
  id: "sync-single-user",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
  },
  run: async (payload: { userId: string; platformIds?: string[] }) => {
    const { userId, platformIds } = payload;

    logger.info(`Syncing platforms for user: ${userId}`);

    const job = await SyncService.syncAllPlatforms(userId, {
      platforms: platformIds,
    });

    return {
      jobId: job.id,
      totalPlatforms: job.totalPlatforms,
      status: 'triggered',
    };
  },
});