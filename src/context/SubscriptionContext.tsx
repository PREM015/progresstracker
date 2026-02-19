'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SubscriptionService, Subscription } from '@/services/api/subscription.service';
// import { Subscription } from '@prisma/client'; // Removed to avoid type mismatch
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

/**
 * Subscription Context
 * 
 * @description Provides subscription state and actions across the app
 * @created 2026-01-26
 */

// Define safe types if Prisma types aren't directly available or too heavy
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE';

interface SubscriptionState {
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  tier: SubscriptionTier;
  isPro: boolean;
  checkAccess: (requiredTier: SubscriptionTier) => boolean;
}

interface SubscriptionActions {
  refresh: () => Promise<void>;
}

interface SubscriptionContextValue extends SubscriptionState, SubscriptionActions { }

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

const TIER_LEVELS: Record<SubscriptionTier, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  TEAM: 3,
  ENTERPRISE: 4,
};

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await SubscriptionService.getCurrent();
      setSubscription(data);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      // Don't toast on initial load to avoid annoyance, maybe only rely on error state
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      refresh();
    } else if (status === 'unauthenticated') {
      setSubscription(null);
      setIsLoading(false);
    }
  }, [status, refresh]);

  const tier = (subscription?.tier as SubscriptionTier) || 'FREE';
  const isPro = TIER_LEVELS[tier] >= TIER_LEVELS['PRO'];

  const checkAccess = useCallback((requiredTier: SubscriptionTier) => {
    if (!subscription) return requiredTier === 'FREE';
    // Using current tier from state which relies on subscription object
    const currentTier = (subscription.tier as SubscriptionTier) || 'FREE';
    return TIER_LEVELS[currentTier] >= TIER_LEVELS[requiredTier];
  }, [subscription]);

  const value: SubscriptionContextValue = {
    subscription,
    isLoading,
    error,
    tier,
    isPro,
    checkAccess,
    refresh,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }

  return context;
}

export default SubscriptionContext;
