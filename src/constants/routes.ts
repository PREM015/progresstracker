// AUTH ROUTES:
export const AUTH_ROUTES = {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    VERIFY_EMAIL: '/verify-email',
    TWO_FACTOR_SETUP: '/2fa/setup',
    TWO_FACTOR_VERIFY: '/2fa/verify',
    MAGIC_LINK: '/magic-link',
} as const;

// DASHBOARD ROUTES:
export const DASHBOARD_ROUTES = {
    HOME: '/dashboard',
    TRACKER: '/tracker',
    GOALS: '/goals',
    GOALS_NEW: '/goals/new',
    ACHIEVEMENTS: '/achievements',
    ANALYTICS: '/analytics',
    PLATFORMS: '/platforms',
    PLATFORMS_CONNECT: '/platforms/connect',
    LEADERBOARD: '/leaderboard',
    PROFILE: '/profile',
    SETTINGS: '/settings',
    NOTIFICATIONS: '/notifications',
    SYNC: '/sync',
    REPORTS: '/reports',
    SUPPORT: '/support',
} as const;

// SETTINGS ROUTES:
export const SETTINGS_ROUTES = {
    ACCOUNT: '/settings/account',
    SECURITY: '/settings/security',
    NOTIFICATIONS: '/settings/notifications',
    APPEARANCE: '/settings/appearance',
    BILLING: '/settings/billing',
    PRIVACY: '/settings/privacy',
    INTEGRATIONS: '/settings/integrations',
    API_KEYS: '/settings/api-keys',
    DATA: '/settings/data',
    DANGER_ZONE: '/settings/danger-zone',
} as const;

// ADMIN ROUTES:
export const ADMIN_ROUTES = {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    PLATFORMS: '/admin/platforms',
    ACHIEVEMENTS: '/admin/achievements',
    FEATURE_FLAGS: '/admin/feature-flags',
    ANALYTICS: '/admin/analytics',
    LOGS: '/admin/logs',
    SUPPORT_TICKETS: '/admin/support-tickets',
    SYSTEM_SETTINGS: '/admin/system-settings',
    MAINTENANCE: '/admin/maintenance',
    EMAIL: '/admin/email',
    WAITLIST: '/admin/waitlist',
} as const;

// PUBLIC ROUTES:
export const PUBLIC_ROUTES = {
    HOME: '/',
    ABOUT: '/about',
    FEATURES: '/features',
    PRICING: '/pricing',
    BLOG: '/blog',
    DOCS: '/docs',
    CHANGELOG: '/changelog',
    PRIVACY: '/privacy',
    TERMS: '/terms',
    CONTACT: '/contact',
    STATUS: '/status',
    LEADERBOARD: '/leaderboard',
    PLATFORMS: '/platforms',
    WAITLIST: '/waitlist',
} as const;

// API ROUTES:
export const API_ROUTES = {
    // Auth
    AUTH_SESSION: '/api/auth/session',
    AUTH_REGISTER: '/api/auth/register',
    AUTH_FORGOT_PASSWORD: '/api/auth/forgot-password',
    AUTH_RESET_PASSWORD: '/api/auth/reset-password',
    AUTH_VERIFY_EMAIL: '/api/auth/verify-email',

    // User
    USER: '/api/user',
    USER_PROFILE: '/api/user/profile',
    USER_SETTINGS: '/api/user/settings',

    // Tracker
    TRACKER: '/api/tracker',
    TRACKER_STATS: '/api/tracker/stats',

    // Goals
    GOALS: '/api/goals',

    // Platforms
    PLATFORMS: '/api/platforms',
    PLATFORMS_CONNECT: '/api/platforms/connect',
    PLATFORMS_SYNC: '/api/sync',

} as const;

// ROUTE HELPERS:
export const getGoalRoute = (id: string) => `/goals/${id}`;
export const getGoalEditRoute = (id: string) => `/goals/${id}/edit`;
export const getUserProfileRoute = (username: string) => `/${username}`;
export const getPlatformRoute = (id: string) => `/platforms/${id}`;
export const getBlogPostRoute = (slug: string) => `/blog/${slug}`;
export const getAchievementRoute = (id: string) => `/achievements/${id}`;

// PROTECTED ROUTE CHECK:
export const isProtectedRoute = (pathname: string): boolean => {
    const protectedPrefixes = ['/dashboard', '/settings', '/admin', '/tracker', '/goals', '/profile'];
    return protectedPrefixes.some(prefix => pathname.startsWith(prefix));
};

// ADMIN ROUTE CHECK:
export const isAdminRoute = (pathname: string): boolean => {
    return pathname.startsWith('/admin');
};

// AUTH ROUTE CHECK:
export const isAuthRoute = (pathname: string): boolean => {
    return Object.values(AUTH_ROUTES).some(route => pathname.startsWith(route));
};
