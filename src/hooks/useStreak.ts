// ============================================================================
// FILE: src/hooks/useStreak.ts
// PURPOSE: Streak hook - current streak, history, freeze
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { StreakService } from '@/services/api/streak.service';
import { queryKeys } from './keys';
import type { StreakHistory } from '@/types/tracker';

// =============================================================================
// TYPES
// =============================================================================

interface StreakData {
  current: number;
  longest: number;
  startDate: Date | null;
  lastActivityDate: Date | null;
  freezeCount: number;
  freezeUsedAt: Date | null;
  isAtRisk: boolean;
  hoursUntilBreak: number | null;
}

interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  averageStreak: number;
  streakStartDate: Date | null;
  milestones: {
    days: number;
    reached: boolean;
    reachedAt?: Date;
  }[];
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useStreak() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH CURRENT STREAK
  // ==========================================================================
  const streakQuery = useQuery({
    queryKey: queryKeys.streak.current(),
    queryFn: () => StreakService.getCurrent(),
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // ==========================================================================
  // FETCH STREAK HISTORY
  // ==========================================================================
  const historyQuery = useQuery({
    queryKey: queryKeys.streak.history(),
    queryFn: () => StreakService.getHistory(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH STREAK STATS
  // ==========================================================================
  const statsQuery = useQuery({
    queryKey: queryKeys.streak.stats(),
    queryFn: () => StreakService.getStats(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // USE STREAK FREEZE
  // ==========================================================================
  const freezeMutation = useMutation({
    mutationKey: ['streak', 'freeze'],
    mutationFn: () => StreakService.useFreeze(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.streak.all });
    },
  });

  const useFreeze = useCallback(async () => {
    return freezeMutation.mutateAsync();
  }, [freezeMutation]);

  // ==========================================================================
  // CHECK STREAK STATUS
  // ==========================================================================
  const checkMutation = useMutation({
    mutationKey: ['streak', 'check'],
    mutationFn: () => StreakService.check(),
    onSuccess: (newStreak) => {
      queryClient.setQueryData(queryKeys.streak.current(), newStreak);
    },
  });

  const checkStreak = useCallback(async () => {
    return checkMutation.mutateAsync();
  }, [checkMutation]);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  const isStreakActive = useMemo(() => {
    return (streakQuery.data?.current ?? 0) > 0;
  }, [streakQuery.data]);

  const canUseFreeze = useMemo(() => {
    return (streakQuery.data?.freezeCount ?? 0) > 0;
  }, [streakQuery.data?.freezeCount]);

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    streak: streakQuery.data ?? null,
    history: historyQuery.data ?? [],
    stats: statsQuery.data ?? null,

    // Computed
    current: streakQuery.data?.current ?? 0,
    longest: streakQuery.data?.longest ?? 0,
    freezeCount: streakQuery.data?.freezeCount ?? 0,
    isAtRisk: streakQuery.data?.isAtRisk ?? false,
    hoursUntilBreak: streakQuery.data?.hoursUntilBreak ?? null,
    isStreakActive,
    canUseFreeze,

    // Loading states
    isLoading: streakQuery.isLoading,
    isLoadingHistory: historyQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,

    // Error states
    error: streakQuery.error,
    historyError: historyQuery.error,
    statsError: statsQuery.error,

    // Actions
    useFreeze,
    checkStreak,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.streak.all });
    },

    // Mutation states
    isUsingFreeze: freezeMutation.isPending,
    isChecking: checkMutation.isPending,

    // Mutation errors
    freezeError: freezeMutation.error,
    checkError: checkMutation.error,
  }), [
    streakQuery.data,
    streakQuery.isLoading,
    streakQuery.error,
    historyQuery.data,
    historyQuery.isLoading,
    historyQuery.error,
    statsQuery.data,
    statsQuery.isLoading,
    statsQuery.error,
    isStreakActive,
    canUseFreeze,
    useFreeze,
    checkStreak,
    freezeMutation.isPending,
    freezeMutation.error,
    checkMutation.isPending,
    checkMutation.error,
    queryClient,
  ]);
}

export default useStreak;