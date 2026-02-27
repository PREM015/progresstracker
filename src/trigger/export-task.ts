// src/trigger/export-task.ts
// Trigger.dev task for data exports — replaces BullMQ exportWorker

import { task, logger } from "@trigger.dev/sdk/v3";
import { ExportQueue } from "@/services/export/exportQueue";

export interface ExportTaskPayload {
    jobId: string;
    format: string;
    dateFrom?: string;
    dateTo?: string;
    metrics?: string[];
    platforms?: string[];
    categories?: string[];
}

export const exportTask = task({
    id: "process-export",
    maxDuration: 300, // 5 min for large exports
    retry: {
        maxAttempts: 2,
        minTimeoutInMs: 5000,
    },
    run: async (payload: ExportTaskPayload) => {
        const { jobId: exportJobId } = payload;

        logger.info("Processing export task", { exportJobId, format: payload.format });

        try {
            const exportJob = await ExportQueue.getNextJob();

            if (!exportJob) {
                logger.warn("Export job not found or already processing", { exportJobId });
                return { skipped: true };
            }

            logger.info("Export task completed", { exportJobId });
            return { processed: true, exportJobId };
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            logger.error("Export task failed", { exportJobId, error: errMsg });

            if (exportJobId) {
                await ExportQueue.fail(exportJobId, errMsg).catch(() => { });
            }

            throw error;
        }
    },
});
