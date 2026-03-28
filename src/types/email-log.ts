// src/types/email-log.ts
// Email delivery log types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type EmailLogStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'spam' | 'unsubscribed';
export type EmailPriority = 'low' | 'normal' | 'high' | 'critical';
export type EmailProvider = 'resend' | 'sendgrid' | 'ses' | 'smtp' | 'postmark';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Email log record (matches Prisma EmailLog model) */
export interface EmailLog {
  id: string;
  userId?: string | null;
  templateId?: string | null;
  to: string | string[];
  cc?: string | string[] | null;
  bcc?: string | string[] | null;
  subject: string;
  status: EmailLogStatus;
  priority: EmailPriority;
  provider: EmailProvider;
  providerMessageId?: string | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  openedAt?: Date | null;
  clickedAt?: Date | null;
  bouncedAt?: Date | null;
  bounceType?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  tags?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

/** Email delivery stats */
export interface EmailDeliveryStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  deliveryRate: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface EmailLogQuery {
  userId?: string;
  status?: EmailLogStatus;
  templateId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getEmailStatusLabel(status: EmailLogStatus): string {
  const labels: Record<EmailLogStatus, string> = {
    pending: 'Pending',
    sent: 'Sent',
    delivered: 'Delivered',
    opened: 'Opened',
    clicked: 'Clicked',
    bounced: 'Bounced',
    failed: 'Failed',
    spam: 'Spam',
    unsubscribed: 'Unsubscribed',
  };
  return labels[status];
}

export default EmailLog;
