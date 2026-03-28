// src/lib/validations/email-template.ts
// Email template validation schemas

import { z } from 'zod';

export const CreateEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with dashes'),
  category: z.enum(['auth', 'transactional', 'marketing', 'notifications', 'support', 'billing', 'system']),
  subject: z.string().min(1, 'Subject is required').max(200).trim(),
  previewText: z.string().max(200).optional().nullable(),
  htmlContent: z.string().min(50, 'HTML content required').max(100000),
  textContent: z.string().max(100000).optional().nullable(),
  variables: z.array(z.object({
    name: z.string().min(1).max(50).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
    description: z.string().max(200).optional(),
    defaultValue: z.string().optional(),
    required: z.boolean().default(false),
    type: z.enum(['string', 'number', 'boolean', 'url', 'date']).default('string'),
  })).max(50).default([]),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
});

export const UpdateEmailTemplateSchema = CreateEmailTemplateSchema.partial();

export const TestEmailTemplateSchema = z.object({
  slug: z.string().min(1),
  to: z.string().email('Invalid email address'),
  variables: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type CreateEmailTemplateInput = z.infer<typeof CreateEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof UpdateEmailTemplateSchema>;
export type TestEmailTemplateInput = z.infer<typeof TestEmailTemplateSchema>;
