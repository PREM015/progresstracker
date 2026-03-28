// src/repositories/maintenanceWindow.repository.ts
// Maintenance window data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class MaintenanceWindowRepository {
  static async findAll(options?: { isActive?: boolean }) {
    return prisma.maintenanceWindow.findMany({
      where: { ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}) },
      orderBy: { startTime: 'desc' },
    });
  }

  static async findById(id: string) {
    return prisma.maintenanceWindow.findUnique({ where: { id } });
  }

  static async findActive() {
    const now = new Date();
    return prisma.maintenanceWindow.findFirst({
      where: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    });
  }

  static async findUpcoming(hours = 24) {
    const cutoff = new Date(Date.now() + hours * 60 * 60 * 1000);
    return prisma.maintenanceWindow.findMany({
      where: {
        isActive: true,
        startTime: { lte: cutoff, gte: new Date() },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  static async create(data: Prisma.MaintenanceWindowCreateInput) {
    return prisma.maintenanceWindow.create({ data });
  }

  static async update(id: string, data: Prisma.MaintenanceWindowUpdateInput) {
    return prisma.maintenanceWindow.update({ where: { id }, data });
  }

  static async updateStatus(id: string, isActive: boolean) {
    return prisma.maintenanceWindow.update({ where: { id }, data: { isActive } });
  }

  static async delete(id: string) {
    return prisma.maintenanceWindow.delete({ where: { id } });
  }
}

export default MaintenanceWindowRepository;
