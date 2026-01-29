/* eslint-disable @typescript-eslint/no-unused-vars */
// ===== FILE: src/types/billing.ts =====
// Complete billing types matching Prisma schema

import type {
  SubscriptionStatus as PrismaSubscriptionStatus,
  SubscriptionTier as PrismaSubscriptionTier,
  BillingInterval as PrismaBillingInterval,
  PaymentStatus as PrismaPaymentStatus,
} from '@prisma/client';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Subscription status */
export type SubscriptionStatus = 
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'unpaid';

/** Subscription tier */
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';

/** Billing interval */
export type BillingInterval = 'monthly' | 'yearly' | 'lifetime';

/** Payment status */
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

/** Payment method type */
export type PaymentMethodType = 'card' | 'bank_account' | 'paypal';

/** Card brand */
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'diners' | 'unionpay' | 'unknown';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Subscription (matches Prisma Subscription) */
export interface Subscription {
  id: string;
  userId: string;
  
  // Stripe IDs
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  
  // Plan info
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  
  // Pricing
  priceAmount?: number;
  currency: string;
  
  // Current period
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  
  // Trial
  trialStart?: Date;
  trialEnd?: Date;
  trialDays?: number;
  
  // Cancellation
  cancelAtPeriodEnd: boolean;
  cancelAt?: Date;
  canceledAt?: Date;
  cancelReason?: string;
  cancelFeedback?: string;
  
  // Pause
  pausedAt?: Date;
  resumesAt?: Date;
  
  // Usage limits
  platformLimit: number;
  syncFrequencyMinutes: number;
  exportLimitMonthly: number;
  apiRequestsDaily: number;
  
  // Current usage
  currentPlatformCount: number;
  currentExportCount: number;
  usageResetAt?: Date;
  
  // Features
  features: string[];
  
  // Payment info
  lastPaymentAt?: Date;
  lastPaymentAmount?: number;
  nextPaymentAt?: Date;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  createdAt: Date;
  updatedAt: Date;
}

/** Payment method (matches Prisma PaymentMethod) */
export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  
  type: PaymentMethodType;
  brand?: CardBrand;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  
  isDefault: boolean;
  isValid: boolean;
  
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingAddress?: BillingAddress;
  
  createdAt: Date;
  updatedAt: Date;
}

/** Billing address */
export interface BillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/** Invoice (matches Prisma Invoice) */
export interface Invoice {
  id: string;
  userId: string;
  subscriptionId?: string;
  
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  
  invoiceNumber?: string;
  
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  
  invoiceDate: Date;
  dueDate?: Date;
  paidAt?: Date;
  voidedAt?: Date;
  
  lineItems?: InvoiceLineItem[];
  
  invoicePdfUrl?: string;
  hostedInvoiceUrl?: string;
  
  billingReason?: string;
  
  metadata?: Record<string, unknown>;
  
  createdAt: Date;
  updatedAt: Date;
}

/** Invoice line item */
export interface InvoiceLineItem {
  description: string;
  amount: number;
  quantity: number;
  unitAmount?: number;
}

/** Payment event (matches Prisma PaymentEvent) */
export interface PaymentEvent {
  id: string;
  userId?: string;
  subscriptionId?: string;
  
  stripeEventId: string;
  stripeEventType: string;
  
  eventType: string;
  status: PaymentStatus;
  
  amount?: number;
  currency?: string;
  
  failureCode?: string;
  failureMessage?: string;
  
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  stripeChargeId?: string;
  
  rawData?: Record<string, unknown>;
  
  processedAt?: Date;
  processingError?: string;
  
  createdAt: Date;
}

/** Pricing tier */
export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  description: string;
  
  prices: {
    monthly: number;
    yearly: number;
    yearlyMonthly: number;
    savings: number;
  };
  
  features: PricingFeature[];
  limits: TierLimits;
  
  isPopular: boolean;
  isCurrent?: boolean;
  
  stripePriceIds?: {
    monthly: string;
    yearly: string;
  };
}

/** Pricing feature */
export interface PricingFeature {
  name: string;
  description?: string;
  included: boolean;
  limit?: number | 'unlimited';
  highlight?: boolean;
}

/** Tier limits */
export interface TierLimits {
  platforms: number;
  syncFrequencyMinutes: number;
  exportsPerMonth: number;
  apiRequestsPerDay: number;
  historyDays: number;
  teamMembers?: number;
  customPlatforms: number;
  goals: number;
  scheduledExports: number;
}

