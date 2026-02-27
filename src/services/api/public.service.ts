import { httpClient } from '@/lib/http-client';

// =============================================================================
// SERVICE
// =============================================================================

export const PublicService = {
    /**
     * Get public user stats
     */
    getUserStats: async (username: string): Promise<unknown> => {
        const response = await httpClient.get<{ stats: unknown }>(`/api/public/users/${username}/stats`);
        return response.stats;
    },

    /**
     * Get public user profile
     */
    getUserProfile: async (username: string): Promise<unknown> => {
        const response = await httpClient.get<{ profile: unknown }>(`/api/public/users/${username}`);
        return response.profile;
    },

    /**
     * Get global leaderboard
     */
    getLeaderboard: async (period: string = 'weekly'): Promise<unknown> => {
        const response = await httpClient.get<{ leaderboard: unknown }>('/api/public/leaderboard', {
            params: { period },
        });
        return response.leaderboard;
    },

    /**
     * Get global public stats
     */
    getGlobalStats: async (): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/stats/public');
        return response.stats;
    },
};
