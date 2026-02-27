// src/services/sseNotificationService.ts
/**
 * SSE Notification Service
 * 
 * Helper service to send notifications via SSE
 */

import { logger } from '@/lib/logger';
import { sseConnectionManager } from './sseConnectionManager';
import {
  SSEEventTypes,
  generateEventId,
  SSENotificationPayload,
  SSENotificationCountPayload,
  SSEAchievementPayload,
  SSEGoalPayload,
  SSEStreakPayload,
} from '@/lib/sse';
import { prisma } from '@/lib/prisma';

const log = logger.child({ service: 'SSENotificationService' });

class SSENotificationService {
  /**
   * Send a notification to user
   */
  async sendNotification(userId: string, notification: SSENotificationPayload): Promise<number> {
    const count = sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION,
      data: notification,
    });

    log.debug('Notification sent via SSE', { userId, notificationId: notification.id, connections: count });

   const { sent } = sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION,
      data: notification,
    });
return sent;
  }

  /**
   * Update unread count for user
   */
  async updateNotificationCount(userId: string): Promise<number> {
    try {
      const [unreadCount, totalCount] = await Promise.all([
        prisma.notification.count({
          where: { userId, isRead: false, isArchived: false },
        }),
        prisma.notification.count({
          where: { userId, isArchived: false },
        }),
      ]);

   const { sent } = sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION_COUNT,
      data: { unreadCount, totalCount } as SSENotificationCountPayload,
    });
return sent;

      
    } catch (error) {
      log.error('Failed to update notification count', { userId }, error);
      return 0;
    }
  }

  /**
   * Send notification read event
   */
  sendNotificationRead(userId: string, notificationId: string): number {
   const { sent } = sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION_READ,
      data: { notificationId },
    });
return sent;
    
  }

  /**
   * Send achievement unlocked notification
   */
  sendAchievementUnlocked(userId: string, achievement: SSEAchievementPayload): number {
    log.info('Achievement unlocked SSE sent', { userId, achievementId: achievement.achievementId });
const { sent } = sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.ACHIEVEMENT_UNLOCKED,    
        data: achievement,
    });
return sent;
  }

  /**
   * Send goal completed notification
   */
  sendGoalCompleted(userId: string, goal: SSEGoalPayload): number {
    log.info('Goal completed SSE sent', { userId, goalId: goal.id });

 const { sent } = sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.GOAL_COMPLETED,  
        data: goal,
    });
return sent;
  }

  /**
   * Send goal reminder
   */
  sendGoalReminder(userId: string, goal: SSEGoalPayload): number {
    log.info('Goal reminder SSE sent', { userId, goalId: goal.id });

   const { sent } = sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.GOAL_REMINDER,  
        data: goal,
    });
return sent;
  }

  /**
   * Send streak alert
   */
  sendStreakAlert(userId: string, streak: SSEStreakPayload): number {
    log.info('Streak alert SSE sent', { userId, status: streak.status });

    const { sent } = sseConnectionManager.sendToUser(userId, {
        id: generateEventId(),
        event: SSEEventTypes.STREAK_ALERT,  
        data: streak,
    });
return sent;
  }

  /**
   * Check if user has active SSE connections
   */
  hasActiveConnection(userId: string): boolean {
    return sseConnectionManager.hasUserConnections(userId);
  }

  /**
   * Get user's connection count
   */
  getUserConnectionCount(userId: string): number {
    return sseConnectionManager.getUserConnections(userId).length;
  }
}

export const sseNotificationService = new SSENotificationService();
export default sseNotificationService;