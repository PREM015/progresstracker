import { httpClient } from '@/lib/http-client';

export const AdminBillingService = {
    /**
     * Get billing statistics
     */
    getStats: async (period: string = 'month'): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/admin/billing/stats', { params: { period } });
        return response.stats;
    },

    /**
     * Get all invoices
     */
    getInvoices: async (params?: Record<string, string>): Promise<any[]> => {
        const response = await httpClient.get<{ invoices: any[] }>('/api/admin/billing/invoices', { params });
        return response.invoices || [];
    },

    /**
     * Get payment methods
     */
    getPaymentMethods: async (): Promise<any[]> => {
        const response = await httpClient.get<{ methods: any[] }>('/api/admin/billing/payment-methods');
        return response.methods || [];
    },

    /**
     * Get subscriptions (legacy)
     */
    getSubscriptions: async (): Promise<any[]> => {
        const response = await httpClient.get<{ subscriptions: any[] }>('/api/admin/billing/subscriptions');
        return response.subscriptions || [];
    },

    /**
     * Get revenue (legacy)
     */
    getRevenue: async (params?: Record<string, string>): Promise<any> => {
        const response = await httpClient.get<{ revenue: any }>('/api/admin/billing/revenue', { params });
        return response.revenue;
    },
};
