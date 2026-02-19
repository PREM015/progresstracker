import { httpClient } from '@/lib/http-client';

// =============================================================================
// TYPES
// =============================================================================

export interface ExportOptions {
    format: 'json' | 'csv' | 'pdf' | 'excel';
    dateRange?: { start: Date; end: Date };
    dateFrom?: string;
    dateTo?: string;
    includeStats?: boolean;
    includePlatforms?: string[];
    [key: string]: any;
}

export interface ExportResult {
    id: string;
    url: string;
    expiresAt: Date;
}

// =============================================================================
// SERVICE
// =============================================================================

export const ExportService = {
    /**
     * Generate export
     */
    generate: async (options: ExportOptions): Promise<ExportResult> => {
        const response = await httpClient.post<{ job: ExportResult }>('/api/export', options);
        return response.job;
    },

    /**
     * Get export history
     */
    getHistory: async (): Promise<any[]> => {
        const response = await httpClient.get<{ jobs: any[] }>('/api/export/history');
        return response.jobs;
    },

    /**
     * Get scheduled exports
     */
    getScheduled: async (): Promise<any[]> => {
        const response = await httpClient.get<{ exports: any[] }>('/api/export/scheduled');
        return response.exports;
    },

    /**
     * Get export status
     */
    getStatus: async (exportId: string): Promise<{ status: string; progress: number }> => {
        const response = await httpClient.get<{ status: string; progress: number }>(
            `/api/export/${exportId}/status`
        );
        return response;
    },

    /**
     * Download export
     */
    download: async (exportId: string): Promise<Blob> => {
        // For downloads, we might need raw response
        const response = await fetch(`/api/export/download/${exportId}`);
        return response.blob();
    },

    /**
     * Cancel an export job
     */
    cancel: async (exportId: string): Promise<void> => {
        await httpClient.post(`/api/export/cancel/${exportId}`);
    },

    /**
     * Delete an export job
     */
    delete: async (exportId: string): Promise<void> => {
        await httpClient.delete(`/api/export/${exportId}`);
    },
};
