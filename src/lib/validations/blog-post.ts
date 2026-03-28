// src/lib/validations/blog-post.ts
// Blog post validation schemas

import { z } from 'zod';

export const CreateBlogPostSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(300, 'Title too long').trim(),
  content: z.string().min(50, 'Content must be at least 50 characters').max(200000, 'Content too long'),
  excerpt: z.string().max(500).optional().nullable(),
  coverImage: z.string().url('Invalid URL').optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  categories: z.array(z.string().max(50)).max(5).default([]),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).default('draft'),
  visibility: z.enum(['public', 'unlisted', 'members_only', 'private']).default('public'),
  scheduledAt: z.coerce.date().optional().nullable(),
  allowComments: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
  seoKeywords: z.array(z.string().max(50)).max(20).optional(),
});

export const UpdateBlogPostSchema = CreateBlogPostSchema.partial();

export const BlogPostQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['draft', 'published', 'scheduled', 'archived', 'deleted']).optional(),
  authorId: z.string().cuid().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().max(200).optional(),
  isFeatured: z.coerce.boolean().optional(),
  sortBy: z.enum(['publishedAt', 'viewCount', 'likeCount', 'createdAt']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateBlogPostInput = z.infer<typeof CreateBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof UpdateBlogPostSchema>;
export type BlogPostQueryInput = z.infer<typeof BlogPostQuerySchema>;
