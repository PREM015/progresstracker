// src/repositories/knowledgeBaseCategory.repository.ts
// Knowledge base category data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class KnowledgeBaseCategoryRepository {
  static async findAll(options?: { isActive?: boolean }) {
    return prisma.knowledgeBaseCategory.findMany({
      where: { ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}) },
      orderBy: { sortOrder: 'asc' },
    });
  }

  static async findById(id: string) {
    return prisma.knowledgeBaseCategory.findUnique({ where: { id } });
  }

  static async findBySlug(slug: string) {
    return prisma.knowledgeBaseCategory.findFirst({ where: { slug } });
  }

  static async create(data: Prisma.KnowledgeBaseCategoryCreateInput) {
    return prisma.knowledgeBaseCategory.create({ data });
  }

  static async update(id: string, data: Prisma.KnowledgeBaseCategoryUpdateInput) {
    return prisma.knowledgeBaseCategory.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.knowledgeBaseCategory.delete({ where: { id } });
  }

  static async reorder(items: { id: string; sortOrder: number }[]) {
    return Promise.all(
      items.map((item) => prisma.knowledgeBaseCategory.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }))
    );
  }
}

export default KnowledgeBaseCategoryRepository;
