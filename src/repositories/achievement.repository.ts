// src/repositories/achievement.repository.ts
// Achievement definition data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class AchievementRepository {
  static async findAll(options?: { isActive?: boolean }) {
    return prisma.achievement.findMany({
      where: { ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}) },
      orderBy: [{ category: 'asc' }, { points: 'asc' }],
    });
  }

  static async findById(id: string) {
    return prisma.achievement.findUnique({ where: { id } });
  }

  static async findBySlug(slug: string) {
    return prisma.achievement.findUnique({ where: { slug } });
  }

  static async findByCategory(category: string) {
    return prisma.achievement.findMany({
      where: { category: category as never, isActive: true },
      orderBy: { points: 'asc' },
    });
  }

  static async create(data: Prisma.AchievementCreateInput) {
    return prisma.achievement.create({ data });
  }

  static async update(id: string, data: Prisma.AchievementUpdateInput) {
    return prisma.achievement.update({ where: { id }, data });
  }

  static async search(query: string) {
    return prisma.achievement.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }

  static async count(): Promise<number> {
    return prisma.achievement.count({ where: { isActive: true } });
  }
}

export default AchievementRepository;
