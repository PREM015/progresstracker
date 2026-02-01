// src/services/newsletterService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';

const log = logger.child({ service: 'NewsletterService' });

export interface SubscribeInput {
  email: string;
  name?: string;
  topics?: string[];
  frequency?: 'weekly' | 'monthly';
}

export interface UpdateSubscriptionInput {
  name?: string;
  topics?: string[];
  frequency?: 'weekly' | 'monthly';
  isActive?: boolean;
}

class NewsletterService {
  /**
   * Subscribe to newsletter
   */
  async subscribe(data: SubscribeInput) {
    try {
      const existing = await prisma.newsletterSubscriber.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existing) {
        if (existing.isActive) {
          throw new Error('Email is already subscribed');
        }

        // Reactivate subscription
        const subscriber = await prisma.newsletterSubscriber.update({
          where: { email: data.email.toLowerCase() },
          data: {
            isActive: true,
            name: data.name || existing.name,
            topics: data.topics || existing.topics,
            frequency: data.frequency || existing.frequency,
            unsubscribedAt: null,
            unsubscribeReason: null,
          },
        });

        log.info('Newsletter subscription reactivated', { email: data.email });

        return subscriber;
      }

      const subscriber = await prisma.newsletterSubscriber.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          topics: data.topics || [],
          frequency: data.frequency || 'weekly',
          isActive: true,
          unsubscribeToken: nanoid(32),
        },
      });

      log.info('Newsletter subscription created', { email: data.email });

      return subscriber;
    } catch (error) {
      log.error('Error subscribing to newsletter', { email: data.email }, error);
      throw error;
    }
  }

  /**
   * Confirm subscription
   */
  async confirm(email: string) {
    try {
      const subscriber = await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase() },
        data: {
          confirmedAt: new Date(),
        },
      });

      log.info('Newsletter subscription confirmed', { email });

      return subscriber;
    } catch (error) {
      log.error('Error confirming newsletter subscription', { email }, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from newsletter
   */
  async unsubscribe(token: string, reason?: string) {
    try {
      const subscriber = await prisma.newsletterSubscriber.update({
        where: { unsubscribeToken: token },
        data: {
          isActive: false,
          unsubscribedAt: new Date(),
          unsubscribeReason: reason,
        },
      });

      log.info('Newsletter unsubscribed', { email: subscriber.email });

      return subscriber;
    } catch (error) {
      log.error('Error unsubscribing from newsletter', { token }, error);
      throw error;
    }
  }

  /**
   * Get subscriber by email
   */
  async getByEmail(email: string) {
    try {
      const subscriber = await prisma.newsletterSubscriber.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (subscriber) {
        log.info('Newsletter subscriber fetched', { email });
      }

      return subscriber;
    } catch (error) {
      log.error('Error fetching newsletter subscriber', { email }, error);
      throw error;
    }
  }

  /**
   * Get all active subscribers
   */
  async getActiveSubscribers(frequency?: 'weekly' | 'monthly') {
    try {
      const where: Prisma.NewsletterSubscriberWhereInput = {
        isActive: true,
        confirmedAt: { not: null },
      };

      if (frequency) {
        where.frequency = frequency;
      }

      const subscribers = await prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      log.info('Active newsletter subscribers fetched', { count: subscribers.length });

      return subscribers;
    } catch (error) {
      log.error('Error fetching active subscribers', {}, error);
      throw error;
    }
  }

  /**
   * Get subscribers by topic
   */
  async getByTopic(topic: string) {
    try {
      const subscribers = await prisma.newsletterSubscriber.findMany({
        where: {
          isActive: true,
          confirmedAt: { not: null },
          topics: { has: topic },
        },
      });

      log.info('Subscribers by topic fetched', { topic, count: subscribers.length });

      return subscribers;
    } catch (error) {
      log.error('Error fetching subscribers by topic', { topic }, error);
      throw error;
    }
  }

  /**
   * Update subscription preferences
   */
  async updatePreferences(email: string, data: UpdateSubscriptionInput) {
    try {
      const updateData: Prisma.NewsletterSubscriberUpdateInput = {
        ...data,
        updatedAt: new Date(),
      };

      const subscriber = await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase() },
        data: updateData,
      });

      log.info('Newsletter preferences updated', { email });

      return subscriber;
    } catch (error) {
      log.error('Error updating newsletter preferences', { email }, error);
      throw error;
    }
  }

  /**
   * Record email sent
   */
  async recordEmailSent(email: string) {
    try {
      await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase() },
        data: {
          emailsSent: { increment: 1 },
        },
      });

      log.info('Newsletter email sent recorded', { email });
    } catch (error) {
      log.error('Error recording email sent', { email }, error);
    }
  }

  /**
   * Record email opened
   */
  async recordEmailOpened(email: string) {
    try {
      await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase() },
        data: {
          emailsOpened: { increment: 1 },
        },
      });

      log.info('Newsletter email opened recorded', { email });
    } catch (error) {
      log.error('Error recording email opened', { email }, error);
    }
  }

  /**
   * Record email clicked
   */
  async recordEmailClicked(email: string) {
    try {
      await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase() },
        data: {
          emailsClicked: { increment: 1 },
        },
      });

      log.info('Newsletter email clicked recorded', { email });
    } catch (error) {
      log.error('Error recording email clicked', { email }, error);
    }
  }

  /**
   * Get newsletter statistics
   */
  async getStats() {
    try {
      const [total, active, confirmed, unsubscribed, byFrequency] = await Promise.all([
        prisma.newsletterSubscriber.count(),
        prisma.newsletterSubscriber.count({
          where: { isActive: true },
        }),
        prisma.newsletterSubscriber.count({
          where: { confirmedAt: { not: null } },
        }),
        prisma.newsletterSubscriber.count({
          where: { isActive: false },
        }),
        prisma.newsletterSubscriber.groupBy({
          by: ['frequency'],
          _count: true,
        }),
      ]);

      const frequencyMap: Record<string, number> = {};
      byFrequency.forEach((f) => {
        frequencyMap[f.frequency] = f._count;
      });

      log.info('Newsletter stats fetched');

      return {
        total,
        active,
        confirmed,
        unsubscribed,
        byFrequency: frequencyMap,
      };
    } catch (error) {
      log.error('Error fetching newsletter stats', {}, error);
      throw error;
    }
  }

  /**
   * Delete inactive subscribers (cleanup)
   */
  async deleteInactive(daysInactive: number = 365) {
    try {
      const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);

      const result = await prisma.newsletterSubscriber.deleteMany({
        where: {
          isActive: false,
          unsubscribedAt: { lt: cutoffDate },
        },
      });

      log.info('Inactive newsletter subscribers deleted', { count: result.count });

      return { deleted: result.count };
    } catch (error) {
      log.error('Error deleting inactive subscribers', { daysInactive }, error);
      throw error;
    }
  }
}

export const newsletterService = new NewsletterService();
export default newsletterService;