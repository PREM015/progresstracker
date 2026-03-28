// src/repositories/notification.repository.ts
// Notification data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class NotificationRepository {
  static async findByUserId(userId: string, options?: {
    read?: boolean;
    type?: string;
    skip?: number;
    take?: number;
  }) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(options?.read !== undefined ? { readAt: options.read ? { not: null } : null } : {}),
        ...(options?.type ? { type: options.type as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip ?? 0,
      take: options?.take ?? 20,
    });
  }

  static async findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  }

  static async create(data: Prisma.NotificationCreateInput) {
    return prisma.notification.create({ data });
  }

  static async createMany(notifications: Prisma.NotificationCreateManyInput[]) {
    return prisma.notification.createMany({ data: notifications });
  }

  static async markRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  static async markManyRead(ids: string[]) {
    return prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true, readAt: new Date() },
    });
  }

  static async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { isRead: true, readAt: new Date() },
    });
  }

  static async delete(id: string) {
    return prisma.notification.delete({ where: { id } });
  }

  static async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  static async countByUserId(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId } });
  }
}

export default NotificationRepository;
