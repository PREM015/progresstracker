/* eslint-disable @typescript-eslint/no-unused-vars */
// src/trigger/sync-all-platforms.ts
// Fixed: Correct SyncService usage and proper error handling

import { task, schedules } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { SyncStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { SyncService } from "@/services/syncService";

interface SyncUserPlatformsPayload {
  userId: string;
  platformIds?: string[];
  force?: boolean;
}

interface SyncUserPlatformsResult {
  success: boolean;
  jobId: string;
  platformCount: number;
  successCount: number;
  failedCount: number;
}

// Task to sync all platforms for a single user
export const syncUserPlatformsTask = task({
  id: "sync-user-platforms",
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: SyncUserPlatformsPayload): Promise<SyncUserPlatformsResult> => {
    const { userId, platformIds, force } = payload;

    logger.info(`Starting platform sync for user`, { userId, platformIds, force });

    try {
      // If specific platforms requested, sync them individually
      if (platformIds && platformIds.length > 0) {
        let successCount = 0;
        let failedCount = 0;

        for (const platformId of platformIds) {
          try {
            await SyncService.syncPlatform(userId, platformId, { async: true });
            successCount++;
          } catch (error) {
            failedCount++;
            logger.error(`Failed to sync platform ${platformId}`, { userId, platformId }, error instanceof Error ? error : new Error(String(error)));
          }
        }

        return {
          success: failedCount === 0,
          jobId: `sync-${userId}-${Date.now()}`,
          platformCount: platformIds.length,
          successCount,
          failedCount,
        };
      }

      // Sync all platforms
      const result = await SyncService.syncAllPlatforms(userId);

      return {
        success: result.failCount === 0,
        jobId: result.jobId,
        platformCount: result.platformCount,
        successCount: result.successCount,
        failedCount: result.failCount,
      };
    } catch (error) {
      logger.error(`Sync failed for user ${userId}`, { userId }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  },
});

// Scheduled task to sync all users (daily at 2 AM UTC)
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

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async ({ userId }) => {
          try {
            // Trigger the sync task (don't wait for completion)
            await syncUserPlatformsTask.trigger({ userId });
            return { userId, success: true };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { userId, success: false, error: errorMessage };
          }
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            userId: "unknown",
            success: false,
            error: result.reason?.message || "Unknown error"
          });
        }
      }

      // Rate limiting between batches
      if (i + batchSize < users.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    logger.info(`Daily sync task completed`, {
      totalUsers: users.length,
      successCount,
      failCount
    });

    return {
      totalUsers: users.length,
      successCount,
      failCount,
      timestamp: new Date().toISOString(),
    };
  },
});

// On-demand sync for specific platforms
export const syncSpecificPlatformsTask = task({
  id: "sync-specific-platforms",
  maxDuration: 180,
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: { userId: string; platformSlugs: string[] }) => {
    const { userId, platformSlugs } = payload;

    logger.info(`Syncing specific platforms for user`, { userId, platformSlugs });

    // Get platform IDs from slugs
    const platforms = await prisma.platform.findMany({
      where: {
        slug: { in: platformSlugs },
        isActive: true,
      },
      select: { id: true, slug: true, name: true },
    });

    if (platforms.length === 0) {
      throw new Error("No valid platforms found");
    }

    const results: Array<{ platform: string; success: boolean; error?: string }> = [];

    for (const platform of platforms) {
      try {
        await SyncService.syncPlatform(userId, platform.id, { async: true });
        results.push({ platform: platform.slug, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ platform: platform.slug, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return {
      platformsRequested: platformSlugs.length,
      platformsFound: platforms.length,
      successCount,
      failedCount: platforms.length - successCount,
      results,
    };
  },
});