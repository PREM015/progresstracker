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
      let token = '';
      if (userPlatform.credentials) {
        try {
          const creds = typeof userPlatform.credentials === 'string'
            ? JSON.parse(userPlatform.credentials)
            : userPlatform.credentials;
          token = creds.access_token || '';
        } catch (e) {
          console.error('Failed to parse credentials:', e);
        }
      }
      const result = await scraper.fetchData({
        token: token,
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
            userId_date_platformId: {
              userId,
              date: entry.date,
              platformId: platformId,
            },
          },
          create: {
            userId,
            date: entry.date,
            platformId: platformId,
            problemsSolved: entry.problems || 0,
            notes: entry.notes,
          },
          update: {
            problemsSolved: entry.problems || 0,
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