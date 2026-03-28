// src/repositories/bookmark.repository.ts
// Bookmark data access

import { prisma } from '@/lib/prisma';

export class BookmarkRepository {
  static async findByUserId(userId: string, options?: {
    entityType?: string;
    skip?: number;
    take?: number;
  }) {
    return prisma.bookmark.findMany({
      where: {
        userId,
        ...(options?.entityType ? { entityType: options.entityType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
    });
  }

  static async findByUserAndResource(userId: string, entityType: string, entityId: string) {
    return prisma.bookmark.findFirst({ where: { userId, entityType, entityId } });
  }

  static async create(data: { userId: string; entityType: string; entityId: string; notes?: string; tags?: string[] }) {
    return prisma.bookmark.create({ data });
  }

  static async update(id: string, data: { notes?: string | null; tags?: string[] }) {
    return prisma.bookmark.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.bookmark.delete({ where: { id } });
  }

  static async deleteByResource(userId: string, entityType: string, entityId: string) {
    return prisma.bookmark.deleteMany({ where: { userId, entityType, entityId } });
  }

  static async isBookmarked(userId: string, entityType: string, entityId: string): Promise<boolean> {
    const b = await prisma.bookmark.findFirst({
      where: { userId, entityType, entityId },
      select: { id: true },
    });
    return !!b;
  }

  static async countByUserId(userId: string): Promise<number> {
    return prisma.bookmark.count({ where: { userId } });
  }
}

export default BookmarkRepository;
