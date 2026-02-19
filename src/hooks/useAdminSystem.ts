/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminSystem.ts
// PURPOSE: Admin hooks - system settings management
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { AdminSystemService } from '@/services/api/admin/system.service';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface SystemSetting {
    id: string;
    key: string;
    value: string;
    description: string | null;
    type: string;
    isPublic: boolean;
    updatedAt: string;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// =============================================================================
// ADMIN SYSTEM HOOK
// =============================================================================

export function useAdminSystem() {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const isAdmin = session?.user?.isAdmin ?? false;

    // ==========================================================================
    // FETCH SETTINGS
    // ==========================================================================
    const settingsQuery = useQuery({
        queryKey: queryKeys.admin.system(),
        queryFn: async (): Promise<SystemSetting[]> => {
            return AdminSystemService.getSettings() as any;
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    // ==========================================================================
    // UPDATE SETTING
    // ==========================================================================
    const updateMutation = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: string }) => {
            return AdminSystemService.updateSetting(key, value);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.system() });
        },
    });

    const updateSetting = useCallback(
        async (key: string, value: string) => {
            return updateMutation.mutateAsync({ key, value });
        },
        [updateMutation]
    );

    return useMemo(() => ({
        settings: settingsQuery.data ?? [],
        isLoading: settingsQuery.isLoading,
        error: settingsQuery.error,

        // Actions
        updateSetting,
        refetch: settingsQuery.refetch,

        // Mutation states
        isUpdating: updateMutation.isPending,
        updateError: updateMutation.error,
    }), [
        settingsQuery.data,
        settingsQuery.isLoading,
        settingsQuery.error,
        settingsQuery.refetch,
        updateSetting,
        updateMutation.isPending,
        updateMutation.error
    ]);
}

export default useAdminSystem;
