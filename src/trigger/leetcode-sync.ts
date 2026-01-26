// src/trigger/leetcode-sync.ts

import { task } from "@trigger.dev/sdk/v3";
import {prisma} from "@/lib/prisma";
import { LeetCodeScraper } from "@/services/scrapers/leetcodeScraper";

export const syncLeetCodeTask = task({
  id: "sync-leetcode",
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { userId: string; platformId: string }) => {
    const { userId, platformId } = payload;

    const userPlatform = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: { platform: true },
    });

    if (!userPlatform) {
      throw new Error("LeetCode not connected");
    }

    const syncLog = await prisma.syncLog.create({
      data: {
        userId,
        platformId,
        status: "running",
        message: "LeetCode sync started",
      },
    });

    try {
      const scraper = new LeetCodeScraper();
      const result = await scraper.fetchData({
        username: userPlatform.username || "",
      });

      if (!result.success) {
        throw new Error(result.error);
      }

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

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "success",
          message: `Synced ${entriesAdded} entries from LeetCode`,
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