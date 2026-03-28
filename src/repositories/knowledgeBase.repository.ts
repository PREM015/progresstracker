// src/repositories/knowledgeBase.repository.ts
// Knowledge base data access

import { prisma } from '@/lib/prisma';

export class KnowledgeBaseRepository {
  static async findCategories(options?: { isActive?: boolean }) {
    return prisma.knowledgeBaseCategory.findMany({
      where: { ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}) },
      include: {
        _count: { select: { articles: { where: { status: 'PUBLISHED' } } } },
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  static async findCategoryBySlug(slug: string) {
    return prisma.knowledgeBaseCategory.findFirst({ where: { slug, isActive: true } });
  }

  static async findArticles(options: { categoryId?: string; type?: string; isFaq?: boolean; search?: string; status?: string; skip?: number; take?: number }) {
    const where = {
      ...(options.categoryId ? { categoryId: options.categoryId } : {}),
      ...(options.type ? { type: options.type as never } : {}),
      ...(options.isFaq !== undefined ? { isFaq: options.isFaq } : {}),
      ...(options.status ? { status: options.status } : { status: 'PUBLISHED' }),
      ...(options.search ? { OR: [
        { title: { contains: options.search, mode: 'insensitive' as const } },
        { content: { contains: options.search, mode: 'insensitive' as const } },
      ] } : {}),
    };

    const [articles, total] = await Promise.all([
      prisma.knowledgeBaseArticle.findMany({
        where,
        include: { category: { select: { id: true, name: true, slug: true } } },
        skip: options.skip,
        take: options.take ?? 20,
        orderBy: { helpfulYes: 'desc' },
      }),
      prisma.knowledgeBaseArticle.count({ where }),
    ]);

    return { articles, total };
  }

  static async findArticleBySlug(slug: string) {
    return prisma.knowledgeBaseArticle.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  static async incrementViews(articleId: string) {
    return prisma.knowledgeBaseArticle.update({ where: { id: articleId }, data: { viewCount: { increment: 1 } } });
  }

  static async recordFeedback(articleId: string, helpful: boolean) {
    if (helpful) {
      return prisma.knowledgeBaseArticle.update({ where: { id: articleId }, data: { helpfulYes: { increment: 1 } } });
    } else {
      return prisma.knowledgeBaseArticle.update({ where: { id: articleId }, data: { helpfulNo: { increment: 1 } } });
    }
  }
}

export default KnowledgeBaseRepository;
