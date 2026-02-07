// ============================================================================
// FILE: services/analyticsAggregationService.ts
// PURPOSE: Analytics aggregation and computation service
// ============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { PlatformCategory } from '@prisma/client';

const log = logger.child({ service: 'AnalyticsAggregationService' });

// =============================================================================
// TYPES
// =============================================================================

export interface DailyStats {
    date: Date;
    totalProblems: number;
    totalCommits: number;
    totalPullRequests: number;
    totalTimeSpent: number;
    totalPoints: number;
    platformBreakdown: Record<string, unknown>;
    categoryBreakdown: Record<string, unknown>;
}

export interface WeeklyStats {
    weekStart: Date;
    weekEnd: Date;
    totalProblems: number;
    totalCommits: number;
    dailyAverage: number;
    uniquePlatforms: number;
    topPlatforms: Array<{ platform: string; count: number }>;
    topCategories: Array<{ category: PlatformCategory; count: number }>;
}

export interface MonthlyStats {
    month: Date;
    totalProblems: number;
    totalCommits: number;
    dailyAverage: number;
    weeklyAverage: number;
    uniquePlatforms: number;
    growth: number;
    topPerformers: Array<{ platform: string; count: number }>;
}

export interface DateRange {
    start: Date;
    end: Date;
}

export interface TrendData {
    metric: string;
    data: Array<{
        date: Date;
        value: number;
        change?: number;
    }>;
    overall: {
        total: number;
        average: number;
        trend: 'up' | 'down' | 'stable';
        changePercent: number;
    };
}

export interface Comparison {
    period1: {
        start: Date;
        end: Date;
        value: number;
    };
    period2: {
        start: Date;
        end: Date;
        value: number;
    };
    change: number;
    changePercent: number;
    improvement: boolean;
}

export interface Insight {
    type: 'achievement' | 'warning' | 'suggestion' | 'milestone';
    title: string;
    description: string;
    metric?: string;
    value?: number;
    priority: 'low' | 'medium' | 'high';
}

export interface TopPerformer {
    id: string;
    name: string;
    value: number;
    category?: string;
}

export interface PlatformBreakdown {
    platforms: Array<{
        id: string;
        name: string;
        count: number;
        percentage: number;
    }>;
    total: number;
}

export interface CategoryBreakdown {
    categories: Array<{
        category: PlatformCategory;
        count: number;
        percentage: number;
    }>;
    total: number;
}

export interface ProductivityScore {
    score: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    factors: {
        consistency: number;
        volume: number;
        diversity: number;
        streaks: number;
    };
    suggestions: string[];
}

// =============================================================================
// SERVICE METHODS
// =============================================================================

