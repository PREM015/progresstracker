// src/lib/validations/support-ticket.ts
// Support ticket validation schemas

import { z } from 'zod';

export const CreateSupportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(300, 'Subject too long').trim(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(10000, 'Description too long').trim(),
  category: z.enum(['billing', 'technical', 'account', 'feature_request', 'bug_report', 'general', 'platform_sync', 'data_export']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  attachments: z.array(z.object({
    name: z.string().max(255),
    url: z.string().url(),
    size: z.number().int().positive().max(10 * 1024 * 1024), // 10MB
    type: z.string().max(100),
  })).max(5).default([]),
  isPublic: z.boolean().default(false),
});

export const UpdateSupportTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_user', 'resolved', 'closed', 'spam']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: z.string().cuid().optional().nullable(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isPublic: z.boolean().optional(),
});

export const CreateTicketReplySchema = z.object({
  ticketId: z.string().cuid('Invalid ticket ID'),
  content: z.string().min(1, 'Reply cannot be empty').max(10000, 'Reply too long').trim(),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.object({
    name: z.string().max(255),
    url: z.string().url(),
    size: z.number().int().positive(),
    type: z.string().max(100),
  })).max(5).default([]),
});

export const SubmitSatisfactionSchema = z.object({
  ticketId: z.string().cuid('Invalid ticket ID'),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const SupportTicketQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_user', 'resolved', 'closed', 'spam']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSupportTicketInput = z.infer<typeof CreateSupportTicketSchema>;
export type UpdateSupportTicketInput = z.infer<typeof UpdateSupportTicketSchema>;
export type CreateTicketReplyInput = z.infer<typeof CreateTicketReplySchema>;
export type SubmitSatisfactionInput = z.infer<typeof SubmitSatisfactionSchema>;
