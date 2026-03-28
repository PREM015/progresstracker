// src/repositories/platformDailyStats.repository.ts
// Per-platform daily stats data access

import { prisma } from '@/lib/prisma';

export class PlatformDailyStatsRepository {
  static async findByUserAndDate(userId: string, date: Date, platformId?: string) {
    return prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: new Date(date.setUTCHours(0, 0, 0, 0)), lte: new Date(date.setUTCHours(23, 59, 59, 999)) },
        ...(platformId ? { platformId } : {}),
      },
    });
  }

  static async findByDateRange(userId: string, startDate: Date, endDate: Date, platformId?: string) {
    return prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        ...(platformId ? { platformId } : {}),
      },
      include: { platform: { select: { id: true, name: true, slug: true, logo: true, color: true } } },
      orderBy: { date: 'asc' },
    });
  }

  static async upsert(data: {
    userId: string;
    platformId: string;
    userPlatformId: string;
    date: Date;
    problemsSolved: number;
    minutesSpent?: number;
    xpEarned?: number;
  }) {
    const dateOnly = new Date(data.date);
    dateOnly.setUTCHours(0, 0, 0, 0);

    return prisma.trackerEntry.upsert({
      where: {
        userId_platformId_date: {
          userId: data.userId,
          platformId: data.platformId,
          date: dateOnly,
        },
      },
      create: { 
        userId: data.userId,
        platformId: data.platformId,
        date: dateOnly,
        problemsSolved: data.problemsSolved,
        timeSpent: data.minutesSpent ?? 0,
        xpEarned: data.xpEarned ?? 0
      },
      update: {
        problemsSolved: { increment: data.problemsSolved },
        timeSpent: { increment: data.minutesSpent ?? 0 },
        xpEarned: { increment: data.xpEarned ?? 0 },
      },
    });
  }

  static async getTotals(userId: string, platformId?: string) {
    return prisma.trackerEntry.aggregate({
      where: { userId, ...(platformId ? { platformId } : {}) },
      _sum: { problemsSolved: true, timeSpent: true, xpEarned: true },
    });
  }
}

export default PlatformDailyStatsRepository;
