import { httpClient } from '@/lib/http-client';

export const AdminChangelogService = {
    /**
     * Get all changelog entries
     */
    getEntries: async (): Promise<any[]> => {
        const response = await httpClient.get<{ entries: any[] }>('/api/admin/changelog');
        return response.entries || [];
    },

    /**
     * Create a new changelog entry
     */
    createEntry: async (data: any): Promise<any> => {
        const response = await httpClient.post<{ entry: any }>('/api/admin/changelog', data);
        return response.entry;
    },

    /**
     * Update an existing changelog entry
     */
    updateEntry: async (id: string, data: any): Promise<any> => {
        const response = await httpClient.patch<{ entry: any }>(`/api/admin/changelog/${id}`, data);
        return response.entry;
    },

    /**
     * Delete a changelog entry
     */
    deleteEntry: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/admin/changelog/${id}`);
    },

    /**
     * Publish a changelog entry
     */
    publishEntry: async (id: string): Promise<void> => {
        await httpClient.post(`/api/admin/changelog/${id}/publish`);
    },
};
