// ============================================================================
// FILE: src/hooks/useLeaderboard.ts
// PURPOSE: Leaderboard hook - rankings, filters, user position
// ============================================================================

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { LeaderboardService, type LeaderboardPeriod } from '@/services/api/leaderboard.service';
import type { LeaderboardEntry, LeaderboardData, UserRank } from '@/services/api/leaderboard.service';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

type LeaderboardType = 'global' | 'friends' | 'platform' | 'category';

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useLeaderboard(
  type: LeaderboardType = 'global',
  period: LeaderboardPeriod = 'weekly',
  options?: {
    platformId?: string;
    category?: string;
    limit?: number;
  }
) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // Determine query key based on type
  const getQueryKey = () => {
    switch (type) {
      case 'global':
        return queryKeys.leaderboard.global(period);
      case 'friends':
        return queryKeys.leaderboard.friends();
      case 'platform':
        return queryKeys.leaderboard.platform(options?.platformId ?? '');
      case 'category':
        return queryKeys.leaderboard.category(options?.category ?? '');
      default:
        return queryKeys.leaderboard.global(period);
    }
  };

  // ==========================================================================
  // FETCH LEADERBOARD
  // ==========================================================================
  const leaderboardQuery = useQuery({
    queryKey: getQueryKey(),
    queryFn: async (): Promise<LeaderboardData> => {
      const limit = options?.limit ?? 50;

      switch (type) {
        case 'friends':
          return LeaderboardService.getFriends(period, limit);

        case 'platform':
          if (!options?.platformId) {
            throw new Error('Platform ID required for platform leaderboard');
          }
          return LeaderboardService.getPlatform(options.platformId, period, limit);

        case 'category':
          if (!options?.category) {
            throw new Error('Category required for category leaderboard');
          }
          return LeaderboardService.getCategory(options.category, period, limit);

        case 'global':
        default:
          return LeaderboardService.getGlobal(period, limit);
      }
    },
    enabled: isAuthenticated && (type !== 'platform' || !!options?.platformId),
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH USER'S RANK
  // ==========================================================================
  const rankQuery = useQuery({
    queryKey: queryKeys.leaderboard.myRank(),
    queryFn: async (): Promise<UserRank> => {
      return LeaderboardService.getMyRank(period);
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    entries: leaderboardQuery.data?.entries ?? [],
    total: leaderboardQuery.data?.total ?? 0,
    period: leaderboardQuery.data?.period ?? period,
    updatedAt: leaderboardQuery.data?.updatedAt ?? null,

    // User rank
    myRank: rankQuery.data ?? null,
    rank: rankQuery.data?.rank ?? null,
    percentile: rankQuery.data?.percentile ?? null,
    nearbyUsers: rankQuery.data?.nearbyUsers ?? [],

    // Loading states
    isLoading: leaderboardQuery.isLoading,
    isLoadingRank: rankQuery.isLoading,

    // Error states
    error: leaderboardQuery.error,
    rankError: rankQuery.error,

    // Refetch
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all });
    },

    // Convenience
    topThree: leaderboardQuery.data?.entries.slice(0, 3) ?? [],
    isInTopTen: (rankQuery.data?.rank ?? 999) <= 10,
    isInTopHundred: (rankQuery.data?.rank ?? 999) <= 100,
  }), [
    leaderboardQuery.data,
    leaderboardQuery.isLoading,
    leaderboardQuery.error,
    rankQuery.data,
    rankQuery.isLoading,
    rankQuery.error,
    period,
    queryClient,
  ]);
}

// =============================================================================
// PERIOD-SPECIFIC HOOKS
// =============================================================================

export function useDailyLeaderboard(limit?: number) {
  return useLeaderboard('global', 'daily', { limit });
}

export function useWeeklyLeaderboard(limit?: number) {
  return useLeaderboard('global', 'weekly', { limit });
}

export function useMonthlyLeaderboard(limit?: number) {
  return useLeaderboard('global', 'monthly', { limit });
}

export function useFriendsLeaderboard() {
  return useLeaderboard('friends', 'weekly');
}

export function usePlatformLeaderboard(platformId: string, period: LeaderboardPeriod = 'weekly') {
  return useLeaderboard('platform', period, { platformId });
}

export default useLeaderboard;