/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminFeedback.ts
// PURPOSE: Admin hooks - feedback management
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface Feedback {
    id: string;
    message: string;
    type: 'BUG' | 'FEATURE' | 'GENERAL' | 'OTHER';
    user: {
        name: string | null;
        email: string | null;
    } | null;
    createdAt: string;
}

// =============================================================================
// ADMIN FEEDBACK HOOK
// =============================================================================

export function useAdminFeedback() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    // ==========================================================================
    // FETCH FEEDBACK
    // ==========================================================================
    const feedbackQuery = useQuery({
        queryKey: queryKeys.admin.feedback(),
        queryFn: async (): Promise<Feedback[]> => {
            const response = await apiClient.get<any>('/admin/feedback');

            if (response.error) {
                return [];
            }

            const payload = response.data;
            if (Array.isArray(payload)) return payload;
            if (payload && payload.feedback && Array.isArray(payload.feedback)) return payload.feedback;
            if (payload && payload.data && Array.isArray(payload.data)) return payload.data;

            return [];
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        feedback: feedbackQuery.data ?? [],
        isLoading: feedbackQuery.isLoading,
        error: feedbackQuery.error,
        refetch: feedbackQuery.refetch,
    };
}

export default useAdminFeedback;
