// src/repositories/userSettings.repository.ts
// User settings data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class UserSettingsRepository {
  static async findByUserId(userId: string) {
    return prisma.userSettings.findUnique({ where: { userId } });
  }

  static async upsert(userId: string, data: Prisma.UserSettingsCreateInput) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...(data as any) },
      update: { ...(data as any) },
    });
  }

  static async update(userId: string, data: Prisma.UserSettingsUpdateInput) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...(data as any),
      },
      update: data as any,
    });
  }

  static async delete(userId: string) {
    return prisma.userSettings.delete({ where: { userId } });
  }

  static async getTheme(userId: string): Promise<string | null> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { theme: true },
    });
    return settings?.theme ?? null;
  }
}

export default UserSettingsRepository;
