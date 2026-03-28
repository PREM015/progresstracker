// src/repositories/dailyStats.repository.ts
// Daily statistics data access

import { prisma } from '@/lib/prisma';

export class DailyStatsRepository {
  static async findByUserAndDate(userId: string, date: Date) {
    const dateOnly = new Date(date);
    dateOnly.setUTCHours(0, 0, 0, 0);
    return prisma.dailyStats.findUnique({
      where: { userId_date: { userId, date: dateOnly } },
    });
  }

  static async findByDateRange(userId: string, startDate: Date, endDate: Date) {
    return prisma.dailyStats.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });
  }

  static async upsert(userId: string, date: Date, data: Record<string, unknown>) {
    const dateOnly = new Date(date);
    dateOnly.setUTCHours(0, 0, 0, 0);
    return prisma.dailyStats.upsert({
      where: { userId_date: { userId, date: dateOnly } },
      create: { userId, date: dateOnly, ...data },
      update: { ...data },
    });
  }

  static async incrementProblemsSolved(userId: string, date: Date, count: number) {
    const dateOnly = new Date(date);
    dateOnly.setUTCHours(0, 0, 0, 0);
    return prisma.dailyStats.upsert({
      where: { userId_date: { userId, date: dateOnly } },
      create: { userId, date: dateOnly, totalProblems: count },
      update: { totalProblems: { increment: count } },
    });
  }

  static async getStreak(userId: string): Promise<number> {
    const stats = await prisma.dailyStats.findMany({
      where: { userId, totalProblems: { gt: 0 } },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    let streak = 0;
    let expectedDate = new Date();
    expectedDate.setUTCHours(0, 0, 0, 0);

    for (const stat of stats) {
      const statDate = new Date(stat.date);
      statDate.setUTCHours(0, 0, 0, 0);
      if (statDate.getTime() === expectedDate.getTime()) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (statDate.getTime() < expectedDate.getTime()) {
        break;
      }
    }
    return streak;
  }

  static async getTotals(userId: string, startDate?: Date, endDate?: Date) {
    return prisma.dailyStats.aggregate({
      where: {
        userId,
        ...(startDate || endDate
          ? { date: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } }
          : {}),
      },
      _sum: { totalProblems: true, totalTimeSpent: true, totalPoints: true },
      _max: { totalProblems: true, streakDay: true },
    });
  }
}

export default DailyStatsRepository;
