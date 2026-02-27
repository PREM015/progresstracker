import { httpClient } from '@/lib/http-client';

// =============================================================================
// TYPES
// =============================================================================

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    name: string | null;
    image: string | null;
    score: number;
    problems: number;
    streak: number;
    change: number;
    isCurrentUser: boolean;
}

export interface LeaderboardData {
    entries: LeaderboardEntry[];
    total: number;
    period: string;
    updatedAt: Date;
}

export interface UserRank {
    rank: number | null;
    percentile: number | null;
    score: number;
    change: number | null;
    nearbyUsers: LeaderboardEntry[];
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

// =============================================================================
// SERVICE
// =============================================================================

export const LeaderboardService = {
    /**
     * Get global leaderboard for a specific period
     */
    getGlobal: async (period: LeaderboardPeriod, limit: number = 50): Promise<LeaderboardData> => {
        const response = await httpClient.get<{ leaderboard: LeaderboardData }>(
            `/api/leaderboard/${period}`,
            { params: { limit: String(limit) } }
        );
        return response.leaderboard;
    },

    /**
     * Get friends leaderboard
     */
    getFriends: async (period: LeaderboardPeriod, limit: number = 50): Promise<LeaderboardData> => {
        const response = await httpClient.get<{ leaderboard: LeaderboardData }>(
            '/api/leaderboard/friends',
            { params: { period, limit: String(limit) } }
        );
        return response.leaderboard;
    },

    /**
     * Get platform-specific leaderboard
     */
    getPlatform: async (
        platformId: string,
        period: LeaderboardPeriod,
        limit: number = 50
    ): Promise<LeaderboardData> => {
        const response = await httpClient.get<{ leaderboard: LeaderboardData }>(
            `/api/leaderboard/platform/${platformId}`,
            { params: { period, limit: String(limit) } }
        );
        return response.leaderboard;
    },

    /**
     * Get category-specific leaderboard
     */
    getCategory: async (
        category: string,
        period: LeaderboardPeriod,
        limit: number = 50
    ): Promise<LeaderboardData> => {
        const response = await httpClient.get<{ leaderboard: LeaderboardData }>(
            `/api/leaderboard/category/${category}`,
            { params: { period, limit: String(limit) } }
        );
        return response.leaderboard;
    },

    /**
     * Get current user's rank
     */
    getMyRank: async (period: LeaderboardPeriod): Promise<UserRank> => {
        const response = await httpClient.get<{ rank: UserRank }>(
            '/api/leaderboard/rank',
            { params: { period } }
        );
        return response.rank;
    },
};
