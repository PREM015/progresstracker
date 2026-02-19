import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { StatsService } from '@/services/statsService';
import {
    startOfDay, endOfDay, startOfWeek, endOfWeek,
    startOfMonth, endOfMonth, subWeeks, subMonths
} from 'date-fns';

const RATE_LIMIT = 20;

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return apiResponse.unauthorized('Unauthorized', requestId);
        }

        const userId = session.user.id;
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:dashboard:${userId}`);

        if (!rateLimitResult.success) {
            return apiResponse.rateLimited(60, requestId);
        }

        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        // Parallel data fetching
        const [
            user,
            todayEntries,
            thisWeekEntries,
            lastWeekEntries,
            thisMonthEntries,
            lastMonthEntries,
            activeGoals,
            completedGoals,
            totalGoals,
            userAchievements,
            totalPlatforms,
            connectedPlatforms,
            userRank,
            streakData,
            hasActivityToday
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { totalPoints: true, rank: true }
            }),
            prisma.trackerEntry.findMany({ where: { userId, date: { gte: todayStart, lte: todayEnd } } }),
            prisma.trackerEntry.findMany({ where: { userId, date: { gte: weekStart, lte: weekEnd } } }),
            prisma.trackerEntry.findMany({ where: { userId, date: { gte: lastWeekStart, lte: lastWeekEnd } } }),
            prisma.trackerEntry.findMany({ where: { userId, date: { gte: monthStart, lte: monthEnd } } }),
            prisma.trackerEntry.findMany({ where: { userId, date: { gte: lastMonthStart, lte: lastMonthEnd } } }),
            prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
            prisma.goal.count({ where: { userId, status: 'COMPLETED' } }),
            prisma.goal.count({ where: { userId } }),
            prisma.userAchievement.findMany({
                where: { userId },
                include: { achievement: true },
                orderBy: { unlockedAt: 'desc' },
                take: 5
            }),
            prisma.platform.count(),
            prisma.userPlatform.count({ where: { userId, isActive: true } }),
            // Placeholder for rank percentile logic if not stored
            Promise.resolve({ percentile: null, change: null }),
            StatsService.calculateStreak(userId),
            StatsService.hasActivityToday(userId)
        ]);

        // Helper to aggregate stats
        const aggregate = (entries: typeof todayEntries) => ({
            problems: entries.reduce((acc, e) => acc + e.problemsSolved, 0),
            commits: entries.reduce((acc, e) => acc + e.commits, 0),
            time: entries.reduce((acc, e) => acc + e.timeSpent, 0),
            points: entries.reduce((acc, e) => acc + (e.points || 0), 0),
            // New: Difficulty aggregations
            easy: entries.reduce((acc, e) => acc + e.easyProblems, 0),
            medium: entries.reduce((acc, e) => acc + e.mediumProblems, 0),
            hard: entries.reduce((acc, e) => acc + e.hardProblems, 0)
        });

        const todayStats = aggregate(todayEntries);
        const thisWeekStats = aggregate(thisWeekEntries);
        const lastWeekStats = aggregate(lastWeekEntries);
        const thisMonthStats = aggregate(thisMonthEntries);
        const lastMonthStats = aggregate(lastMonthEntries);

        // Calculate changes
        const calcChange = (current: number, prev: number) => prev === 0 ? 0 : Math.round(((current - prev) / prev) * 100);

        const weekChange = calcChange(thisWeekStats.points, lastWeekStats.points);
        const monthChange = calcChange(thisMonthStats.points, lastMonthStats.points);

        // Achievement stats
        const achievementsUnlocked = await prisma.userAchievement.count({ where: { userId } });
        const achievementPoints = userAchievements.reduce((acc, ua) => acc + ua.achievement.points, 0);

        // Platform sync status (fetch latest sync log)
        const lastSyncLog = await prisma.syncLog.findFirst({
            where: { userId, status: 'SUCCESS' },
            orderBy: { completedAt: 'desc' }
        });

        // Fetch detailed connected platforms
        const connectedPlatformsList = await prisma.userPlatform.findMany({
            where: { userId, isActive: true },
            include: { platform: true }
        });

        // Calculate Lifetime Difficulty Breakdown
        // This combines TrackerEntry aggregations AND cachedStats from platforms
        const lifetimeDifficulty = await (async () => {
            // 1. Aggregated from entries
            const entryStats = await prisma.trackerEntry.aggregate({
                where: { userId },
                _sum: {
                    easyProblems: true,
                    mediumProblems: true,
                    hardProblems: true,
                    problemsSolved: true
                }
            });

            // 2. Computed from cached platform stats (e.g. LeetCode metadata)
            // We take the MAX of cached vs entries to avoid double counting if they are out of sync, 
            // OR we prefer cached if available for that specific platform.
            // A safer approach for "Total" is to use the entry aggregations if we trust our sync,
            // but for "User Profile" view, users often want what the platform says.

            // For now, let's use the explicit aggregation from the database which represents "Synced Data"
            return {
                easy: entryStats._sum.easyProblems || 0,
                medium: entryStats._sum.mediumProblems || 0,
                hard: entryStats._sum.hardProblems || 0,
                total: entryStats._sum.problemsSolved || 0
            };
        })();

        const stats = {
            streak: {
                current: streakData.current,
                longest: streakData.longest,
                isAtRisk: streakData.current > 0 && !hasActivityToday
            },
            today: todayStats,
            thisWeek: {
                ...thisWeekStats,
                change: weekChange
            },
            thisMonth: {
                ...thisMonthStats,
                change: monthChange
            },
            goals: {
                active: activeGoals,
                completed: completedGoals,
                completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
            },
            achievements: {
                total: await prisma.achievement.count(), // Total available achievements
                unlocked: achievementsUnlocked,
                points: achievementPoints,
                recent: userAchievements.map(ua => ({
                    id: ua.achievementId,
                    title: ua.achievement.title,
                    icon: ua.achievement.icon || '🏆',
                    unlockedAt: ua.unlockedAt
                }))
            },
            platforms: {
                connected: connectedPlatforms,
                total: totalPlatforms,
                lastSync: lastSyncLog?.completedAt || null,
                // Return detailed platform info
                connectedPlatforms: connectedPlatformsList.map(up => ({
                    id: up.platformId,
                    name: up.platform.name,
                    slug: up.platform.slug,
                    icon: up.platform.icon,
                    lastSyncedAt: up.lastSyncedAt,
                    status: up.connectionStatus,
                    cachedStats: up.cachedStats
                }))
            },
            rank: {
                current: user?.rank || null,
                percentile: userRank.percentile,
                change: userRank.change
            },

            lifetime: {
                problems: await (async () => {
                    const platforms = await prisma.userPlatform.findMany({
                        where: { userId },
                        select: { cachedStats: true }
                    });

                    const cachedTotal = platforms.reduce((sum, p) => {
                        const stats = p.cachedStats as any;
                        return sum + (stats?.totalProblems || stats?.problemsSolved || 0);
                    }, 0);

                    const entrySum = await prisma.trackerEntry.aggregate({
                        where: { userId },
                        _sum: { problemsSolved: true }
                    }).then(res => res._sum.problemsSolved || 0);

                    return Math.max(cachedTotal, entrySum);
                })(),
                commits: await (async () => {
                    const platforms = await prisma.userPlatform.findMany({
                        where: { userId },
                        select: { cachedStats: true }
                    });

                    const cachedTotal = platforms.reduce((sum, p) => {
                        const stats = p.cachedStats as any;
                        return sum + (stats?.totalCommits || stats?.commits || 0);
                    }, 0);

                    const entrySum = await prisma.trackerEntry.aggregate({
                        where: { userId },
                        _sum: { commits: true }
                    }).then(res => res._sum.commits || 0);

                    return Math.max(cachedTotal, entrySum);
                })(),
                time: await prisma.trackerEntry.aggregate({
                    where: { userId },
                    _sum: { timeSpent: true }
                }).then(res => res._sum.timeSpent || 0),
                points: user?.totalPoints || 0,
                difficulty: lifetimeDifficulty // Add this new field
            }
        };

        logger.info('GET stats dashboard completed', { userId, requestId, duration: Date.now() - startTime });

        return apiResponse.success({ stats }, { meta: { requestId } });

    } catch (error) {
        logger.error('GET stats dashboard failed', { requestId }, error);
        return apiResponse.internalError('Operation failed', requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: { 'Allow': 'GET, OPTIONS' } });
}
