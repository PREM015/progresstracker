import { httpClient } from '@/lib/http-client';
import { Report, GenerateReportInput, ExportHistoryItem } from '@/types/report';

const BASE_URL = '/reports';

export const ReportService = {
    /**
     * Get all reports
     */
    getReports: async (): Promise<Report[]> => {
        const response = await httpClient.get<Report[]>(`${BASE_URL}`);
        return response || [];
    },

    /**
     * Get a single report
     */
    getReport: async (id: string): Promise<Report> => {
        return httpClient.get<Report>(`${BASE_URL}/${id}`);
    },

    /**
     * Generate a new report
     */
    generateReport: async (data: GenerateReportInput): Promise<Report> => {
        return httpClient.post<Report>(`${BASE_URL}/generate`, data);
    },

    /**
     * Delete a report
     */
    deleteReport: async (id: string): Promise<void> => {
        await httpClient.delete(`${BASE_URL}/${id}`);
    },

    /**
     * Get export history
     */
    getExportHistory: async (): Promise<ExportHistoryItem[]> => {
        const response = await httpClient.get<ExportHistoryItem[]>('/exports/history');
        return response || [];
    },

    /**
     * Trigger an export
     */
    triggerExport: async (type: string, format: string = 'json'): Promise<void> => {
        await httpClient.get(`/export/${type}?format=${format}`);
    }
};
