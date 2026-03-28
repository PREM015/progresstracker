// src/lib/validations/payment.ts
// Payment validation schemas

import { z } from 'zod';

export const ProcessPaymentSchema = z.object({
  amount: z.number().int().positive('Amount must be positive').max(100000000),
  currency: z.string().length(3, 'Currency must be 3 chars').toUpperCase().default('USD'),
  paymentMethodId: z.string().min(1, 'Payment method required'),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string().max(100)).optional(),
});

export const RefundPaymentSchema = z.object({
  paymentEventId: z.string().cuid('Invalid payment ID'),
  amount: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

export const PaymentHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'refunded', 'disputed', 'canceled']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type ProcessPaymentInput = z.infer<typeof ProcessPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof RefundPaymentSchema>;
export type PaymentHistoryQueryInput = z.infer<typeof PaymentHistoryQuerySchema>;
