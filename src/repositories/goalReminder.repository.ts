// src/repositories/goalReminder.repository.ts
// Goal reminder data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class GoalReminderRepository {
  static async findByGoalId(goalId: string) {
    return prisma.goalReminder.findMany({ where: { goalId }, orderBy: { createdAt: 'asc' } });
  }

  static async findByUserId(userId: string, options?: { isEnabled?: boolean }) {
    return prisma.goalReminder.findMany({
      where: {
        goal: { userId },
        ...(options?.isEnabled !== undefined ? { isActive: options.isEnabled } : {}),
      },
      include: { goal: { select: { id: true, title: true } } },
    });
  }

  static async findById(id: string) {
    return prisma.goalReminder.findUnique({ where: { id } });
  }

  static async create(data: Prisma.GoalReminderCreateInput) {
    return prisma.goalReminder.create({ data });
  }

  static async update(id: string, data: Prisma.GoalReminderUpdateInput) {
    return prisma.goalReminder.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.goalReminder.delete({ where: { id } });
  }

  static async updateLastSent(id: string) {
    return prisma.goalReminder.update({
      where: { id },
      data: { lastSentAt: new Date() },
    });
  }

  static async findDue() {
    return prisma.goalReminder.findMany({
      where: {
        isActive: true,
        OR: [
          { nextSendAt: { lte: new Date() } },
          { nextSendAt: null },
        ],
      },
      include: {
        goal: { select: { id: true, title: true, userId: true, status: true } },
      },
    });
  }
}

export default GoalReminderRepository;
