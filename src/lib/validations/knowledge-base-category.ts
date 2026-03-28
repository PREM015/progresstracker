// src/lib/validations/knowledge-base-category.ts
// Knowledge base category validation schemas

export {
  CreateKbCategorySchema,
  type CreateKbCategoryInput,
} from './knowledge-base';

import { z } from 'zod';

export const UpdateKbCategorySchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(1000).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().cuid().optional().nullable(),
});

export type UpdateKbCategoryInput = z.infer<typeof UpdateKbCategorySchema>;
