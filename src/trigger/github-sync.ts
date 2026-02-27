/* eslint-disable @typescript-eslint/no-explicit-any */


import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { SyncStatus } from "@prisma/client";
import { GitHubScraper } from "@/services/scrapers/githubScraper";
import { logger } from "@/lib/logger";

interface GitHubSyncPayload {
  userId: string;
  platformId: string;
}

interface GitHubSyncResult {
  success: boolean;
  entriesAdded: number;
  entriesUpdated: number;
  error?: string;
}

export const syncGitHubTask = task({
  id: "sync-github",
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: GitHubSyncPayload): Promise<GitHubSyncResult> => {
    const { userId, platformId } = payload;
    const startTime = Date.now();

    logger.info(`Starting GitHub sync`, { userId, platformId });

    // Get user's GitHub connection
    const userPlatform = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: { platform: true },
    });

    if (!userPlatform) {
      throw new Error("GitHub not connected");
    }

    // Create sync log
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
      // Extract token from credentials
      let token = "";
      if (userPlatform.accessToken) {
        token = userPlatform.accessToken;
      } else if (userPlatform.credentials) {
        try {
          const creds = typeof userPlatform.credentials === "string"
            ? JSON.parse(userPlatform.credentials)
            : userPlatform.credentials;
          token = (creds as Record<string, string>).access_token || 
                  (creds as Record<string, string>).token || 
                  (creds as Record<string, string>).accessToken || "";
        } catch {
          logger.warn("Failed to parse credentials", { userId, platformId });
        }
      }

      // Fallback to OAuth account
      if (!token) {
        const githubAccount = await prisma.account.findFirst({
          where: { userId, provider: "github" },
          select: { access_token: true },
        });
        token = githubAccount?.access_token ?? "";
      }

      if (!token) {
        throw new Error("No valid GitHub token found");
      }

      const scraper = new GitHubScraper();
      const result = await scraper.fetchData({
        token,
        username: userPlatform.username || "",
      });

      if (!result.success) {
        throw new Error(result.error || "GitHub sync failed");
      }

      // Save entries
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
              commits: entry.commits ?? existingEntry.commits,
              pullRequests: entry.pullRequests ?? existingEntry.pullRequests,
              issuesOpened: entry.issues ?? existingEntry.issuesOpened,
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
              commits: entry.commits ?? 0,
              pullRequests: entry.pullRequests ?? 0,
              issuesOpened: entry.issues ?? 0,
              problemsSolved: entry.problems ?? 0,
              notes: entry.notes,
              source: "sync",
              syncLogId: syncLog.id,
              category: "GIT",
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

      // Update user platform sync status
      await prisma.userPlatform.update({
        where: { userId_platformId: { userId, platformId } },
        data: {
          syncStatus: SyncStatus.SUCCESS,
          lastSyncedAt: new Date(),
          lastSyncError: null,
          lastSyncDuration: duration,
          consecutiveFailures: 0,
         cachedStats: result.metadata ? (result.metadata as any) : undefined,

          statsUpdatedAt: new Date(),
        },
      });

      logger.info(`GitHub sync completed`, { 
        userId, 
        platformId, 
        entriesAdded, 
        entriesUpdated,
        duration,
      });

      return { success: true, entriesAdded, entriesUpdated };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      // Update sync log - failure
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

      // Update user platform sync status
      await prisma.userPlatform.update({
        where: { userId_platformId: { userId, platformId } },
        data: {
          syncStatus: SyncStatus.FAILED,
          lastSyncError: errorMessage,
          lastSyncDuration: duration,
          consecutiveFailures: { increment: 1 },
        },
      });

      logger.error(`GitHub sync failed`, { userId, platformId }, error instanceof Error ? error : new Error(errorMessage));

      throw error;
    }
  },
});