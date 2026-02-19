/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminReports.ts
// PURPOSE: Admin hooks - reports management
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminReportsService } from '@/services/api/admin/reports.service';
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
            return AdminReportsService.getReports() as any;
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
