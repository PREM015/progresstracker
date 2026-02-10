/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminPlatforms.ts
// PURPOSE: Admin hooks - platforms management
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

export interface Platform {
    id: string;
    name: string;
    category: string;
    isActive: boolean;
    syncStatus: string;
    lastSyncAt: string | null;
    _count: {
        userPlatforms: number;
    };
}

// =============================================================================
// ADMIN PLATFORMS HOOK
// =============================================================================

export function useAdminPlatforms() {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const isAdmin = session?.user?.isAdmin ?? false;

    // ==========================================================================
    // FETCH PLATFORMS
    // ==========================================================================
    const platformsQuery = useQuery({
        queryKey: queryKeys.admin.system(), // Using system key as platforms are system-wide config
        queryFn: async (): Promise<Platform[]> => {
            const response = await apiClient.get<any>('/admin/platforms');

            if (response.error) {
                return [];
            }

            const payload = response.data;

            if (Array.isArray(payload)) return payload;
            if (payload && payload.platforms && Array.isArray(payload.platforms)) return payload.platforms;
            if (payload && payload.data && Array.isArray(payload.data)) return payload.data;

            return [];
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    // ==========================================================================
    // TOGGLE PLATFORM
    // ==========================================================================
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const response = await apiClient.patch(`/admin/platforms/${id}`, { isActive });

            if (response.error) {
                throw new Error(response.error);
            }

            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.system() });
        },
    });

    const togglePlatform = useCallback(
        async (id: string, isActive: boolean) => {
            return toggleMutation.mutateAsync({ id, isActive });
        },
        [toggleMutation]
    );

    return useMemo(() => ({
        platforms: platformsQuery.data ?? [],
        isLoading: platformsQuery.isLoading,
        error: platformsQuery.error,

        // Actions
        togglePlatform,
        refetch: platformsQuery.refetch,

        // Mutation states
        isToggling: toggleMutation.isPending,
        toggleError: toggleMutation.error,
    }), [
        platformsQuery.data,
        platformsQuery.isLoading,
        platformsQuery.error,
        platformsQuery.refetch,
        togglePlatform,
        toggleMutation.isPending,
        toggleMutation.error
    ]);
}

export default useAdminPlatforms;
