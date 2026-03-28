// src/repositories/notificationPreferences.repository.ts
// Notification preference data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class NotificationPreferencesRepository {
  static async findByUserId(userId: string) {
    return prisma.notificationPreferences.findUnique({ where: { userId } });
  }

  static async upsert(userId: string, data: Prisma.NotificationPreferencesCreateInput) {
    return prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId, ...(data as any) },
      update: { ...(data as any) },
    });
  }

  static async update(userId: string, data: Prisma.NotificationPreferencesUpdateInput) {
    return prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId, ...(data as any) },
      update: { ...(data as any) },
    });
  }
}

export default NotificationPreferencesRepository;
