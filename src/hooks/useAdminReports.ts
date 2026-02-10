/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminReports.ts
// PURPOSE: Admin hooks - reports management
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface Report {
    id: string;
    name: string;
    type: string;
    status: string;
    url: string | null;
    createdAt: string;
    createdBy: string;
}

// =============================================================================
// ADMIN REPORTS HOOK
// =============================================================================

export function useAdminReports() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    // ==========================================================================
    // FETCH REPORTS
    // ==========================================================================
    const reportsQuery = useQuery({
        queryKey: queryKeys.admin.reports(),
        queryFn: async (): Promise<Report[]> => {
            const response = await apiClient.get<any>('/api/admin/reports'); // ApiClient handles base URL usually, but let's check current usage. 
            // In other hooks we used '/admin/...' without /api prefix if the apiClient adds it? 
            // Actually apiClient usually expects /admin/... if it's relative to API root.
            // Let's check other hooks. useAdminPlatforms uses '/admin/platforms'.
            // The existing fetch in ReportsList used '/api/admin/reports'.
            // If apiClient base is /api, then '/admin/reports' is correct.
            // Let's stick to the pattern used in other hooks: '/admin/reports'.

            const res = await apiClient.get<any>('/admin/reports');

            if (res.error) {
                return [];
            }

            const payload = res.data;
            if (Array.isArray(payload)) return payload;
            if (payload && payload.reports && Array.isArray(payload.reports)) return payload.reports;
            if (payload && payload.data && Array.isArray(payload.data)) return payload.data;

            return [];
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        reports: reportsQuery.data ?? [],
        isLoading: reportsQuery.isLoading,
        error: reportsQuery.error,
        refetch: reportsQuery.refetch,
    };
}

export default useAdminReports;
