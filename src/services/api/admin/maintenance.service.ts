import { httpClient } from '@/lib/http-client';

export const AdminMaintenanceService = {
    /**
     * Get all maintenance windows
     */
    getMaintenanceWindows: async (): Promise<any[]> => {
        const response = await httpClient.get<{ windows: any[] }>('/api/admin/maintenance');
        return response.windows || [];
    },

    /**
     * Create a maintenance window
     */
    createMaintenanceWindow: async (data: any): Promise<any> => {
        const response = await httpClient.post<{ window: any }>('/api/admin/maintenance', data);
        return response.window;
    },

    /**
     * Delete a maintenance window
     */
    deleteMaintenanceWindow: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/admin/maintenance/${id}`);
    },

    /**
     * Toggle maintenance window status
     */
    toggleMaintenanceWindow: async (id: string, isActive: boolean): Promise<void> => {
        const endpoint = isActive ? 'deactivate' : 'activate';
        await httpClient.post(`/api/admin/maintenance/${id}/${endpoint}`);
    },

    /**
     * Get cache statistics
     */
    getCacheStats: async (): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/admin/cache/stats');
        return response.stats;
    },

    /**
     * Clear cache
     */
    clearCache: async (key?: string): Promise<void> => {
        await httpClient.post('/api/admin/cache/clear', { key });
    },
};
