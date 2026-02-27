// src/trigger/notification-task.ts
// Trigger.dev task for in-app notifications — replaces BullMQ notificationWorker

import { task, logger } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";

export interface NotificationTaskPayload {
    userId?: string;
    userIds?: string[];
    type: string;
    title: string;
    message: string;
    priority: string;
    actionUrl?: string;
    actionLabel?: string;
}

export const notificationTask = task({
    id: "create-notification",
    maxDuration: 120, // 2 min
    retry: {
        maxAttempts: 2,
        minTimeoutInMs: 3000,
    },
    run: async (payload: NotificationTaskPayload) => {
        const { title, type, priority, message, actionUrl, actionLabel } = payload;
        const userIds = payload.userIds || (payload.userId ? [payload.userId] : []);

        logger.info("Processing notification task", { recipients: userIds.length });

        const BATCH_SIZE = 1000;
        let created = 0;

        for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
            const batch = userIds.slice(i, i + BATCH_SIZE);

            await prisma.notification.createMany({
                data: batch.map((userId) => ({
                    userId,
                    type: type as any,
                    priority: priority as any,
                    channel: "IN_APP" as const,
                    title,
                    message,
                    actionUrl,
                    actionLabel,
                })),
            });

            created += batch.length;
        }

        logger.info("Notification task completed", { created });
        return { created };
    },
});

// Bulk notification (for broadcast)
export const notificationBulkTask = task({
    id: "create-notification-bulk",
    maxDuration: 120,
    retry: { maxAttempts: 2 },
    run: async (payload: { notifications: NotificationTaskPayload[] }) => {
        let totalCreated = 0;

        for (const notif of payload.notifications) {
            const result = await notificationTask.triggerAndWait(notif);
            if (result.ok) {
                totalCreated += result.output.created;
            }
        }

        return { totalCreated };
    },
});
