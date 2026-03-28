// src/lib/validations/blog-comment.ts
// Blog comment validation schemas

import { z } from 'zod';

export const CreateBlogCommentSchema = z.object({
  postId: z.string().cuid('Invalid post ID'),
  content: z.string().min(1, 'Comment cannot be empty').max(10000, 'Comment too long').trim(),
  parentId: z.string().cuid().optional().nullable(),
});

export const UpdateBlogCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(10000, 'Comment too long').trim(),
});

export const ModerateCommentSchema = z.object({
  commentId: z.string().cuid('Invalid comment ID'),
  status: z.enum(['pending', 'approved', 'rejected', 'spam']),
  reason: z.string().max(500).optional(),
});

export const BlogCommentQuerySchema = z.object({
  postId: z.string().cuid().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'spam']).optional(),
  authorId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateBlogCommentInput = z.infer<typeof CreateBlogCommentSchema>;
export type UpdateBlogCommentInput = z.infer<typeof UpdateBlogCommentSchema>;
export type ModerateCommentInput = z.infer<typeof ModerateCommentSchema>;
