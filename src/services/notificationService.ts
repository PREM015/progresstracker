// src/services/notificationService.ts
// Fixed to match Prisma schema with proper enums

import { prisma } from '@/lib/prisma';
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority,
  Prisma 
} from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  shortMessage?: string;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  entityType?: string;
  entityId?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  scheduledFor?: Date;
  expiresAt?: Date;
}

export interface NotificationWithMeta {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  message: string;
  shortMessage: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  entityType: string | null;
  entityId: string | null;
  imageUrl: string | null;
  metadata: unknown;
  isRead: boolean;
  readAt: Date | null;
  isArchived: boolean;
  isDismissed: boolean;
  createdAt: Date;
  // Frontend-friendly alias
  read: boolean;
}

export interface NotificationFilter {
  type?: NotificationType | NotificationType[];
  channel?: NotificationChannel;
  isRead?: boolean;
  isArchived?: boolean;
  priority?: NotificationPriority;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

// =============================================================================
// NOTIFICATION SERVICE
// =============================================================================

export class NotificationService {
  // ===========================================================================
  // CREATE NOTIFICATION
  // ===========================================================================

  /**
   * Create a new notification
   */
  static async createNotification(
    userId: string,
    data: CreateNotificationInput
  ): Promise<NotificationWithMeta> {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: data.type,
        channel: data.channel ?? NotificationChannel.IN_APP,
        priority: data.priority ?? NotificationPriority.NORMAL,
        title: data.title,
        message: data.message,
        shortMessage: data.shortMessage,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        entityType: data.entityType,
        entityId: data.entityId,
        imageUrl: data.imageUrl,
        metadata: data.metadata 
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        scheduledFor: data.scheduledFor,
        expiresAt: data.expiresAt,
        isRead: false,
        isArchived: false,
        isDismissed: false,
        isDelivered: data.channel === NotificationChannel.IN_APP,
        deliveredAt: data.channel === NotificationChannel.IN_APP ? new Date() : null,
      },
    });

    return this.formatNotification(notification);
  }

  /**
   * Create notification with simplified type (for internal use)
   */
  static async createSimpleNotification(
    userId: string,
    data: {
      type: 'info' | 'success' | 'warning' | 'error';
      title: string;
      message: string;
      actionUrl?: string;
      actionText?: string;
    }
  ): Promise<NotificationWithMeta> {
    // Map simple types to NotificationType enum
    const typeMapping: Record<string, NotificationType> = {
      info: NotificationType.SYSTEM,
      success: NotificationType.ACHIEVEMENT_UNLOCKED,
      warning: NotificationType.STREAK_AT_RISK,
      error: NotificationType.SECURITY_ALERT,
    };

    const priorityMapping: Record<string, NotificationPriority> = {
      info: NotificationPriority.LOW,
      success: NotificationPriority.NORMAL,
      warning: NotificationPriority.HIGH,
      error: NotificationPriority.URGENT,
    };

    return this.createNotification(userId, {
      type: typeMapping[data.type] || NotificationType.CUSTOM,
      priority: priorityMapping[data.type] || NotificationPriority.NORMAL,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      actionLabel: data.actionText,
      metadata: { severity: data.type },
    });
  }

  // ===========================================================================
  // GET NOTIFICATIONS
  // ===========================================================================

  /**
   * Get user notifications with filtering
   */
  static async getUserNotifications(
    userId: string,
    options: {
      filter?: NotificationFilter;
      limit?: number;
      offset?: number;
      includeArchived?: boolean;
    } = {}
  ): Promise<{ notifications: NotificationWithMeta[]; total: number }> {
    const {
      filter,
      limit = 50,
      offset = 0,
      includeArchived = false,
    } = options;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(includeArchived ? {} : { isArchived: false }),
    };

    if (filter) {
      if (filter.type) {
        where.type = Array.isArray(filter.type) 
          ? { in: filter.type } 
          : filter.type;
      }
      if (filter.channel) {
        where.channel = filter.channel;
      }
      if (filter.isRead !== undefined) {
        where.isRead = filter.isRead;
      }
      if (filter.priority) {
        where.priority = filter.priority;
      }
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map((n) => this.formatNotification(n)),
      total,
    };
  }

  /**
   * Get unread notifications only
   */
  static async getUnreadNotifications(
    userId: string,
    limit: number = 20
  ): Promise<NotificationWithMeta[]> {
    const result = await this.getUserNotifications(userId, {
      filter: { isRead: false },
      limit,
    });

    return result.notifications;
  }

  /**
   * Get notification by ID
   */
  static async getNotificationById(
    id: string,
    userId: string
  ): Promise<NotificationWithMeta | null> {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    return notification ? this.formatNotification(notification) : null;
  }

  // ===========================================================================
  // UNREAD COUNT
  // ===========================================================================

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
        isArchived: false,
        isDismissed: false,
      },
    });
  }

  /**
   * Get notification stats
   */
  static async getNotificationStats(userId: string): Promise<NotificationStats> {
    const [total, unread, byType, byPriority] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({
        where: { userId, isRead: false, isArchived: false },
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId, isArchived: false },
        _count: true,
      }),
      prisma.notification.groupBy({
        by: ['priority'],
        where: { userId, isRead: false, isArchived: false },
        _count: true,
      }),
    ]);

    const byTypeMap: Record<string, number> = {};
    byType.forEach((item) => {
      byTypeMap[item.type] = item._count;
    });

    const byPriorityMap: Record<string, number> = {};
    byPriority.forEach((item) => {
      byPriorityMap[item.priority] = item._count;
    });

    return {
      total,
      unread,
      byType: byTypeMap,
      byPriority: byPriorityMap,
    };
  }

  // ===========================================================================
  // MARK AS READ
  // ===========================================================================

  /**
   * Mark specific notifications as read
   */
  static async markAsRead(
    notificationIds: string[],
    userId: string
  ): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Mark single notification as read
   */
  static async markOneAsRead(
    id: string,
    userId: string
  ): Promise<NotificationWithMeta | null> {
    const notification = await prisma.notification.updateMany({
      where: { id, userId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    if (notification.count === 0) return null;

    return this.getNotificationById(id, userId);
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  // ===========================================================================
  // ARCHIVE & DISMISS
  // ===========================================================================

  /**
   * Archive a notification
   */
  static async archiveNotification(
    id: string,
    userId: string
  ): Promise<boolean> {
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  /**
   * Dismiss a notification
   */
  static async dismissNotification(
    id: string,
    userId: string
  ): Promise<boolean> {
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  /**
   * Archive all read notifications
   */
  static async archiveAllRead(userId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: true,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return { count: result.count };
  }

  // ===========================================================================
  // DELETE
  // ===========================================================================

  /**
   * Delete a notification
   */
  static async deleteNotification(
    id: string,
    userId: string
  ): Promise<boolean> {
    try {
      await prisma.notification.delete({
        
        where: { id, userId },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  static async deleteOldNotifications(
    userId: string,
    daysOld: number = 30
  ): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    return { count: result.count };
  }

  // ===========================================================================
  // NOTIFICATION BUILDERS
  // ===========================================================================

  /**
   * Create achievement unlocked notification
   */
  static async notifyAchievementUnlocked(
    userId: string,
    achievement: { title: string; icon: string; points: number }
  ): Promise<NotificationWithMeta> {
    return this.createNotification(userId, {
      type: NotificationType.ACHIEVEMENT_UNLOCKED,
      priority: NotificationPriority.NORMAL,
      title: '🏆 Achievement Unlocked!',
      message: `You've earned "${achievement.title}" and received ${achievement.points} points!`,
      shortMessage: `Unlocked: ${achievement.title}`,
      actionUrl: '/dashboard/achievements',
      actionLabel: 'View Achievement',
      metadata: { achievement },
    });
  }

  /**
   * Create goal completed notification
   */
  static async notifyGoalCompleted(
    userId: string,
    goal: { title: string; id: string }
  ): Promise<NotificationWithMeta> {
    return this.createNotification(userId, {
      type: NotificationType.GOAL_COMPLETED,
      priority: NotificationPriority.NORMAL,
      title: '🎯 Goal Completed!',
      message: `Congratulations! You've completed your goal: "${goal.title}"`,
      shortMessage: `Completed: ${goal.title}`,
      actionUrl: `/goals/${goal.id}`,
      actionLabel: 'View Goal',
      entityType: 'goal',
      entityId: goal.id,
    });
  }

  /**
   * Create streak at risk notification
   */
  static async notifyStreakAtRisk(
    userId: string,
    currentStreak: number
  ): Promise<NotificationWithMeta> {
    return this.createNotification(userId, {
      type: NotificationType.STREAK_AT_RISK,
      priority: NotificationPriority.HIGH,
      title: '🔥 Streak at Risk!',
      message: `Your ${currentStreak}-day streak is about to end! Complete some activity today to keep it going.`,
      shortMessage: `${currentStreak}-day streak at risk`,
      actionUrl: '/tracker',
      actionLabel: 'Log Activity',
    });
  }

  /**
   * Create sync failed notification
   */
  static async notifySyncFailed(
    userId: string,
    platform: { name: string; id: string },
    error: string
  ): Promise<NotificationWithMeta> {
    return this.createNotification(userId, {
      type: NotificationType.SYNC_FAILED,
      priority: NotificationPriority.HIGH,
      title: `❌ Sync Failed: ${platform.name}`,
      message: `Failed to sync data from ${platform.name}. ${error}`,
      shortMessage: `${platform.name} sync failed`,
      actionUrl: '/connections',
      actionLabel: 'Retry Sync',
      entityType: 'platform',
      entityId: platform.id,
      metadata: { error },
    });
  }

  /**
   * Create welcome notification
   */
  static async notifyWelcome(userId: string): Promise<NotificationWithMeta> {
    return this.createNotification(userId, {
      type: NotificationType.WELCOME,
      priority: NotificationPriority.NORMAL,
      title: '👋 Welcome to Progress Tracker!',
      message: 'Get started by connecting your first platform and setting up your goals.',
      actionUrl: '/connections',
      actionLabel: 'Connect Platforms',
    });
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Format notification for API response
   */
  private static formatNotification(
    notification: Prisma.NotificationGetPayload<object>
  ): NotificationWithMeta {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      channel: notification.channel,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      shortMessage: notification.shortMessage,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
      entityType: notification.entityType,
      entityId: notification.entityId,
      imageUrl: notification.imageUrl,
      metadata: notification.metadata,
      isRead: notification.isRead,
      readAt: notification.readAt,
      isArchived: notification.isArchived,
      isDismissed: notification.isDismissed,
      createdAt: notification.createdAt,
      // Frontend-friendly alias
      read: notification.isRead,
    };
  }
}

export default NotificationService;