import { httpClient } from '@/lib/http-client';

// =============================================================================
// ADMIN SERVICE
// =============================================================================

export const AdminService = {
    /**
     * Get admin dashboard stats
     */
    /**
     * Get admin dashboard stats
     */
    getDashboard: async (): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/admin/dashboard');
        return response.stats;
    },

    /**
     * Get system overview
     */
    getOverview: async (): Promise<any> => {
        const response = await httpClient.get<{ overview: any }>('/api/admin/overview');
        return response.overview;
    },

    /**
     * Get all users
     */
    getUsers: async (params?: Record<string, string>): Promise<{ users: any[]; total: number }> => {
        const response = await httpClient.get<{ users: any[]; total: number }>('/api/admin/users', { params });
        return response;
    },

    /**
     * Get user by ID
     */
    getUser: async (userId: string): Promise<any> => {
        const response = await httpClient.get<{ user: any }>(`/api/admin/users/${userId}`);
        return response.user;
    },

    /**
     * Ban a user
     */
    banUser: async (userId: string, reason: string): Promise<void> => {
        await httpClient.post(`/api/admin/users/${userId}/ban`, { reason });
    },

    /**
     * Unban a user
     */
    unbanUser: async (userId: string): Promise<void> => {
        await httpClient.post(`/api/admin/users/${userId}/unban`);
    },

    /**
     * Verify a user
     */
    verifyUser: async (userId: string): Promise<void> => {
        await httpClient.post(`/api/admin/users/${userId}/verify`);
    },

    /**
     * Reset user password
     */
    resetPassword: async (userId: string, sendEmail: boolean = true): Promise<any> => {
        const response = await httpClient.post<any>(`/api/admin/users/${userId}/reset-password`, { sendEmail });
        return response;
    },

    /**
     * Impersonate a user
     */
    impersonate: async (userId: string, reason: string): Promise<{ token: string }> => {
        const response = await httpClient.post<{ token: string }>(`/api/admin/users/${userId}/impersonate`, { reason });
        return response;
    },

    /**
     * Delete a user
     */
    deleteUser: async (userId: string): Promise<void> => {
        await httpClient.delete(`/api/admin/users/${userId}`);
    },

    /**
     * Get global admin stats
     */
    getStats: async (): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/admin/stats');
        return response.stats;
    },
};
