/* eslint-disable @typescript-eslint/no-unused-vars */
// ============================================================================
// FILE: services/leaderboardService.ts
// PURPOSE: Leaderboard calculation and ranking service
// ============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { PlatformCategory } from '@prisma/client';

const log = logger.child({ service: 'LeaderboardService' });

// =============================================================================
// TYPES
// =============================================================================

export type LeaderboardType = 'global' | 'daily' | 'weekly' | 'monthly' | 'streak' | 'platform' | 'category' | 'friends';

export interface LeaderboardOptions {
    limit?: number;
    offset?: number;
    includeUser?: string;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    username?: string;
    image?: string;
    score: number;
    change?: number;
    isCurrentUser?: boolean;
    metadata?: Record<string, unknown>;
}

export interface RankInfo {
    rank: number;
    score: number;
    total: number;
    percentile: number;
}

// =============================================================================
// CACHE
// =============================================================================

interface LeaderboardCache {
    data: LeaderboardEntry[];
    updatedAt: number;
}

// Cache leaderboard results
const leaderboardCache = new Map<string, { data: LeaderboardEntry[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Common user select fields
const userSelect = {
    id: true,
    name: true,
    username: true,
    image: true,
    totalPoints: true,
    currentStreak: true,
    longestStreak: true,
} as const;

// =============================================================================
// SERVICE METHODS
// =============================================================================

export const leaderboardService = {
    /**
     * Get global leaderboard
     */
    async getGlobalLeaderboard(options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
        try {
            const { limit = 100, offset = 0, includeUser } = options;
            const cacheKey = `global:${limit}:${offset}`;

            // Check cache
            const cached = this._getCached(cacheKey);
            if (cached) {
                return cached;
            }

            const users = await prisma.user.findMany({
                where: {
                    isActive: true,
                    isBanned: false,
                },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    totalPoints: true,
                    rank: true,
                },
                orderBy: [
                    { totalPoints: 'desc' },
                    { createdAt: 'asc' },
                ],
                take: limit,
                skip: offset,
            });

            const entries: LeaderboardEntry[] = users.map((user, index) => ({
                rank: offset + index + 1,
                userId: user.id,
                name: user.name || 'Unknown User',
                username: user.username || undefined,
                image: user.image || undefined,
                score: user.totalPoints,
                isCurrentUser: user.id === includeUser,
            }));

            // Cache result
            this._setCache(cacheKey, entries);

            return entries;
        } catch (error) {
            log.error('Error getting global leaderboard', {}, error);
            return [];
        }
    },

    /**
     * Get daily leaderboard
     */
    async getDailyLeaderboard(date: Date, options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
        try {
            const { limit = 50, offset = 0, includeUser } = options;
            const startRank = offset + 1;

            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            // Get daily stats for the specified day
            const dailyStats = await prisma.dailyStats.findMany({
                where: {
                    date: {
                        gte: dayStart,
                        lte: dayEnd,
                    },
                },
                orderBy: {
                    totalProblems: 'desc',
                },
                take: limit,
                skip: offset,
            });

            // Get user details
            const userIds = dailyStats.map(s => s.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: userSelect,
            });
            const userMap = new Map(users.map(u => [u.id, u]));

            const entries = dailyStats.map((stat, index) => {
                const user = userMap.get(stat.userId);
                return {
                    rank: startRank + index,
                    userId: stat.userId,
                    name: user?.name || 'Unknown User',
                    username: user?.username ?? undefined,
                    image: user?.image ?? undefined,
                    score: stat.totalProblems,
                    isCurrentUser: stat.userId === includeUser,
                };
            });
            return entries;
        } catch (error) {
            log.error('Error getting daily leaderboard', { date }, error);
            return [];
        }
    },

    /**
     * Get weekly leaderboard
     */
    async getWeeklyLeaderboard(weekStart: Date, options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
        try {
            const { limit = 50, offset = 0, includeUser } = options;
            const startRank = offset + 1;

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const entries = await prisma.trackerEntry.groupBy({
                by: ['userId'],
                where: {
                    date: {
                        gte: weekStart,
                        lt: weekEnd,
                    },
                },
                _sum: {
                    problemsSolved: true,
                },
                orderBy: {
                    _sum: {
                        problemsSolved: 'desc',
                    },
                },
                take: limit,
                skip: offset,
            });

            const userIds = entries.map(e => e.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: userSelect,
            });

            const userMap = new Map(users.map(u => [u.id, u]));

            return entries.map((entry, index) => {
                const user = userMap.get(entry.userId);
                return {
                    rank: startRank + index,
                    userId: entry.userId,
                    name: user?.name || 'Unknown User',
                    username: user?.username ?? undefined,
                    image: user?.image ?? undefined,
                    score: entry._sum?.problemsSolved || 0,
                    isCurrentUser: entry.userId === includeUser,
                };
            });
        } catch (error) {
            log.error('Error getting weekly leaderboard', { weekStart }, error);
            return [];
        }
    },

    /**
     * Get monthly leaderboard
     */
    async getMonthlyLeaderboard(month: Date, options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
        try {
            const { limit = 50, offset = 0, includeUser } = options;
            const startRank = offset + 1;

            const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
            const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);

            const entries = await prisma.trackerEntry.groupBy({
                by: ['userId'],
                where: {
                    date: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                },
                _sum: {
                    problemsSolved: true,
                },
                orderBy: {
                    _sum: {
                        problemsSolved: 'desc',
                    },
                },
                take: limit,
                skip: offset,
            });

            const userIds = entries.map(e => e.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: userSelect,
            });

            const userMap = new Map(users.map(u => [u.id, u]));

            return entries.map((entry, index) => {
                const user = userMap.get(entry.userId);
                return {
                    rank: startRank + index,
                    userId: entry.userId,
                    name: user?.name || 'Unknown User',
                    username: user?.username ?? undefined,
                    image: user?.image ?? undefined,
                    score: entry._sum?.problemsSolved || 0,
                    isCurrentUser: entry.userId === includeUser,
                };
            });
        } catch (error) {
            log.error('Error getting monthly leaderboard', { month }, error);
            return [];
        }
    },

    /**
     * Get streak leaderboard
     */
    async getStreakLeaderboard(options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
        try {
            const { limit = 50, offset = 0, includeUser } = options;
            const startRank = offset + 1;

            const users = await prisma.user.findMany({
                where: {
                    isActive: true,
                    isBanned: false,
                },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    currentStreak: true,
                    longestStreak: true,
                },
                orderBy: [
                    { currentStreak: 'desc' },
                    { longestStreak: 'desc' },
                ],
                take: limit,
                skip: offset,
            });

            return users.map((user, index) => ({
                rank: startRank + index,
                userId: user.id,
                name: user.name || 'Unknown User',
                username: user.username || undefined,
                image: user.image || undefined,
                score: user.currentStreak,
                metadata: {
                    longestStreak: user.longestStreak,
                },
                isCurrentUser: user.id === includeUser,
            }));
        } catch (error) {
            log.error('Error getting streak leaderboard', {}, error);
            return [];
        }
    },

    /**
     * Get platform-specific leaderboard
     */
    async getPlatformLeaderboard(
        platformId: string,
        options: LeaderboardOptions = {}
    ): Promise<LeaderboardEntry[]> {
        try {
            const { limit = 50, offset = 0, includeUser } = options;
            const startRank = offset + 1;

            const entries = await prisma.trackerEntry.groupBy({
                by: ['userId'],
                where: {
                    platformId,
                },
                _sum: {
                    problemsSolved: true,
                },
                orderBy: {
                    _sum: {
                        problemsSolved: 'desc',
                    },
                },
                take: limit,
                skip: offset,
            });

            const userIds = entries.map(e => e.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: userSelect,
            });

            const userMap = new Map(users.map(u => [u.id, u]));

            return entries.map((entry, index) => {
                const user = userMap.get(entry.userId);
                return {
                    rank: startRank + index,
                    userId: entry.userId,
                    name: user?.name || 'Unknown User',
                    username: user?.username ?? undefined,
                    image: user?.image ?? undefined,
                    score: entry._sum?.problemsSolved || 0,
                    isCurrentUser: entry.userId === includeUser,
                };
            });
        } catch (error) {
            log.error('Error getting platform leaderboard', { platformId }, error);
            return [];
        }
    },

    /**
     * Get category leaderboard
     */
    async getCategoryLeaderboard(
        category: PlatformCategory,
        options: LeaderboardOptions = {}
    ): Promise<LeaderboardEntry[]> {
        try {
            const { limit = 50, offset = 0, includeUser } = options;
            const startRank = offset + 1;

            const entries = await prisma.trackerEntry.groupBy({
                by: ['userId'],
                where: {
                    category,
                },
                _sum: {
                    problemsSolved: true,
                },
                orderBy: {
                    _sum: {
                        problemsSolved: 'desc',
                    },
                },
                take: limit,
                skip: offset,
            });

            const userIds = entries.map(e => e.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: userSelect,
            });

            const userMap = new Map(users.map(u => [u.id, u]));

            return entries.map((entry, index) => {
                const user = userMap.get(entry.userId);
                return {
                    rank: startRank + index,
                    userId: entry.userId,
                    name: user?.name || 'Unknown User',
                    username: user?.username ?? undefined,
                    image: user?.image ?? undefined,
                    score: entry._sum?.problemsSolved || 0,
                    isCurrentUser: entry.userId === includeUser,
                };
            });
        } catch (error) {
            log.error('Error getting category leaderboard', { category }, error);
            return [];
        }
    },

    /**
     * Get friends leaderboard
     */
    async getFriendsLeaderboard(userId: string, options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
        try {
            const { limit = 50, offset = 0 } = options;
            const startRank = offset + 1;

            // Note: Follow model doesn't exist in schema yet
            // For now, return just the current user
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: userSelect,
            });

            if (!user) {
                return [];
            }

            return [{
                rank: 1,
                userId: user.id,
                name: user.name || 'Unknown User',
                username: user.username || undefined,
                image: user.image || undefined,
                score: user.totalPoints,
                isCurrentUser: true,
            }];
        } catch (error) {
            log.error('Error getting friends leaderboard', { userId }, error);
            return [];
        }
    },

    /**
     * Get user's rank in specific leaderboard
     */
    async getUserRank(userId: string, type: LeaderboardType): Promise<RankInfo> {
        try {
            let rank = 0;
            let score = 0;
            let total = 0;

            switch (type) {
                case 'global': {
                    const user = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { totalPoints: true },
                    });

                    if (!user) throw new Error('User not found');

                    score = user.totalPoints;

                    const higherRanked = await prisma.user.count({
                        where: {
                            totalPoints: { gt: score },
                            isActive: true,
                        },
                    });

                    rank = higherRanked + 1;
                    total = await prisma.user.count({ where: { isActive: true } });
                    break;
                }

                case 'streak': {
                    const user = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { currentStreak: true },
                    });

                    if (!user) throw new Error('User not found');

                    score = user.currentStreak;

                    const higherRanked = await prisma.user.count({
                        where: {
                            currentStreak: { gt: score },
                            isActive: true,
                        },
                    });

                    rank = higherRanked + 1;
                    total = await prisma.user.count({ where: { isActive: true } });
                    break;
                }

                default:
                    throw new Error(`Rank calculation not implemented for type: ${type}`);
            }

            const percentile = total > 0 ? ((total - rank + 1) / total) * 100 : 0;

            return {
                rank,
                score,
                total,
                percentile,
            };
        } catch (error) {
            log.error('Error getting user rank', { userId, type }, error);
            throw error;
        }
    },

    /**
     * Get nearby users in leaderboard
     */
    async getNearbyUsers(
        userId: string,
        type: LeaderboardType,
        range: number = 5
    ): Promise<LeaderboardEntry[]> {
        try {
            const rankInfo = await this.getUserRank(userId, type);
            const start = Math.max(1, rankInfo.rank - range);
            const limit = range * 2 + 1;

            const leaderboard = await this.getGlobalLeaderboard({
                limit,
                offset: start - 1,
                includeUser: userId,
            });

            return leaderboard;
        } catch (error) {
            log.error('Error getting nearby users', { userId, type }, error);
            return [];
        }
    },

    /**
     * Update all user ranks (cron job)
     */
    async updateRanks(): Promise<void> {
        try {
            const users = await prisma.user.findMany({
                where: {
                    isActive: true,
                    isBanned: false,
                },
                select: {
                    id: true,
                    totalPoints: true,
                },
                orderBy: {
                    totalPoints: 'desc',
                },
            });

            // Update ranks in batches
            const batchSize = 100;
            for (let i = 0; i < users.length; i += batchSize) {
                const batch = users.slice(i, i + batchSize);

                await Promise.all(
                    batch.map((user, index) =>
                        prisma.user.update({
                            where: { id: user.id },
                            data: { rank: i + index + 1 },
                        })
                    )
                );
            }

            log.info('Ranks updated', { totalUsers: users.length });
        } catch (error) {
            log.error('Error updating ranks', {}, error);
        }
    },

    /**
     * Invalidate leaderboard cache
     */
    async invalidateLeaderboardCache(type: LeaderboardType): Promise<void> {
        try {
            // Clear all caches for this type
            for (const key of leaderboardCache.keys()) {
                if (key.startsWith(`${type}:`)) {
                    leaderboardCache.delete(key);
                }
            }

            log.info('Leaderboard cache invalidated', { type });
        } catch (error) {
            log.error('Error invalidating cache', { type }, error);
        }
    },

    /**
     * Get cached leaderboard
     */
    _getCached(key: string): LeaderboardEntry[] | null {
        const cached = leaderboardCache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > CACHE_TTL) {
            leaderboardCache.delete(key);
            return null;
        }

        return cached.data;
    },

    /**
     * Set cache
     */
    _setCache(key: string, data: LeaderboardEntry[]): void {
        leaderboardCache.set(key, {
            data,
            timestamp: Date.now(),
        });
    },
};

export default leaderboardService;
