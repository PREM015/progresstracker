// src/lib/validations/billing.ts
// Billing general validation schemas

export {
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  CancelSubscriptionSchema,
  ApplyCouponSchema,
  type CreateSubscriptionInput,
  type UpdateSubscriptionInput,
  type CancelSubscriptionInput,
  type ApplyCouponInput,
} from './subscription';

export {
  ProcessPaymentSchema,
  RefundPaymentSchema,
  PaymentHistoryQuerySchema,
  type ProcessPaymentInput,
  type RefundPaymentInput,
  type PaymentHistoryQueryInput,
} from './payment';

export {
  AddPaymentMethodSchema,
  SetDefaultPaymentMethodSchema,
  RemovePaymentMethodSchema,
  type AddPaymentMethodInput,
  type SetDefaultPaymentMethodInput,
} from './payment-method';

export {
  InvoiceQuerySchema,
  DownloadInvoiceSchema,
  type InvoiceQueryInput,
  type DownloadInvoiceInput,
} from './invoice';
