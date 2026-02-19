// src/services/stripeService.ts

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {
  SubscriptionStatus,
  SubscriptionTier,
  BillingInterval,
  PaymentStatus,
  Subscription,
  Invoice,
  PaymentMethod,
  PaymentEvent,
  Prisma,
} from '@prisma/client';

// ============================================================================
// TYPES - Matching Prisma Schema EXACTLY
// ============================================================================

export type SubscriptionData = Subscription;

export interface CreateSubscriptionInput {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  billingInterval?: BillingInterval;
  priceAmount?: number;
  currency?: string;
  trialDays?: number;
}

export interface UpdateSubscriptionInput {
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  billingInterval?: BillingInterval;
  priceAmount?: number;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: Date;
  canceledAt?: Date;
  cancelReason?: string;
  cancelFeedback?: string;
  pausedAt?: Date;
  resumesAt?: Date;
  features?: string[];
}

export type InvoiceData = Invoice;

export type PaymentMethodData = PaymentMethod;

export interface CreatePaymentMethodInput {
  stripePaymentMethodId: string;
  type: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingAddress?: Prisma.InputJsonValue;
}

export type PaymentEventData = PaymentEvent;

export interface CreateInvoiceInput {
  subscriptionId?: string;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  invoiceNumber?: string;
  subtotal: number;
  tax?: number;
  total: number;
  amountDue: number;
  currency?: string;
  status: string;
  invoiceDate: Date;
  dueDate?: Date;
  lineItems?: Prisma.InputJsonValue;
  invoicePdfUrl?: string;
  hostedInvoiceUrl?: string;
  billingReason?: string;
}

// ============================================================================
// TIER LIMITS CONFIGURATION
// ============================================================================

interface TierLimitConfig {
  platformLimit: number;
  syncFrequencyMinutes: number;
  exportLimitMonthly: number;
  apiRequestsDaily: number;
  features: string[];
}

