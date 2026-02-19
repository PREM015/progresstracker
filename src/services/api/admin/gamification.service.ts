import { httpClient } from '@/lib/http-client';

export const AdminGamificationService = {
    /**
     * Get all achievements
     */
    getAchievements: async (): Promise<any[]> => {
        const response = await httpClient.get<{ achievements: any[] }>('/api/admin/achievements');
        return response.achievements || [];
    },

    /**
     * Create a new achievement
     */
    createAchievement: async (data: any): Promise<any> => {
        const response = await httpClient.post<{ achievement: any }>('/api/admin/achievements', data);
        return response.achievement;
    },

    /**
     * Update an existing achievement
     */
    updateAchievement: async (id: string, data: any): Promise<any> => {
        const response = await httpClient.patch<{ achievement: any }>(`/api/admin/achievements/${id}`, data);
        return response.achievement;
    },

    /**
     * Delete an achievement
     */
    deleteAchievement: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/admin/achievements/${id}`);
    },

    /**
     * Get achievement statistics
     */
    getStats: async (): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/admin/achievements/stats');
        return response.stats;
    },
};
