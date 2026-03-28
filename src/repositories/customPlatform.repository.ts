// src/repositories/customPlatform.repository.ts
// Custom platform data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class CustomPlatformRepository {
  static async findByUserId(userId: string) {
    return prisma.customPlatform.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findById(id: string) {
    return prisma.customPlatform.findUnique({ where: { id } });
  }

  static async findAll(options?: { isPublic?: boolean; userId?: string }) {
    return prisma.customPlatform.findMany({
      where: {
        ...(options?.isPublic !== undefined ? { isPublic: options.isPublic } : {}),
        ...(options?.userId ? { userId: options.userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async create(data: Prisma.CustomPlatformCreateInput) {
    return prisma.customPlatform.create({ data });
  }

  static async update(id: string, data: Prisma.CustomPlatformUpdateInput) {
    return prisma.customPlatform.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.customPlatform.delete({ where: { id } });
  }

  static async countByUserId(userId: string): Promise<number> {
    return prisma.customPlatform.count({ where: { userId } });
  }
}

export default CustomPlatformRepository;
