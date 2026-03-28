// ============================================================================
// FILE: src/constants/index.ts
// PURPOSE: Central export for all constants
// ============================================================================

// Export all constants from individual files
export * from './achievements';
export * from './colors';
export * from './dates';
export * from './events';
export * from './limits';
export * from './platforms';
export * from './regex';

// Explicitly re-export conflicting constants from colors to resolve ambiguity
export { DIFFICULTY_COLORS, PLATFORM_CATEGORY_COLORS, SYNC_STATUS_COLORS } from './colors';

// Re-export default exports as named exports
export { default as ACHIEVEMENTS } from './achievements';
export { default as COLORS } from './colors';
export { default as DATES } from './dates';
export { default as EVENTS } from './events';
export { default as LIMITS } from './limits';
export { default as PLATFORMS } from './platforms';
export { default as REGEX } from './regex';

// =============================================================================
// APPLICATION CONSTANTS
// =============================================================================

export const APP_NAME = 'CodeSync Pro';
export const APP_DESCRIPTION = 'Track and sync your coding progress across 80+ platforms';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://codesync.pro';
export const APP_VERSION = '1.0.0';

export const COMPANY_NAME = 'CodeSync';
export const COMPANY_EMAIL = 'support@codesync.pro';
export const SUPPORT_EMAIL = 'support@codesync.pro';
export const ADMIN_EMAIL = 'admin@codesync.pro';

// =============================================================================
// API CONSTANTS
// =============================================================================

export const API_VERSION = 'v1';
export const API_BASE_URL = `/api/${API_VERSION}`;
export const API_TIMEOUT = 30000; // 30 seconds

// =============================================================================
// STORAGE KEYS
// =============================================================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  RECENT_SEARCHES: 'recent_searches',
  PREFERRED_DATE_RANGE: 'preferred_date_range',
  DASHBOARD_LAYOUT: 'dashboard_layout',
} as const;

// =============================================================================
// QUERY KEYS (for React Query)
// =============================================================================

export const QUERY_KEYS = {
  // User
  USER: 'user',
  USER_PROFILE: 'user_profile',
  USER_SETTINGS: 'user_settings',
  USER_STATS: 'user_stats',

  // Platforms
  PLATFORMS: 'platforms',
  PLATFORM: 'platform',
  USER_PLATFORMS: 'user_platforms',
  PLATFORM_STATS: 'platform_stats',

  // Tracker
  TRACKER_ENTRIES: 'tracker_entries',
  TRACKER_ENTRY: 'tracker_entry',
  TRACKER_STATS: 'tracker_stats',
  DAILY_STATS: 'daily_stats',

  // Goals
  GOALS: 'goals',
  GOAL: 'goal',
  GOAL_PROGRESS: 'goal_progress',
  GOAL_TEMPLATES: 'goal_templates',

  // Achievements
  ACHIEVEMENTS: 'achievements',
  ACHIEVEMENT: 'achievement',
  USER_ACHIEVEMENTS: 'user_achievements',
  ACHIEVEMENT_PROGRESS: 'achievement_progress',

  // Streak
  STREAK: 'streak',
  STREAK_HISTORY: 'streak_history',

  // Notifications
  NOTIFICATIONS: 'notifications',
  UNREAD_COUNT: 'unread_count',

  // Sync
  SYNC_STATUS: 'sync_status',
  SYNC_LOGS: 'sync_logs',

  // Analytics
  ANALYTICS: 'analytics',
  HEATMAP: 'heatmap',
  TRENDS: 'trends',

  // Leaderboard
  LEADERBOARD: 'leaderboard',

  // Export
  EXPORTS: 'exports',
  EXPORT_JOB: 'export_job',

  // Support
  SUPPORT_TICKETS: 'support_tickets',
  SUPPORT_TICKET: 'support_ticket',

  // Blog
  BLOG_POSTS: 'blog_posts',
  BLOG_POST: 'blog_post',

  // Subscription
  SUBSCRIPTION: 'subscription',
  INVOICES: 'invoices',
  PAYMENT_METHODS: 'payment_methods',
} as const;

// =============================================================================
// ROUTE CONSTANTS
// =============================================================================

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  
  // Dashboard Routes
  PLATFORMS: '/platforms',
  TRACKER: '/tracker',
  GOALS: '/goals',
  ACHIEVEMENTS: '/achievements',
  ANALYTICS: '/analytics',
  LEADERBOARD: '/leaderboard',
  SETTINGS: '/settings',
  
  // Admin Routes
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_PLATFORMS: '/admin/platforms',
  ADMIN_ANALYTICS: '/admin/analytics',
  
  // Public Routes
  PRICING: '/pricing',
  ABOUT: '/about',
  CONTACT: '/contact',
  BLOG: '/blog',
  DOCS: '/docs',
  FAQ: '/faq',
} as const;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULTS = {
  PAGE_SIZE: 20,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 5000,
  MODAL_ANIMATION_DURATION: 200,
  INFINITE_SCROLL_THRESHOLD: 0.8,
} as const;

// =============================================================================
// BREAKPOINTS (Tailwind)
// =============================================================================

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export const FEATURES = {
  ACHIEVEMENTS: true,
  GOALS: true,
  LEADERBOARD: true,
  ANALYTICS: true,
  EXPORT: true,
  WEBHOOKS: true,
  API_KEYS: true,
  TWO_FACTOR_AUTH: true,
  SOCIAL_LOGIN: true,
  REFERRAL_PROGRAM: true,
  BLOG: true,
  SUPPORT_TICKETS: true,
} as const;

// =============================================================================
// ENVIRONMENT
// =============================================================================

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_TEST = process.env.NODE_ENV === 'test';

export const IS_SERVER = typeof window === 'undefined';
export const IS_CLIENT = typeof window !== 'undefined';

// =============================================================================
// SOCIAL LINKS
// =============================================================================

export const SOCIAL_LINKS = {
  TWITTER: 'https://twitter.com/codesyncpro',
  GITHUB: 'https://github.com/codesyncpro',
  DISCORD: 'https://discord.gg/codesyncpro',
  LINKEDIN: 'https://linkedin.com/company/codesyncpro',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

const CONSTANTS_EXPORT = {
  APP_NAME,
  APP_DESCRIPTION,
  APP_URL,
  APP_VERSION,
  API_VERSION,
  API_BASE_URL,
  STORAGE_KEYS,
  QUERY_KEYS,
  ROUTES,
  DEFAULTS,
  BREAKPOINTS,
  FEATURES,
  SOCIAL_LINKS,
};

export default CONSTANTS_EXPORT;