const TIER_LIMITS: Record<SubscriptionTier, TierLimitConfig> = {
  FREE: {
    platformLimit: 3,
    syncFrequencyMinutes: 1440,
    exportLimitMonthly: 1,
    apiRequestsDaily: 50,
    features: ['basic_tracking', 'manual_sync'],
  },
  STARTER: {
    platformLimit: 5,
    syncFrequencyMinutes: 720,
    exportLimitMonthly: 5,
    apiRequestsDaily: 200,
    features: [
      'basic_tracking',
      'manual_sync',
      'auto_sync',
      'basic_analytics',
    ],
  },
  PRO: {
    platformLimit: 15,
    syncFrequencyMinutes: 60,
    exportLimitMonthly: 25,
    apiRequestsDaily: 1000,
    features: [
      'basic_tracking',
      'manual_sync',
      'auto_sync',
      'advanced_analytics',
      'goals',
      'achievements',
      'api_access',
    ],
  },
  TEAM: {
    platformLimit: 50,
    syncFrequencyMinutes: 30,
    exportLimitMonthly: 100,
    apiRequestsDaily: 5000,
    features: [
      'basic_tracking',
      'manual_sync',
      'auto_sync',
      'advanced_analytics',
      'goals',
      'achievements',
      'api_access',
      'team_features',
      'priority_support',
    ],
  },
  ENTERPRISE: {
    platformLimit: -1,
    syncFrequencyMinutes: 5,
    exportLimitMonthly: -1,
    apiRequestsDaily: -1,
    features: ['all'],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tier limits with proper type safety
 */
function getTierLimitConfig(tier: SubscriptionTier): TierLimitConfig {
  return TIER_LIMITS[tier];
}

/**
 * Calculate trial end date
 */
function calculateTrialEndDate(trialDays: number): Date {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + trialDays);
  return trialEnd;
}

/**
 * Determine initial subscription status
 */
function getInitialStatus(trialDays?: number): SubscriptionStatus {
  return trialDays ? 'TRIALING' : 'ACTIVE';
}

/**
 * Serialize billing address - only set if provided
 */
function serializeBillingAddress(
  address?: Prisma.InputJsonValue
): Prisma.InputJsonValue | undefined {
  if (!address) return undefined;
  return address;
}

/**
 * Serialize line items - only set if provided
 */
function serializeLineItems(
  lineItems?: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>
): Prisma.InputJsonValue | undefined {
  if (!lineItems || lineItems.length === 0) return undefined;
  return { items: lineItems };
}

/**
 * Serialize raw data - only set if provided
 */
function serializeRawData(
  rawData?: Record<string, unknown>
): Prisma.InputJsonValue | undefined {
  if (!rawData || Object.keys(rawData).length === 0) return undefined;
  return rawData as Prisma.InputJsonValue;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class StripeService {
  private readonly log = logger.child({ service: 'StripeService' });

  // ==========================================================================
  // SUBSCRIPTION METHODS
  // ==========================================================================

  /**
   * Get user subscription
   */
  async getSubscription(userId: string): Promise<SubscriptionData | null> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      return subscription;
    } catch (error) {
      this.log.error('Error getting subscription', { userId, error });
      throw error;
    }
  }

  /**
   * Create or get subscription for user
   */
  async getOrCreateSubscription(userId: string): Promise<SubscriptionData> {
    try {
      let subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        const limits = getTierLimitConfig('FREE');
        subscription = await prisma.subscription.create({
          data: {
            userId,
            tier: 'FREE',
            status: 'ACTIVE',
            billingInterval: 'MONTHLY',
            currency: 'usd',
            platformLimit: limits.platformLimit,
            syncFrequencyMinutes: limits.syncFrequencyMinutes,
            exportLimitMonthly: limits.exportLimitMonthly,
            apiRequestsDaily: limits.apiRequestsDaily,
            features: limits.features,
          },
        });

        this.log.info('Created default FREE subscription', { userId });
      }

      return subscription;
    } catch (error) {
      this.log.error('Error getting/creating subscription', { userId, error });
      throw error;
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(
    userId: string,
    data: CreateSubscriptionInput
  ): Promise<SubscriptionData> {
    try {
      const tier = data.tier ?? 'FREE';
      const limits = getTierLimitConfig(tier);

      const trialStart = data.trialDays ? new Date() : null;
      const trialEnd = data.trialDays ? calculateTrialEndDate(data.trialDays) : null;
      const status = data.status ?? getInitialStatus(data.trialDays);

      const subscription = await prisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          stripePriceId: data.stripePriceId,
          stripeProductId: data.stripeProductId,
          tier,
          status,
          billingInterval: data.billingInterval ?? 'MONTHLY',
          priceAmount: data.priceAmount,
          currency: data.currency ?? 'usd',
          trialStart,
          trialEnd,
          trialDays: data.trialDays,
          platformLimit: limits.platformLimit,
          syncFrequencyMinutes: limits.syncFrequencyMinutes,
          exportLimitMonthly: limits.exportLimitMonthly,
          apiRequestsDaily: limits.apiRequestsDaily,
          features: limits.features,
        },
      });

      this.log.info('Created subscription', { userId, tier });
      return subscription;
    } catch (error) {
      this.log.error('Error creating subscription', { userId, error });
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    userId: string,
    data: UpdateSubscriptionInput
  ): Promise<SubscriptionData> {
    try {
      type SubscriptionUpdateInput = Prisma.SubscriptionUpdateInput;
      const updateData: SubscriptionUpdateInput = {};

      if (data.stripeSubscriptionId !== undefined)
        updateData.stripeSubscriptionId = data.stripeSubscriptionId;
      if (data.stripePriceId !== undefined) updateData.stripePriceId = data.stripePriceId;
      if (data.stripeProductId !== undefined)
        updateData.stripeProductId = data.stripeProductId;
      if (data.tier !== undefined) {
        updateData.tier = data.tier;
        const limits = getTierLimitConfig(data.tier);
        updateData.platformLimit = limits.platformLimit;
        updateData.syncFrequencyMinutes = limits.syncFrequencyMinutes;
        updateData.exportLimitMonthly = limits.exportLimitMonthly;
        updateData.apiRequestsDaily = limits.apiRequestsDaily;
        updateData.features = limits.features;
      }
      if (data.status !== undefined) updateData.status = data.status;
      if (data.billingInterval !== undefined) updateData.billingInterval = data.billingInterval;
      if (data.priceAmount !== undefined) updateData.priceAmount = data.priceAmount;
      if (data.currentPeriodStart !== undefined)
        updateData.currentPeriodStart = data.currentPeriodStart;
      if (data.currentPeriodEnd !== undefined) updateData.currentPeriodEnd = data.currentPeriodEnd;
      if (data.cancelAtPeriodEnd !== undefined)
        updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
      if (data.cancelAt !== undefined) updateData.cancelAt = data.cancelAt;
      if (data.canceledAt !== undefined) updateData.canceledAt = data.canceledAt;
      if (data.cancelReason !== undefined) updateData.cancelReason = data.cancelReason;
      if (data.cancelFeedback !== undefined) updateData.cancelFeedback = data.cancelFeedback;
      if (data.pausedAt !== undefined) updateData.pausedAt = data.pausedAt;
      if (data.resumesAt !== undefined) updateData.resumesAt = data.resumesAt;
      if (data.features !== undefined) updateData.features = data.features;

      const subscription = await prisma.subscription.update({
        where: { userId },
        data: updateData,
      });

      this.log.info('Updated subscription', { userId, tier: data.tier });
      return subscription;
    } catch (error) {
      this.log.error('Error updating subscription', { userId, error });
      throw error;
    }
  }

  /**
   * Upgrade subscription tier
   */
  async upgradeTier(
    userId: string,
    newTier: SubscriptionTier,
    stripeSubscriptionId?: string,
    stripePriceId?: string
  ): Promise<SubscriptionData> {
    try {
      const limits = getTierLimitConfig(newTier);

      const subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          tier: newTier,
          stripeSubscriptionId,
          stripePriceId,
          status: 'ACTIVE',
          platformLimit: limits.platformLimit,
          syncFrequencyMinutes: limits.syncFrequencyMinutes,
          exportLimitMonthly: limits.exportLimitMonthly,
          apiRequestsDaily: limits.apiRequestsDaily,
          features: limits.features,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SUBSCRIPTION_CHANGE',
          category: 'billing',
          entityType: 'subscription',
          entityId: subscription.id,
          description: `Upgraded to ${newTier} tier`,
          newValue: { tier: newTier },
        },
      });

      this.log.info('Upgraded subscription tier', { userId, newTier });
      return subscription;
    } catch (error) {
      this.log.error('Error upgrading subscription', { userId, newTier, error });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    userId: string,
    reason?: string,
    feedback?: string,
    cancelImmediately: boolean = false
  ): Promise<SubscriptionData> {
    try {
      type SubscriptionUpdateInput = Prisma.SubscriptionUpdateInput;
      const updateData: SubscriptionUpdateInput = {
        cancelReason: reason,
        cancelFeedback: feedback,
      };

      if (cancelImmediately) {
        updateData.status = 'CANCELLED';
        updateData.canceledAt = new Date();
      } else {
        updateData.cancelAtPeriodEnd = true;
        updateData.cancelAt = new Date();
      }

      const subscription = await prisma.subscription.update({
        where: { userId },
        data: updateData,
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SUBSCRIPTION_CHANGE',
          category: 'billing',
          entityType: 'subscription',
          entityId: subscription.id,
          description: 'Subscription cancelled',
          newValue: { reason, cancelImmediately },
        },
      });

      this.log.info('Cancelled subscription', { userId, cancelImmediately });
      return subscription;
    } catch (error) {
      this.log.error('Error cancelling subscription', { userId, error });
      throw error;
    }
  }

  /**
   * Resume cancelled subscription
   */
  async resumeSubscription(userId: string): Promise<SubscriptionData> {
    try {
      const subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: false,
          cancelAt: null,
          pausedAt: null,
          resumesAt: null,
          status: 'ACTIVE',
        },
      });

      this.log.info('Resumed subscription', { userId });
      return subscription;
    } catch (error) {
      this.log.error('Error resuming subscription', { userId, error });
      throw error;
    }
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(userId: string, resumeDate?: Date): Promise<SubscriptionData> {
    try {
      const subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
          resumesAt: resumeDate,
        },
      });

      this.log.info('Paused subscription', { userId });
      return subscription;
    } catch (error) {
      this.log.error('Error pausing subscription', { userId, error });
      throw error;
    }
  }

  // ==========================================================================
  // USAGE TRACKING
  // ==========================================================================

  /**
   * Increment platform count
   */
  async incrementPlatformCount(userId: string): Promise<void> {
    try {
      await prisma.subscription.update({
        where: { userId },
        data: {
          currentPlatformCount: { increment: 1 },
        },
      });
    } catch (error) {
      this.log.error('Error incrementing platform count', { userId, error });
      throw error;
    }
  }

  /**
   * Decrement platform count
   */
  async decrementPlatformCount(userId: string): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        select: { currentPlatformCount: true },
      });

      if (subscription && subscription.currentPlatformCount > 0) {
        await prisma.subscription.update({
          where: { userId },
          data: {
            currentPlatformCount: { decrement: 1 },
          },
        });
      }
    } catch (error) {
      this.log.error('Error decrementing platform count', { userId, error });
      throw error;
    }
  }

  /**
   * Increment export count
   */
  async incrementExportCount(userId: string): Promise<void> {
    try {
      await prisma.subscription.update({
        where: { userId },
        data: {
          currentExportCount: { increment: 1 },
        },
      });
    } catch (error) {
      this.log.error('Error incrementing export count', { userId, error });
      throw error;
    }
  }

  /**
   * Check if user can add more platforms
   */
  async canAddPlatform(userId: string): Promise<boolean> {
    try {
      // Bypass limit in development for testing
      if (process.env.NODE_ENV === 'development') {
        return true;
      }

      const subscription = await this.getOrCreateSubscription(userId);

      if (subscription.platformLimit === -1) {
        return true;
      }

      return subscription.currentPlatformCount < subscription.platformLimit;
    } catch (error) {
      this.log.error('Error checking platform limit', { userId, error });
      return false;
    }
  }

  /**
   * Check if user can export
   */
  async canExport(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getOrCreateSubscription(userId);

      if (subscription.exportLimitMonthly === -1) {
        return true;
      }

      return subscription.currentExportCount < subscription.exportLimitMonthly;
    } catch (error) {
      this.log.error('Error checking export limit', { userId, error });
      return false;
    }
  }

  /**
   * Reset monthly usage counters
   */
  async resetMonthlyUsage(userId: string): Promise<void> {
    try {
      await prisma.subscription.update({
        where: { userId },
        data: {
          currentExportCount: 0,
          usageResetAt: new Date(),
        },
      });

      this.log.info('Reset monthly usage', { userId });
    } catch (error) {
      this.log.error('Error resetting monthly usage', { userId, error });
      throw error;
    }
  }

  // ==========================================================================
  // PAYMENT METHODS
  // ==========================================================================

  /**
   * Get payment methods for user
   */
  async getPaymentMethods(userId: string): Promise<PaymentMethodData[]> {
    try {
      const methods = await prisma.paymentMethod.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      return methods;
    } catch (error) {
      this.log.error('Error getting payment methods', { userId, error });
      throw error;
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(
    userId: string,
    data: CreatePaymentMethodInput
  ): Promise<PaymentMethodData> {
    try {
      if (data.isDefault) {
        await prisma.paymentMethod.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const method = await prisma.paymentMethod.create({
        data: {
          userId,
          stripePaymentMethodId: data.stripePaymentMethodId,
          type: data.type,
          brand: data.brand,
          last4: data.last4,
          expMonth: data.expMonth,
          expYear: data.expYear,
          isDefault: data.isDefault ?? false,
          isValid: true,
          billingName: data.billingName,
          billingEmail: data.billingEmail,
          billingAddress: serializeBillingAddress(data.billingAddress),
        },
      });

      this.log.info('Added payment method', { userId });
      return method;
    } catch (error) {
      this.log.error('Error adding payment method', { userId, error });
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<PaymentMethodData> {
    try {
      await prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      const method = await prisma.paymentMethod.update({
        where: { id: paymentMethodId },
        data: { isDefault: true },
      });

      this.log.info('Set default payment method', { userId });
      return method;
    } catch (error) {
      this.log.error('Error setting default payment method', { userId, error });
      throw error;
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      await prisma.paymentMethod.delete({
        where: {
          id: paymentMethodId,
          userId,
        },
      });

      this.log.info('Removed payment method', { userId, paymentMethodId });
    } catch (error) {
      this.log.error('Error removing payment method', { userId, error });
      throw error;
    }
  }

  // ==========================================================================
  // INVOICES
  // ==========================================================================

  /**
   * Get invoices for user
   */
  async getInvoices(userId: string, limit: number = 10): Promise<InvoiceData[]> {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { userId },
        orderBy: { invoiceDate: 'desc' },
        take: limit,
      });

      return invoices;
    } catch (error) {
      this.log.error('Error getting invoices', { userId, error });
      throw error;
    }
  }

  /**
   * Create invoice record
   */
  async createInvoice(userId: string, data: CreateInvoiceInput): Promise<InvoiceData> {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          userId,
          subscriptionId: data.subscriptionId,
          stripeInvoiceId: data.stripeInvoiceId,
          stripePaymentIntentId: data.stripePaymentIntentId,
          invoiceNumber: data.invoiceNumber,
          subtotal: data.subtotal,
          tax: data.tax ?? 0,
          total: data.total,
          amountPaid: 0,
          amountDue: data.amountDue,
          currency: data.currency ?? 'usd',
          status: data.status,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          lineItems: serializeLineItems(
            Array.isArray(data.lineItems)
              ? (data.lineItems as Array<{
                description: string;
                amount: number;
                quantity: number;
              }>)
              : undefined
          ),
          invoicePdfUrl: data.invoicePdfUrl,
          hostedInvoiceUrl: data.hostedInvoiceUrl,
          billingReason: data.billingReason,
        },
      });

      this.log.info('Created invoice', { userId, invoiceId: invoice.id });
      return invoice;
    } catch (error) {
      this.log.error('Error creating invoice', { userId, error });
      throw error;
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    stripeInvoiceId: string,
    status: string,
    paidAt?: Date,
    amountPaid?: number
  ): Promise<InvoiceData | null> {
    try {
      type InvoiceUpdateInput = Prisma.InvoiceUpdateInput;
      const updateData: InvoiceUpdateInput = { status };

      if (paidAt) {
        updateData.paidAt = paidAt;
      }

      if (typeof amountPaid === 'number') {
        updateData.amountPaid = amountPaid;
        updateData.amountDue = 0;
      }

      const invoice = await prisma.invoice.update({
        where: { stripeInvoiceId },
        data: updateData,
      });

      this.log.info('Updated invoice status', { stripeInvoiceId, status });
      return invoice;
    } catch (error) {
      this.log.error('Error updating invoice status', { stripeInvoiceId, error });
      return null;
    }
  }

  // ==========================================================================
  // PAYMENT EVENTS
  // ==========================================================================

  /**
   * Record payment event from Stripe webhook
   */
  async recordPaymentEvent(data: {
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
  }): Promise<PaymentEventData> {
    try {
      const event = await prisma.paymentEvent.create({
        data: {
          userId: data.userId,
          subscriptionId: data.subscriptionId,
          stripeEventId: data.stripeEventId,
          stripeEventType: data.stripeEventType,
          eventType: data.eventType,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          failureCode: data.failureCode,
          failureMessage: data.failureMessage,
          stripePaymentIntentId: data.stripePaymentIntentId,
          stripeInvoiceId: data.stripeInvoiceId,
          stripeChargeId: data.stripeChargeId,
          rawData: serializeRawData(data.rawData),
          processedAt: new Date(),
        },
      });

      this.log.info('Recorded payment event', {
        stripeEventId: data.stripeEventId,
        eventType: data.eventType,
      });
      return event;
    } catch (error) {
      this.log.error('Error recording payment event', { error });
      throw error;
    }
  }

  /**
   * Check if event already processed
   */
  async isEventProcessed(stripeEventId: string): Promise<boolean> {
    try {
      const event = await prisma.paymentEvent.findUnique({
        where: { stripeEventId },
        select: { id: true },
      });

      return !!event;
    } catch (error) {
      this.log.error('Error checking event processing', { stripeEventId, error });
      return false;
    }
  }

  // ==========================================================================
  // STRIPE CUSTOMER MANAGEMENT
  // ==========================================================================

  /**
   * Link Stripe customer to user
   */
  async linkStripeCustomer(
    userId: string,
    stripeCustomerId: string
  ): Promise<SubscriptionData> {
    try {
      const limits = getTierLimitConfig('FREE');

      const subscription = await prisma.subscription.upsert({
        where: { userId },
        update: { stripeCustomerId },
        create: {
          userId,
          stripeCustomerId,
          tier: 'FREE',
          status: 'ACTIVE',
          billingInterval: 'MONTHLY',
          currency: 'usd',
          platformLimit: limits.platformLimit,
          syncFrequencyMinutes: limits.syncFrequencyMinutes,
          exportLimitMonthly: limits.exportLimitMonthly,
          apiRequestsDaily: limits.apiRequestsDaily,
          features: limits.features,
        },
      });

      this.log.info('Linked Stripe customer', { userId, stripeCustomerId });
      return subscription;
    } catch (error) {
      this.log.error('Error linking Stripe customer', { userId, error });
      throw error;
    }
  }

  /**
   * Get user by Stripe customer ID
   */
  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<string | null> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeCustomerId },
        select: { userId: true },
      });

      return subscription?.userId ?? null;
    } catch (error) {
      this.log.error('Error getting user by Stripe customer', {
        stripeCustomerId,
        error,
      });
      return null;
    }
  }

  // ==========================================================================
  // FEATURE ACCESS
  // ==========================================================================

  /**
   * Check if user has access to a feature
   */
  async hasFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const subscription = await this.getOrCreateSubscription(userId);

      if (subscription.features.includes('all')) {
        return true;
      }

      return subscription.features.includes(feature);
    } catch (error) {
      this.log.error('Error checking feature access', { userId, feature, error });
      return false;
    }
  }

  /**
   * Get tier limits for user
   */
  async getTierLimits(userId: string): Promise<{
    tier: SubscriptionTier;
    platformLimit: number;
    syncFrequencyMinutes: number;
    exportLimitMonthly: number;
    apiRequestsDaily: number;
    currentPlatformCount: number;
    currentExportCount: number;
  }> {
    try {
      const subscription = await this.getOrCreateSubscription(userId);

      return {
        tier: subscription.tier,
        platformLimit: subscription.platformLimit,
        syncFrequencyMinutes: subscription.syncFrequencyMinutes,
        exportLimitMonthly: subscription.exportLimitMonthly,
        apiRequestsDaily: subscription.apiRequestsDaily,
        currentPlatformCount: subscription.currentPlatformCount,
        currentExportCount: subscription.currentExportCount,
      };
    } catch (error) {
      this.log.error('Error getting tier limits', { userId, error });
      throw error;
    }
  }

  /**
   * Get subscription status with detailed info
   */
  async getSubscriptionStatus(userId: string): Promise<{
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    isPastDue: boolean;
    isTrialing: boolean;
    isCancelled: boolean;
    isPaused: boolean;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    resumesAt: Date | null;
  }> {
    try {
      const subscription = await this.getOrCreateSubscription(userId);

      return {
        tier: subscription.tier,
        status: subscription.status,
        isPastDue: subscription.status === 'PAST_DUE',
        isTrialing: subscription.status === 'TRIALING',
        isCancelled: subscription.status === 'CANCELLED',
        isPaused: subscription.status === 'PAUSED',
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        resumesAt: subscription.resumesAt,
      };
    } catch (error) {
      this.log.error('Error getting subscription status', { userId, error });
      throw error;
    }
  }
}

export const stripeService = new StripeService();
export default stripeService;