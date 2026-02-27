import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, startOfWeek, subDays, startOfMonth, format, eachDayOfInterval, differenceInDays } from 'date-fns';
import { logger } from '@/lib/logger';
import { PlatformCategory } from '@prisma/client';
import { CacheService } from './cacheService';

// =============================================================================
// STRICT DASHBOARD DATA CONTRACT
// =============================================================================
// This is the single source of truth for the dashboard API response shape.
// Frontend types must match this contract exactly.

export interface DashboardUser {
    name: string;
    rank: number | string;
    streak: {
        current: number;
        longest: number;
        lastActivity: string | null;
    };
    totals: {
        problems: number;
        commits: number;
        points: number;
    };
}

export interface DashboardStats {
    today: { problems: number; commits: number; time: number; points: number };
    week: { problems: number; commits: number; time: number; activeDays: number };
    month: { problems: number; commits: number; time: number };
}

export interface DashboardChartEntry {
    date: string;
    label: string;
    problems: number;
    commits: number;
    time: number;
}

export interface DashboardGoal {
    id: string;
    title: string;
    progress: number;
    target: number;
    deadline: string | null;
    category: string;
    percentage: number;
}

export interface DashboardActivity {
    id: string;
    date: string;
    platform: string;
    icon?: string | null;
    color?: string | null;
    problems: number;
    commits: number;
    time: number;
}

export interface DashboardPlatform {
    name: string;
    icon?: string | null;
    color?: string | null;
    stats: { problems: number; time: number; points: number };
}

export interface DashboardCategory {
    name: string;
    count: number;
    color: string;
    value: number;
    percentage: number;
}

export interface DashboardInsight {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: string;
    color: string;
}

export interface DashboardMeta {
    connectedPlatformsCount: number;
    generatedAt: string;
}

export interface DashboardData {
    user: DashboardUser;
    stats: DashboardStats;
    chart: DashboardChartEntry[];
    goals: DashboardGoal[];
    activity: DashboardActivity[];
    platforms: DashboardPlatform[];
    categories: DashboardCategory[];
    insights: DashboardInsight[];
    meta: DashboardMeta;
}

const CATEGORY_CONFIG: Record<PlatformCategory, { label: string; color: string; icon: string }> = {
    DSA: { label: 'DSA & Competitive', color: '#3B82F6', icon: 'Code' },
    JOB: { label: 'Job Search', color: '#10B981', icon: 'Briefcase' },
    GIT: { label: 'Version Control', color: '#6366F1', icon: 'GitBranch' },
    LEARNING: { label: 'Learning', color: '#F59E0B', icon: 'BookOpen' },
    HACKATHON: { label: 'Hackathons', color: '#EC4899', icon: 'Zap' },
    OPENSOURCE: { label: 'Open Source', color: '#8B5CF6', icon: 'Globe' },
    COMPANY: { label: 'Company Prep', color: '#EF4444', icon: 'Building' },
    DESIGN: { label: 'Design', color: '#14B8A6', icon: 'Palette' },
    DATA_SCIENCE: { label: 'Data Science', color: '#06B6D4', icon: 'BarChart' },
    OTHER: { label: 'Other', color: '#6B7280', icon: 'MoreHorizontal' },
};

export class AnalyticsService {

    /**
     * Get comprehensive dashboard data in a single parallel execution
     */
    static async getDashboardData(userId: string): Promise<DashboardData> {
        // --- Redis Cache Layer ---
        const CACHE_KEY = `stats:dashboard:data:${userId}`;
        const CACHE_TTL = 120; // 2 minutes

        try {
            const cached = await CacheService.get(CACHE_KEY) as DashboardData | null;
            if (cached) {
                logger.info('Dashboard served from cache', { userId });
                return cached;
            }
        } catch { /* cache miss, proceed to DB */ }

        const queryStart = Date.now();
        const now = new Date();
        const today = startOfDay(now);
        const weekStart = startOfWeek(now);
        const monthStart = startOfMonth(now);
        const last30Days = startOfDay(subDays(now, 30));

        // Parallel fetching
        const [
            user,
            todayEntries,
            weekEntries,
            monthEntries,
            activeGoals,
            recentActivity,
            connectedPlatforms,
            platformStats,
            categoryStats,
            rawInsightsPrevWeek, // Renamed to avoid conflict with rawInsights variable in the instruction
            last7DaysEntries // Added for chart accuracy
        ] = await Promise.all([
            // 1. User Stats & Streak
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    name: true,
                    currentStreak: true,
                    longestStreak: true,
                    totalProblems: true,
                    totalCommits: true,
                    totalPoints: true,
                    totalAchievements: true,
                    lastActivityDate: true,
                    rank: true
                }
            }),

