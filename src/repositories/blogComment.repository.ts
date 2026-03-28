// src/repositories/blogComment.repository.ts
// Blog comment data access

import { prisma } from '@/lib/prisma';

export class BlogCommentRepository {
  static async findByPostId(postId: string, options?: { status?: string; skip?: number; take?: number }) {
    return prisma.blogComment.findMany({
      where: {
        postId,
        parentId: null, // Only top-level comments
        ...(options?.status ? { isApproved: options.status === 'APPROVED' } : { isApproved: true }),
      },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        replies: {
          where: { isApproved: true },
          include: { author: { select: { id: true, name: true, image: true, username: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip: options?.skip,
      take: options?.take ?? 50,
    });
  }

  static async findById(id: string) {
    return prisma.blogComment.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, image: true } } },
    });
  }

  static async create(data: { postId: string; authorId: string; content: string; parentId?: string }) {
    return prisma.blogComment.create({ data, include: { author: { select: { id: true, name: true, image: true } } } });
  }

  static async update(id: string, data: { content: string }) {
    return prisma.blogComment.update({ where: { id }, data });
  }

  static async updateStatus(id: string, status: string) {
    return prisma.blogComment.update({ where: { id }, data: { isApproved: status === 'APPROVED' } });
  }

  static async delete(id: string) {
    return prisma.blogComment.delete({ where: { id } });
  }

  static async countByPostId(postId: string): Promise<number> {
    return prisma.blogComment.count({ where: { postId, isApproved: true } });
  }
}

export default BlogCommentRepository;
