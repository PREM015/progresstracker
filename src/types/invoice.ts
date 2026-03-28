// src/types/invoice.ts
// Invoice types for billing

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Invoice record (matches Prisma Invoice model) */
export interface Invoice {
  id: string;
  userId: string;
  subscriptionId?: string | null;
  stripeInvoiceId: string;
  stripeCustomerId: string;
  number?: string | null;
  status: InvoiceStatus;
  currency: string;
  subtotal: number; // In cents
  tax: number;
  total: number;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  description?: string | null;
  periodStart: Date;
  periodEnd: Date;
  dueDate?: Date | null;
  paidAt?: Date | null;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  lineItems?: InvoiceLineItem[] | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Invoice line item */
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  currency: string;
  period?: { start: Date; end: Date } | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface InvoiceQuery {
  userId?: string;
  status?: InvoiceStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  totalPaidAmount: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  const labels: Record<InvoiceStatus, string> = {
    draft: 'Draft',
    open: 'Open',
    paid: 'Paid',
    void: 'Voided',
    uncollectible: 'Uncollectible',
  };
  return labels[status];
}

export function getInvoiceStatusColor(status: InvoiceStatus): string {
  const colors: Record<InvoiceStatus, string> = {
    draft: '#6B7280',
    open: '#F59E0B',
    paid: '#10B981',
    void: '#6B7280',
    uncollectible: '#EF4444',
  };
  return colors[status];
}

export default Invoice;
