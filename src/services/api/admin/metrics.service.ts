import { httpClient } from '@/lib/http-client';

export const AdminMetricsService = {
    /**
     * Get dashboard metrics
     */
    getDashboardMetrics: async (): Promise<any> => {
        const response = await httpClient.get<{ data: any }>('/api/admin/metrics/dashboard');
        return response.data;
    },

    /**
     * Get API metrics
     */
    getApiMetrics: async (): Promise<any> => {
        const response = await httpClient.get<{ data: any }>('/api/admin/metrics/api');
        return response.data;
    },

    /**
     * Get system metrics
     */
    getSystemMetrics: async (): Promise<any> => {
        const response = await httpClient.get<{ data: any }>('/api/admin/metrics/system');
        return response.data;
    },

    /**
     * Get user metrics
     */
    getUserMetrics: async (): Promise<any> => {
        const response = await httpClient.get<{ data: any }>('/api/admin/metrics/users');
        return response.data;
    },

    /**
     * Get performance metrics
     */
    getPerformanceMetrics: async (): Promise<any> => {
        const response = await httpClient.get<{ data: any }>('/api/admin/metrics/performance');
        return response.data;
    },
};
