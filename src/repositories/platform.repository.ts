// src/repositories/platform.repository.ts
// Platform data access

import { prisma } from '@/lib/prisma';
import type { Prisma, PlatformCategory } from '@prisma/client';

export class PlatformRepository {
  static async findAll(options?: { category?: PlatformCategory; isActive?: boolean }) {
    return prisma.platform.findMany({
      where: {
        ...(options?.category ? { category: options.category } : {}),
        ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  static async findById(id: string) {
    return prisma.platform.findUnique({ where: { id } });
  }

  static async findBySlug(slug: string) {
    return prisma.platform.findUnique({ where: { slug } });
  }

  static async search(query: string) {
    return prisma.platform.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }

  static async create(data: Prisma.PlatformCreateInput) {
    return prisma.platform.create({ data });
  }

  static async update(id: string, data: Prisma.PlatformUpdateInput) {
    return prisma.platform.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.platform.delete({ where: { id } });
  }

  static async count(): Promise<number> {
    return prisma.platform.count({ where: { isActive: true } });
  }

  static async findTopPlatforms(limit = 10) {
    return prisma.platform.findMany({
      where: { isActive: true },
      orderBy: { totalUsers: 'desc' },
      take: limit,
    });
  }
}

export default PlatformRepository;
