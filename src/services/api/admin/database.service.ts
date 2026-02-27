import { httpClient } from '@/lib/http-client';

export const AdminDatabaseService = {
    /**
     * Get all database backups
     */
    getBackups: async (): Promise<any[]> => {
        const response = await httpClient.get<{ backups: any[] }>('/api/admin/database/backups');
        return response.backups || [];
    },

    /**
     * Create a new database backup
     */
    createBackup: async (): Promise<void> => {
        await httpClient.post('/api/admin/database/backup');
    },

    /**
     * Delete a database backup
     */
    deleteBackup: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/admin/database/backup/${id}`);
    },

    /**
     * Restore a database backup
     */
    restoreBackup: async (id: string): Promise<void> => {
        await httpClient.post(`/api/admin/database/backup/${id}/restore`);
    },

    /**
     * Get database statistics
     */
    getStats: async (): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/admin/database/stats');
        return response.stats;
    },
};
