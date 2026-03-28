// src/repositories/blogPost.repository.ts
// Blog post data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class BlogPostRepository {
  static async findById(id: string) {
    return prisma.blogPost.findUnique({
      where: { id },
    }) as any;
  }

  static async findBySlug(slug: string) {
    return prisma.blogPost.findUnique({
      where: { slug: slug as any },
    }) as any;
  }

  static async findMany(options: {
    status?: string;
    authorId?: string;
    tags?: string[];
    search?: string;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: Prisma.BlogPostWhereInput = {
      ...(options.status ? { status: options.status as never } : {}),
      ...(options.authorId ? { authorId: options.authorId } : {}),
      ...(options.tags?.length ? { tags: { hasSome: options.tags } } : {}),
      ...(options.search
        ? { OR: [
            { title: { contains: options.search, mode: 'insensitive' } },
            { content: { contains: options.search, mode: 'insensitive' } },
          ] }
        : {}),
    } as any;

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip: options.skip,
        take: options.take ?? 10,
        orderBy: { [options.sortBy ?? 'publishedAt']: options.sortOrder ?? 'desc' },
      }) as any,
      (prisma as any).blogPost?.count ? (prisma as any).blogPost.count({ where }) : Promise.resolve(0),
    ]);

    return { posts, total };
  }

  static async create(data: Prisma.BlogPostCreateInput) {
    return (prisma as any).blogPost?.create({ data }) as any;
  }

  static async update(id: string, data: Prisma.BlogPostUpdateInput) {
    return (prisma as any).blogPost?.update({ where: { id }, data }) as any;
  }

  static async delete(id: string) {
    return (prisma as any).blogPost?.update({ where: { id }, data: { status: 'DELETED' as never } }) as any;
  }

  static async incrementViewCount(id: string) {
    return (prisma as any).blogPost?.update({ where: { id }, data: { viewCount: { increment: 1 } } }) as any;
  }

  static async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const post = await (prisma as any).blogPost?.findFirst({
      where: { slug, id: excludeId ? { not: excludeId } : undefined },
      select: { id: true },
    });
    return !!post;
  }
}

export default BlogPostRepository;
