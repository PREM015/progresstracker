/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminAnalytics.ts
// PURPOSE: Admin hooks - analytics data fetching
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface AnalyticsData {
    users: number;
    usersGrowth: number;
    activeUsers: number;
    activeRate: number;
    revenue: number;
    revenueGrowth: number;
    newSignups: number;
    signupsGrowth: number;
    retentionRate: number;
    avgSessionDuration: number;
    topPlatforms: Array<{ name: string; users: number }>;
    topFeatures: Array<{ name: string; usage: number }>;
}

export type TimeFrame = '7d' | '30d' | '90d';

// =============================================================================
// ADMIN ANALYTICS HOOK
// =============================================================================

export function useAdminAnalytics(timeFrame: TimeFrame = '30d') {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    // ==========================================================================
    // FETCH ANALYTICS
    // ==========================================================================
    const analyticsQuery = useQuery({
        queryKey: queryKeys.admin.analytics(timeFrame),
        queryFn: async (): Promise<AnalyticsData | null> => {
            const response = await apiClient.get<any>('/admin/analytics', { timeFrame });

            if (response.error) {
                throw new Error(response.error);
            }

            const payload = response.data;
            if (payload && (payload.users !== undefined || payload.stats)) return payload.stats || payload;

            return null;
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        data: analyticsQuery.data ?? null,
        isLoading: analyticsQuery.isLoading,
        error: analyticsQuery.error,
        refetch: analyticsQuery.refetch,
    };
}

export default useAdminAnalytics;
