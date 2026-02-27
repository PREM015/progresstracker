// src/trigger/scraper-task.ts
// Trigger.dev task for scraping — replaces BullMQ scraperWorker
// Supports both heavy (Puppeteer) and light (Cheerio/API) scrapers

import { task, logger } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { ScraperFactory } from "@/services/scrapers";
import { SyncService } from "@/services/syncService";

export interface ScraperTaskPayload {
    userId: string;
    platformId: string;
    userPlatformId: string;
    triggeredBy: string;
    weight?: "heavy" | "light" | "priority";
}

export const scraperTask = task({
    id: "scraper-sync",
    maxDuration: 300, // 5 min for heavy scrapers
    retry: {
        maxAttempts: 3,
        minTimeoutInMs: 5000,
        maxTimeoutInMs: 30000,
        factor: 2,
    },
    run: async (payload: ScraperTaskPayload) => {
        const { userId, platformId, triggeredBy } = payload;

        logger.info("Starting scraper task", { userId, platformId, triggeredBy });

        try {
            const result = await SyncService.internalSync(userId, platformId, { triggeredBy });

            logger.info("Scraper task completed", {
                userId,
                platformId,
                success: result.success,
            });

            return result;
        } catch (error) {
            logger.error("Scraper task failed", {
                userId,
                platformId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    },
});
