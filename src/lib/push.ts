// src/lib/push.ts
/**
 * Web Push Notification utilities
 * Synced with Prisma schema: PushSubscription
 */

import webPush from 'web-push';
import { prisma } from './prisma';
import { logger } from './logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@codesync.pro';

// Initialize web-push if VAPID keys are available
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  logger.warn('VAPID keys not configured. Push notifications disabled.');
}

// =============================================================================
// TYPES
// =============================================================================

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: string;
    entityId?: string;
    [key: string]: unknown;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export interface PushResult {
  success: boolean;
  subscriptionId: string;
  error?: string;
}

// =============================================================================
// PUSH SERVICE
// =============================================================================

class PushService {
  private readonly log = logger.child({ service: 'push' });
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
  }

  /**
   * Check if push notifications are configured
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Get VAPID public key for client
   */
  getPublicKey(): string | null {
    return VAPID_PUBLIC_KEY || null;
  }

  /**
   * Save push subscription for user
   */
  async saveSubscription(
    userId: string,
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
    deviceInfo?: {
      deviceName?: string;
      userAgent?: string;
      browser?: string;
      os?: string;
    }
  ): Promise<string> {
    try {
      const pushSub = await prisma.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        update: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isActive: true,
          ...deviceInfo,
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          ...deviceInfo,
        },
      });

      this.log.info('Push subscription saved', {
        userId,
        subscriptionId: pushSub.id,
      });

      return pushSub.id;
    } catch (error) {
      this.log.error('Failed to save push subscription', { userId }, error);
      throw error;
    }
  }

  /**
   * Remove push subscription
   */
  async removeSubscription(endpoint: string): Promise<void> {
    try {
      await prisma.pushSubscription.delete({
        where: { endpoint },
      });

      this.log.info('Push subscription removed', { endpoint });
    } catch (error) {
      this.log.error('Failed to remove push subscription', { endpoint }, error);
      // Don't throw - subscription might already be deleted
    }
  }

  /**
   * Send push notification to a user
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<PushResult[]> {
    if (!this.isConfigured) {
      this.log.warn('Push notifications not configured');
      return [];
    }

    const startTime = Date.now();

    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId, isActive: true },
      });

      if (subscriptions.length === 0) {
        this.log.debug('No push subscriptions for user', { userId });
        return [];
      }

      const results = await Promise.all(
        subscriptions.map((sub) => this.sendToSubscription(sub, payload))
      );

      const successCount = results.filter((r) => r.success).length;

      this.log.info('Push notifications sent', {
        userId,
        total: subscriptions.length,
        success: successCount,
        failed: subscriptions.length - successCount,
        duration: Date.now() - startTime,
      });

      return results;
    } catch (error) {
      this.log.error('Failed to send push to user', { userId }, error);
      throw error;
    }
  }

  /**
   * Send push notification to specific subscription
   */
  async sendToSubscription(
    subscription: {
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    },
    payload: PushPayload
  ): Promise<PushResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        subscriptionId: subscription.id,
        error: 'Push notifications not configured',
      };
    }

    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
        {
          TTL: 86400, // 24 hours
          urgency: 'normal',
        }
      );

      // Update success stats
      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: {
          lastUsedAt: new Date(),
          successCount: { increment: 1 },
        },
      });

      return {
        success: true,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      const webPushError = error as webPush.WebPushError;

      // Handle expired/invalid subscriptions
      if (webPushError.statusCode === 404 || webPushError.statusCode === 410) {
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { isActive: false },
        });

        this.log.info('Push subscription expired', {
          subscriptionId: subscription.id,
        });
      } else {
        // Update failure stats
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: {
            failureCount: { increment: 1 },
          },
        });

        this.log.error('Push notification failed', {
          subscriptionId: subscription.id,
          statusCode: webPushError.statusCode,
        }, error);
      }

      return {
        success: false,
        subscriptionId: subscription.id,
        error: webPushError.message || 'Unknown error',
      };
    }
  }

  /**
   * Broadcast push notification to all users
   */
  async broadcast(payload: PushPayload): Promise<{ total: number; success: number; failed: number }> {
    if (!this.isConfigured) {
      this.log.warn('Push notifications not configured');
      return { total: 0, success: 0, failed: 0 };
    }

    const startTime = Date.now();

    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { isActive: true },
      });

      const results = await Promise.all(
        subscriptions.map((sub) => this.sendToSubscription(sub, payload))
      );

      const success = results.filter((r) => r.success).length;
      const failed = results.length - success;

      this.log.info('Push broadcast completed', {
        total: subscriptions.length,
        success,
        failed,
        duration: Date.now() - startTime,
      });

      return { total: subscriptions.length, success, failed };
    } catch (error) {
      this.log.error('Push broadcast failed', {}, error);
      throw error;
    }
  }

  /**
   * Clean up expired/failed subscriptions
   */
  async cleanup(): Promise<number> {
    const result = await prisma.pushSubscription.deleteMany({
      where: {
        OR: [
          { isActive: false },
          { failureCount: { gte: 5 } },
        ],
      },
    });

    this.log.info('Push subscriptions cleanup', { deleted: result.count });

    return result.count;
  }
}

// =============================================================================
// SINGLETON & EXPORTS
// =============================================================================

export const pushService = new PushService();

/**
 * Quick send notification helper
 */
export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    url?: string;
    type?: string;
  }
): Promise<boolean> {
  const results = await pushService.sendToUser(userId, {
    title: notification.title,
    body: notification.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: notification.url || '/',
      type: notification.type,
    },
  });

  return results.some((r) => r.success);
}

export const push = pushService;
export default pushService;