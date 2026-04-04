import { task, logger } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";

export interface SendNotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: any;
}

export const sendNotification = task({
  id: "send-notification",
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
  },
  run: async (payload: SendNotificationPayload) => {
    const { userId, type, title, message, actionUrl, metadata } = payload;
    
    logger.info("Sending notification", { userId, type });

    try {
      // Validate user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // We're casting 'type' to any here because Prisma enum might throw if 'type' is dynamic,
      // but in a real app you'd map string to NotificationType enum.
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          actionUrl,
          type: type as any,
          channel: "IN_APP",
          metadata: metadata || {}
        }
      });

      logger.info("Notification created successfully", { notificationId: notification.id });
      return { success: true, notificationId: notification.id };

    } catch (error) {
      logger.error("Failed to send notification", { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
});
