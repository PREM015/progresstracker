// src/repositories/goalTemplate.repository.ts
// Goal template data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class GoalTemplateRepository {
  static async findAll(options?: { category?: string; difficulty?: string; isActive?: boolean; limit?: number }) {
    return prisma.goalTemplate.findMany({
      where: {
        ...(options?.category ? { category: options.category as never } : {}),
        ...(options?.difficulty ? { difficulty: options.difficulty as never } : {}),
        ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { timesUsed: 'desc' }],
      take: options?.limit,
    });
  }

  static async findById(id: string) {
    return prisma.goalTemplate.findUnique({ where: { id } });
  }

  static async findPopular(limit = 10) {
    return prisma.goalTemplate.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { timesUsed: 'desc' },
      take: limit,
    });
  }

  static async search(query: string) {
    return prisma.goalTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  }

  static async create(data: Prisma.GoalTemplateCreateInput) {
    return prisma.goalTemplate.create({ data });
  }

  static async update(id: string, data: Prisma.GoalTemplateUpdateInput) {
    return prisma.goalTemplate.update({ where: { id }, data });
  }

  static async incrementUsage(id: string) {
    return prisma.goalTemplate.update({
      where: { id },
      data: { timesUsed: { increment: 1 } },
    });
  }
}

export default GoalTemplateRepository;
