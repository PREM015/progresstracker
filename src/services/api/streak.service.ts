import { httpClient } from '@/lib/http-client';
import type { StreakHistory } from '@/types/tracker';

// =============================================================================
// TYPES
// =============================================================================

export interface StreakData {
    current: number;
    longest: number;
    startDate: Date | null;
    lastActivityDate: Date | null;
    freezeCount: number;
    freezeUsedAt: Date | null;
    isAtRisk: boolean;
    hoursUntilBreak: number | null;
}

export interface StreakStats {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    averageStreak: number;
    streakStartDate: Date | null;
    milestones: {
        days: number;
        reached: boolean;
        reachedAt?: Date;
    }[];
}

export interface FreezStreakResponse {
    success: boolean;
    freezesRemaining: number;
}

// =============================================================================
// SERVICE
// =============================================================================

export const StreakService = {
    /**
     * Get current streak data
     */
    getCurrent: async (): Promise<StreakData> => {
        const response = await httpClient.get<{ streak: StreakData }>('/api/streak');
        return response.streak;
    },

    /**
     * Get streak history
     */
    getHistory: async (): Promise<StreakHistory[]> => {
        const response = await httpClient.get<{ history: StreakHistory[] }>('/api/streak/history');
        return response.history;
    },

    /**
     * Get streak stats
     */
    getStats: async (): Promise<StreakStats> => {
        const response = await httpClient.get<{ stats: StreakStats }>('/api/streak/stats');
        return response.stats;
    },

    /**
     * Use streak freeze
     */
    useFreeze: async (): Promise<FreezStreakResponse> => {
        const response = await httpClient.post<FreezStreakResponse>('/api/streak/freeze');
        return response;
    },

    /**
     * Check streak status
     */
    check: async (): Promise<StreakData> => {
        const response = await httpClient.post<{ streak: StreakData }>('/api/streak/check');
        return response.streak;
    },
};
