// src/types/ticket-reply.ts
// Support ticket reply types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type TicketReplySource = 'user' | 'agent' | 'system' | 'bot';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Ticket reply record (matches Prisma TicketReply model) */
export interface TicketReply {
  id: string;
  ticketId: string;
  authorId?: string | null; // null for system/bot
  source: TicketReplySource;
  content: string;
  contentHtml?: string | null;
  isInternal: boolean; // Agent-only notes
  attachments?: Array<{ name: string; url: string; size: number; type: string }> | null;
  isEdited: boolean;
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Ticket reply with author info */
export interface TicketReplyWithAuthor extends TicketReply {
  author?: {
    id: string;
    name: string | null;
    image: string | null;
    isAgent: boolean;
  } | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateTicketReplyInput {
  ticketId: string;
  content: string;
  isInternal?: boolean;
  attachments?: Array<{ name: string; url: string; size: number; type: string }>;
}

export interface UpdateTicketReplyInput {
  content: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface TicketRepliesResponse {
  replies: TicketReplyWithAuthor[];
  total: number;
}

export default TicketReply;
