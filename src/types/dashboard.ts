export interface DashboardStats {
    streak: {
        current: number;
        longest: number;
        isAtRisk: boolean;
    };
    today: {
        problems: number;
        commits: number;
        time: number;
        points: number;
    };
    thisWeek: {
        problems: number;
        commits: number;
        time: number;
        points: number;
        change: number; // percentage change from last week
    };
    thisMonth: {
        problems: number;
        commits: number;
        time: number;
        points: number;
        change: number;
    };
    goals: {
        active: number;
        completed: number;
        completionRate: number;
    };
    achievements: {
        total: number;
        unlocked: number;
        points: number;
        recent: Array<{
            id: string;
            title: string;
            icon: string;
            unlockedAt: Date;
        }>;
    };
    platforms: {
        connected: number;
        total: number;
        lastSync: Date | null;
        connectedPlatforms: Array<{
            id: string;
            name: string;
            slug: string;
            icon: string | null;
            lastSyncedAt: Date | null;
            status: string;
            cachedStats?: any;
        }>;
    };
    lifetime: {
        problems: number;
        commits: number;
        time: number;
        points: number;
        difficulty?: {
            easy: number;
            medium: number;
            hard: number;
            total: number;
        };
    };
    rank: {
        current: number | null;
        percentile: number | null;
        change: number | null;
    };
}

export interface OverviewStats {
    period: string;
    problems: {
        total: number;
        easy: number;
        medium: number;
        hard: number;
        byDay: Array<{ date: string; count: number }>;
    };
    commits: {
        total: number;
        byDay: Array<{ date: string; count: number }>;
    };
    time: {
        total: number;
        average: number;
        byDay: Array<{ date: string; minutes: number }>;
    };
    points: {
        total: number;
        byDay: Array<{ date: string; points: number }>;
    };
    platforms: Array<{
        id: string;
        name: string;
        icon: string;
        problems: number;
        commits: number;
        time: number;
    }>;
}

export interface TrendData {
    period: string;
    data: Array<{
        date: string;
        problems: number;
        commits: number;
        time: number;
        points: number;
    }>;
    comparison: {
        problems: { current: number; previous: number; change: number };
        commits: { current: number; previous: number; change: number };
        time: { current: number; previous: number; change: number };
        points: { current: number; previous: number; change: number };
    };
}

export interface HeatmapDataPoint {
    date: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
    dayOfWeek?: number;
    weekNumber?: number;
    details?: {
        problems: number;
        commits: number;
        timeSpent: number;
    };
}

export interface HeatmapStats {
    points: HeatmapDataPoint[];
    weeks?: {
        weekNumber: number;
        weekStart: string;
        days: HeatmapDataPoint[];
        total: number;
    }[];
    dayOfWeekStats?: {
        dayOfWeek: number;
        dayName: string;
        totalActivity: number;
        avgActivity: number;
        activeDays: number;
    }[];
    summary: {
        totalActiveDays: number;
        totalDays: number;
        activityRate: number;
        currentStreak: number;
        longestStreak: number;
        maxCount: number;
        avgCount: number;
        mostActiveDay: string | null;
        mostActiveDayOfWeek: string | null;
    };
    period: {
        startDate: string;
        endDate: string;
        days: number;
    };
}

export interface TrendStats {
    metric: string;
    granularity: string;
    periodType: string;
    trend: Array<{
        date: string;
        label: string;
        value: number;
        cumulativeValue?: number;
    }>;
    comparison?: {
        current: {
            label: string;
            startDate: string;
            endDate: string;
            value: number;
            activeDays: number;
            avgPerDay: number;
            totalDays: number;
        };
        previous: {
            label: string;
            startDate: string;
            endDate: string;
            value: number;
            activeDays: number;
            avgPerDay: number;
            totalDays: number;
        };
        change: {
            absolute: number;
            percent: number;
            trend: 'up' | 'down' | 'stable';
            activeDaysChange: number;
            avgPerDayChange: number;
        };
    };
    weekSummaries?: Array<{
        weekStart: string;
        weekEnd: string;
        total: number;
        average: number;
        activeDays: number;
    }>;
    summary: {
        total: number;
        average: number;
        max: { value: number; date: string };
        min: { value: number; date: string };
        trend: 'increasing' | 'decreasing' | 'stable';
        growthRate: number;
    };
    movingAverage?: Array<{
        date: string;
        label: string;
        value: number;
    }>;
}

export interface MonthlyStats {
    months: Array<{
        month: string;
        monthName: string;
        year: number;
        problems: number;
        commits: number;
        pullRequests: number;
        timeSpent: number;
        points: number;
        activeDays: number;
        totalDays: number;
        activityRate: number;
        avgProblemsPerDay: number;
        avgTimePerDay: number;
    }>;
    summary: {
        totalProblems: number;
        totalCommits: number;
        totalTimeSpent: number;
        totalPoints: number;
        totalActiveDays: number;
        avgProblemsPerMonth: number;
        avgActiveDaysPerMonth: number;
        bestMonth: {
            month: string;
            monthName: string;
            problems: number;
        } | null;
        growthTrend: 'increasing' | 'decreasing' | 'stable';
        currentStreak: number;
        longestStreak: number;
    };
    comparison: {
        current: any;
        previous: any;
        changes: any;
    } | null;
    period: {
        startDate: string;
        endDate: string;
        monthsIncluded: number;
    };
}

// =============================================================================
// UNIFIED DASHBOARD API CONTRACT
// =============================================================================
// This is the canonical shared type for the /api/dashboard/full endpoint.
// Backend (AnalyticsService) produces this shape, frontend consumes it.

export interface UnifiedDashboardData {
    user: {
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
    };
    stats: {
        today: { problems: number; commits: number; time: number; points: number };
        week: { problems: number; commits: number; time: number; activeDays: number };
        month: { problems: number; commits: number; time: number };
    };
    chart: Array<{
        date: string;
        label: string;
        problems: number;
        commits: number;
        time: number;
    }>;
    goals: Array<{
        id: string;
        title: string;
        progress: number;
        target: number;
        deadline: string | null;
        category: string;
        percentage: number;
    }>;
    activity: Array<{
        id: string;
        date: string;
        platform: string;
        icon?: string | null;
        color?: string | null;
        problems: number;
        commits: number;
        time: number;
    }>;
    platforms: Array<{
        name: string;
        icon?: string | null;
        color?: string | null;
        stats: { problems: number; time: number; points: number };
    }>;
    categories: Array<{
        name: string;
        count: number;
        color?: string;
        percentage: number;
    }>;
    insights: Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        priority: string;
        color?: string;
    }>;
    meta: {
        connectedPlatformsCount: number;
        generatedAt: string;
    };
}
