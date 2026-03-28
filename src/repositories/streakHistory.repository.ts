// src/repositories/streakHistory.repository.ts
// Streak history data access

import { prisma } from '@/lib/prisma';

export class StreakHistoryRepository {
  static async findByUserId(userId: string, options?: {
    isActive?: boolean;
    limit?: number;
  }) {
    return prisma.streakHistory.findMany({
      where: {
        userId,
        ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
      },
      orderBy: { startDate: 'desc' },
      take: options?.limit,
    });
  }

  static async findCurrentStreak(userId: string) {
    return prisma.streakHistory.findFirst({
      where: { userId, isActive: true, endDate: null as any },
      orderBy: { startDate: 'desc' },
    });
  }

  static async findLongestStreak(userId: string) {
    return prisma.streakHistory.findFirst({
      where: { userId },
      orderBy: { length: 'desc' },
    });
  }

  static async create(data: {
    userId: string;
    startDate: Date;
    length?: number;
  }) {
    return prisma.streakHistory.create({ data: data as any });
  }

  static async endStreak(id: string, endDate: Date, length: number) {
    return prisma.streakHistory.update({
      where: { id },
      data: { endDate, length, isActive: false },
    });
  }

  static async incrementCurrent(userId: string) {
    const current = await this.findCurrentStreak(userId);
    if (current) {
      return prisma.streakHistory.update({
        where: { id: current.id },
        data: { length: { increment: 1 } },
      });
    }
    return this.create({ userId, startDate: new Date(), length: 1 });
  }
}

export default StreakHistoryRepository;
