import useSWR from 'swr';
import axios from 'axios';

interface TrendData {
  date: string;
  value: number;
}

interface TrendMetrics {
  total: number;
  average: number;
  growthRate: number;
  peak: number;
  activeDays: number;
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  icon: string;
}

export function useAnalytics(days: number = 30, metric: 'problems' | 'time' | 'commits' = 'problems') {
  const {
    data: trendsData,
    error: trendsError,
    isLoading: trendsLoading,
    mutate: refreshTrends,
  } = useSWR<{ trends: TrendData[]; metrics: TrendMetrics }>(
    `/api/analytics/trends?days=${days}&metric=${metric}`,
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const {
    data: insightsData,
    error: insightsError,
    isLoading: insightsLoading,
  } = useSWR<{ insights: Insight[] }>(
    '/api/analytics/insights?period=month',
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    }
  );

  const {
    data: comparisonData,
    error: comparisonError,
    isLoading: comparisonLoading,
  } = useSWR<{ comparison: any }>(
    '/api/analytics/comparison',
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    }
  );

  return {
    trends: trendsData?.trends || [],
    metrics: trendsData?.metrics,
    insights: insightsData?.insights || [],
    comparison: comparisonData?.comparison,
    isLoading: trendsLoading || insightsLoading || comparisonLoading,
    error: trendsError || insightsError || comparisonError,
    refreshTrends,
  };
}