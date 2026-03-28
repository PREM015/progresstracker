// src/lib/validations/search.ts
// Search validation schemas

import { z } from 'zod';

export const SearchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  type: z.enum(['all', 'tracker', 'goals', 'achievements', 'blog', 'users', 'platforms']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  filters: z.record(z.string()).optional(),
});

export const RecentSearchQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export const SaveSearchSchema = z.object({
  query: z.string().min(1).max(200),
  type: z.string().optional(),
});

export type SearchInput = z.infer<typeof SearchSchema>;
export type SaveSearchInput = z.infer<typeof SaveSearchSchema>;
