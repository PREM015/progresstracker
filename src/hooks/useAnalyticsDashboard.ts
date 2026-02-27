'use client';

import useSWR from 'swr';
import { httpClient } from '@/lib/http-client';
import { useSession } from 'next-auth/react';
import { SWR_CONFIG } from '@/lib/swr-config';

// Re-export from canonical types location for backward compatibility
export type { UnifiedDashboardData } from '@/types/dashboard';
import type { UnifiedDashboardData } from '@/types/dashboard';

const fetcher = (url: string) => httpClient.get<UnifiedDashboardData>(url);

export function useAnalyticsDashboard() {
    const { status } = useSession();
    const isAuthenticated = status === 'authenticated';

    const { data, error, isLoading, isValidating, mutate } = useSWR(
        isAuthenticated ? '/dashboard/full' : null,
        fetcher,
        SWR_CONFIG
    );

    return {
        data,
        error,
        isLoading,
        isValidating,
        refresh: mutate,
    };
}
