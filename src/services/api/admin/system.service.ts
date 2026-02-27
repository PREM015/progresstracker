import { httpClient } from '@/lib/http-client';

export const AdminSystemService = {
    /**
     * Get all system settings
     */
    getSettings: async (): Promise<any[]> => {
        const response = await httpClient.get<{ settings: any[] }>('/api/admin/system-settings');
        return response.settings || [];
    },

    /**
     * Update a system setting
     */
    updateSetting: async (key: string, value: string): Promise<any> => {
        const response = await httpClient.patch<{ setting: any }>(`/api/admin/system-settings/${key}`, { value });
        return response.setting;
    },

    getSystemStatus: async (): Promise<unknown> => {
        const response = await httpClient.get<{ status: unknown }>('/api/admin/system/status');
        return response.status;
    },
    getHealth: async (): Promise<unknown> => {
        const response = await httpClient.get<{ health: unknown }>('/api/admin/system/health');
        return response.health;
    },
};
