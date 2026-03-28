// src/repositories/goalHistory.repository.ts
// Goal progress history data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class GoalHistoryRepository {
  static async findByGoalId(goalId: string, options?: { limit?: number; skip?: number }) {
    return prisma.goalHistory.findMany({
      where: { goalId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.skip ?? 0,
    });
  }

  static async findByUserId(userId: string, options?: { startDate?: Date; endDate?: Date }) {
    return prisma.goalHistory.findMany({
      where: {
        goal: { userId },
        ...(options?.startDate || options?.endDate
          ? { createdAt: { gte: options?.startDate, lte: options?.endDate } }
          : {}),
      },
      include: { goal: { select: { id: true, title: true, metric: true, target: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async create(data: Prisma.GoalHistoryUncheckedCreateInput) {
    return prisma.goalHistory.create({
      data,
    });
  }

  static async getLatest(goalId: string) {
    return prisma.goalHistory.findFirst({
      where: { goalId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default GoalHistoryRepository;
