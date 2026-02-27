import { httpClient } from '@/lib/http-client';

export const AdminGrowthService = {
    /**
     * Get waitlist entries with filters
     */
    getWaitlist: async (params?: Record<string, string>): Promise<{ entries: any[], pagination: any }> => {
        const response = await httpClient.get<{ entries: any[], pagination: any }>('/api/admin/waitlist', { params });
        return response;
    },

    /**
     * Get waitlist statistics
     */
    getStats: async (): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/admin/waitlist/stats');
        return response.stats;
    },

    /**
     * Update waitlist entry status
     */
    updateStatus: async (id: string, status: string): Promise<void> => {
        await httpClient.put(`/api/admin/waitlist/${id}`, { status });
    },

    /**
     * Send invites to emails
     */
    sendInvites: async (emails: string[]): Promise<void> => {
        await httpClient.post('/api/admin/waitlist/invite', { emails });
    },

    /**
     * Delete waitlist entries
     */
    deleteEntries: async (ids: string): Promise<void> => {
        await httpClient.delete(`/api/admin/waitlist`, { params: { ids } });
    },
};
