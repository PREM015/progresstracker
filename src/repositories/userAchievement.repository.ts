// src/repositories/userAchievement.repository.ts
// User achievement unlock data access

import { prisma } from '@/lib/prisma';

export class UserAchievementRepository {
  static async findByUserId(userId: string, options?: {
    category?: string;
    isPinned?: boolean;
    skip?: number;
    take?: number;
  }) {
    return prisma.userAchievement.findMany({
      where: {
        userId,
        ...(options?.isPinned !== undefined ? { isPinned: options.isPinned } : {}),
        ...(options?.category ? { achievement: { category: options.category as any } } : {}),
      },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  static async findByUserAndAchievement(userId: string, achievementId: string) {
    return prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId } },
    });
  }

  static async create(data: { userId: string; achievementId: string }) {
    return prisma.userAchievement.create({ data });
  }

  static async pin(userId: string, achievementId: string, isPinned: boolean) {
    return prisma.userAchievement.update({
      where: { userId_achievementId: { userId, achievementId } },
      data: { isPinned },
    });
  }


  static async markNotified(userId: string, achievementIds: string[]) {
    return prisma.userAchievement.updateMany({
      where: { userId, achievementId: { in: achievementIds } },
      data: { notifiedAt: new Date() },
    });
  }

  static async countByUserId(userId: string): Promise<number> {
    return prisma.userAchievement.count({ where: { userId } });
  }

  static async getTotalPoints(userId: string): Promise<number> {
    const records = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: { select: { points: true } } },
    });
    return records.reduce((sum, record) => sum + record.achievement.points, 0);
  }

  static async hasUnlocked(userId: string, achievementId: string): Promise<boolean> {
    const record = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId } },
      select: { id: true },
    });
    return !!record;
  }
}

export default UserAchievementRepository;
