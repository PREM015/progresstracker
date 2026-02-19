import { httpClient } from '@/lib/http-client';

export const AdminLogsService = {
    /**
     * Get audit logs
     */
    getAuditLogs: async (params?: Record<string, string>): Promise<any> => {
        return await httpClient.get('/api/admin/audit-logs', { params });
    },

    /**
     * Get system logs
     */
    getSystemLogs: async (params?: Record<string, string>): Promise<any> => {
        return await httpClient.get('/api/admin/logs', { params });
    },

    getLogs: async (params?: Record<string, string>): Promise<unknown> => {
        const response = await httpClient.get<{ logs: unknown }>('/api/admin/logs', { params });
        return response.logs;
    },
};
