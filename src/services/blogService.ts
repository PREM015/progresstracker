// src/services/blogService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const log = logger.child({ service: 'BlogService' });

export interface CreateBlogPostInput {
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  category?: string;
  tags?: string[];
  authorId?: string;
  authorName?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface UpdateBlogPostInput {
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  category?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface BlogPostFilters {
  status?: 'draft' | 'published' | 'archived';
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class BlogService {
  /**
   * Create blog post
   */
  async create(data: CreateBlogPostInput) {
    try {
      const existing = await prisma.blogPost.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new Error('Blog post with this slug already exists');
      }

      const post = await prisma.blogPost.create({
        data: {
          slug: data.slug,
          title: data.title,
          excerpt: data.excerpt,
          content: data.content,
          featuredImage: data.featuredImage,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          category: data.category,
          tags: data.tags || [],
          authorId: data.authorId,
          authorName: data.authorName,
          status: data.status || 'draft',
          publishedAt: data.status === 'published' ? new Date() : null,
        },
      });

      log.info('Blog post created', { id: post.id, slug: data.slug });

      return post;
    } catch (error) {
      log.error('Error creating blog post', { slug: data.slug }, error);
      throw error;
    }
  }

  /**
   * Get all blog posts with filters
   */
  async getAll(filters: BlogPostFilters = {}) {
    try {
      const {
        status,
        category,
        tag,
        search,
        page = 1,
        limit = 10,
      } = filters;

      const where: Prisma.BlogPostWhereInput = {};

      if (status) where.status = status;
      if (category) where.category = category;
      if (tag) where.tags = { has: tag };
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.blogPost.count({ where }),
      ]);

      log.info('Blog posts fetched', { total, page });

      return {
        posts,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      log.error('Error fetching blog posts', {}, error);
      throw error;
    }
  }

  /**
   * Get published posts
   */
  async getPublished(page: number = 1, limit: number = 10) {
    return this.getAll({ status: 'published', page, limit });
  }

  /**
   * Get post by slug
   */
  async getBySlug(slug: string) {
    try {
      const post = await prisma.blogPost.findUnique({
        where: { slug },
      });

      if (post && post.status === 'published') {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { viewCount: { increment: 1 } },
        });

        log.info('Blog post viewed', { slug, id: post.id });
      }

      return post;
    } catch (error) {
      log.error('Error fetching blog post by slug', { slug }, error);
      throw error;
    }
  }

  /**
   * Update blog post
   */
  async update(id: string, data: UpdateBlogPostInput) {
    try {
      const updateData: Prisma.BlogPostUpdateInput = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.status === 'published') {
        const current = await prisma.blogPost.findUnique({
          where: { id },
          select: { publishedAt: true },
        });

        if (!current?.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }

      const post = await prisma.blogPost.update({
        where: { id },
        data: updateData,
      });

      log.info('Blog post updated', { id, slug: post.slug });

      return post;
    } catch (error) {
      log.error('Error updating blog post', { id }, error);
      throw error;
    }
  }

  /**
   * Delete blog post
   */
  async delete(id: string) {
    try {
      await prisma.blogPost.delete({
        where: { id },
      });

      log.info('Blog post deleted', { id });

      return { deleted: true };
    } catch (error) {
      log.error('Error deleting blog post', { id }, error);
      throw error;
    }
  }

  /**
   * Get categories
   */
  async getCategories() {
    try {
      const posts = await prisma.blogPost.findMany({
        where: { status: 'published', category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      });

      const categories = posts
        .map((p) => p.category)
        .filter((c): c is string => !!c);

      log.info('Blog categories fetched', { count: categories.length });

      return categories;
    } catch (error) {
      log.error('Error fetching blog categories', {}, error);
      throw error;
    }
  }

  /**
   * Get all tags
   */
  async getTags() {
    try {
      const posts = await prisma.blogPost.findMany({
        where: { status: 'published' },
        select: { tags: true },
      });

      const allTags = posts.flatMap((p) => p.tags);
      const uniqueTags = [...new Set(allTags)];

      log.info('Blog tags fetched', { count: uniqueTags.length });

      return uniqueTags;
    } catch (error) {
      log.error('Error fetching blog tags', {}, error);
      throw error;
    }
  }
}

export const blogService = new BlogService();
export default blogService;