            // 2. Today's Activity
            prisma.trackerEntry.findMany({
                where: { userId, date: { gte: today } },
                select: { problemsSolved: true, commits: true, timeSpent: true, pointsEarned: true }
            }),

            // 3. Week's Activity
            prisma.trackerEntry.findMany({
                where: { userId, date: { gte: weekStart } },
                select: { problemsSolved: true, commits: true, timeSpent: true, date: true }
            }),

            // 4. Month's Activity (Count only for speed)
            prisma.trackerEntry.aggregate({
                where: { userId, date: { gte: monthStart } },
                _sum: { problemsSolved: true, commits: true, timeSpent: true }
            }),

            // 5. Active Goals
            prisma.goal.findMany({
                where: { userId, status: 'ACTIVE' },
                select: { id: true, title: true, progress: true, target: true, deadline: true, category: true },
                take: 5,
                orderBy: { deadline: 'asc' }
            }),

            // 6. Recent Activity Feed
            prisma.trackerEntry.findMany({
                where: { userId, date: { gte: subDays(now, 7) } },
                include: { platform: { select: { name: true, icon: true, color: true } } },
                orderBy: { date: 'desc' },
                take: 10
            }),

            // 7. Platform Counts
            prisma.userPlatform.count({ where: { userId, isActive: true } }),

            // 8. Platform Specific Stats
            prisma.userPlatform.findMany({
                where: { userId, isActive: true },
                select: {
                    id: true,
                    platformId: true,
                    cachedStats: true,
                    platform: { select: { name: true, color: true, icon: true } }
                }
            }),

            // 9. Category Distribution (Last 30 Days)
            prisma.trackerEntry.findMany({
                where: { userId, date: { gte: last30Days } },
                select: { category: true, problemsSolved: true, timeSpent: true }
            }),

            // 10. Data for Insights (Previous 7 days for comparison)
            prisma.trackerEntry.aggregate({
                where: { userId, date: { gte: subDays(today, 14), lt: subDays(today, 7) } },
                _sum: { problemsSolved: true }
            }),

