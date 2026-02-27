// src/trigger/email-task.ts
// Trigger.dev task for sending emails — replaces BullMQ emailWorker

import { task, logger } from "@trigger.dev/sdk/v3";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export interface EmailTaskPayload {
    to?: string;
    subject: string;
    html?: string;
    htmlTemplate?: string;
    // Bulk email fields
    userIds?: string[];
    variables?: Record<string, string>;
}

export const emailTask = task({
    id: "send-email",
    maxDuration: 120, // 2 min
    retry: {
        maxAttempts: 3,
        minTimeoutInMs: 5000,
        maxTimeoutInMs: 30000,
    },
    run: async (payload: EmailTaskPayload) => {
        const { subject, htmlTemplate, userIds, to } = payload;

        // Single email
        if (to) {
            logger.info("Sending single email", { to, subject });
            await sendEmail({ to, subject, html: payload.html || htmlTemplate || "" });
            return { sent: 1 };
        }

        // Bulk email
        if (userIds && userIds.length > 0) {
            logger.info("Sending bulk email", { recipientCount: userIds.length, subject });

            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, email: true },
            });

            let sent = 0;
            let failed = 0;

            for (const user of users) {
                if (!user.email) continue;
                try {
                    await sendEmail({
                        to: user.email,
                        subject,
                        html: htmlTemplate || "",
                    });
                    sent++;
                } catch (error) {
                    failed++;
                    logger.error("Failed to send email", {
                        userId: user.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }

            logger.info("Bulk email completed", { sent, failed });
            return { sent, failed };
        }

        logger.warn("No recipients specified for email task");
        return { sent: 0 };
    },
});
