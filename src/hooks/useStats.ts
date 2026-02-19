// ============================================================================
// FILE: src/hooks/useStats.ts
// PURPOSE: Dashboard stats hook - overview, trends, analytics
// ============================================================================

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { DashboardService } from '@/services/api/dashboard.service';
import { DashboardStats, OverviewStats, TrendStats, HeatmapStats } from '@/types/dashboard';
import { queryKeys } from './keys';

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useStats() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH DASHBOARD STATS
  // ==========================================================================
  const dashboardQuery = useQuery({
    queryKey: queryKeys.stats.dashboard(),
    queryFn: () => DashboardService.getDashboardStats(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // ==========================================================================
  // FETCH OVERVIEW STATS
  // ==========================================================================
  const overviewQuery = useQuery({
    queryKey: queryKeys.stats.overview('7d'),
    queryFn: () => DashboardService.getOverview('7d'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH WEEKLY STATS
  // ==========================================================================
  const weeklyQuery = useQuery({
    queryKey: queryKeys.stats.weekly(),
    queryFn: () => DashboardService.getWeekly(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH MONTHLY STATS
  // ==========================================================================
  const monthlyQuery = useQuery({
    queryKey: queryKeys.stats.monthly(),
    queryFn: () => DashboardService.getMonthly(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH TRENDS
  // ==========================================================================
  const trendsQuery = useQuery({
    queryKey: queryKeys.stats.trends('30d'),
    queryFn: () => DashboardService.getTrends('30d'),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH HEATMAP
  // ==========================================================================
  const heatmapQuery = useQuery({
    queryKey: queryKeys.stats.heatmap(new Date().getFullYear()),
    queryFn: () => DashboardService.getHeatmap(new Date().getFullYear()),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    dashboard: dashboardQuery.data ?? null,
    overview: overviewQuery.data ?? null,
    weekly: weeklyQuery.data ?? null,
    monthly: monthlyQuery.data ?? null,
    trends: trendsQuery.data ?? null,
    heatmap: heatmapQuery.data?.points ?? [],
    heatmapStats: heatmapQuery.data ?? null,

    // Loading states
    isLoading: dashboardQuery.isLoading,
    isLoadingOverview: overviewQuery.isLoading,
    isLoadingWeekly: weeklyQuery.isLoading,
    isLoadingMonthly: monthlyQuery.isLoading,
    isLoadingTrends: trendsQuery.isLoading,
    isLoadingHeatmap: heatmapQuery.isLoading,

    // Error states
    error: dashboardQuery.error,
    overviewError: overviewQuery.error,
    trendsError: trendsQuery.error,

    // Refetch
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
    refetchDashboard: dashboardQuery.refetch,

    // Quick accessors
    streak: dashboardQuery.data?.streak ?? { current: 0, longest: 0, isAtRisk: false },
    todayStats: dashboardQuery.data?.today ?? { problems: 0, commits: 0, time: 0, points: 0 },
    weekStats: dashboardQuery.data?.thisWeek ?? { problems: 0, commits: 0, time: 0, points: 0, change: 0 },
    monthStats: dashboardQuery.data?.thisMonth ?? { problems: 0, commits: 0, time: 0, points: 0, change: 0 },
    goalStats: dashboardQuery.data?.goals ?? { active: 0, completed: 0, completionRate: 0 },
    achievementStats: dashboardQuery.data?.achievements ?? { total: 0, unlocked: 0, points: 0, recent: [] },
    platformStats: dashboardQuery.data?.platforms ?? { connected: 0, total: 0, lastSync: null, connectedPlatforms: [] },
    rankStats: dashboardQuery.data?.rank ?? { current: null, percentile: null, change: null },
  }), [
    dashboardQuery.data,
    dashboardQuery.isLoading,
    dashboardQuery.error,
    dashboardQuery.refetch,
    overviewQuery.data,
    overviewQuery.isLoading,
    overviewQuery.error,
    weeklyQuery.data,
    weeklyQuery.isLoading,
    monthlyQuery.data,
    monthlyQuery.isLoading,
    trendsQuery.data,
    trendsQuery.isLoading,
    trendsQuery.error,
    heatmapQuery.data,
    heatmapQuery.isLoading,
    queryClient,
  ]);
}

// =============================================================================
// PERIOD-SPECIFIC HOOKS
// =============================================================================

export function useStatsForPeriod(period: '7d' | '30d' | '90d' | '1y') {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const query = useQuery({
    queryKey: queryKeys.stats.overview(period),
    queryFn: () => DashboardService.getOverview(period),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// COMPARISON HOOK
// =============================================================================

export function useStatsComparison() {
  // Placeholder - DashboardService comparison not implemented in first pass
  // but hook structure remains for consistency
  return {
    comparison: null,
    isLoading: false,
    error: null,
    refetch: async () => { },
  };
}

export default useStats;