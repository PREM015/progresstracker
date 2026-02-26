import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    // Initialize workers in Node.js environment
    // This ensures background jobs are processed when the server starts
    await import("@/workers/statsWorker");

    // Schedule daily stats batch (Safe to call repeatedly, it checks last run)
    const { scheduleDailyBatch } = await import("@/workers/statsScheduler");
    await scheduleDailyBatch();

    // We can also ensure scraper workers are initialized if they aren't already
    // (Assuming scraperWorker.ts has side-effects that start workers on import)
    const { heavyWorker, lightWorker, priorityWorker } = await import("@/workers/bullmq/scraperWorker");
    // Ensure workers are defined
    if (heavyWorker && lightWorker && priorityWorker) {
      // Workers are initialized
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
