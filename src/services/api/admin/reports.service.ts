import { httpClient } from '@/lib/http-client';

export const AdminReportsService = {
    /**
     * Get reports
     */
    getReports: async (): Promise<any[]> => {
        const response = await httpClient.get<{ reports: any[] }>('/api/admin/reports');
        return response.reports || [];
    },

    generateReport: async (type: string, params?: Record<string, unknown>): Promise<unknown> => {
        const response = await httpClient.post<{ report: unknown }>('/api/admin/reports/generate', { type, ...params });
        return response.report;
    },
};
