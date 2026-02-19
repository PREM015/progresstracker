// ===== FILE: src/constants/query-keys.ts =====

export const QUERY_KEYS = {
    // Auth & User
    USER: {
        PROFILE: 'user/profile',
        SETTINGS: 'user/settings',
        LOGIN_HISTORY: 'user/login-history',
        WEBHOOKS: 'user/webhooks',
        CONNECTED_ACCOUNTS: 'user/connected-accounts',
    },

    // Platforms
    PLATFORMS: {
        ALL: 'platforms/all',
        CONNECTED: 'platforms/connected',
        DETAILS: (id: string) => ['platforms/details', id],
    },

    // Tracker / Dashboard
    TRACKER: {
        ENTRIES: 'tracker/entries',
        ENTRY: (id: string) => ['tracker/entry', id],
        STATS: 'tracker/stats',
        HEATMAP: 'tracker/heatmap',
        SUMMARY: 'tracker/summary',
        RECENT: 'tracker/recent',
    },

    // Support
    SUPPORT: {
        TICKETS: 'support/tickets',
        TICKET: (id: string) => ['support/ticket', id],
    },

    // Reports
    REPORTS: {
        ALL: 'reports/list',
        DETAIL: (id: string) => ['reports/detail', id],
        EXPORT_HISTORY: 'reports/export-history',
    },

    // Content
    CONTENT: {
        CHANGELOG: 'content/changelog',
        BLOG: 'content/blog',
    },

    // Waitlist & Referral
    WAITLIST: {
        STATUS: (email: string) => ['waitlist/status', email],
    },
    REFERRAL: {
        STATS: 'referral/stats',
        CODE: 'referral/code',
    },
} as const;
