/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminGamification.ts
// PURPOSE: Admin hooks - gamification management (achievements)
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    points: number;
    rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    category: 'GENERAL' | 'STREAK' | 'GOALS' | 'SOCIAL';
    requirementType: 'COUNT' | 'TIME' | 'CUSTOM';
    requirementValue: number;
    createdAt?: string;
    updatedAt?: string;
}

export type AchievementInput = Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>;

// =============================================================================
// ADMIN GAMIFICATION HOOKS
// =============================================================================

export function useAdminAchievements() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.admin.gamification.achievements(),
        queryFn: async (): Promise<Achievement[]> => {
            const response = await apiClient.get<any>('/admin/achievements');

            if (response.error) {
                return [];
            }

            const payload = response.data;
            if (Array.isArray(payload)) return payload;
            if (payload && payload.achievements && Array.isArray(payload.achievements)) return payload.achievements;

            return [];
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: async (data: AchievementInput) => {
            return await apiClient.post<Achievement>('/admin/achievements', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.gamification.achievements() });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<AchievementInput> }) => {
            return await apiClient.patch<Achievement>(`/admin/achievements/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.gamification.achievements() });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.delete<void>(`/admin/achievements/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.gamification.achievements() });
        },
    });

    return {
        achievements: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        createAchievement: createMutation.mutateAsync,
        updateAchievement: updateMutation.mutateAsync,
        deleteAchievement: deleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}

export function useAdminAchievementStats() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const query = useQuery({
        queryKey: queryKeys.admin.gamification.stats(),
        queryFn: async () => {
            const response = await apiClient.get<any>('/admin/achievements/stats');
            if (response.error) return null;
            return response.data;
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        stats: query.data,
        isLoading: query.isLoading,
        error: query.error,
    };
}

export default useAdminAchievements;
