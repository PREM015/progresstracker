/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminSystem.ts
// PURPOSE: Admin hooks - system settings management
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
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
            // The API currently returns the array directly based on SystemSettings.tsx component
            // But standardizing on ApiResponse structure if possible, or handling both is safer.
            // Based on SystemSettings.tsx: const data = await res.json(); setSettings(data || []);
            // Let's assume it returns the array directly for now as per the component code, 
            // but wrapper might be needed if the API changes to standard response format later.
            // Actually, let's verify if we can use apiClient which usually expects standard format.
            // If the existing API returns generic JSON, apiClient.get might wrap it or expect specific structure.
            // Let's use apiClient.get and see. Use 'any' for now to be safe with existing endpoint structure.

            const response = await apiClient.get<any>('/admin/system-settings');

            if (response.error) {
                return [];
            }

            const payload = response.data;

            // payload is the parsed JSON body
            if (Array.isArray(payload)) return payload;
            if (payload && payload.data && Array.isArray(payload.data)) return payload.data;

            return [];
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    // ==========================================================================
    // UPDATE SETTING
    // ==========================================================================
    const updateMutation = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: string }) => {
            const response = await apiClient.patch(`/admin/system-settings/${key}`, { value });

            if (response.error) {
                throw new Error(response.error);
            }

            return response.data;
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
