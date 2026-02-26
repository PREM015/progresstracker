// ============================================================================
// FILE: src/hooks/keys.ts
// PURPOSE: Centralized query keys for React Query cache management
// ============================================================================

/**
 * Query keys factory for consistent cache key management
 * Using factory pattern for type-safe and refactorable keys
 */
export const queryKeys = {
  // ===== AUTH & USER =====
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  user: {
    all: ['user'] as const,
    profile: (userId: string, options?: { lean?: boolean }) =>
      [...queryKeys.user.all, 'profile', userId, options] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
    stats: () => [...queryKeys.user.all, 'stats'] as const,
    sessions: () => [...queryKeys.user.all, 'sessions'] as const,
    byUsername: (username: string) => [...queryKeys.user.all, 'username', username] as const,
    byId: (id: string) => [...queryKeys.user.all, 'id', id] as const,
  },

  // ===== TRACKER =====
  tracker: {
    all: ['tracker'] as const,
    entries: (filters?: Record<string, unknown>) =>
      [...queryKeys.tracker.all, 'entries', filters] as const,
    entry: (id: string) => [...queryKeys.tracker.all, 'entry', id] as const,
    daily: (date: string) => [...queryKeys.tracker.all, 'daily', date] as const,
    range: (start: string, end: string) =>
      [...queryKeys.tracker.all, 'range', start, end] as const,
    stats: (period?: string) => [...queryKeys.tracker.all, 'stats', period] as const,
    heatmap: (year?: number) => [...queryKeys.tracker.all, 'heatmap', year] as const,
    calendar: (month: string) => [...queryKeys.tracker.all, 'calendar', month] as const,
    recent: (limit?: number) => [...queryKeys.tracker.all, 'recent', limit] as const,
    summary: () => [...queryKeys.tracker.all, 'summary'] as const,
  },

  // ===== PLATFORMS =====
  platforms: {
    all: ['platforms'] as const,
    available: () => [...queryKeys.platforms.all, 'available'] as const,
    connected: () => [...queryKeys.platforms.all, 'connected'] as const,
    byId: (id: string) => [...queryKeys.platforms.all, 'id', id] as const,
    bySlug: (slug: string) => [...queryKeys.platforms.all, 'slug', slug] as const,
    stats: (id: string) => [...queryKeys.platforms.all, 'stats', id] as const,
    health: () => [...queryKeys.platforms.all, 'health'] as const,
    categories: () => [...queryKeys.platforms.all, 'categories'] as const,
  },

  // ===== GOALS =====
  goals: {
    all: ['goals'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.goals.all, 'list', filters] as const,
    active: () => [...queryKeys.goals.all, 'active'] as const,
    completed: () => [...queryKeys.goals.all, 'completed'] as const,
    archived: () => [...queryKeys.goals.all, 'archived'] as const,
    byId: (id: string) => [...queryKeys.goals.all, 'id', id] as const,
    stats: () => [...queryKeys.goals.all, 'stats'] as const,
    templates: () => [...queryKeys.goals.all, 'templates'] as const,
    reminders: () => [...queryKeys.goals.all, 'reminders'] as const,
  },

  // ===== ACHIEVEMENTS =====
  achievements: {
    all: ['achievements'] as const,
    available: () => [...queryKeys.achievements.all, 'available'] as const,
    unlocked: () => [...queryKeys.achievements.all, 'unlocked'] as const,
    progress: () => [...queryKeys.achievements.all, 'progress'] as const,
    byId: (id: string) => [...queryKeys.achievements.all, 'id', id] as const,
    stats: () => [...queryKeys.achievements.all, 'stats'] as const,
    recent: () => [...queryKeys.achievements.all, 'recent'] as const,
    pinned: () => [...queryKeys.achievements.all, 'pinned'] as const,
    categories: () => [...queryKeys.achievements.all, 'categories'] as const,
  },

  // ===== STREAK =====
  streak: {
    all: ['streak'] as const,
    current: () => [...queryKeys.streak.all, 'current'] as const,
    history: () => [...queryKeys.streak.all, 'history'] as const,
    stats: () => [...queryKeys.streak.all, 'stats'] as const,
  },

  // ===== NOTIFICATIONS =====
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.notifications.all, 'list', filters] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
    preferences: () => [...queryKeys.notifications.all, 'preferences'] as const,
    byId: (id: string) => [...queryKeys.notifications.all, 'id', id] as const,
  },

  // ===== STATS & ANALYTICS =====
  stats: {
    all: ['stats'] as const,
    dashboard: () => [...queryKeys.stats.all, 'dashboard'] as const,
    overview: (period?: string) => [...queryKeys.stats.all, 'overview', period] as const,
    daily: (date: string) => [...queryKeys.stats.all, 'daily', date] as const,
    weekly: () => [...queryKeys.stats.all, 'weekly'] as const,
    monthly: () => [...queryKeys.stats.all, 'monthly'] as const,
    yearly: () => [...queryKeys.stats.all, 'yearly'] as const,
    trends: (period?: string) => [...queryKeys.stats.all, 'trends', period] as const,
    heatmap: (year?: number) => [...queryKeys.stats.all, 'heatmap', year] as const,
    comparison: () => [...queryKeys.stats.all, 'comparison'] as const,
  },

  // ===== SYNC =====
  sync: {
    all: ['sync'] as const,
    status: () => [...queryKeys.sync.all, 'status'] as const,
    history: (limit?: number) => [...queryKeys.sync.all, 'history', limit] as const,
    logs: (platformId?: string) => [...queryKeys.sync.all, 'logs', platformId] as const,
    queue: () => [...queryKeys.sync.all, 'queue'] as const,
  },

  // ===== LEADERBOARD =====
  leaderboard: {
    all: ['leaderboard'] as const,
    global: (period?: string) => [...queryKeys.leaderboard.all, 'global', period] as const,
    friends: () => [...queryKeys.leaderboard.all, 'friends'] as const,
    platform: (platformId: string) => [...queryKeys.leaderboard.all, 'platform', platformId] as const,
    category: (category: string) => [...queryKeys.leaderboard.all, 'category', category] as const,
    myRank: () => [...queryKeys.leaderboard.all, 'myRank'] as const,
  },

  // ===== REPORTS =====
  reports: {
    all: ['reports'] as const,
    list: () => [...queryKeys.reports.all, 'list'] as const,
    byId: (id: string) => [...queryKeys.reports.all, 'id', id] as const,
    weekly: () => [...queryKeys.reports.all, 'weekly'] as const,
    monthly: () => [...queryKeys.reports.all, 'monthly'] as const,
  },

  // ===== EXPORT =====
  export: {
    all: ['export'] as const,
    jobs: () => [...queryKeys.export.all, 'jobs'] as const,
    job: (id: string) => [...queryKeys.export.all, 'job', id] as const,
    scheduled: () => [...queryKeys.export.all, 'scheduled'] as const,
  },

  // ===== SUBSCRIPTION & BILLING =====
  subscription: {
    all: ['subscription'] as const,
    current: () => [...queryKeys.subscription.all, 'current'] as const,
    plans: () => [...queryKeys.subscription.all, 'plans'] as const,
    invoices: () => [...queryKeys.subscription.all, 'invoices'] as const,
    paymentMethods: () => [...queryKeys.subscription.all, 'paymentMethods'] as const,
    usage: () => [...queryKeys.subscription.all, 'usage'] as const,
  },

  // ===== SEARCH =====
  search: {
    all: ['search'] as const,
    results: (query: string, filters?: Record<string, unknown>) =>
      [...queryKeys.search.all, 'results', query, filters] as const,
    suggestions: (query: string) => [...queryKeys.search.all, 'suggestions', query] as const,
    recent: () => [...queryKeys.search.all, 'recent'] as const,
  },

  // ===== ADMIN =====
  admin: {
    all: ['admin'] as const,
    dashboard: () => [...queryKeys.admin.all, 'dashboard'] as const,
    users: (filters?: Record<string, unknown>) =>
      [...queryKeys.admin.all, 'users', filters] as const,
    user: (id: string) => [...queryKeys.admin.all, 'user', id] as const,
    platforms: () => [...queryKeys.admin.all, 'platforms'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    auditLogs: (filters?: Record<string, unknown>) =>
      [...queryKeys.admin.all, 'auditLogs', filters] as const,
    system: () => [...queryKeys.admin.all, 'system'] as const,
    blog: (filter?: string) => [...queryKeys.admin.all, 'blog', filter] as const,
    analytics: (timeFrame?: string) => [...queryKeys.admin.all, 'analytics', timeFrame] as const,
    reports: () => [...queryKeys.admin.all, 'reports'] as const,
    tickets: (filters?: Record<string, unknown>) => [...queryKeys.admin.all, 'tickets', filters] as const,
    feedback: () => [...queryKeys.admin.all, 'feedback'] as const,
    billing: {
      stats: (period?: string) => [...queryKeys.admin.all, 'billing', 'stats', period] as const,
      subscriptions: () => [...queryKeys.admin.all, 'billing', 'subscriptions'] as const,
      invoices: (status?: string) => [...queryKeys.admin.all, 'billing', 'invoices', status] as const,
      paymentMethods: () => [...queryKeys.admin.all, 'billing', 'paymentMethods'] as const,
    },
    communication: {
      newsletters: () => [...queryKeys.admin.all, 'communication', 'newsletters'] as const,
      templates: () => [...queryKeys.admin.all, 'communication', 'templates'] as const,
      template: (id: string) => [...queryKeys.admin.all, 'communication', 'templates', id] as const,
      emailStats: () => [...queryKeys.admin.all, 'communication', 'email', 'stats'] as const,
    },
    logs: {
      audit: (filters?: Record<string, unknown>) => [...queryKeys.admin.all, 'logs', 'audit', filters] as const,
      system: (filters?: Record<string, unknown>) => [...queryKeys.admin.all, 'logs', 'system', filters] as const,
    },
    gamification: {
      achievements: () => [...queryKeys.admin.all, 'gamification', 'achievements'] as const,
      stats: () => [...queryKeys.admin.all, 'gamification', 'stats'] as const,
    },
    templates: {
      goals: () => [...queryKeys.admin.all, 'templates', 'goals'] as const,
    },
    access: {
      all: ['access'] as const,
      roles: () => [...queryKeys.admin.all, 'access', 'roles'] as const,
      permissions: () => [...queryKeys.admin.all, 'access', 'permissions'] as const,
    },
    maintenance: {
      windows: () => [...queryKeys.admin.all, 'maintenance', 'windows'] as const,
    },
    cache: {
      stats: () => [...queryKeys.admin.all, 'cache', 'stats'] as const,
    },
    database: {
      backups: () => [...queryKeys.admin.all, 'database', 'backups'] as const,
      stats: () => [...queryKeys.admin.all, 'database', 'stats'] as const,
    },
    changelog: {
      list: () => [...queryKeys.admin.all, 'changelog', 'list'] as const,
    },
    growth: {
      waitlist: (filters?: Record<string, unknown>) => [...queryKeys.admin.all, 'growth', 'waitlist', filters] as const,
      stats: () => [...queryKeys.admin.all, 'growth', 'stats'] as const,
    },
    features: {
      list: () => [...queryKeys.admin.all, 'features', 'list'] as const,
      details: (id: string) => [...queryKeys.admin.all, 'features', 'details', id] as const,
    },
    sync: {
      stats: () => [...queryKeys.admin.all, 'sync', 'stats'] as const,
      logs: () => [...queryKeys.admin.all, 'sync', 'logs'] as const,
      config: () => [...queryKeys.admin.all, 'sync', 'config'] as const,
    },
    metrics: {
      dashboard: () => [...queryKeys.admin.all, 'metrics', 'dashboard'] as const,
      api: () => [...queryKeys.admin.all, 'metrics', 'api'] as const,
      system: () => [...queryKeys.admin.all, 'metrics', 'system'] as const,
      users: () => [...queryKeys.admin.all, 'metrics', 'users'] as const,
      performance: () => [...queryKeys.admin.all, 'metrics', 'performance'] as const,
    },
  },

  // ===== ACTIVITY =====
  activity: {
    all: ['activity'] as const,
    feed: (filters?: Record<string, unknown>) =>
      [...queryKeys.activity.all, 'feed', filters] as const,
    recent: (limit?: number) => [...queryKeys.activity.all, 'recent', limit] as const,
  },

  // ===== REFERRALS =====
  referrals: {
    all: ['referrals'] as const,
    stats: () => [...queryKeys.referrals.all, 'stats'] as const,
    list: () => [...queryKeys.referrals.all, 'list'] as const,
    code: () => [...queryKeys.referrals.all, 'code'] as const,
  },

  // ===== SUPPORT =====
  support: {
    all: ['support'] as const,
    tickets: () => [...queryKeys.support.all, 'tickets'] as const,
    ticket: (id: string) => [...queryKeys.support.all, 'ticket', id] as const,
  },
} as const;

