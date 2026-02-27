import { httpClient } from '@/lib/http-client';

export const AdminPlatformsService = {
    /**
     * Get all platforms
     */
    getPlatforms: async (): Promise<any[]> => {
        const response = await httpClient.get<{ platforms: any[] }>('/api/admin/platforms');
        return response.platforms || [];
    },

    /**
     * Toggle platform status
     */
    togglePlatform: async (id: string, isActive: boolean): Promise<any> => {
        const response = await httpClient.patch<{ platform: any }>(`/api/admin/platforms/${id}`, { isActive });
        return response.platform;
    },

    updatePlatform: async (id: string, data: unknown): Promise<unknown> => {
        const response = await httpClient.put<{ platform: unknown }>(`/api/admin/platforms/${id}`, data);
        return response.platform;
    },
};
