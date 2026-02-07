// ============================================================================
// FILE: src/hooks/useStats.ts
// PURPOSE: Dashboard stats hook - overview, trends, analytics
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

interface DashboardStats {
  streak: {
    current: number;
    longest: number;
    isAtRisk: boolean;
  };
  today: {
    problems: number;
    commits: number;
    time: number;
    points: number;
  };
  thisWeek: {
    problems: number;
    commits: number;
    time: number;
    points: number;
    change: number; // percentage change from last week
  };
  thisMonth: {
    problems: number;
    commits: number;
    time: number;
    points: number;
    change: number;
  };
  goals: {
    active: number;
    completed: number;
    completionRate: number;
  };
  achievements: {
    total: number;
    unlocked: number;
    points: number;
    recent: Array<{
      id: string;
      title: string;
      icon: string;
      unlockedAt: Date;
    }>;
  };
  platforms: {
    connected: number;
    total: number;
    lastSync: Date | null;
  };
  rank: {
    current: number | null;
    percentile: number | null;
    change: number | null;
  };
}

interface OverviewStats {
  period: string;
  problems: {
    total: number;
    easy: number;
    medium: number;
    hard: number;
    byDay: Array<{ date: string; count: number }>;
  };
  commits: {
    total: number;
    byDay: Array<{ date: string; count: number }>;
  };
  time: {
    total: number;
    average: number;
    byDay: Array<{ date: string; minutes: number }>;
  };
  points: {
    total: number;
    byDay: Array<{ date: string; points: number }>;
  };
  platforms: Array<{
    id: string;
    name: string;
    icon: string;
    problems: number;
    commits: number;
    time: number;
  }>;
}

interface TrendData {
  period: string;
  data: Array<{
    date: string;
    problems: number;
    commits: number;
    time: number;
    points: number;
  }>;
  comparison: {
    problems: { current: number; previous: number; change: number };
    commits: { current: number; previous: number; change: number };
    time: { current: number; previous: number; change: number };
    points: { current: number; previous: number; change: number };
  };
}

interface HeatmapData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

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
    queryFn: async (): Promise<DashboardStats> => {
      const response = await apiClient.get<ApiResponse<{ stats: DashboardStats }>>(
        '/stats/dashboard'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch dashboard stats');
      }
      
      return response.data.data!.stats;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // ==========================================================================
  // FETCH OVERVIEW STATS
  // ==========================================================================
  const overviewQuery = useQuery({
    queryKey: queryKeys.stats.overview('7d'),
    queryFn: async (): Promise<OverviewStats> => {
      const response = await apiClient.get<ApiResponse<{ stats: OverviewStats }>>(
        '/stats/overview',
        { period: '7d' }
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch overview stats');
      }
      
      return response.data.data!.stats;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH WEEKLY STATS
  // ==========================================================================
  const weeklyQuery = useQuery({
    queryKey: queryKeys.stats.weekly(),
    queryFn: async (): Promise<OverviewStats> => {
      const response = await apiClient.get<ApiResponse<{ stats: OverviewStats }>>(
        '/stats/weekly'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch weekly stats');
      }
      
      return response.data.data!.stats;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH MONTHLY STATS
  // ==========================================================================
  const monthlyQuery = useQuery({
    queryKey: queryKeys.stats.monthly(),
    queryFn: async (): Promise<OverviewStats> => {
      const response = await apiClient.get<ApiResponse<{ stats: OverviewStats }>>(
        '/stats/monthly'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch monthly stats');
      }
      
      return response.data.data!.stats;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH TRENDS
  // ==========================================================================
  const trendsQuery = useQuery({
    queryKey: queryKeys.stats.trends('30d'),
    queryFn: async (): Promise<TrendData> => {
      const response = await apiClient.get<ApiResponse<{ trends: TrendData }>>(
        '/stats/trends',
        { period: '30d' }
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch trends');
      }
      
      return response.data.data!.trends;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH HEATMAP
  // ==========================================================================
  const heatmapQuery = useQuery({
    queryKey: queryKeys.stats.heatmap(new Date().getFullYear()),
    queryFn: async (): Promise<HeatmapData[]> => {
      const response = await apiClient.get<ApiResponse<{ heatmap: HeatmapData[] }>>(
        '/stats/heatmap'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch heatmap');
      }
      
      return response.data.data!.heatmap;
    },
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
    heatmap: heatmapQuery.data ?? [],
    
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
    platformStats: dashboardQuery.data?.platforms ?? { connected: 0, total: 0, lastSync: null },
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
    queryFn: async (): Promise<OverviewStats> => {
      const response = await apiClient.get<ApiResponse<{ stats: OverviewStats }>>(
        '/stats/overview',
        { period }
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch stats');
      }
      
      return response.data.data!.stats;
    },
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
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const query = useQuery({
    queryKey: queryKeys.stats.comparison(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ comparison: Record<string, unknown> }>>(
        '/stats/compare'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch comparison');
      }
      
      return response.data.data!.comparison;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  return {
    comparison: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useStats;