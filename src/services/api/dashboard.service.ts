import { httpClient } from '@/lib/http-client';
import { DashboardStats, OverviewStats, TrendStats, HeatmapStats, MonthlyStats } from '@/types/dashboard';

const BASE_URL = '/stats';

export const DashboardService = {
    /**
     * Get main dashboard stats
     */
    getDashboardStats: async (): Promise<DashboardStats> => {
        const response = await httpClient.get<{ stats: DashboardStats }>(`${BASE_URL}/dashboard`);
        if (!response?.stats) throw new Error('Dashboard stats missing in response');
        return response.stats;
    },

    /**
     * Get overview stats for a period
     */
    /**
     * Get overview stats for a period
     */
    getOverview: async (period: '7d' | '30d' | '90d' | '1y' = '7d'): Promise<OverviewStats> => {
        const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
        return await httpClient.get<OverviewStats>(`${BASE_URL}/overview`, {
            params: { days: daysMap[period] }
        });
    },

    /**
     * Get weekly stats
     */
    getWeekly: async (): Promise<OverviewStats> => {
        return await httpClient.get<OverviewStats>(`${BASE_URL}/weekly`);
    },

    /**
     * Get monthly stats
     */
    getMonthly: async (): Promise<MonthlyStats> => {
        return await httpClient.get<MonthlyStats>(`${BASE_URL}/monthly`);
    },

    /**
     * Get trend data
     */
    getTrends: async (period: '30d' | '90d' | '1y' = '30d'): Promise<TrendStats> => {
        const periodMap = { '30d': 'month', '90d': 'quarter', '1y': 'year' };
        return await httpClient.get<TrendStats>(`${BASE_URL}/trends`, {
            params: {
                period: periodMap[period],
                metric: 'problems', // Fixed: 'combined' is not a valid metric
                granularity: period === '1y' ? 'month' : 'day'
            }
        });
    },

    /**
     * Get heatmap data
     */
    getHeatmap: async (year?: number): Promise<HeatmapStats> => {
        return await httpClient.get<HeatmapStats>(`${BASE_URL}/heatmap`, { params: { year } });
    },
};
