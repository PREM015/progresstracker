// src/lib/validations/payment-method.ts
// Payment method validation schemas

import { z } from 'zod';

export const AddPaymentMethodSchema = z.object({
  stripePaymentMethodId: z.string().min(1, 'Payment method ID is required'),
  setAsDefault: z.boolean().default(false),
});

export const SetDefaultPaymentMethodSchema = z.object({
  paymentMethodId: z.string().cuid('Invalid payment method ID'),
});

export const RemovePaymentMethodSchema = z.object({
  paymentMethodId: z.string().cuid('Invalid payment method ID'),
});

export type AddPaymentMethodInput = z.infer<typeof AddPaymentMethodSchema>;
export type SetDefaultPaymentMethodInput = z.infer<typeof SetDefaultPaymentMethodSchema>;
