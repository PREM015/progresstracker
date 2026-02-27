/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: services/searchService.ts
// PURPOSE: Unified search service across all entities
// ============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { PlatformCategory } from '@prisma/client';

const log = logger.child({ service: 'SearchService' });

// =============================================================================
// TYPES
// =============================================================================

export interface SearchOptions {
    limit?: number;
    offset?: number;
    includeUsers?: boolean;
    includeGoals?: boolean;
    includeAchievements?: boolean;
    includePlatforms?: boolean;
    includeEntries?: boolean;
}

export interface SearchResults {
    users: UserSearchResult[];
    goals: GoalSearchResult[];
    achievements: AchievementSearchResult[];
    platforms: PlatformSearchResult[];
    entries: EntrySearchResult[];
    total: number;
}

export interface UserSearchResult {
    id: string;
    name: string;
    email?: string;
    username?: string;
    image?: string;
    bio?: string;
}

export interface GoalSearchResult {
    id: string;
    title: string;
    description?: string;
    category?: string;
    targetValue: number;
    currentValue: number;
    status: string;
}

export interface AchievementSearchResult {
    id: string;
    title: string;
    description: string;
    icon?: string;
    category?: string;
    rarity?: string;
}

export interface PlatformSearchResult {
    id: string;
    name: string;
    category: PlatformCategory;
    website?: string;
    description?: string;
}

export interface EntrySearchResult {
    id: string;
    platformName: string;
    category: PlatformCategory;
    notes?: string;
    date: Date;
    problemsSolved: number;
}

export interface AutocompleteResult {
    value: string;
    label: string;
    type: string;
    metadata?: Record<string, unknown>;
}

// =============================================================================
// SERVICE METHODS
// =============================================================================

