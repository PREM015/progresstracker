/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminBilling.ts
// PURPOSE: Admin hooks - billing management (stats, invoices, payment methods)
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface BillingStats {
    totalRevenue: number;
    activeSubscriptions: number;
    mrr: number;
    churnRate: number;
    lifetimeValue: number;
    pendingPayments: number;
    failedPayments: number;
    revenueGrowth: number;
}

export interface Invoice {
    id: string;
    number: string;
    customerEmail: string;
    customerName: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
    date: string;
    dueDate?: string;
    description?: string;
}

export interface PaymentMethod {
    id: string;
    type: string;
    last4: string;
    isDefault: boolean;
    expiryMonth?: number;
    expiryYear?: number;
}

// =============================================================================
// ADMIN BILLING HOOKS
// =============================================================================

export function useAdminBilling(period: 'month' | 'quarter' | 'year' = 'month') {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    // ==========================================================================
    // FETCH BILLING STATS
    // ==========================================================================
    const statsQuery = useQuery({
        queryKey: queryKeys.admin.billing.stats(period),
        queryFn: async (): Promise<BillingStats | null> => {
            const response = await apiClient.get<any>('/admin/billing', { period });

            if (response.error) {
                throw new Error(response.error);
            }

            return response.data || null;
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        stats: statsQuery.data,
        isLoading: statsQuery.isLoading,
        error: statsQuery.error,
        refetch: statsQuery.refetch,
    };
}

export function useAdminInvoices(status: 'all' | 'PAID' | 'PENDING' | 'FAILED' = 'all') {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const invoicesQuery = useQuery({
        queryKey: queryKeys.admin.billing.invoices(status),
        queryFn: async (): Promise<Invoice[]> => {
            const params: Record<string, string> = {};
            if (status !== 'all') params.status = status;

            const response = await apiClient.get<any>('/admin/billing/invoices', params);

            if (response.error) {
                return [];
            }

            return (response.data as Invoice[]) || [];
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        invoices: invoicesQuery.data ?? [],
        isLoading: invoicesQuery.isLoading,
        error: invoicesQuery.error,
        refetch: invoicesQuery.refetch
    };
}

export function useAdminPaymentMethods() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const query = useQuery({
        queryKey: queryKeys.admin.billing.paymentMethods(),
        queryFn: async (): Promise<PaymentMethod[]> => {
            const response = await apiClient.get<any>('/admin/billing/payment-methods');
            if (response.error) return [];
            return (response.data as PaymentMethod[]) || [];
        },
        enabled: isAdmin,
    });

    return {
        methods: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error
    };
}

export default useAdminBilling;
