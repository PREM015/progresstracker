// src/lib/validations/bookmark.ts
// Bookmark validation schemas

import { z } from 'zod';

export const CreateBookmarkSchema = z.object({
  resourceType: z.enum(['blog_post', 'knowledge_base', 'achievement', 'goal_template', 'tracker_entry']),
  resourceId: z.string().cuid('Invalid resource ID'),
  notes: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string().max(30)).max(10).default([]),
});

export const UpdateBookmarkSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export const BookmarkQuerySchema = z.object({
  resourceType: z.enum(['blog_post', 'knowledge_base', 'achievement', 'goal_template', 'tracker_entry']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().max(100).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkSchema>;
export type BookmarkQueryInput = z.infer<typeof BookmarkQuerySchema>;
