// src/repositories/knowledgeBaseArticle.repository.ts
// Knowledge base article data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class KnowledgeBaseArticleRepository {
  static async findById(id: string) {
    return prisma.knowledgeBaseArticle.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  static async findBySlug(slug: string) {
    return prisma.knowledgeBaseArticle.findFirst({ where: { slug } });
  }

  static async create(data: Prisma.KnowledgeBaseArticleCreateInput) {
    return prisma.knowledgeBaseArticle.create({ data });
  }

  static async update(id: string, data: Prisma.KnowledgeBaseArticleUpdateInput) {
    return prisma.knowledgeBaseArticle.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.knowledgeBaseArticle.delete({ where: { id } });
  }

  static async publishArticle(id: string) {
    return prisma.knowledgeBaseArticle.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }
}

export default KnowledgeBaseArticleRepository;
