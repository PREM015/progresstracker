import { httpClient } from '@/lib/http-client';

export const AdminAnalyticsService = {
    getAnalytics: async (timeFrame: string = '30d'): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/admin/analytics', { params: { timeFrame } });
        return response.stats;
    },
};
