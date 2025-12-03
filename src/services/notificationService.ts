// src/services/notificationService.ts

import { prisma } from '@/lib/prisma';

interface CreateNotificationData {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

export class NotificationService {
  /**
   * Create notification
   */
  static async createNotification(userId: string, data: CreateNotificationData) {
    return await prisma.notification.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number } = {}
  ) {
    const { unreadOnly = false, limit = 50 } = options;

    return await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(notificationIds: string[]) {
    return await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
      },
      data: {
        read: true,
      },
    });
  }

  /**
   * Mark all as read
   */
  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    return await prisma.notification.delete({
      where: {
        id: notificationId,
        userId,
      },
    });
  }
}