/** Usage stats */
export interface UsageStats {
  platformsUsed: number;
  platformsLimit: number;
  platformsPercentage: number;
  
  exportsUsed: number;
  exportsLimit: number;
  exportsPercentage: number;
  
  apiRequestsUsed: number;
  apiRequestsLimit: number;
  apiRequestsPercentage: number;
  
  syncFrequency: number;
  
  resetAt?: Date;
  daysUntilReset: number;
}

/** Checkout session */
export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: Date;
  status: 'open' | 'complete' | 'expired';
}

/** Portal session */
export interface PortalSession {
  id: string;
  url: string;
  expiresAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create subscription input */
export interface CreateSubscriptionInput {
  tier: SubscriptionTier;
  billingInterval: BillingInterval;
  paymentMethodId?: string;
  promotionCode?: string;
}

/** Update subscription input */
export interface UpdateSubscriptionInput {
  tier?: SubscriptionTier;
  billingInterval?: BillingInterval;
}

/** Add payment method input */
export interface AddPaymentMethodInput {
  paymentMethodId: string;
  setAsDefault?: boolean;
}

/** Create checkout session input */
export interface CreateCheckoutInput {
  tier: SubscriptionTier;
  billingInterval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
  promotionCode?: string;
}

// =============================================================================
// PRICING CONFIGURATION
// =============================================================================

/** Pricing tiers configuration */
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic tracking',
    prices: {
      monthly: 0,
      yearly: 0,
      yearlyMonthly: 0,
      savings: 0,
    },
    features: [
      { name: 'Up to 5 platforms', included: true, limit: 5 },
      { name: 'Daily sync', included: true },
      { name: 'Basic analytics', included: true },
      { name: '3 exports per month', included: true, limit: 3 },
      { name: 'Community support', included: true },
      { name: 'Priority support', included: false },
      { name: 'API access', included: false },
      { name: 'Custom platforms', included: false },
    ],
    limits: {
      platforms: 5,
      syncFrequencyMinutes: 1440,
      exportsPerMonth: 3,
      apiRequestsPerDay: 0,
      historyDays: 30,
      customPlatforms: 0,
      goals: 3,
      scheduledExports: 0,
    },
    isPopular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For serious developers',
    prices: {
      monthly: 9,
      yearly: 90,
      yearlyMonthly: 7.5,
      savings: 18,
    },
    features: [
      { name: 'Up to 15 platforms', included: true, limit: 15 },
      { name: 'Hourly sync', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Unlimited exports', included: true, limit: 'unlimited' },
      { name: 'Email support', included: true },
      { name: '90 days history', included: true },
      { name: 'API access', included: false },
      { name: 'Custom platforms', included: false },
    ],
    limits: {
      platforms: 15,
      syncFrequencyMinutes: 60,
      exportsPerMonth: 999,
      apiRequestsPerDay: 0,
      historyDays: 90,
      customPlatforms: 0,
      goals: 10,
      scheduledExports: 3,
    },
    isPopular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For power users',
    prices: {
      monthly: 19,
      yearly: 190,
      yearlyMonthly: 15.83,
      savings: 38,
    },
    features: [
      { name: 'Unlimited platforms', included: true, limit: 'unlimited', highlight: true },
      { name: 'Real-time sync', included: true, highlight: true },
      { name: 'Full analytics suite', included: true },
      { name: 'Unlimited exports', included: true, limit: 'unlimited' },
      { name: 'Priority support', included: true, highlight: true },
      { name: '1 year history', included: true },
      { name: 'API access (1000 req/day)', included: true, limit: 1000 },
      { name: 'Custom platforms (5)', included: true, limit: 5 },
    ],
    limits: {
      platforms: 999,
      syncFrequencyMinutes: 15,
      exportsPerMonth: 999,
      apiRequestsPerDay: 1000,
      historyDays: 365,
      customPlatforms: 5,
      goals: 999,
      scheduledExports: 10,
    },
    isPopular: true,
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For teams and organizations',
    prices: {
      monthly: 49,
      yearly: 490,
      yearlyMonthly: 40.83,
      savings: 98,
    },
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Team dashboards', included: true, highlight: true },
      { name: 'Up to 10 team members', included: true, limit: 10 },
      { name: 'Admin controls', included: true },
      { name: 'SSO / SAML', included: true },
      { name: 'API access (10000 req/day)', included: true, limit: 10000 },
      { name: 'Unlimited history', included: true },
      { name: 'Dedicated support', included: true },
    ],
    limits: {
      platforms: 999,
      syncFrequencyMinutes: 5,
      exportsPerMonth: 999,
      apiRequestsPerDay: 10000,
      historyDays: 999,
      teamMembers: 10,
      customPlatforms: 20,
      goals: 999,
      scheduledExports: 999,
    },
    isPopular: false,
  },
];

