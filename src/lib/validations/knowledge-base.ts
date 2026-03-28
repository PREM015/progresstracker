// src/lib/validations/knowledge-base.ts
// Knowledge base validation schemas

import { z } from 'zod';

export const CreateKbCategorySchema = z.object({
  name: z.string().min(2, 'Name required').max(100).trim(),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const CreateKbArticleSchema = z.object({
  categoryId: z.string().cuid('Invalid category ID'),
  title: z.string().min(5, 'Title required').max(300).trim(),
  summary: z.string().max(500).optional().nullable(),
  content: z.string().min(50, 'Content is too short').max(100000),
  type: z.enum(['article', 'faq', 'guide', 'troubleshooting', 'reference']).default('article'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  tags: z.array(z.string().max(30)).max(10).default([]),
  isFeatured: z.boolean().default(false),
  isFaq: z.boolean().default(false),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
});

export const UpdateKbArticleSchema = CreateKbArticleSchema.partial().omit({ categoryId: true });

export const ArticleFeedbackSchema = z.object({
  articleId: z.string().cuid('Invalid article ID'),
  helpful: z.boolean(),
  comment: z.string().max(2000).optional(),
});

export const KbArticleQuerySchema = z.object({
  categoryId: z.string().cuid().optional(),
  categorySlug: z.string().optional(),
  type: z.enum(['article', 'faq', 'guide', 'troubleshooting', 'reference']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  search: z.string().max(200).optional(),
  isFeatured: z.coerce.boolean().optional(),
  isFaq: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateKbCategoryInput = z.infer<typeof CreateKbCategorySchema>;
export type CreateKbArticleInput = z.infer<typeof CreateKbArticleSchema>;
export type UpdateKbArticleInput = z.infer<typeof UpdateKbArticleSchema>;
export type ArticleFeedbackInput = z.infer<typeof ArticleFeedbackSchema>;
