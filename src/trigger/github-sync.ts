// src/trigger/github-sync.ts

import { task } from "@trigger.dev/sdk/v3";
import {prisma} from "@/lib/prisma";
import { GitHubScraper } from "@/services/scrapers/githubScraper";

export const syncGitHubTask = task({
  id: "sync-github",
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { userId: string; platformId: string }) => {
    const { userId, platformId } = payload;

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
        status: "running",
        message: "GitHub sync started",
      },
    });

    try {
      const scraper = new GitHubScraper();
      const result = await scraper.fetchData({
        token: userPlatform.token || "",
        username: userPlatform.username || "",
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Save entries
      let entriesAdded = 0;
      for (const entry of result.entries) {
        await prisma.trackerEntry.upsert({
          where: {
            userId_date_platform: {
              userId,
              date: entry.date,
              platform: "GitHub",
            },
          },
          create: {
            userId,
            date: entry.date,
            platform: "GitHub",
            problems: entry.problems || 0,
            notes: entry.notes,
          },
          update: {
            problems: entry.problems || 0,
            notes: entry.notes,
          },
        });
        entriesAdded++;
      }

      // Update sync log
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "success",
          message: `Synced ${entriesAdded} entries from GitHub`,
        },
      });

      return { success: true, entriesAdded };
    } catch (error: any) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          message: error.message,
        },
      });
      throw error;
    }
  },
});