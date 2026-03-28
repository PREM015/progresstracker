// src/lib/validations/ticket-reply.ts
// Ticket reply specific validation schemas (re-export from support-ticket)

import { z } from 'zod';

export const UpdateTicketReplySchema = z.object({
  content: z.string().min(1, 'Reply cannot be empty').max(10000).trim(),
});

export const DeleteTicketReplySchema = z.object({
  replyId: z.string().cuid('Invalid reply ID'),
});

export type UpdateTicketReplyInput = z.infer<typeof UpdateTicketReplySchema>;
export type DeleteTicketReplyInput = z.infer<typeof DeleteTicketReplySchema>;
