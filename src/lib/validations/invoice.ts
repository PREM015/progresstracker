// src/lib/validations/invoice.ts
// Invoice validation schemas

import { z } from 'zod';

export const InvoiceQuerySchema = z.object({
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const DownloadInvoiceSchema = z.object({
  invoiceId: z.string().cuid('Invalid invoice ID'),
});

export type InvoiceQueryInput = z.infer<typeof InvoiceQuerySchema>;
export type DownloadInvoiceInput = z.infer<typeof DownloadInvoiceSchema>;
