'use client';

import { useAnalyticsDashboard } from './useAnalyticsDashboard';
import { useMemo } from 'react';
import useSWR from 'swr';
import { httpClient } from '@/lib/http-client';
import { useSession } from 'next-auth/react';
import { SWR_CONFIG } from '@/lib/swr-config';

/**
 * Legacy hook wrapper around useAnalyticsDashboard for backward compatibility.
 * Consumes the unified endpoint data and maps it to the old structure expected by components.
 */
export function useStats() {
  const { data: dashboard, isLoading, error, refresh } = useAnalyticsDashboard();

  return useMemo(() => ({
    // mapped data
    dashboard,
    overview: {
      platforms: dashboard?.platforms.map(p => ({
        name: p.name,
        problems: p.stats.problems,
        commits: 0, // Not split in new API
        points: p.stats.points
      })) || [],
      // ... other overview fields if needed
    },
    weekly: null, // Legacy, use dashboard.stats.week
    monthly: null, // Legacy, use dashboard.stats.month
    trends: {
      trend: dashboard?.chart || []
    },
    heatmap: dashboard?.chart.map(c => ({ date: c.date, count: c.problems + c.commits })) || [],
    heatmapStats: null,

    // Loading states - unified
    isLoading,
    isLoadingOverview: isLoading,
    isLoadingWeekly: isLoading,
    isLoadingMonthly: isLoading,
    isLoadingTrends: isLoading,
    isLoadingHeatmap: isLoading,

    // Error states
    error,
    overviewError: error,
    trendsError: error,

    // Actions
    refetch: refresh,
    refetchDashboard: refresh,

    // Quick accessors
    streak: dashboard?.user.streak ?? { current: 0, longest: 0, isAtRisk: false },
    todayStats: dashboard?.stats.today ?? { problems: 0, commits: 0, time: 0, points: 0 },
    weekStats: dashboard?.stats.week ?? { problems: 0, commits: 0, time: 0, activeDays: 0 },
    monthStats: dashboard?.stats.month ?? { problems: 0, commits: 0, time: 0 },
    goalStats: { active: dashboard?.goals.length || 0, completed: 0, completionRate: 0 }, // Simplified
    achievementStats: { total: 0, unlocked: 0, points: 0, recent: [] }, // Not in dashboard yet
    platformStats: {
      connected: dashboard?.meta.connectedPlatformsCount || 0,
      total: dashboard?.meta.connectedPlatformsCount || 0,
      lastSync: null,
      connectedPlatforms: dashboard?.platforms
    },
    rankStats: { current: dashboard?.user.rank || 0, percentile: null, change: null },
  }), [dashboard, isLoading, error, refresh]);
}

// Keep separate hooks if they fetch distinct data not in dashboard
export function useStatsForPeriod(period: '7d' | '30d' | '90d' | '1y') {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const { data: stats, error, isLoading, mutate } = useSWR(
    isAuthenticated ? `/api/stats/overview?days=${period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365}` : null,
    (url: string) => httpClient.get<any>(url), // Using any for now, better to import OverviewStats
    SWR_CONFIG
  );

  return {
    stats,
    isLoading,
    error,
    refetch: mutate,
  };
}

export function useStatsComparison() {
  return { comparison: null, isLoading: false, error: null, refetch: async () => { } };
}

export default useStats;