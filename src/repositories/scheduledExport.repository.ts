// src/repositories/scheduledExport.repository.ts
// Scheduled export data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class ScheduledExportRepository {
  static async findByUserId(userId: string) {
    return prisma.scheduledExport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findById(id: string) {
    return prisma.scheduledExport.findUnique({ where: { id } });
  }

  static async findDue() {
    return prisma.scheduledExport.findMany({
      where: {
        isActive: true,
        OR: [{ nextRunAt: { lte: new Date() } }, { nextRunAt: null }],
      },
    });
  }

  static async create(data: Prisma.ScheduledExportUncheckedCreateInput) {
    return prisma.scheduledExport.create({ data });
  }

  static async update(id: string, data: Record<string, unknown>) {
    return prisma.scheduledExport.update({ where: { id }, data });
  }

  static async updateNextRun(id: string, nextRunAt: Date) {
    return prisma.scheduledExport.update({
      where: { id },
      data: { nextRunAt, lastRunAt: new Date() },
    });
  }

  static async delete(id: string) {
    return prisma.scheduledExport.delete({ where: { id } });
  }
}

export default ScheduledExportRepository;
