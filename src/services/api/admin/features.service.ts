import { httpClient } from '@/lib/http-client';

export const AdminFeaturesService = {
    /**
     * Get all feature flags
     */
    getFlags: async (): Promise<any[]> => {
        const response = await httpClient.get<{ flags: any[] }>('/api/admin/feature-flags');
        return response.flags || [];
    },

    /**
     * Create a new feature flag
     */
    createFlag: async (data: any): Promise<any> => {
        const response = await httpClient.post<{ flag: any }>('/api/admin/feature-flags', data);
        return response.flag;
    },

    /**
     * Update an existing feature flag
     */
    updateFlag: async (key: string, data: any): Promise<any> => {
        const response = await httpClient.patch<{ flag: any }>(`/api/admin/feature-flags/${key}`, data);
        return response.flag;
    },

    /**
     * Delete a feature flag
     */
    deleteFlag: async (key: string): Promise<void> => {
        await httpClient.delete(`/api/admin/feature-flags/${key}`);
    },

    getFeatures: async (): Promise<unknown> => {
        const response = await httpClient.get<{ features: unknown }>('/api/admin/features');
        return response.features;
    },
    toggleFeature: async (featureId: string, enabled: boolean): Promise<unknown> => {
        const response = await httpClient.post<{ feature: unknown }>(`/api/admin/features/${featureId}/toggle`, { enabled });
        return response.feature;
    },
};
