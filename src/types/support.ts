// ===== FILE: src/types/support.ts =====
// Complete support types for tickets, feedback, and contact

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Ticket status */
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

/** Ticket priority */
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

/** Ticket category */
export type TicketCategory = 'bug' | 'feature_request' | 'account' | 'billing' | 'other';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Support ticket */
export interface SupportTicket {
  id: string;
  userId: string;

  subject: string;
  message: string;

  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;

  attachments?: string[];

  assignedTo?: string; // Admin ID

  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;

  // Relations
  user?: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
}

/** Feedback submission */
export interface FeedbackRequest {
  type: 'bug' | 'feature' | 'general' | 'design';
  message: string;
  rating?: number;
  screenshot?: string;
  path?: string; // URL path where feedback was submitted
  userAgent?: string;
}

/** Contact form submission */
export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: 'sales' | 'support' | 'partnership' | 'other';
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create ticket input */
export interface CreateTicketRequest {
  subject: string;
  message: string;
  priority: TicketPriority;
  category: TicketCategory;
  attachments?: string[];
}

/** Update ticket input */
export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
}

/** Add comment input */
export interface AddTicketCommentInput {
  message: string;
  attachments?: string[];
}