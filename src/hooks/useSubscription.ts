// ============================================================================
// FILE: src/hooks/useSubscription.ts
// PURPOSE: Subscription & billing hook - plans, invoices, usage
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { SubscriptionService } from '@/services/api/subscription.service';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE';
type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED';

interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  priceAmount: number | null;
  currency: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;

  // Limits
  platformLimit: number;
  syncFrequencyMinutes: number;
  exportLimitMonthly: number;
  apiRequestsDaily: number;

  // Usage
  currentPlatformCount: number;
  currentExportCount: number;

  // Features
  features: string[];
}

interface Plan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    platforms: number;
    syncFrequency: string;
    exports: number;
    apiRequests: number;
  };
  isPopular: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  status: string;
  total: number;
  currency: string;
  invoiceDate: Date;
  paidAt: Date | null;
  invoicePdfUrl: string | null;
}

interface PaymentMethod {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

interface UsageData {
  platforms: { used: number; limit: number; percentage: number };
  exports: { used: number; limit: number; percentage: number; resetsAt: Date };
  apiRequests: { used: number; limit: number; percentage: number; resetsAt: Date };
  storage: { used: number; limit: number; percentage: number };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate days until renewal from period end date
 * Returns null if no period end date
 */
function calculateDaysUntilRenewal(periodEnd: Date | null | undefined): number | null {
  if (!periodEnd) return null;
  const now = Date.now();
  const endTime = new Date(periodEnd).getTime();
  return Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useSubscription() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH CURRENT SUBSCRIPTION
  // ==========================================================================
  const subscriptionQuery = useQuery({
    queryKey: queryKeys.subscription.current(),
    queryFn: () => SubscriptionService.getCurrent(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH PLANS
  // ==========================================================================
  const plansQuery = useQuery({
    queryKey: queryKeys.subscription.plans(),
    queryFn: () => SubscriptionService.getPlans(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // ==========================================================================
  // FETCH INVOICES
  // ==========================================================================
  const invoicesQuery = useQuery({
    queryKey: queryKeys.subscription.invoices(),
    queryFn: () => SubscriptionService.getInvoices(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH PAYMENT METHODS
  // ==========================================================================
  const paymentMethodsQuery = useQuery({
    queryKey: queryKeys.subscription.paymentMethods(),
    queryFn: () => SubscriptionService.getPaymentMethods(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH USAGE
  // ==========================================================================
  const usageQuery = useQuery({
    queryKey: queryKeys.subscription.usage(),
    queryFn: () => SubscriptionService.getUsage(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  // ==========================================================================
  // CREATE CHECKOUT SESSION
  // ==========================================================================
  const checkoutMutation = useMutation({
    mutationKey: ['subscription', 'checkout'],
    mutationFn: ({ priceId, successUrl, cancelUrl }: { priceId: string; successUrl?: string; cancelUrl?: string }) =>
      SubscriptionService.createCheckout(priceId, successUrl, cancelUrl),
  });

  const createCheckout = useCallback(
    async (priceId: string, options?: { successUrl?: string; cancelUrl?: string }) => {
      const result = await checkoutMutation.mutateAsync({
        priceId,
        ...options
      });

      // Redirect to Stripe
      window.location.href = result.url;
    },
    [checkoutMutation]
  );

  // ==========================================================================
  // OPEN CUSTOMER PORTAL
  // ==========================================================================
  const portalMutation = useMutation({
    mutationKey: ['subscription', 'portal'],
    mutationFn: () => SubscriptionService.openCustomerPortal(),
  });

  const openCustomerPortal = useCallback(async () => {
    const result = await portalMutation.mutateAsync();
    window.location.href = result.url;
  }, [portalMutation]);

  // ==========================================================================
  // CANCEL SUBSCRIPTION
  // ==========================================================================
  const cancelMutation = useMutation({
    mutationKey: ['subscription', 'cancel'],
    mutationFn: (reason?: string) => SubscriptionService.cancel(reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.current() });
    },
  });

  const cancelSubscription = useCallback(
    async (reason?: string) => {
      return cancelMutation.mutateAsync(reason);
    },
    [cancelMutation]
  );

  // ==========================================================================
  // RESUME SUBSCRIPTION
  // ==========================================================================
  const resumeMutation = useMutation({
    mutationKey: ['subscription', 'resume'],
    mutationFn: () => SubscriptionService.resume(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.current() });
    },
  });

  const resumeSubscription = useCallback(async () => {
    return resumeMutation.mutateAsync();
  }, [resumeMutation]);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  const subscription = subscriptionQuery.data;
  const subscriptionTier = subscription?.tier;
  const subscriptionStatus = subscription?.status;
  const currentPeriodEnd = subscription?.currentPeriodEnd;

  const isPro = subscriptionTier === 'PRO' || subscriptionTier === 'TEAM' || subscriptionTier === 'ENTERPRISE';
  const isFree = !subscription || subscriptionTier === 'FREE';
  const isActive = subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIALING';
  const isCancelled = subscription?.cancelAtPeriodEnd ?? false;
  const isTrialing = subscriptionStatus === 'TRIALING';

  // Calculate days until renewal - computed fresh on each render
  // This is intentionally not memoized since Date.now() changes
  const daysUntilRenewal = calculateDaysUntilRenewal(currentPeriodEnd);

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    subscription,
    plans: plansQuery.data ?? [],
    invoices: invoicesQuery.data ?? [],
    paymentMethods: paymentMethodsQuery.data ?? [],
    usage: usageQuery.data ?? null,

    // Computed
    tier: subscriptionTier ?? 'FREE',
    isPro,
    isFree,
    isActive,
    isCancelled,
    isTrialing,
    daysUntilRenewal,

    // Loading states
    isLoading: subscriptionQuery.isLoading,
    isLoadingPlans: plansQuery.isLoading,
    isLoadingInvoices: invoicesQuery.isLoading,
    isLoadingPaymentMethods: paymentMethodsQuery.isLoading,
    isLoadingUsage: usageQuery.isLoading,

    // Error states
    error: subscriptionQuery.error,
    plansError: plansQuery.error,

    // Actions
    createCheckout,
    openCustomerPortal,
    cancelSubscription,
    resumeSubscription,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.all });
    },

    // Mutation states
    isCreatingCheckout: checkoutMutation.isPending,
    isOpeningPortal: portalMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isResuming: resumeMutation.isPending,

    // Convenience
    getPlanByTier: (tier: SubscriptionTier) => plansQuery.data?.find(p => p.tier === tier),
    canUpgrade: isFree || subscriptionTier === 'STARTER',
    canDowngrade: isPro,
  }), [
    subscription,
    subscriptionTier,
    plansQuery.data,
    plansQuery.isLoading,
    plansQuery.error,
    invoicesQuery.data,
    invoicesQuery.isLoading,
    paymentMethodsQuery.data,
    paymentMethodsQuery.isLoading,
    usageQuery.data,
    usageQuery.isLoading,
    subscriptionQuery.isLoading,
    subscriptionQuery.error,
    isPro,
    isFree,
    isActive,
    isCancelled,
    isTrialing,
    daysUntilRenewal,
    createCheckout,
    openCustomerPortal,
    cancelSubscription,
    resumeSubscription,
    checkoutMutation.isPending,
    portalMutation.isPending,
    cancelMutation.isPending,
    resumeMutation.isPending,
    queryClient,
  ]);
}

export default useSubscription;