/**
 * Mutation keys for tracking mutations
 */
export const mutationKeys = {
  auth: {
    login: ['auth', 'login'] as const,
    logout: ['auth', 'logout'] as const,
    register: ['auth', 'register'] as const,
    resetPassword: ['auth', 'resetPassword'] as const,
  },
  tracker: {
    create: ['tracker', 'create'] as const,
    update: ['tracker', 'update'] as const,
    delete: ['tracker', 'delete'] as const,
    bulkCreate: ['tracker', 'bulkCreate'] as const,
    bulkDelete: ['tracker', 'bulkDelete'] as const,
  },
  platforms: {
    connect: ['platforms', 'connect'] as const,
    disconnect: ['platforms', 'disconnect'] as const,
    sync: ['platforms', 'sync'] as const,
  },
  goals: {
    create: ['goals', 'create'] as const,
    update: ['goals', 'update'] as const,
    delete: ['goals', 'delete'] as const,
    complete: ['goals', 'complete'] as const,
    archive: ['goals', 'archive'] as const,
  },
  achievements: {
    pin: ['achievements', 'pin'] as const,
    unpin: ['achievements', 'unpin'] as const,
  },
  notifications: {
    markRead: ['notifications', 'markRead'] as const,
    markAllRead: ['notifications', 'markAllRead'] as const,
    delete: ['notifications', 'delete'] as const,
  },
  sync: {
    trigger: ['sync', 'trigger'] as const,
    triggerAll: ['sync', 'triggerAll'] as const,
    cancel: ['sync', 'cancel'] as const,
  },
} as const;

export default queryKeys;