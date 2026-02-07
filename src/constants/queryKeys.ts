
export const queryKeys = {
    // User
    user: {
        all: ['user'] as const,
        current: () => [...queryKeys.user.all, 'current'] as const,
        profile: (username: string) => [...queryKeys.user.all, 'profile', username] as const,
        settings: () => [...queryKeys.user.all, 'settings'] as const,
        stats: () => [...queryKeys.user.all, 'stats'] as const,
    },

    // Tracker
    tracker: {
        all: ['tracker'] as const,
        entries: (filters?: Record<string, unknown>) =>
            [...queryKeys.tracker.all, 'entries', filters] as const,
        entry: (id: string) => [...queryKeys.tracker.all, 'entry', id] as const,
        stats: (dateRange?: { from: string; to: string }) =>
            [...queryKeys.tracker.all, 'stats', dateRange] as const,
        heatmap: (year?: number) => [...queryKeys.tracker.all, 'heatmap', year] as const,
        recent: (limit?: number) => [...queryKeys.tracker.all, 'recent', limit] as const,
    },

    // Goals
    goals: {
        all: ['goals'] as const,
        list: (filters?: { status?: string; category?: string }) =>
            [...queryKeys.goals.all, 'list', filters] as const,
        detail: (id: string) => [...queryKeys.goals.all, 'detail', id] as const,
        templates: () => [...queryKeys.goals.all, 'templates'] as const,
        stats: () => [...queryKeys.goals.all, 'stats'] as const,
    },

    // Achievements
    achievements: {
        all: ['achievements'] as const,
        list: (filters?: { category?: string; unlocked?: boolean }) =>
            [...queryKeys.achievements.all, 'list', filters] as const,
        detail: (id: string) => [...queryKeys.achievements.all, 'detail', id] as const,
        available: () => [...queryKeys.achievements.all, 'available'] as const,
        pinned: () => [...queryKeys.achievements.all, 'pinned'] as const,
    },

    // Platforms
    platforms: {
        all: ['platforms'] as const,
        available: () => [...queryKeys.platforms.all, 'available'] as const,
        connected: () => [...queryKeys.platforms.all, 'connected'] as const,
        detail: (id: string) => [...queryKeys.platforms.all, 'detail', id] as const,
        stats: (id: string) => [...queryKeys.platforms.all, 'stats', id] as const,
    },

    // Sync
    sync: {
        all: ['sync'] as const,
        status: () => [...queryKeys.sync.all, 'status'] as const,
        history: (platformId?: string) => [...queryKeys.sync.all, 'history', platformId] as const,
        queue: () => [...queryKeys.sync.all, 'queue'] as const,
    },

    // Analytics
    analytics: {
        all: ['analytics'] as const,
        dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
        trends: (range: string) => [...queryKeys.analytics.all, 'trends', range] as const,
        comparison: (params: unknown) => [...queryKeys.analytics.all, 'comparison', params] as const,
    },

    // Leaderboard
    leaderboard: {
        all: ['leaderboard'] as const,
        global: (period: string) => [...queryKeys.leaderboard.all, 'global', period] as const,
        category: (category: string, period: string) =>
            [...queryKeys.leaderboard.all, 'category', category, period] as const,
        friends: () => [...queryKeys.leaderboard.all, 'friends'] as const,
    },

    // Notifications
    notifications: {
        all: ['notifications'] as const,
        list: (filters?: unknown) => [...queryKeys.notifications.all, 'list', filters] as const,
        unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
        preferences: () => [...queryKeys.notifications.all, 'preferences'] as const,
    },

    // Streak
    streak: {
        all: ['streak'] as const,
        current: () => [...queryKeys.streak.all, 'current'] as const,
        history: () => [...queryKeys.streak.all, 'history'] as const,
    },

    // Admin
    admin: {
        all: ['admin'] as const,
        users: (filters?: unknown) => [...queryKeys.admin.all, 'users', filters] as const,
        user: (id: string) => [...queryKeys.admin.all, 'user', id] as const,
        stats: () => [...queryKeys.admin.all, 'stats'] as const,
        featureFlags: () => [...queryKeys.admin.all, 'featureFlags'] as const,
    },

    // Blog
    blog: {
        all: ['blog'] as const,
        posts: (filters?: unknown) => [...queryKeys.blog.all, 'posts', filters] as const,
        post: (slug: string) => [...queryKeys.blog.all, 'post', slug] as const,
    }
};
