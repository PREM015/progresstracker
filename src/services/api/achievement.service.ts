import { httpClient } from '@/lib/http-client';
import type {
    UserAchievement,
    AchievementProgress,
    AchievementStats,
    AchievementCategory,
} from '@/types/achievement';

// =============================================================================
// SERVICE
// =============================================================================

export const AchievementService = {
    /**
     * Get all achievements with progress
     */
    getProgress: async (): Promise<AchievementProgress[]> => {
        const response = await httpClient.get<{ progress: AchievementProgress[] }>(
            '/api/achievements/progress'
        );
        return response.progress;
    },

    /**
     * Get unlocked achievements
     */
    getUnlocked: async (): Promise<UserAchievement[]> => {
        const response = await httpClient.get<{ achievements: UserAchievement[] }>('/api/achievements', {
            params: { unlocked: 'true' }
        });
        return response.achievements;
    },

    /**
     * Get recent achievements
     */
    getRecent: async (limit: number = 10): Promise<UserAchievement[]> => {
        const response = await httpClient.get<{ achievements: UserAchievement[] }>(
            '/api/achievements/recent',
            { params: { limit: String(limit) } }
        );
        return response.achievements;
    },

    /**
     * Get pinned achievements
     */
    getPinned: async (): Promise<UserAchievement[]> => {
        const response = await httpClient.get<{ pinnedAchievements: UserAchievement[] }>(
            '/api/achievements/pinned'
        );
        return response?.pinnedAchievements || [];
    },

    /**
     * Get achievement stats
     */
    getStats: async (): Promise<AchievementStats> => {
        const response = await httpClient.get<{ stats: AchievementStats }>('/api/achievements/stats');
        return response.stats;
    },

    /**
     * Get achievement categories
     */
    getCategories: async (): Promise<{ category: AchievementCategory; count: number; unlocked: number }[]> => {
        const response = await httpClient.get<{
            categories: { category: AchievementCategory; count: number; unlocked: number }[]
        }>('/api/achievements/categories');
        return response.categories;
    },

    /**
     * Get single achievement by ID
     */
    getById: async (id: string): Promise<AchievementProgress> => {
        const response = await httpClient.get<{ achievement: AchievementProgress }>(
            `/api/achievements/${id}`
        );
        return response.achievement;
    },

    /**
     * Pin an achievement
     */
    pin: async (achievementId: string): Promise<UserAchievement> => {
        const response = await httpClient.post<{ achievement: UserAchievement }>(
            `/api/achievements/${achievementId}/pin`
        );
        return response.achievement;
    },

    /**
     * Unpin an achievement
     */
    unpin: async (achievementId: string): Promise<UserAchievement> => {
        const response = await httpClient.delete<{ achievement: UserAchievement }>(
            `/api/achievements/${achievementId}/pin`
        );
        return response.achievement;
    },

    /**
     * Check for new achievements
     */
    check: async (): Promise<UserAchievement[]> => {
        const response = await httpClient.post<{ unlocked: UserAchievement[] }>('/api/achievements/check');
        return response.unlocked;
    },
};
