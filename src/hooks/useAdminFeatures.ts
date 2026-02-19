/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminFeatures.ts
// PURPOSE: Admin hooks - feature flags management
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { AdminFeaturesService } from '@/services/api/admin/features.service';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description: string | null;
    isEnabled: boolean;
    rolloutPercentage: number;
    rolloutStrategy: string;
    enabledTiers: string[];
    enabledUserIds: string[];
    createdAt: string;
    updatedAt: string;
}

// =============================================================================
// ADMIN FEATURES HOOK
// =============================================================================

export function useAdminFeatures() {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const isAdmin = session?.user?.isAdmin ?? false;

    // ==========================================================================
    // FETCH FLAGS
    // ==========================================================================
    // ==========================================================================
    // FETCH FLAGS
    // ==========================================================================
    const flagsQuery = useQuery({
        queryKey: queryKeys.admin.features.list(),
        queryFn: async (): Promise<FeatureFlag[]> => {
            return AdminFeaturesService.getFlags();
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    // ==========================================================================
    // CREATE FLAG
    // ==========================================================================
    const createMutation = useMutation({
        mutationFn: async (data: Partial<FeatureFlag>) => {
            return AdminFeaturesService.createFlag(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.features.list() });
        },
    });

    // ==========================================================================
    // UPDATE FLAG
    // ==========================================================================
    const updateMutation = useMutation({
        mutationFn: async ({ key, data }: { key: string; data: Partial<FeatureFlag> }) => {
            return AdminFeaturesService.updateFlag(key, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.features.list() });
        },
    });

    // ==========================================================================
    // TOGGLE FLAG
    // ==========================================================================
    const toggleMutation = useMutation({
        mutationFn: async ({ key, isEnabled }: { key: string; isEnabled: boolean }) => {
            return AdminFeaturesService.updateFlag(key, { isEnabled });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.features.list() });
        },
    });

    const toggleFlag = useCallback(
        async (key: string, isEnabled: boolean) => {
            return toggleMutation.mutateAsync({ key, isEnabled });
        },
        [toggleMutation]
    );

    // ==========================================================================
    // DELETE FLAG
    // ==========================================================================
    const deleteMutation = useMutation({
        mutationFn: async (key: string) => {
            return AdminFeaturesService.deleteFlag(key);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.features.list() });
        },
    });

    const deleteFlag = useCallback(
        async (key: string) => {
            return deleteMutation.mutateAsync(key);
        },
        [deleteMutation]
    );

    return useMemo(() => ({
        flags: flagsQuery.data ?? [],
        isLoading: flagsQuery.isLoading,
        error: flagsQuery.error,

        // Actions
        createFlag: createMutation.mutateAsync,
        updateFlag: updateMutation.mutateAsync,
        toggleFlag,
        deleteFlag,
        refetch: flagsQuery.refetch,

        // Mutation states
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isToggling: toggleMutation.isPending,
        isDeleting: deleteMutation.isPending,
    }), [
        flagsQuery.data,
        flagsQuery.isLoading,
        flagsQuery.error,
        flagsQuery.refetch,
        createMutation.mutateAsync,
        createMutation.isPending,
        updateMutation.mutateAsync,
        updateMutation.isPending,
        toggleFlag,
        deleteFlag,
        toggleMutation.isPending,
        deleteMutation.isPending
    ]);
}

export default useAdminFeatures;
