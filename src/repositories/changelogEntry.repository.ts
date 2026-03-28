// src/repositories/changelogEntry.repository.ts
// Changelog entry data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class ChangelogEntryRepository {
  static async findAll(options?: { isPublished?: boolean; skip?: number; take?: number }) {
    return prisma.changelogEntry.findMany({
      where: {
        ...(options?.isPublished !== undefined ? { isPublished: options.isPublished } : {}),
      },
      orderBy: { version: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
    });
  }

  static async findById(id: string) {
    return prisma.changelogEntry.findUnique({ where: { id } });
  }

  static async findByVersion(version: string) {
    return prisma.changelogEntry.findFirst({ where: { version } });
  }

  static async create(data: Prisma.ChangelogEntryCreateInput) {
    return prisma.changelogEntry.create({ data });
  }

  static async update(id: string, data: Prisma.ChangelogEntryUpdateInput) {
    return prisma.changelogEntry.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.changelogEntry.delete({ where: { id } });
  }

  static async publish(id: string) {
    return prisma.changelogEntry.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
  }
}

export default ChangelogEntryRepository;
