// src/types/payment-method.ts
// Payment method types (cards, wallets, etc.)

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type PaymentMethodType = 'card' | 'sepa_debit' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_account';
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'jcb' | 'unionpay' | 'unknown';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Payment method record (matches Prisma PaymentMethod model) */
export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: PaymentMethodType;
  isDefault: boolean;
  // Card details
  cardBrand?: CardBrand | null;
  cardLast4?: string | null;
  cardExpMonth?: number | null;
  cardExpYear?: number | null;
  cardHolderName?: string | null;
  // Bank details
  bankName?: string | null;
  bankLast4?: string | null;
  // Billing address
  billingEmail?: string | null;
  billingName?: string | null;
  billingLine1?: string | null;
  billingCity?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Masked payment method for display */
export interface PaymentMethodDisplay {
  id: string;
  type: PaymentMethodType;
  isDefault: boolean;
  cardBrand?: CardBrand | null;
  cardLast4?: string | null;
  cardExpMonth?: number | null;
  cardExpYear?: number | null;
  bankName?: string | null;
  bankLast4?: string | null;
  displayLabel: string;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface AddPaymentMethodInput {
  stripePaymentMethodId: string;
  setAsDefault?: boolean;
}

export interface SetDefaultPaymentMethodInput {
  paymentMethodId: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface PaymentMethodListResponse {
  methods: PaymentMethodDisplay[];
  total: number;
  defaultMethodId?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getPaymentMethodDisplayLabel(method: PaymentMethodDisplay): string {
  if (method.type === 'card' && method.cardBrand && method.cardLast4) {
    const brand = method.cardBrand.charAt(0).toUpperCase() + method.cardBrand.slice(1);
    return `${brand} •••• ${method.cardLast4}`;
  }
  if (method.type === 'bank_account' && method.bankLast4) {
    return `${method.bankName ?? 'Bank'} •••• ${method.bankLast4}`;
  }
  return method.type.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function isCardExpiringSoon(method: Pick<PaymentMethod, 'cardExpMonth' | 'cardExpYear'>): boolean {
  if (!method.cardExpMonth || !method.cardExpYear) return false;
  const expiry = new Date(method.cardExpYear, method.cardExpMonth - 1);
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  return expiry <= threeMonths;
}

export default PaymentMethod;
