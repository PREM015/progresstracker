// src/lib/validations/blog-like.ts
// Blog like validation schemas

import { z } from 'zod';

export const ToggleBlogLikeSchema = z.object({
  postId: z.string().cuid('Invalid post ID'),
});

export type ToggleBlogLikeInput = z.infer<typeof ToggleBlogLikeSchema>;