            // 11. Last 7 Days Entries for Chart
            prisma.trackerEntry.findMany({
                where: { userId, date: { gte: subDays(today, 6) } }, // From 6 days ago up to today (7 days total)
                select: { date: true, problemsSolved: true, commits: true, timeSpent: true }
            })
        ]);

        // --- Process Aggregations ---

        // Stats
        const todayStats = {
            problems: todayEntries.reduce((acc, curr) => acc + curr.problemsSolved, 0),
            commits: todayEntries.reduce((acc, curr) => acc + curr.commits, 0),
            time: todayEntries.reduce((acc, curr) => acc + curr.timeSpent, 0),
            points: todayEntries.reduce((acc, curr) => acc + (curr.pointsEarned || 0), 0)
        };

        const weekStats = {
            problems: weekEntries.reduce((acc, curr) => acc + curr.problemsSolved, 0),
            commits: weekEntries.reduce((acc, curr) => acc + curr.commits, 0),
            time: weekEntries.reduce((acc, curr) => acc + curr.timeSpent, 0),
            activeDays: new Set(weekEntries.map(e => e.date.toDateString())).size
        };

        // Chart Data (Last 7 Days)
        const chart = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(today, 6 - i);
            const dStr = format(d, 'yyyy-MM-dd');
            const dayEntries = last7DaysEntries.filter(e => format(e.date, 'yyyy-MM-dd') === dStr);
            return {
                date: dStr,
                label: format(d, 'EEE'),
                problems: dayEntries.reduce((s, e) => s + e.problemsSolved, 0),
                commits: dayEntries.reduce((s, e) => s + e.commits, 0),
                time: dayEntries.reduce((s, e) => s + e.timeSpent, 0)
            };
        });

        // Categories Breakdown
        const categoryMap = new Map<string, { name: string; count: number; color: string; value: number }>();
        let totalCategoryProblems = 0;

        categoryStats.forEach(entry => {
            if (!entry.category) return;
            const cat = entry.category;
            if (!categoryMap.has(cat)) {
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTHER;
                categoryMap.set(cat, {
                    name: config.label,
                    count: 0,
                    color: config.color,
                    value: 0
                });
            }
            const data = categoryMap.get(cat)!;
            data.count += entry.problemsSolved;
            data.value += entry.problemsSolved; // using problems as the metric
            totalCategoryProblems += entry.problemsSolved;
        });

        const categories = Array.from(categoryMap.values())
            .map(c => ({ ...c, percentage: totalCategoryProblems > 0 ? Math.round((c.count / totalCategoryProblems) * 100) : 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5

        // Insights Generation
        const insights: DashboardInsight[] = [];

        // 1. Streak
        if (user?.currentStreak && user.currentStreak >= 3) {
            insights.push({
                id: 'streak-fire',
                type: 'celebration',
                title: 'Streak on Fire! 🔥',
                message: `You're on a ${user.currentStreak}-day streak! Keep it up!`,
                priority: 'high',
                color: '#EF4444'
            });
        }

        // 2. Goal Warning
        activeGoals.forEach(g => {
            if (g.deadline) {
                const daysLeft = differenceInDays(new Date(g.deadline), now);
                const pct = g.target > 0 ? (g.progress / g.target) * 100 : 0;
                if (daysLeft <= 3 && pct < 80) {
                    insights.push({
                        id: `goal-${g.id}-risk`,
                        type: 'warning',
                        title: 'Goal at Risk ⚠️',
                        message: `"${g.title}" is due soon (${daysLeft}d).`,
                        priority: 'critical',
                        color: '#F59E0B'
                    });
                }
            }
        });

        // 3. Improvement (vs prev week)
        const prevWeekProblems = rawInsightsPrevWeek._sum.problemsSolved || 0;
        // Current week (last 7 days problems)
        const currentWeekProblems = last7DaysEntries.reduce((s, e) => s + e.problemsSolved, 0);

        if (prevWeekProblems > 0) {
            const improvement = Math.round(((currentWeekProblems - prevWeekProblems) / prevWeekProblems) * 100);
            if (improvement > 15) {
                insights.push({
                    id: 'improvement-rate',
                    type: 'improvement',
                    title: 'Great Progress! 📈',
                    message: `You solved ${improvement}% more problems than last week!`,
                    priority: 'medium',
                    color: '#10B981'
                });
            }
        }

        const result: DashboardData = {
            user: {
                name: user?.name || 'User',
                rank: user?.rank || 'Novice',
                streak: {
                    current: user?.currentStreak || 0,
                    longest: user?.longestStreak || 0,
                    lastActivity: user?.lastActivityDate ? user.lastActivityDate.toISOString() : null
                },
                totals: {
                    problems: user?.totalProblems || 0,
                    commits: user?.totalCommits || 0,
                    points: user?.totalPoints || 0
                }
            },
            stats: {
                today: todayStats,
                week: weekStats,
                month: {
                    problems: monthEntries._sum.problemsSolved || 0,
                    commits: monthEntries._sum.commits || 0,
                    time: monthEntries._sum.timeSpent || 0
                }
            },
            chart,
            goals: activeGoals.map(g => ({
                id: g.id,
                title: g.title,
                progress: g.progress,
                target: g.target,
                deadline: g.deadline ? g.deadline.toISOString() : null,
                category: g.category,
                percentage: g.target > 0 ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0
            })),
            activity: recentActivity.map(a => ({
                id: a.id,
                date: a.date.toISOString(),
                platform: a.platform?.name || 'Manual',
                icon: a.platform?.icon,
                color: a.platform?.color,
                problems: a.problemsSolved,
                commits: a.commits,
                time: a.timeSpent
            })),
            platforms: platformStats.map(p => {
                // Safe access to platform relations which are now guaranteed by select
                const platform = p.platform;
                const rawStats = (p.cachedStats as Record<string, number> | null) || {};
                return {
                    name: platform.name,
                    icon: platform.icon,
                    color: platform.color,
                    stats: {
                        problems: rawStats.problems || 0,
                        time: rawStats.time || 0,
                        points: rawStats.points || 0
                    }
                };
            }),
            categories,
            insights: insights.slice(0, 3), // Top 3 insights
            meta: {
                connectedPlatformsCount: connectedPlatforms,
                generatedAt: now.toISOString()
            }
        };

        const duration = Date.now() - queryStart;
        logger.info('Dashboard query completed', { userId, duration });

        // Cache for next request
        await CacheService.set(CACHE_KEY, result, CACHE_TTL).catch(() => { });

        return result;
    };
}
