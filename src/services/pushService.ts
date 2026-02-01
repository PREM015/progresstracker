// src/services/pushService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import webpush from 'web-push';


const log = logger.child({ service: 'PushService' });

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@progresstracker.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SubscribePushInput {
  userId: string;
  subscription: PushSubscriptionData;
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
}

export interface SendPushNotificationInput {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

class PushService {
  /**
   * Subscribe to push notifications
   */
  async subscribe(data: SubscribePushInput) {
    try {
      const existing = await prisma.pushSubscription.findUnique({
        where: { endpoint: data.subscription.endpoint },
      });

      if (existing) {
        const updated = await prisma.pushSubscription.update({
          where: { endpoint: data.subscription.endpoint },
          data: {
            p256dh: data.subscription.keys.p256dh,
            auth: data.subscription.keys.auth,
            deviceId: data.deviceId,
            deviceName: data.deviceName,
            userAgent: data.userAgent,
            isActive: true,
            lastUsedAt: new Date(),
          },
        });

        log.info('Push subscription updated', { userId: data.userId, endpoint: data.subscription.endpoint });

        return updated;
      }

      const subscription = await prisma.pushSubscription.create({
        data: {
          userId: data.userId,
          endpoint: data.subscription.endpoint,
          p256dh: data.subscription.keys.p256dh,
          auth: data.subscription.keys.auth,
          deviceId: data.deviceId,
          deviceName: data.deviceName,
          userAgent: data.userAgent,
          isActive: true,
        },
      });

      log.info('Push subscription created', { userId: data.userId, id: subscription.id });

      return subscription;
    } catch (error) {
      log.error('Error subscribing to push', { userId: data.userId }, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(endpoint: string, userId: string) {
    try {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId },
      });

      log.info('Push subscription deleted', { userId, endpoint });

      return { unsubscribed: true };
    } catch (error) {
      log.error('Error unsubscribing from push', { userId, endpoint }, error);
      throw error;
    }
  }

  /**
   * Get user's push subscriptions
   */
  async getUserSubscriptions(userId: string) {
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      log.info('User push subscriptions fetched', { userId, count: subscriptions.length });

      return subscriptions;
    } catch (error) {
      log.error('Error fetching user subscriptions', { userId }, error);
      throw error;
    }
  }

  /**
   * Send push notification to user
   */
  async sendToUser(userId: string, notification: SendPushNotificationInput) {
    try {
      const subscriptions = await this.getUserSubscriptions(userId);

      if (subscriptions.length === 0) {
        log.warn('No push subscriptions found', { userId });
        return { sent: 0, failed: 0 };
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-192x192.png',
        badge: notification.badge || '/badge-72x72.png',
        image: notification.image,
        data: {
          url: notification.url || '/',
          ...notification.data,
        },
        tag: notification.tag,
      });

      const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              payload
            );

            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: {
                lastUsedAt: new Date(),
                successCount: { increment: 1 },
              },
            });

            return { success: true };
          } catch (error) {
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: {
                failureCount: { increment: 1 },
              },
            });

            // If subscription is invalid, mark as inactive
            if ((error as Error).message.includes('410')) {
              await prisma.pushSubscription.update({
                where: { id: sub.id },
                data: { isActive: false },
              });
            }

            throw error;
          }
        })
      );

      const sent = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      log.info('Push notifications sent', { userId, sent, failed });

      return { sent, failed };
    } catch (error) {
      log.error('Error sending push notification', { userId }, error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToMultipleUsers(
    userIds: string[],
    notification: SendPushNotificationInput
  ) {
    try {
      const results = await Promise.allSettled(
        userIds.map((userId) => this.sendToUser(userId, notification))
      );

      const totalSent = results
        .filter((r) => r.status === 'fulfilled')
        .reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value.sent : 0), 0);

      const totalFailed = results
        .filter((r) => r.status === 'fulfilled')
        .reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value.failed : 0), 0);

      log.info('Bulk push notifications sent', { users: userIds.length, sent: totalSent, failed: totalFailed });

      return { sent: totalSent, failed: totalFailed };
    } catch (error) {
      log.error('Error sending bulk push notifications', {}, error);
      throw error;
    }
  }

  /**
   * Test push notification
   */
  async testNotification(userId: string) {
    try {
      return this.sendToUser(userId, {
        title: 'Test Notification',
        body: 'This is a test push notification from Progress Tracker!',
        tag: 'test',
      });
    } catch (error) {
      log.error('Error sending test notification', { userId }, error);
      throw error;
    }
  }

  /**
   * Clean up inactive subscriptions
   */
  async cleanupInactive() {
    try {
      const result = await prisma.pushSubscription.deleteMany({
        where: {
          isActive: false,
          updatedAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old
          },
        },
      });

      log.info('Inactive push subscriptions cleaned up', { count: result.count });

      return { deleted: result.count };
    } catch (error) {
      log.error('Error cleaning up inactive subscriptions', {}, error);
      throw error;
    }
  }
}

export const pushService = new PushService();
export default pushService;