export const analyticsAggregationService = {
    /**
     * Aggregate daily statistics for a user
     */
    async aggregateDailyStats(userId: string, date: Date): Promise<DailyStats> {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const entries = await prisma.trackerEntry.findMany({
                where: {
                    userId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                include: {
                    platform: {
                        select: {
                            name: true,
                            category: true,
                        },
                    },
                },
            });

            const totalProblems = entries.reduce((sum, e) => sum + (e.problemsSolved || 0), 0);
            const totalCommits = entries.reduce((sum, e) => sum + (e.commits || 0), 0);
            const totalPullRequests = entries.reduce((sum, e) => sum + (e.pullRequests || 0), 0);
            const totalTimeSpent = entries.reduce((sum, e) => sum + (e.timeSpent || 0), 0);
            const totalPoints = entries.reduce((sum, e) => sum + (e.points || 0), 0);

            const platformBreakdown: Record<string, number> = {};
            const categoryBreakdown: Record<string, number> = {};

            entries.forEach(entry => {
                if (entry.platform && entry.category) {
                    const problemCount = entry.problemsSolved || 0;
                    platformBreakdown[entry.platform.name] =
                        (platformBreakdown[entry.platform.name] || 0) + problemCount;

                    categoryBreakdown[entry.category] =
                        (categoryBreakdown[entry.category] || 0) + problemCount;
                }
            });

            // Update or create daily stats record
            await prisma.dailyStats.upsert({
                where: {
                    userId_date: {
                        userId,
                        date: startOfDay,
                    },
                },
                create: {
                    userId,
                    date: startOfDay,
                    totalProblems,
                    totalCommits,
                    totalPullRequests,
                    totalTimeSpent,
                    totalPoints,
                    platformBreakdown,
                    categoryBreakdown,
                    hadActivity: totalProblems > 0 || totalCommits > 0,
                },
                update: {
                    totalProblems,
                    totalCommits,
                    totalPullRequests,
                    totalTimeSpent,
                    totalPoints,
                    platformBreakdown,
                    categoryBreakdown,
                    hadActivity: totalProblems > 0 || totalCommits > 0,
                },
            });

            log.info('Daily stats aggregated', { userId, date, totalProblems });

            return {
                date: startOfDay,
                totalProblems,
                totalCommits,
                totalPullRequests,
                totalTimeSpent,
                totalPoints,
                platformBreakdown,
                categoryBreakdown,
            };
        } catch (error) {
            log.error('Error aggregating daily stats', { userId, date }, error);
            throw error;
        }
    },

    /**
     * Aggregate weekly statistics
     */
    async aggregateWeeklyStats(userId: string, weekStart: Date): Promise<WeeklyStats> {
        try {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const entries = await prisma.trackerEntry.findMany({
                where: {
                    userId,
                    date: {
                        gte: weekStart,
                        lt: weekEnd,
                    },
                },
                include: {
                    platform: {
                        select: {
                            name: true,
                            category: true,
                        },
                    },
                },
            });

            const totalProblems = entries.reduce((sum, e) => sum + (e.problemsSolved || 0), 0);
            const totalCommits = entries.reduce((sum, e) => sum + (e.commits || 0), 0);
            const dailyAverage = totalProblems / 7;
            const uniquePlatforms = new Set(entries.map(e => e.platformId).filter(Boolean)).size;

            // Calculate top platforms
            const platformCounts = new Map<string, number>();
            entries.forEach(entry => {
                if (entry.platform) {
                    const current = platformCounts.get(entry.platform.name) || 0;
                    platformCounts.set(entry.platform.name, current + (entry.problemsSolved || 0));
                }
            });

            const topPlatforms = Array.from(platformCounts.entries())
                .map(([platform, count]) => ({ platform, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            // Calculate top categories
            const categoryCounts = new Map<PlatformCategory, number>();
            entries.forEach(entry => {
                if (entry.category) {
                    const current = categoryCounts.get(entry.category) || 0;
                    categoryCounts.set(entry.category, current + (entry.problemsSolved || 0));
                }
            });

            const topCategories = Array.from(categoryCounts.entries())
                .map(([category, count]) => ({ category, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);

            return {
                weekStart,
                weekEnd,
                totalProblems,
                totalCommits,
                dailyAverage,
                uniquePlatforms,
                topPlatforms,
                topCategories,
            };
        } catch (error) {
            log.error('Error aggregating weekly stats', { userId, weekStart }, error);
            throw error;
        }
    },

    /**
     * Aggregate monthly statistics
     */
    async aggregateMonthlyStats(userId: string, month: Date): Promise<MonthlyStats> {
        try {
            const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
            const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);

            const entries = await prisma.trackerEntry.findMany({
                where: {
                    userId,
                    date: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                },
                include: {
                    platform: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

            const totalProblems = entries.reduce((sum, e) => sum + (e.problemsSolved || 0), 0);
            const totalCommits = entries.reduce((sum, e) => sum + (e.commits || 0), 0);
            const daysInMonth = monthEnd.getDate();
            const weeksInMonth = Math.ceil(daysInMonth / 7);
            const dailyAverage = totalProblems / daysInMonth;
            const weeklyAverage = totalProblems / weeksInMonth;
            const uniquePlatforms = new Set(entries.map(e => e.platformId).filter(Boolean)).size;

            // Calculate growth compared to previous month
            const prevMonthStart = new Date(month.getFullYear(), month.getMonth() - 1, 1);
            const prevMonthEnd = new Date(month.getFullYear(), month.getMonth(), 0);

            const prevMonthCount = await prisma.trackerEntry.aggregate({
                where: {
                    userId,
                    date: {
                        gte: prevMonthStart,
                        lte: prevMonthEnd,
                    },
                },
                _sum: {
                    problemsSolved: true,
                },
            });

            const prevTotal = prevMonthCount._sum?.problemsSolved || 0;
            const growth = prevTotal > 0 ? ((totalProblems - prevTotal) / prevTotal) * 100 : 0;

            // Top performers
            const platformCounts = new Map<string, number>();
            entries.forEach(entry => {
                if (entry.platform) {
                    const current = platformCounts.get(entry.platform.name) || 0;
                    platformCounts.set(entry.platform.name, current + (entry.problemsSolved || 0));
                }
            });

            const topPerformers = Array.from(platformCounts.entries())
                .map(([platform, count]) => ({ platform, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return {
                month: monthStart,
                totalProblems,
                totalCommits,
                dailyAverage,
                weeklyAverage,
                uniquePlatforms,
                growth,
                topPerformers,
            };
        } catch (error) {
            log.error('Error aggregating monthly stats', { userId, month }, error);
            throw error;
        }
    },

    /**
     * Compute trends over a date range
     */
    async computeTrends(userId: string, dateRange: DateRange): Promise<TrendData> {
        try {
            const dailyStats = await prisma.dailyStats.findMany({
                where: {
                    userId,
                    date: {
                        gte: dateRange.start,
                        lte: dateRange.end,
                    },
                },
                orderBy: {
                    date: 'asc',
                },
            });

            const data = dailyStats.map((stat, index) => ({
                date: stat.date,
                value: stat.totalProblems,
                change: index > 0 ? stat.totalProblems - dailyStats[index - 1].totalProblems : 0,
            }));

            const total = dailyStats.reduce((sum, stat) => sum + stat.totalProblems, 0);
            const average = dailyStats.length > 0 ? total / dailyStats.length : 0;

            // Calculate trend
            const firstHalf = dailyStats.slice(0, Math.floor(dailyStats.length / 2));
            const secondHalf = dailyStats.slice(Math.floor(dailyStats.length / 2));

            const firstHalfAvg = firstHalf.length > 0
                ? firstHalf.reduce((sum, s) => sum + s.totalProblems, 0) / firstHalf.length
                : 0;
            const secondHalfAvg = secondHalf.length > 0
                ? secondHalf.reduce((sum, s) => sum + s.totalProblems, 0) / secondHalf.length
                : 0;

            const changePercent = firstHalfAvg > 0
                ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
                : 0;

            const trend =
                changePercent > 5 ? 'up' :
                    changePercent < -5 ? 'down' :
                        'stable';

            return {
                metric: 'daily_problems',
                data,
                overall: {
                    total,
                    average,
                    trend,
                    changePercent,
                },
            };
        } catch (error) {
            log.error('Error computing trends', { userId, dateRange }, error);
            throw error;
        }
    },

    /**
     * Compare two time periods
     */
    async comparePeriods(
        userId: string,
        period1: DateRange,
        period2: DateRange
    ): Promise<Comparison> {
        try {
            const [count1, count2] = await Promise.all([
                prisma.trackerEntry.aggregate({
                    where: {
                        userId,
                        date: {
                            gte: period1.start,
                            lte: period1.end,
                        },
                    },
                    _sum: { problemsSolved: true },
                }),
                prisma.trackerEntry.aggregate({
                    where: {
                        userId,
                        date: {
                            gte: period2.start,
                            lte: period2.end,
                        },
                    },
                    _sum: { problemsSolved: true },
                }),
            ]);

            const value1 = count1._sum?.problemsSolved || 0;
            const value2 = count2._sum?.problemsSolved || 0;

            const change = value2 - value1;
            const changePercent = value1 > 0 ? (change / value1) * 100 : 0;
            const improvement = change > 0;

            return {
                period1: { ...period1, value: value1 },
                period2: { ...period2, value: value2 },
                change,
                changePercent,
                improvement,
            };
        } catch (error) {
            log.error('Error comparing periods', { userId, period1, period2 }, error);
            throw error;
        }
    },

    /**
     * Generate insights from aggregated stats
     */
    async generateInsights(userId: string, stats: DailyStats): Promise<Insight[]> {
        try {
            const insights: Insight[] = [];

            // Check for milestones
            if (stats.totalProblems >= 100) {
                insights.push({
                    type: 'milestone',
                    title: 'Century Achieved!',
                    description: `You've solved ${stats.totalProblems} problems today!`,
                    metric: 'daily_problems',
                    value: stats.totalProblems,
                    priority: 'high',
                });
            }

            // Check for low activity
            if (stats.totalProblems < 5) {
                insights.push({
                    type: 'warning',
                    title: 'Low Activity Today',
                    description: 'Your activity is lower than usual. Consider setting a goal to stay consistent.',
                    metric: 'daily_problems',
                    value: stats.totalProblems,
                    priority: 'medium',
                });
            }

            return insights;
        } catch (error) {
            log.error('Error generating insights', { userId }, error);
            return [];
        }
    },

    /**
     * Get top performers for a metric
     */
    async getTopPerformers(metric: string, limit: number = 10): Promise<TopPerformer[]> {
        try {
            const users = await prisma.user.findMany({
                where: {
                    isActive: true,
                    isBanned: false,
                },
                select: {
                    id: true,
                    name: true,
                    totalPoints: true,
                },
                orderBy: {
                    totalPoints: 'desc',
                },
                take: limit,
            });

            return users.map(u => ({
                id: u.id,
                name: u.name || 'Unknown User',
                value: u.totalPoints,
            }));
        } catch (error) {
            log.error('Error getting top performers', { metric }, error);
            return [];
        }
    },

    /**
     * Compute platform breakdown
     */
    async computePlatformBreakdown(userId: string, dateRange: DateRange): Promise<PlatformBreakdown> {
        try {
            const entries = await prisma.trackerEntry.groupBy({
                by: ['platformId'],
                where: {
                    userId,
                    platformId: { not: null },
                    date: {
                        gte: dateRange.start,
                        lte: dateRange.end,
                    },
                },
                _sum: {
                    problemsSolved: true,
                },
            });

            const platformIds = entries.map(e => e.platformId).filter((id): id is string => id !== null);
            const platforms = await prisma.platform.findMany({
                where: { id: { in: platformIds } },
                select: { id: true, name: true },
            });

            const platformMap = new Map(platforms.map(p => [p.id, p.name]));
            const total = entries.reduce((sum, e) => sum + (e._sum?.problemsSolved || 0), 0);

            const platformBreakdown = entries
                .filter(e => e.platformId !== null)
                .map(e => ({
                    id: e.platformId as string,
                    name: platformMap.get(e.platformId as string) || 'Unknown',
                    count: e._sum?.problemsSolved || 0,
                    percentage: total > 0 ? ((e._sum?.problemsSolved || 0) / total) * 100 : 0,
                }));

            return {
                platforms: platformBreakdown.sort((a, b) => b.count - a.count),
                total,
            };
        } catch (error) {
            log.error('Error computing platform breakdown', { userId, dateRange }, error);
            throw error;
        }
    },

    /**
     * Compute category breakdown
     */
    async computeCategoryBreakdown(userId: string, dateRange: DateRange): Promise<CategoryBreakdown> {
        try {
            const entries = await prisma.trackerEntry.groupBy({
                by: ['category'],
                where: {
                    userId,
                    category: { not: null },
                    date: {
                        gte: dateRange.start,
                        lte: dateRange.end,
                    },
                },
                _sum: {
                    problemsSolved: true,
                },
            });

            const total = entries.reduce((sum, e) => sum + (e._sum?.problemsSolved || 0), 0);

            const categoryBreakdown = entries
                .filter(e => e.category !== null)
                .map(e => ({
                    category: e.category as PlatformCategory,
                    count: e._sum?.problemsSolved || 0,
                    percentage: total > 0 ? ((e._sum?.problemsSolved || 0) / total) * 100 : 0,
                }));

            return {
                categories: categoryBreakdown.sort((a, b) => b.count - a.count),
                total,
            };
        } catch (error) {
            log.error('Error computing category breakdown', { userId, dateRange }, error);
            throw error;
        }
    },

    /**
     * Calculate productivity score
     */
    async getProductivityScore(userId: string, dateRange: DateRange): Promise<ProductivityScore> {
        try {
            const [entries, dailyStats, user] = await Promise.all([
                prisma.trackerEntry.findMany({
                    where: {
                        userId,
                        date: {
                            gte: dateRange.start,
                            lte: dateRange.end,
                        },
                    },
                }),
                prisma.dailyStats.findMany({
                    where: {
                        userId,
                        date: {
                            gte: dateRange.start,
                            lte: dateRange.end,
                        },
                    },
                }),
                prisma.user.findUnique({
                    where: { id: userId },
                    select: { currentStreak: true },
                }),
            ]);

            // Calculate factors
            const totalDays = Math.ceil(
                (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
            );
            const activeDays = dailyStats.length;
            const consistency = (activeDays / totalDays) * 100;

            const totalProblems = entries.reduce((sum, e) => sum + (e.problemsSolved || 0), 0);
            const volume = Math.min((totalProblems / totalDays / 10) * 100, 100);

            const uniquePlatforms = new Set(entries.map(e => e.platformId).filter(Boolean)).size;
            const diversity = Math.min((uniquePlatforms / 5) * 100, 100);

            const streaks = Math.min(((user?.currentStreak || 0) / 30) * 100, 100);

            // Calculate overall score
            const score = (consistency * 0.3 + volume * 0.3 + diversity * 0.2 + streaks * 0.2);

            // Determine grade
            const grade =
                score >= 95 ? 'A+' :
                    score >= 90 ? 'A' :
                        score >= 80 ? 'B' :
                            score >= 70 ? 'C' :
                                score >= 60 ? 'D' : 'F';

            // Generate suggestions
            const suggestions: string[] = [];
            if (consistency < 70) suggestions.push('Try to be active every day to build consistency');
            if (volume < 70) suggestions.push('Increase your daily activity volume');
            if (diversity < 50) suggestions.push('Explore more platforms to diversify your progress');
            if (streaks < 50) suggestions.push('Build and maintain longer streaks');

            return {
                score: Math.round(score),
                grade,
                factors: {
                    consistency,
                    volume,
                    diversity,
                    streaks,
                },
                suggestions,
            };
        } catch (error) {
            log.error('Error calculating productivity score', { userId, dateRange }, error);
            throw error;
        }
    },
};

export default analyticsAggregationService;