/** Subscription status configuration */
export const SUBSCRIPTION_STATUS_CONFIG: Record<SubscriptionStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  active: { label: 'Active', color: '#10B981', bgColor: '#D1FAE5', icon: 'CheckCircle' },
  trialing: { label: 'Trial', color: '#3B82F6', bgColor: '#DBEAFE', icon: 'Clock' },
  past_due: { label: 'Past Due', color: '#F59E0B', bgColor: '#FEF3C7', icon: 'AlertCircle' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bgColor: '#F3F4F6', icon: 'XCircle' },
  incomplete: { label: 'Incomplete', color: '#F59E0B', bgColor: '#FEF3C7', icon: 'AlertCircle' },
  incomplete_expired: { label: 'Expired', color: '#EF4444', bgColor: '#FEE2E2', icon: 'XCircle' },
  paused: { label: 'Paused', color: '#6B7280', bgColor: '#F3F4F6', icon: 'Pause' },
  unpaid: { label: 'Unpaid', color: '#EF4444', bgColor: '#FEE2E2', icon: 'AlertTriangle' },
};

/** Card brand icons */
export const CARD_BRAND_CONFIG: Record<CardBrand, {
  name: string;
  icon: string;
}> = {
  visa: { name: 'Visa', icon: '/icons/cards/visa.svg' },
  mastercard: { name: 'Mastercard', icon: '/icons/cards/mastercard.svg' },
  amex: { name: 'American Express', icon: '/icons/cards/amex.svg' },
  discover: { name: 'Discover', icon: '/icons/cards/discover.svg' },
  jcb: { name: 'JCB', icon: '/icons/cards/jcb.svg' },
  diners: { name: 'Diners Club', icon: '/icons/cards/diners.svg' },
  unionpay: { name: 'UnionPay', icon: '/icons/cards/unionpay.svg' },
  unknown: { name: 'Card', icon: '/icons/cards/generic.svg' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get pricing tier by ID */
export function getPricingTier(tier: SubscriptionTier): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.id === tier);
}

/** Get tier limits */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return getPricingTier(tier)?.limits ?? PRICING_TIERS[0].limits;
}

/** Format price */
export function formatPrice(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format price from cents */
export function formatPriceFromCents(cents: number, currency: string = 'usd'): string {
  return formatPrice(cents / 100, currency);
}

/** Get subscription status config */
export function getSubscriptionStatusConfig(status: SubscriptionStatus) {
  return SUBSCRIPTION_STATUS_CONFIG[status];
}

/** Check if subscription is active */
export function isSubscriptionActive(subscription: Subscription): boolean {
  return ['active', 'trialing'].includes(subscription.status);
}

/** Check if subscription can be upgraded */
export function canUpgrade(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
  const tierOrder: SubscriptionTier[] = ['free', 'starter', 'pro', 'team', 'enterprise'];
  return tierOrder.indexOf(targetTier) > tierOrder.indexOf(currentTier);
}

/** Check if subscription can be downgraded */
export function canDowngrade(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
  const tierOrder: SubscriptionTier[] = ['free', 'starter', 'pro', 'team', 'enterprise'];
  return tierOrder.indexOf(targetTier) < tierOrder.indexOf(currentTier);
}

/** Calculate usage percentage */
export function calculateUsagePercentage(used: number, limit: number): number {
  if (limit <= 0 || limit === 999) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/** Format card display */
export function formatCardDisplay(card: PaymentMethod): string {
  const brand = CARD_BRAND_CONFIG[card.brand || 'unknown'].name;
  return `${brand} •••• ${card.last4}`;
}

/** Get days until trial ends */
export function getDaysUntilTrialEnd(subscription: Subscription): number | null {
  if (!subscription.trialEnd) return null;
  const now = new Date();
  const trialEnd = new Date(subscription.trialEnd);
  const diff = trialEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default Subscription;