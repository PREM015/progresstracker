// src/trigger/leetcode-sync.ts
// Fixed: Same corrections as github-sync.ts

import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { SyncStatus } from "@prisma/client";
import { LeetCodeScraper } from "@/services/scrapers/leetcodeScraper";
import { logger } from "@/lib/logger";

interface LeetCodeSyncPayload {
  userId: string;
  platformId: string;
}

interface LeetCodeSyncResult {
  success: boolean;
  entriesAdded: number;
  entriesUpdated: number;
  totalProblems?: number;
  error?: string;
}

export const syncLeetCodeTask = task({
  id: "sync-leetcode",
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: LeetCodeSyncPayload): Promise<LeetCodeSyncResult> => {
    const { userId, platformId } = payload;
    const startTime = Date.now();

    logger.info(`Starting LeetCode sync`, { userId, platformId });

    const userPlatform = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: { platform: true },
    });

    if (!userPlatform) {
      throw new Error("LeetCode not connected");
    }

    if (!userPlatform.username) {
      throw new Error("LeetCode username not configured");
    }

    const syncLog = await prisma.syncLog.create({
      data: {
        userId,
        platformId,
        userPlatformId: userPlatform.id,
        status: SyncStatus.IN_PROGRESS,
        triggeredBy: "scheduled",
        startedAt: new Date(),
      },
    });

    try {
      const scraper = new LeetCodeScraper();
      const result = await scraper.fetchData({
        username: userPlatform.username,
      });

      if (!result.success) {
        throw new Error(result.error || "LeetCode sync failed");
      }

      let entriesAdded = 0;
      let entriesUpdated = 0;

      for (const entry of result.entries) {
        const existingEntry = await prisma.trackerEntry.findFirst({
          where: {
            userId,
            date: entry.date,
            platformId,
          },
        });

        if (existingEntry) {
          await prisma.trackerEntry.update({
            where: { id: existingEntry.id },
            data: {
              problemsSolved: entry.problems ?? existingEntry.problemsSolved,
              notes: entry.notes ?? existingEntry.notes,
              source: "sync",
              syncLogId: syncLog.id,
              updatedAt: new Date(),
            },
          });
          entriesUpdated++;
        } else {
          await prisma.trackerEntry.create({
            data: {
              userId,
              date: entry.date,
              platformId,
              problemsSolved: entry.problems ?? 0,
              notes: entry.notes,
              source: "sync",
              syncLogId: syncLog.id,
              category: "DSA",
            },
          });
          entriesAdded++;
        }
      }

      const duration = Date.now() - startTime;

      // Update sync log - success
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.SUCCESS,
          completedAt: new Date(),
          duration,
          itemsFound: result.entries.length,
          itemsCreated: entriesAdded,
          itemsUpdated: entriesUpdated,
          hasError: false,
        },
      });

      // Update user platform
      await prisma.userPlatform.update({
        where: { userId_platformId: { userId, platformId } },
        data: {
          syncStatus: SyncStatus.SUCCESS,
          lastSyncedAt: new Date(),
          lastSyncError: null,
          lastSyncDuration: duration,
          consecutiveFailures: 0,
       cachedStats: result.metadata ? JSON.parse(JSON.stringify(result.metadata)) : undefined,

          statsUpdatedAt: new Date(),
        },
      });

      logger.info(`LeetCode sync completed`, {
        userId,
        platformId,
        entriesAdded,
        entriesUpdated,
        totalProblems: result.metadata?.totalProblems,
        duration,
      });

      return {
        success: true,
        entriesAdded,
        entriesUpdated,
        totalProblems: result.metadata?.totalProblems as number | undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          duration,
          hasError: true,
          errorMessage,
        },
      });

      await prisma.userPlatform.update({
        where: { userId_platformId: { userId, platformId } },
        data: {
          syncStatus: SyncStatus.FAILED,
          lastSyncError: errorMessage,
          lastSyncDuration: duration,
          consecutiveFailures: { increment: 1 },
        },
      });

      logger.error(`LeetCode sync failed`, { userId, platformId }, error instanceof Error ? error : new Error(errorMessage));

      throw error;
    }
  },
});