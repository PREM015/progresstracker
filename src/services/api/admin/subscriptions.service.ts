import { httpClient } from '@/lib/http-client';

export const AdminSubscriptionsService = {
    /**
     * Get all subscriptions
     */
    getSubscriptions: async (): Promise<any[]> => {
        const response = await httpClient.get<{ subscriptions: any[] }>('/api/admin/billing/subscriptions');
        return response.subscriptions || [];
    },

    getAllSubscriptions: async (params?: Record<string, string>): Promise<unknown> => {
        const response = await httpClient.get<{ subscriptions: unknown }>('/api/admin/subscriptions', { params });
        return response.subscriptions;
    },
    updateSubscription: async (id: string, data: unknown): Promise<unknown> => {
        const response = await httpClient.put<{ subscription: unknown }>(`/api/admin/subscriptions/${id}`, data);
        return response.subscription;
    },
};
