import { httpClient } from '@/lib/http-client';

// =============================================================================
// SERVICE
// =============================================================================

export const SearchService = {
    /**
     * Search across all content
     */
    search: async (query: string, filters?: {
        types?: string[];
        limit?: number;
        [key: string]: any;
    }): Promise<any> => {
        const params: Record<string, string> = { q: query };
        if (filters?.types) params.types = filters.types.join(',');
        if (filters?.limit) params.limit = String(filters.limit);

        // Add other filters as params
        if (filters) {
            Object.keys(filters).forEach(key => {
                if (!['types', 'limit'].includes(key) && filters[key] !== undefined) {
                    params[key] = String(filters[key]);
                }
            });
        }

        const response = await httpClient.get<{ results: any }>('/api/search', { params });
        return response.results;
    },

    /**
     * Get search suggestions
     */
    getSuggestions: async (query: string): Promise<string[]> => {
        const response = await httpClient.get<{ suggestions: string[] }>('/api/search/autocomplete', {
            params: { q: query },
        });
        return response.suggestions;
    },

    /**
     * Get recent searches
     */
    getRecent: async (): Promise<any[]> => {
        const response = await httpClient.get<{ searches: any[] }>('/api/search/recent');
        return response.searches;
    },

    /**
     * Save search history
     */
    saveHistory: async (query: string): Promise<void> => {
        await httpClient.post('/api/search/history', { query });
    },

    /**
     * Clear search history
     */
    clearHistory: async (): Promise<void> => {
        await httpClient.delete('/api/search/history');
    },
};
