/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminSubscriptions.ts
// PURPOSE: Admin hooks - subscriptions management
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminSubscriptionsService } from '@/services/api/admin/subscriptions.service';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface Subscription {
    id: string;
    userId: string;
    status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';
    tier: string;
    amount: number;
    interval: 'month' | 'year';
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    user: {
        name: string | null;
        email: string | null;
    };
}

// =============================================================================
// ADMIN SUBSCRIPTIONS HOOK
// =============================================================================

export function useAdminSubscriptions() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    // ==========================================================================
    // FETCH SUBSCRIPTIONS
    // ==========================================================================
    const subscriptionsQuery = useQuery({
        queryKey: queryKeys.admin.billing.subscriptions(),
        queryFn: async (): Promise<Subscription[]> => {
            return AdminSubscriptionsService.getSubscriptions() as any;
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        subscriptions: subscriptionsQuery.data ?? [],
        isLoading: subscriptionsQuery.isLoading,
        error: subscriptionsQuery.error,
        refetch: subscriptionsQuery.refetch,
    };
}

export default useAdminSubscriptions;
