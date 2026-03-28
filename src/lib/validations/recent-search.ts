// src/lib/validations/recent-search.ts
// Recent search validation schemas

import { z } from 'zod';

export const CreateRecentSearchSchema = z.object({
  query: z.string().min(1).max(200).trim(),
  type: z.string().max(50).optional(),
  resultCount: z.number().int().nonnegative().optional(),
});

export const DeleteRecentSearchSchema = z.object({
  id: z.string().cuid('Invalid search ID'),
});

export const ClearRecentSearchesSchema = z.object({
  type: z.string().max(50).optional(),
});

export type CreateRecentSearchInput = z.infer<typeof CreateRecentSearchSchema>;
