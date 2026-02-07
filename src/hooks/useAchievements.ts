/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAchievements.ts
// PURPOSE: Achievements hook - list, progress, unlock, pin
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';
import type {
  UserAchievement,
  AchievementProgress,
  AchievementStats,
  AchievementCategory,
  AchievementRarity,
} from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AchievementFilter {
  category?: AchievementCategory;
  rarity?: AchievementRarity;
  isUnlocked?: boolean;
  search?: string;
  [key: string]: any;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAchievements(filters: AchievementFilter = {}) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH ALL ACHIEVEMENTS (with user progress)
  // ==========================================================================
  const achievementsQuery = useQuery({
    queryKey: queryKeys.achievements.available(),
    queryFn: async (): Promise<AchievementProgress[]> => {
      const response = await apiClient.get<ApiResponse<{ achievements: AchievementProgress[] }>>(
        '/achievements/progress'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch achievements');
      }

      return response.data.data!.achievements;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Filter achievements based on filters
  const filteredAchievements = useMemo(() => {
    if (!achievementsQuery.data) return [];

    return achievementsQuery.data.filter(ap => {
      if (filters.category && ap.achievement.category !== filters.category) return false;
      if (filters.rarity && ap.achievement.rarity !== filters.rarity) return false;
      if (filters.isUnlocked !== undefined && ap.isUnlocked !== filters.isUnlocked) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          ap.achievement.title.toLowerCase().includes(search) ||
          ap.achievement.description.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [achievementsQuery.data, filters]);

  // ==========================================================================
  // FETCH UNLOCKED ACHIEVEMENTS
  // ==========================================================================
  const unlockedQuery = useQuery({
    queryKey: queryKeys.achievements.unlocked(),
    queryFn: async (): Promise<UserAchievement[]> => {
      const response = await apiClient.get<ApiResponse<{ achievements: UserAchievement[] }>>(
        '/achievements'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch unlocked achievements');
      }

      return response.data.data!.achievements;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH RECENT UNLOCKS
  // ==========================================================================
  const recentQuery = useQuery({
    queryKey: queryKeys.achievements.recent(),
    queryFn: async (): Promise<UserAchievement[]> => {
      const response = await apiClient.get<ApiResponse<{ achievements: UserAchievement[] }>>(
        '/achievements/recent',
        { limit: '10' }
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch recent achievements');
      }

      return response.data.data!.achievements;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH PINNED ACHIEVEMENTS
  // ==========================================================================
  const pinnedQuery = useQuery({
    queryKey: queryKeys.achievements.pinned(),
    queryFn: async (): Promise<UserAchievement[]> => {
      const response = await apiClient.get<ApiResponse<{ achievements: UserAchievement[] }>>(
        '/achievements/pinned'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch pinned achievements');
      }

      return response.data.data!.achievements;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH STATS
  // ==========================================================================
  const statsQuery = useQuery({
    queryKey: queryKeys.achievements.stats(),
    queryFn: async (): Promise<AchievementStats> => {
      const response = await apiClient.get<ApiResponse<{ stats: AchievementStats }>>(
        '/achievements/stats'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch achievement stats');
      }

      return response.data.data!.stats;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH CATEGORIES
  // ==========================================================================
  const categoriesQuery = useQuery({
    queryKey: queryKeys.achievements.categories(),
    queryFn: async (): Promise<{ category: AchievementCategory; count: number; unlocked: number }[]> => {
      const response = await apiClient.get<ApiResponse<{
        categories: { category: AchievementCategory; count: number; unlocked: number }[]
      }>>('/achievements/categories');

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch categories');
      }

      return response.data.data!.categories;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // PIN ACHIEVEMENT
  // ==========================================================================
  const pinMutation = useMutation({
    mutationKey: ['achievements', 'pin'],
    mutationFn: async (achievementId: string): Promise<UserAchievement> => {
      const response = await apiClient.post<ApiResponse<{ achievement: UserAchievement }>>(
        `/achievements/${achievementId}/pin`
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to pin achievement');
      }

      return response.data.data!.achievement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.pinned() });
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.unlocked() });
    },
  });

  const pinAchievement = useCallback(
    async (achievementId: string) => {
      return pinMutation.mutateAsync(achievementId);
    },
    [pinMutation]
  );

  // ==========================================================================
  // UNPIN ACHIEVEMENT
  // ==========================================================================
  const unpinMutation = useMutation({
    mutationKey: ['achievements', 'unpin'],
    mutationFn: async (achievementId: string): Promise<UserAchievement> => {
      const response = await apiClient.delete<ApiResponse<{ achievement: UserAchievement }>>(
        `/achievements/${achievementId}/pin`
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to unpin achievement');
      }

      return response.data.data!.achievement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.pinned() });
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.unlocked() });
    },
  });

  const unpinAchievement = useCallback(
    async (achievementId: string) => {
      return unpinMutation.mutateAsync(achievementId);
    },
    [unpinMutation]
  );

  // ==========================================================================
  // CHECK FOR NEW ACHIEVEMENTS
  // ==========================================================================
  const checkMutation = useMutation({
    mutationKey: ['achievements', 'check'],
    mutationFn: async (): Promise<UserAchievement[]> => {
      const response = await apiClient.post<ApiResponse<{ unlocked: UserAchievement[] }>>(
        '/achievements/check'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to check achievements');
      }

      return response.data.data!.unlocked;
    },
    onSuccess: (unlocked) => {
      if (unlocked.length > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.achievements.all });
      }
    },
  });

  const checkAchievements = useCallback(async () => {
    return checkMutation.mutateAsync();
  }, [checkMutation]);

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    achievements: filteredAchievements,
    allAchievements: achievementsQuery.data ?? [],
    unlocked: unlockedQuery.data ?? [],
    recent: recentQuery.data ?? [],
    pinned: pinnedQuery.data ?? [],
    stats: statsQuery.data ?? null,
    categories: categoriesQuery.data ?? [],

    // Loading states
    isLoading: achievementsQuery.isLoading,
    isLoadingUnlocked: unlockedQuery.isLoading,
    isLoadingRecent: recentQuery.isLoading,
    isLoadingPinned: pinnedQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,

    // Error states
    error: achievementsQuery.error,
    unlockedError: unlockedQuery.error,
    statsError: statsQuery.error,

    // Actions
    pinAchievement,
    unpinAchievement,
    checkAchievements,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.all });
    },

    // Mutation states
    isPinning: pinMutation.isPending,
    isUnpinning: unpinMutation.isPending,
    isChecking: checkMutation.isPending,

    // Convenience getters
    getById: (id: string) => achievementsQuery.data?.find(a => a.achievement.id === id),
    unlockedCount: unlockedQuery.data?.length ?? 0,
    totalCount: achievementsQuery.data?.length ?? 0,
    completionPercentage: statsQuery.data?.completionPercentage ?? 0,
    totalPoints: statsQuery.data?.points ?? 0,
  }), [
    filteredAchievements,
    achievementsQuery.data,
    achievementsQuery.isLoading,
    achievementsQuery.error,
    unlockedQuery.data,
    unlockedQuery.isLoading,
    unlockedQuery.error,
    recentQuery.data,
    recentQuery.isLoading,
    pinnedQuery.data,
    pinnedQuery.isLoading,
    statsQuery.data,
    statsQuery.isLoading,
    statsQuery.error,
    categoriesQuery.data,
    pinAchievement,
    unpinAchievement,
    checkAchievements,
    pinMutation.isPending,
    unpinMutation.isPending,
    checkMutation.isPending,
    queryClient,
  ]);
}

// =============================================================================
// SINGLE ACHIEVEMENT HOOK
// =============================================================================

export function useAchievement(id: string) {
  const query = useQuery({
    queryKey: queryKeys.achievements.byId(id),
    queryFn: async (): Promise<AchievementProgress> => {
      const response = await apiClient.get<ApiResponse<{ achievement: AchievementProgress }>>(
        `/achievements/${id}`
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Achievement not found');
      }

      return response.data.data!.achievement;
    },
    enabled: !!id,
  });

  return {
    achievement: query.data?.achievement ?? null,
    progress: query.data ?? null,
    isUnlocked: query.data?.isUnlocked ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useAchievements;