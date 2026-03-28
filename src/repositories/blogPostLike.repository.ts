// src/repositories/blogPostLike.repository.ts
// Blog post like data access

import { prisma } from '@/lib/prisma';

export class BlogPostLikeRepository {
  static async toggle(postId: string, userId: string): Promise<{ liked: boolean }> {
    const existing = await prisma.blogPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await prisma.blogPostLike.delete({ where: { postId_userId: { postId, userId } } });
      await prisma.blogPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
      return { liked: false };
    }

    await prisma.blogPostLike.create({ data: { postId, userId } });
    await prisma.blogPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
    return { liked: true };
  }

  static async isLiked(postId: string, userId: string): Promise<boolean> {
    const like = await prisma.blogPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { postId: true },
    });
    return !!like;
  }

  static async countByPost(postId: string): Promise<number> {
    return prisma.blogPostLike.count({ where: { postId } });
  }

  static async findByUser(userId: string, options?: { skip?: number; take?: number }) {
    return prisma.blogPostLike.findMany({
      where: { userId },
      include: { post: { select: { id: true, title: true, slug: true, featuredImage: true } } },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
    });
  }
}

export default BlogPostLikeRepository;
