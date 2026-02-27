// src/trigger/report-task.ts
// Trigger.dev task for report generation — replaces BullMQ reportWorker

import { task, logger } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { generateAndSaveReport } from "@/lib/pdf-generator";

export interface ReportTaskPayload {
    userId: string;
    reportType: string;
    periodStart: string;
    periodEnd: string;
    requestedBy: string;
}

export const reportTask = task({
    id: "generate-report",
    maxDuration: 180, // 3 min
    retry: {
        maxAttempts: 3,
        minTimeoutInMs: 2000,
        maxTimeoutInMs: 10000,
    },
    run: async (payload: ReportTaskPayload) => {
        const { userId, reportType, periodStart, periodEnd } = payload;

        logger.info("Processing report task", { userId, reportType });

        try {
            const result = await generateAndSaveReport(
                userId,
                new Date(periodStart),
                new Date(periodEnd),
                reportType
            );

            await prisma.report.update({
                where: { id: result.reportId },
                data: {
                    status: "generated",
                    pdfUrl: result.pdfUrl,
                },
            });

            logger.info("Report task completed", { userId, reportId: result.reportId });
            return result;
        } catch (error) {
            logger.error("Report task failed", {
                userId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    },
});
