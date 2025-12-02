import useSWR from 'swr';
import axios from 'axios';

interface Stats {
  totalProblems: number;
  totalTime: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  avgProblemsPerDay: number;
  avgTimePerDay: number;
  platformStats: any[];
  recentActivity: any[];
}

export function useStats(period: number = 30) {
  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR<{ stats: Stats }>(
    `/api/stats?period=${period}`,
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: true,
      revalidateInterval: 30000, // Auto-refresh every 30 seconds
    }
  );

  return {
    stats: data?.stats,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useMonthlyStats(months: number = 6) {
  const {
    data,
    error,
    isLoading,
  } = useSWR<{ monthlyStats: any[] }>(
    `/api/stats/monthly?months=${months}`,
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    }
  );

  return {
    monthlyStats: data?.monthlyStats || [],
    isLoading,
    error,
  };
}

export function useHeatmapData() {
  const {
    data,
    error,
    isLoading,
  } = useSWR<{ heatmap: any[] }>(
    '/api/stats/heatmap',
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    }
  );

  return {
    heatmapData: data?.heatmap || [],
    isLoading,
    error,
  };
}