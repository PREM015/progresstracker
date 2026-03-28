// src/types/support-ticket.ts
// Support ticket types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed' | 'spam';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory =
  | 'billing'
  | 'technical'
  | 'account'
  | 'feature_request'
  | 'bug_report'
  | 'general'
  | 'platform_sync'
  | 'data_export';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Support ticket record (matches Prisma SupportTicket model) */
export interface SupportTicket {
  id: string;
  ticketNumber: string; // e.g. TICKET-1234
  userId: string;
  assigneeId?: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  tags: string[];
  attachments?: TicketAttachment[] | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  firstResponseAt?: Date | null;
  satisfactionScore?: number | null; // 1-5
  satisfactionComment?: string | null;
  isPublic: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Ticket attachment */
export interface TicketAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

/** Support ticket with user and assignee */
export interface SupportTicketWithDetails extends SupportTicket {
  user: { id: string; name: string | null; email: string | null; image: string | null };
  assignee?: { id: string; name: string | null; image: string | null } | null;
  replyCount: number;
  lastReplyAt?: Date | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateSupportTicketInput {
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  attachments?: TicketAttachment[];
  isPublic?: boolean;
}

export interface UpdateSupportTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
  tags?: string[];
  isPublic?: boolean;
}

export interface SubmitSatisfactionInput {
  ticketId: string;
  score: number; // 1-5
  comment?: string;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface SupportTicketQuery {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  userId?: string;
  assigneeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getTicketStatusLabel(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    waiting_user: 'Awaiting Reply',
    resolved: 'Resolved',
    closed: 'Closed',
    spam: 'Spam',
  };
  return labels[status];
}

export function getTicketPriorityColor(priority: TicketPriority): string {
  const colors: Record<TicketPriority, string> = {
    low: '#6B7280',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626',
  };
  return colors[priority];
}

export default SupportTicket;
