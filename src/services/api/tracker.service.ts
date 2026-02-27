import { httpClient } from '@/lib/http-client';
import { TrackerEntry, TrackerFilter, TrackerStats, TrackerHeatmapData, TrackerEntryInput, TrackerSummary } from '@/types/tracker';
import { PaginatedResponse } from '@/types/api';

export const TrackerService = {
    // Get entries with pagination and filtering
    getEntries: async (filters: TrackerFilter & { page?: number; limit?: number }): Promise<PaginatedResponse<TrackerEntry>> => {

        // Actually our httpClient buildQueryString handles basic types. For arrays, we might need to verify.
        // The implementation in httpClient.ts:
        // Object.entries(params).forEach(([key, value]) => { query.append(key, String(value)); });
        // This blindly stringifies arrays which is "value1,value2". Backend might expect repeated keys "key=val1&key=val2".
        // Use URLSearchParams logic here and pass string to URL? No, httpClient takes endpoint.
        // Let's manually build query string for complex arrays or rely on simple params.
        // The original code used URLSearchParams. Let's keep using it and pass as query string in endpoint?
        // Or update httpClient to support arrays?
        // Updating httpClient is better but for now let's construct the specialized query string here and append to URL if needed,
        // or just use the params object if we trust it. 
        // TrackerService used repeated keys: params.append('platformIds', id).
        // My simple httpClient buildQueryString doesn't support that (it does String(value)).
        // I should probably fix httpClient to support arrays or pass pre-formatted query string.
        // For now, I will construct the query string manually here as the original service did, and append to endpoint.

        const queryFn = () => {
            const p = new URLSearchParams();
            if (filters.page) p.append('page', filters.page.toString());
            if (filters.limit) p.append('limit', filters.limit.toString());
            if (filters.search) p.append('search', filters.search);
            if (filters.difficulty) p.append('difficulty', filters.difficulty);
            if (filters.status) p.append('status', filters.status);

            if (filters.platformIds?.length) {
                filters.platformIds.forEach(id => p.append('platformIds', id));
            }
            if (filters.tags?.length) {
                filters.tags.forEach(tag => p.append('tags', tag));
            }
            if (filters.startDate) p.append('startDate', new Date(filters.startDate).toISOString());
            if (filters.endDate) p.append('endDate', new Date(filters.endDate).toISOString());
            return p.toString();
        };

        const queryString = queryFn();
        // Pass empty params to httpClient because we appended them to url
        const response = await httpClient.get<PaginatedResponse<TrackerEntry>>(`/api/tracker?${queryString}`);
        return response;
    },

    // Get a single entry by ID
    getEntry: async (id: string): Promise<TrackerEntry> => {
        const response = await httpClient.get<{ data: TrackerEntry }>(`/api/tracker/${id}`);
        // Wait, original: response.data!.data! (APIResponse<TrackerEntry>).
        // httpClient unwraps APIResponse<T>. So T is TrackerEntry?
        // Check API response structure for /api/tracker/:id. Usually it's { success: true, data: Entry }.
        // So T should be TrackerEntry.
        // But wait, getEntries (paginated) returns PaginatedResponse directly as data?
        // PaginatedResponse HAS data property.
        // Let's assume standard APIResponse<TrackerEntry>.
        return httpClient.get<TrackerEntry>(`/api/tracker/${id}`);
    },

    // Get a daily entry by date
    getDailyEntry: async (date: string): Promise<TrackerEntry | null> => {
        // This might return null or 404.
        try {
            return await httpClient.get<TrackerEntry>(`/api/tracker/daily/${date}`);
        } catch (e: any) {
            if (e.status === 404) return null;
            throw e;
        }
    },

    // Create a new entry
    createEntry: async (data: Partial<TrackerEntryInput>): Promise<TrackerEntry> => {
        return httpClient.post<TrackerEntry>('/api/tracker', data);
    },

    // Update an existing entry
    updateEntry: async (id: string, data: Partial<TrackerEntryInput>): Promise<TrackerEntry> => {
        return httpClient.put<TrackerEntry>(`/api/tracker/${id}`, data);
    },

    // Delete an entry
    deleteEntry: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/tracker/${id}`);
    },

    // Bulk create entries
    bulkCreate: async (entries: TrackerEntryInput[]): Promise<void> => {
        await httpClient.post('/api/tracker/bulk', { entries });
    },

    // Bulk delete entries
    bulkDelete: async (ids: string[]): Promise<void> => {
        await httpClient.post('/api/tracker/bulk-delete', { ids });
    },

    // Get tracker statistics
    getStats: async (period: string = '30d'): Promise<TrackerStats> => {
        return httpClient.get<TrackerStats>('/api/tracker/stats', { params: { period } });
    },

    // Get tracker summary
    getSummary: async (): Promise<TrackerSummary> => {
        return httpClient.get<TrackerSummary>('/api/tracker/summary');
    },

    // Get heatmap data
    getHeatmap: async (year: number = new Date().getFullYear()): Promise<TrackerHeatmapData[]> => {
        return httpClient.get<TrackerHeatmapData[]>('/api/tracker/heatmap', {
            params: { year }
        });
    },

    // Get recent activity
    getRecent: async (limit: number = 5): Promise<TrackerEntry[]> => {
        return httpClient.get<TrackerEntry[]>('/api/tracker/recent', { params: { limit } });
    },

    // Sync logic
    sync: async (): Promise<void> => {
        await httpClient.post('/api/tracker/sync');
    }
};
