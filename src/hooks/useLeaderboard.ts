// ============================================================================
// FILE: src/hooks/useLeaderboard.ts
// PURPOSE: Leaderboard hook - rankings, filters, user position
// ============================================================================

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  score: number;
  problems: number;
  streak: number;
  change: number; // rank change from previous period
  isCurrentUser: boolean;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  total: number;
  period: string;
  updatedAt: Date;
}

interface UserRank {
  rank: number | null;
  percentile: number | null;
  score: number;
  change: number | null;
  nearbyUsers: LeaderboardEntry[];
}

type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
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
      const params: Record<string, string> = {
        period,
        limit: String(options?.limit ?? 50),
      };
      
      if (type === 'platform' && options?.platformId) {
        params.platformId = options.platformId;
      }
      if (type === 'category' && options?.category) {
        params.category = options.category;
      }
      
      const endpoint = type === 'friends' 
        ? '/leaderboard/friends' 
        : type === 'platform'
        ? `/leaderboard/platform/${options?.platformId}`
        : type === 'category'
        ? `/leaderboard/category/${options?.category}`
        : `/leaderboard/${period}`;
      
      const response = await apiClient.get<ApiResponse<{ leaderboard: LeaderboardData }>>(
        endpoint,
        params
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch leaderboard');
      }
      
      return response.data.data!.leaderboard;
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
      const response = await apiClient.get<ApiResponse<{ rank: UserRank }>>(
        '/leaderboard/rank',
        { period }
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch rank');
      }
      
      return response.data.data!.rank;
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