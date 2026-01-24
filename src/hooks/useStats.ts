import useSWR from 'swr';
import axios from 'axios';
import type { Stats as StatsType, MonthlyData, HeatmapData } from '@/types/analytics';

export function useStats(period: number = 30) {
  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR<{ stats: StatsType }>(
    `/api/stats?period=${period}`,
    async (url: string) => {
      const response = await axios.get<{ stats: StatsType }>(url);
      return response.data;
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // Auto-refresh every 30 seconds
    }
  );

  return {
    stats: data?.stats,
    isLoading: isLoading && !data,
    error: error?.message || (error ? 'Failed to load statistics' : undefined),
    refresh: mutate,
  };
}

export function useMonthlyStats(months: number = 6) {
  const {
    data,
    error,
    isLoading,
  } = useSWR<{ monthlyStats: MonthlyData[] }>(
    `/api/stats/monthly?months=${months}`,
    async (url: string) => {
      const response = await axios.get<{ monthlyStats: MonthlyData[] }>(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    monthlyStats: data?.monthlyStats || [],
    isLoading: isLoading && !data,
    error: error?.message || (error ? 'Failed to load monthly data' : undefined),
  };
}

export function useHeatmapData() {
  const {
    data,
    error,
    isLoading,
  } = useSWR<{ heatmap: HeatmapData[] }>(
    '/api/stats/heatmap',
    async (url: string) => {
      const response = await axios.get<{ heatmap: HeatmapData[] }>(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    heatmapData: data?.heatmap || [],
    isLoading: isLoading && !data,
    error: error?.message || (error ? 'Failed to load heatmap data' : undefined),
  };
}