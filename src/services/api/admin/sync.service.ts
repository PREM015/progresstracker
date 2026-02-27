import { httpClient } from '@/lib/http-client';

export const AdminSyncService = {
    /**
     * Get system-wide sync status
     */
    getSyncStatus: async (): Promise<any> => {
        const response = await httpClient.get<{ status: any }>('/api/admin/sync/status');
        return response.status;
    },

    /**
     * Get sync schedule configuration
     */
    getSyncSchedule: async (): Promise<any> => {
        const response = await httpClient.get<{ schedule: any }>('/api/admin/sync/schedule');
        return response.schedule;
    },

    /**
     * Trigger a manual sync
     */
    triggerSync: async (data: any): Promise<any> => {
        const response = await httpClient.post<{ result: any }>('/api/admin/sync', data);
        return response.result;
    },

    /**
     * Update sync schedule
     */
    updateSchedule: async (data: any): Promise<void> => {
        await httpClient.post('/api/admin/sync/schedule', data);
    },
};