export const searchService = {
    /**
     * Search across all entity types
     */
    async searchAll(
        query: string,
        userId: string,
        options: SearchOptions = {}
    ): Promise<SearchResults> {
        try {
            const {
                limit = 20,
                offset = 0,
                includeUsers = true,
                includeGoals = true,
                includeAchievements = true,
                includePlatforms = true,
                includeEntries = true,
            } = options;

            const searchTerm = query.trim().toLowerCase();

            if (!searchTerm) {
                return {
                    users: [],
                    goals: [],
                    achievements: [],
                    platforms: [],
                    entries: [],
                    total: 0,
                };
            }

            const [users, goals, achievements, platforms, entries] = await Promise.all([
                includeUsers ? this.searchUsers(searchTerm, { limit: 5 }) : Promise.resolve([]),
                includeGoals ? this.searchGoals(searchTerm, userId, { limit: 10 }) : Promise.resolve([]),
                includeAchievements ? this.searchAchievements(searchTerm, { limit: 10 }) : Promise.resolve([]),
                includePlatforms ? this.searchPlatforms(searchTerm, { limit: 10 }) : Promise.resolve([]),
                includeEntries ? this.searchEntries(searchTerm, userId, { limit: 10 }) : Promise.resolve([]),
            ]);

            const total = users.length + goals.length + achievements.length + platforms.length + entries.length;

            log.info('Search completed', {
                query: searchTerm,
                userId,
                total,
            });

            return {
                users,
                goals,
                achievements,
                platforms,
                entries,
                total,
            };
        } catch (error) {
            log.error('Error in searchAll', { query, userId }, error);
            throw error;
        }
    },

    /**
     * Search users
     */
    async searchUsers(
        query: string,
        options: { limit?: number; offset?: number; publicOnly?: boolean } = {}
    ): Promise<UserSearchResult[]> {
        try {
            const { limit = 10, offset = 0, publicOnly = false } = options;
            const searchTerm = `%${query.toLowerCase()}%`;

            const users = await prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } },
                        { username: { contains: query, mode: 'insensitive' } },
                    ],
                    isActive: true,
                    isBanned: false,
                    ...(publicOnly ? { settings: { publicProfile: true } } : {}),
                },
                select: {
                    id: true,
                    name: true,
                    email: publicOnly ? false : true,
                    username: true,
                    image: true,
                    bio: true,
                },
                take: limit,
                skip: offset,
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return users as UserSearchResult[];
        } catch (error) {
            log.error('Error searching users', { query }, error);
            return [];
        }
    },

    /**
     * Search goals
     */
    async searchGoals(
        query: string,
        userId: string,
        options: { limit?: number; offset?: number; status?: string } = {}
    ): Promise<GoalSearchResult[]> {
        try {
            const { limit = 10, offset = 0, status } = options;

            const goals = await prisma.goal.findMany({
                where: {
                    userId,
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                    ...(status ? { status: status as any } : {}),
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    category: true,
                    target: true,
                    progress: true,
                    status: true,
                },
                take: limit,
                skip: offset,
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return goals.map(g => ({
                id: g.id,
                title: g.title,
                description: g.description || undefined,
                category: g.category,
                targetValue: g.target,
                currentValue: g.progress,
                status: g.status,
            }));
        } catch (error) {
            log.error('Error searching goals', { query, userId }, error);
            return [];
        }
    },

    /**
     * Search achievements
     */
    async searchAchievements(
        query: string,
        options: { limit?: number; offset?: number; category?: string } = {}
    ): Promise<AchievementSearchResult[]> {
        try {
            const { limit = 10, offset = 0, category } = options;

            const achievements = await prisma.achievement.findMany({
                where: {
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                    ...(category ? { category: category as any } : {}),
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    icon: true,
                    category: true,
                    rarity: true,
                },
                take: limit,
                skip: offset,
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return achievements.map(a => ({
                id: a.id,
                title: a.title,
                description: a.description,
                icon: a.icon || undefined,
                category: a.category,
                rarity: a.rarity,
            }));
        } catch (error) {
            log.error('Error searching achievements', { query }, error);
            return [];
        }
    },

    /**
     * Search platforms
     */
    async searchPlatforms(
        query: string,
        options: { limit?: number; offset?: number; category?: PlatformCategory } = {}
    ): Promise<PlatformSearchResult[]> {
        try {
            const { limit = 10, offset = 0, category } = options;

            const platforms = await prisma.platform.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                    ...(category ? { category } : {}),
                },
                select: {
                    id: true,
                    name: true,
                    category: true,
                    website: true,
                    description: true,
                },
                take: limit,
                skip: offset,
                orderBy: {
                    name: 'asc',
                },
            });

            return platforms.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                website: p.website || undefined,
                description: p.description || undefined,
            }));
        } catch (error) {
            log.error('Error searching platforms', { query }, error);
            return [];
        }
    },

    /**
     * Search tracker entries
     */
    async searchEntries(
        query: string,
        userId: string,
        options: { limit?: number; offset?: number; category?: PlatformCategory } = {}
    ): Promise<EntrySearchResult[]> {
        try {
            const { limit = 10, offset = 0, category } = options;

            const entries = await prisma.trackerEntry.findMany({
                where: {
                    userId,
                    OR: [
                        { notes: { contains: query, mode: 'insensitive' } },
                        { platform: { name: { contains: query, mode: 'insensitive' } } },
                    ],
                    ...(category ? { category } : {}),
                },
                select: {
                    id: true,
                    platform: {
                        select: {
                            name: true,
                        },
                    },
                    category: true,
                    notes: true,
                    date: true,
                    problemsSolved: true,
                },
                take: limit,
                skip: offset,
                orderBy: {
                    date: 'desc',
                },
            });

            return entries.map(entry => ({
                id: entry.id,
                platformName: entry.platform?.name || 'Unknown',
                category: entry.category || 'OTHER' as PlatformCategory,
                notes: entry.notes || undefined,
                date: entry.date,
                problemsSolved: entry.problemsSolved,
            }));
        } catch (error) {
            log.error('Error searching entries', { query, userId }, error);
            return [];
        }
    },

    /**
     * Get autocomplete suggestions
     */
    async getAutocomplete(
        query: string,
        type: 'all' | 'users' | 'goals' | 'platforms' | 'achievements' = 'all'
    ): Promise<AutocompleteResult[]> {
        try {
            const results: AutocompleteResult[] = [];
            const searchTerm = query.trim().toLowerCase();

            if (!searchTerm) {
                return [];
            }

            if (type === 'all' || type === 'users') {
                const users = await prisma.user.findMany({
                    where: {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { username: { contains: query, mode: 'insensitive' } },
                        ],
                        isActive: true,
                    },
                    select: { id: true, name: true, username: true },
                    take: 5,
                });

                results.push(...users.map(u => ({
                    value: u.id,
                    label: u.name || u.username || 'Unknown User',
                    type: 'user',
                    metadata: { username: u.username },
                })));
            }

            if (type === 'all' || type === 'platforms') {
                const platforms = await prisma.platform.findMany({
                    where: {
                        name: { contains: query, mode: 'insensitive' },
                    },
                    select: { id: true, name: true, category: true },
                    take: 5,
                });

                results.push(...platforms.map(p => ({
                    value: p.id,
                    label: p.name,
                    type: 'platform',
                    metadata: { category: p.category },
                })));
            }

            if (type === 'all' || type === 'goals') {
                const goals = await prisma.goal.findMany({
                    where: {
                        title: { contains: query, mode: 'insensitive' },
                    },
                    select: { id: true, title: true, status: true },
                    take: 5,
                });

                results.push(...goals.map(g => ({
                    value: g.id,
                    label: g.title,
                    type: 'goal',
                    metadata: { status: g.status },
                })));
            }

            if (type === 'all' || type === 'achievements') {
                const achievements = await prisma.achievement.findMany({
                    where: {
                        title: { contains: query, mode: 'insensitive' },
                    },
                    select: { id: true, title: true, rarity: true },
                    take: 5,
                });

                results.push(...achievements.map(a => ({
                    value: a.id,
                    label: a.title,
                    type: 'achievement',
                    metadata: { rarity: a.rarity },
                })));
            }

            return results.slice(0, 20);
        } catch (error) {
            log.error('Error getting autocomplete', { query, type }, error);
            return [];
        }
    },

    /**
     * Save recent search for user
     */
    async saveRecentSearch(userId: string, query: string): Promise<void> {
        try {
            const cleanQuery = query.trim();
            if (!cleanQuery) return;

            // Delete existing identical search to bring it to top
            await prisma.recentSearch.deleteMany({
                where: {
                    userId,
                    query: cleanQuery,
                },
            });

            // Create new entry
            await prisma.recentSearch.create({
                data: {
                    userId,
                    query: cleanQuery,
                },
            });

            // Clean up old searches (keep last 10)
            const count = await prisma.recentSearch.count({
                where: { userId },
            });

            if (count > 10) {
                const oldSearches = await prisma.recentSearch.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    skip: 10,
                    select: { id: true },
                });

                if (oldSearches.length > 0) {
                    await prisma.recentSearch.deleteMany({
                        where: {
                            id: { in: oldSearches.map(s => s.id) },
                        },
                    });
                }
            }
        } catch (error) {
            log.error('Error saving recent search', { userId, query }, error);
        }
    },

    /**
     * Get recent searches for user
     */
    async getRecentSearches(userId: string): Promise<string[]> {
        try {
            const searches = await prisma.recentSearch.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { query: true },
            });

            return searches.map(s => s.query);
        } catch (error) {
            log.error('Error getting recent searches', { userId }, error);
            return [];
        }
    },

    /**
     * Get popular searches across all users
     */
    async getPopularSearches(): Promise<string[]> {
        try {
            // In a real implementation, you'd track search queries in a separate table
            // For now, return some common search terms
            return [
                'LeetCode',
                'GitHub',
                'CodeForces',
                'HackerRank',
                'Kaggle',
            ];
        } catch (error) {
            log.error('Error getting popular searches', {}, error);
            return [];
        }
    },
};

export default searchService;
