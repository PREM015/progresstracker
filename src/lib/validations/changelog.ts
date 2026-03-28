// src/lib/validations/changelog.ts
// Changelog entry validation schemas

import { z } from 'zod';

export const CreateChangelogEntrySchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Invalid version format (e.g. 1.2.3)'),
  title: z.string().min(5, 'Title required').max(200).trim(),
  content: z.string().min(10, 'Content required').max(50000),
  type: z.enum(['major', 'minor', 'patch', 'security', 'hotfix']).default('minor'),
  tags: z.array(z.string().max(30)).max(10).default([]),
  publishedAt: z.coerce.date().optional().nullable(),
  isPublished: z.boolean().default(false),
  highlightColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

export const UpdateChangelogEntrySchema = CreateChangelogEntrySchema.partial();

export type CreateChangelogEntryInput = z.infer<typeof CreateChangelogEntrySchema>;
export type UpdateChangelogEntryInput = z.infer<typeof UpdateChangelogEntrySchema>;
