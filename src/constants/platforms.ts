// ============================================================================
// FILE: src/constants/platforms.ts
// PURPOSE: Platform-related constants
// ============================================================================

// Define locally since it's not exported from @prisma/client yet
export type PlatformCategory = 'DSA' | 'JOB' | 'GIT' | 'LEARNING' | 'HACKATHON' | 'OPENSOURCE' | 'COMPANY' | 'DESIGN' | 'DATA_SCIENCE' | 'OTHER';

// =============================================================================
// PLATFORM CATEGORIES (matches Prisma enum)
// =============================================================================

export const PLATFORM_CATEGORIES = {
  DSA: 'DSA',
  JOB: 'JOB',
  GIT: 'GIT',
  LEARNING: 'LEARNING',
  HACKATHON: 'HACKATHON',
  OPENSOURCE: 'OPENSOURCE',
  COMPANY: 'COMPANY',
  DESIGN: 'DESIGN',
  DATA_SCIENCE: 'DATA_SCIENCE',
  OTHER: 'OTHER',
} as const;

export const PLATFORM_CATEGORY_LABELS: Record<PlatformCategory, string> = {
  DSA: 'DSA & Competitive Programming',
  JOB: 'Job Portals',
  GIT: 'Version Control',
  LEARNING: 'Learning Platforms',
  HACKATHON: 'Hackathons & Competitions',
  OPENSOURCE: 'Open Source Programs',
  COMPANY: 'Company Portals',
  DESIGN: 'Design Platforms',
  DATA_SCIENCE: 'Data Science',
  OTHER: 'Other',
};

export const PLATFORM_CATEGORY_ICONS: Record<PlatformCategory, string> = {
  DSA: 'Code',
  JOB: 'Briefcase',
  GIT: 'GitBranch',
  LEARNING: 'GraduationCap',
  HACKATHON: 'Trophy',
  OPENSOURCE: 'Heart',
  COMPANY: 'Building',
  DESIGN: 'Palette',
  DATA_SCIENCE: 'BarChart',
  OTHER: 'MoreHorizontal',
};

export const PLATFORM_CATEGORY_COLORS: Record<PlatformCategory, string> = {
  DSA: '#6366F1',
  JOB: '#10B981',
  GIT: '#8B5CF6',
  LEARNING: '#EC4899',
  HACKATHON: '#F59E0B',
  OPENSOURCE: '#EF4444',
  COMPANY: '#64748B',
  DESIGN: '#F472B6',
  DATA_SCIENCE: '#06B6D4',
  OTHER: '#6B7280',
};

export const PLATFORM_CATEGORY_DESCRIPTIONS: Record<PlatformCategory, string> = {
  DSA: 'Coding practice and competitive programming platforms',
  JOB: 'Job search and career platforms',
  GIT: 'Git repositories and version control platforms',
  LEARNING: 'Online courses and educational platforms',
  HACKATHON: 'Hackathons, design challenges, and competitions',
  OPENSOURCE: 'Open source contribution programs and initiatives',
  COMPANY: 'Direct company career pages (FAANG, etc.)',
  DESIGN: 'Design portfolios, creative tools, and UI/UX platforms',
  DATA_SCIENCE: 'Data science, machine learning, and analytics platforms',
  OTHER: 'Other platforms and miscellaneous tools',
};

// =============================================================================
// AUTH TYPES (matches Prisma enum)
// =============================================================================

export const AUTH_TYPES = {
  NONE: 'NONE',
  OAUTH: 'OAUTH',
  API_KEY: 'API_KEY',
  SCRAPING: 'SCRAPING',
  MANUAL: 'MANUAL',
  HYBRID: 'HYBRID',
} as const;

export const AUTH_TYPE_LABELS = {
  NONE: 'No Authentication',
  OAUTH: 'OAuth 2.0',
  API_KEY: 'API Key',
  SCRAPING: 'Web Scraping',
  MANUAL: 'Manual Entry',
  HYBRID: 'Hybrid',
} as const;

export const AUTH_TYPE_DESCRIPTIONS = {
  NONE: 'No authentication required - public data only',
  OAUTH: 'Secure OAuth 2.0 authorization',
  API_KEY: 'API key-based authentication',
  SCRAPING: 'Automated web scraping (requires username)',
  MANUAL: 'Manual data entry by user',
  HYBRID: 'Multiple authentication methods supported',
} as const;

export const AUTH_TYPE_ICONS = {
  NONE: 'Lock',
  OAUTH: 'Key',
  API_KEY: 'KeyRound',
  SCRAPING: 'Globe',
  MANUAL: 'Edit',
  HYBRID: 'Settings',
} as const;

// =============================================================================
// SYNC STATUS (matches Prisma enum)
// =============================================================================

export const SYNC_STATUS = {
  IDLE: 'IDLE',
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCESS: 'SUCCESS',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export const SYNC_STATUS_LABELS = {
  IDLE: 'Idle',
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUCCESS: 'Success',
  PARTIAL: 'Partial Success',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  RATE_LIMITED: 'Rate Limited',
} as const;

export const SYNC_STATUS_COLORS = {
  IDLE: '#6B7280',
  PENDING: '#F59E0B',
  IN_PROGRESS: '#3B82F6',
  SUCCESS: '#10B981',
  PARTIAL: '#F59E0B',
  FAILED: '#EF4444',
  CANCELLED: '#6B7280',
  RATE_LIMITED: '#EF4444',
} as const;

export const SYNC_STATUS_ICONS = {
  IDLE: 'Circle',
  PENDING: 'Clock',
  IN_PROGRESS: 'Loader',
  SUCCESS: 'CheckCircle',
  PARTIAL: 'AlertCircle',
  FAILED: 'XCircle',
  CANCELLED: 'Ban',
  RATE_LIMITED: 'AlertTriangle',
} as const;

// =============================================================================
// CONNECTION STATUS
// =============================================================================

export const CONNECTION_STATUS = {
  PENDING: 'pending',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;

export const CONNECTION_STATUS_LABELS = {
  pending: 'Pending',
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
} as const;

export const CONNECTION_STATUS_COLORS = {
  pending: '#F59E0B',
  connected: '#10B981',
  disconnected: '#6B7280',
  error: '#EF4444',
} as const;

// =============================================================================
// POPULAR PLATFORMS
// =============================================================================

export const POPULAR_PLATFORMS = [
  'leetcode',
  'github',
  'codeforces',
  'codechef',
  'hackerrank',
  'linkedin',
  'kaggle',
  'coursera',
  'udemy',
  'devpost',
] as const;

export const FEATURED_PLATFORMS = [
  'leetcode',
  'github',
  'codeforces',
  'linkedin',
  'kaggle',
  'devpost',
] as const;

// =============================================================================
// PLATFORM METRICS
// =============================================================================

export const PLATFORM_METRICS = {
  // DSA Platforms
  PROBLEMS_SOLVED: 'problems_solved',
  PROBLEMS_ATTEMPTED: 'problems_attempted',
  EASY_PROBLEMS: 'easy_problems',
  MEDIUM_PROBLEMS: 'medium_problems',
  HARD_PROBLEMS: 'hard_problems',
  CONTEST_RATING: 'contest_rating',
  CONTEST_RANK: 'contest_rank',
  CONTESTS_PARTICIPATED: 'contests_participated',
  ACCEPTANCE_RATE: 'acceptance_rate',

  // Git Platforms
  COMMITS: 'commits',
  PULL_REQUESTS: 'pull_requests',
  PULL_REQUESTS_MERGED: 'pull_requests_merged',
  ISSUES_OPENED: 'issues_opened',
  ISSUES_CLOSED: 'issues_closed',
  CODE_REVIEWS: 'code_reviews',
  REPOSITORIES: 'repositories',
  STARS_RECEIVED: 'stars_received',
  FORKS: 'forks',
  CONTRIBUTIONS: 'contributions',

  // Learning Platforms
  COURSES_COMPLETED: 'courses_completed',
  COURSES_IN_PROGRESS: 'courses_in_progress',
  CERTIFICATIONS_EARNED: 'certifications_earned',
  LESSONS_COMPLETED: 'lessons_completed',
  MODULES_COMPLETED: 'modules_completed',
  QUIZZES_PASSED: 'quizzes_passed',
  HOURS_SPENT: 'hours_spent',

  // Job Platforms
  APPLICATIONS_SUBMITTED: 'applications_submitted',
  APPLICATIONS_VIEWED: 'applications_viewed',
  INTERVIEWS_SCHEDULED: 'interviews_scheduled',
  INTERVIEWS_COMPLETED: 'interviews_completed',
  OFFERS_RECEIVED: 'offers_received',
  PROFILE_VIEWS: 'profile_views',
  CONNECTIONS: 'connections',

  // Hackathon Platforms
  HACKATHONS_PARTICIPATED: 'hackathons_participated',
  HACKATHONS_COMPLETED: 'hackathons_completed',
  PROJECTS_SUBMITTED: 'projects_submitted',
  AWARDS_WON: 'awards_won',
  TEAM_INVITES: 'team_invites',

  // Data Science
  COMPETITIONS_ENTERED: 'competitions_entered',
  MEDALS: 'medals',
  NOTEBOOKS_PUBLISHED: 'notebooks_published',
  DATASETS_PUBLISHED: 'datasets_published',
  RANKING: 'ranking',

  // Design
  SHOTS_POSTED: 'shots_posted',
  LIKES_RECEIVED: 'likes_received',
  PROJECTS: 'projects',
  APPRECIATIONS: 'appreciations',
  VIEWS: 'views',

  // Generic
  POINTS: 'points',
  XP_EARNED: 'xp_earned',
  RATING: 'rating',
  RANK: 'rank',
  STREAK: 'streak',
  BADGES: 'badges',
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
} as const;

export const METRIC_LABELS: Record<string, string> = {
  problems_solved: 'Problems Solved',
  problems_attempted: 'Problems Attempted',
  easy_problems: 'Easy Problems',
  medium_problems: 'Medium Problems',
  hard_problems: 'Hard Problems',
  contest_rating: 'Contest Rating',
  contest_rank: 'Contest Rank',
  contests_participated: 'Contests Participated',
  acceptance_rate: 'Acceptance Rate',
  commits: 'Commits',
  pull_requests: 'Pull Requests',
  pull_requests_merged: 'PRs Merged',
  issues_opened: 'Issues Opened',
  issues_closed: 'Issues Closed',
  code_reviews: 'Code Reviews',
  repositories: 'Repositories',
  stars_received: 'Stars Received',
  forks: 'Forks',
  contributions: 'Contributions',
  courses_completed: 'Courses Completed',
  courses_in_progress: 'Courses In Progress',
  certifications_earned: 'Certifications',
  lessons_completed: 'Lessons Completed',
  modules_completed: 'Modules Completed',
  quizzes_passed: 'Quizzes Passed',
  hours_spent: 'Hours Spent',
  applications_submitted: 'Applications Submitted',
  applications_viewed: 'Applications Viewed',
  interviews_scheduled: 'Interviews Scheduled',
  interviews_completed: 'Interviews Completed',
  offers_received: 'Offers Received',
  profile_views: 'Profile Views',
  connections: 'Connections',
  hackathons_participated: 'Hackathons Participated',
  hackathons_completed: 'Hackathons Completed',
  projects_submitted: 'Projects Submitted',
  awards_won: 'Awards Won',
  team_invites: 'Team Invites',
  competitions_entered: 'Competitions Entered',
  medals: 'Medals',
  notebooks_published: 'Notebooks Published',
  datasets_published: 'Datasets Published',
  ranking: 'Ranking',
  shots_posted: 'Shots Posted',
  likes_received: 'Likes Received',
  projects: 'Projects',
  appreciations: 'Appreciations',
  views: 'Views',
  points: 'Points',
  xp_earned: 'XP Earned',
  rating: 'Rating',
  rank: 'Rank',
  streak: 'Streak',
  badges: 'Badges',
  followers: 'Followers',
  following: 'Following',
};

// =============================================================================
// DIFFICULTY LEVELS
// =============================================================================

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

export const DIFFICULTY_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
} as const;

export const DIFFICULTY_COLORS = {
  easy: '#10B981',
  medium: '#F59E0B',
  hard: '#EF4444',
} as const;

// =============================================================================
// SYNC PRIORITIES
// =============================================================================

export const SYNC_PRIORITIES = {
  CRITICAL: 10,
  HIGH: 7,
  NORMAL: 5,
  LOW: 3,
  VERY_LOW: 1,
} as const;

export const SYNC_PRIORITY_LABELS = {
  10: 'Critical',
  7: 'High',
  5: 'Normal',
  3: 'Low',
  1: 'Very Low',
} as const;

// =============================================================================
// PLATFORM HEALTH STATUS
// =============================================================================

export const PLATFORM_HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  DOWN: 'down',
  UNKNOWN: 'unknown',
} as const;

export const HEALTH_STATUS_LABELS = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
  unknown: 'Unknown',
} as const;

export const HEALTH_STATUS_COLORS = {
  healthy: '#10B981',
  degraded: '#F59E0B',
  down: '#EF4444',
  unknown: '#6B7280',
} as const;

export const HEALTH_STATUS_ICONS = {
  healthy: 'CheckCircle',
  degraded: 'AlertTriangle',
  down: 'XCircle',
  unknown: 'HelpCircle',
} as const;

// =============================================================================
// PLATFORM URLS & PATTERNS
// =============================================================================

export const PLATFORM_URL_PATTERNS = {
  LEETCODE: 'https://leetcode.com/{username}',
  GITHUB: 'https://github.com/{username}',
  GITLAB: 'https://gitlab.com/{username}',
  CODEFORCES: 'https://codeforces.com/profile/{username}',
  CODECHEF: 'https://www.codechef.com/users/{username}',
  HACKERRANK: 'https://www.hackerrank.com/{username}',
  LINKEDIN: 'https://www.linkedin.com/in/{username}',
  KAGGLE: 'https://www.kaggle.com/{username}',
  ATCODER: 'https://atcoder.jp/users/{username}',
  TOPCODER: 'https://www.topcoder.com/members/{username}',
} as const;

// =============================================================================
// SCRAPER CONFIGURATION
// =============================================================================

export const SCRAPER_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 seconds
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  RATE_LIMIT_DELAY: 2000, // 2 seconds between requests
  MAX_CONCURRENT_REQUESTS: 5,
} as const;

// =============================================================================
// PLATFORM TAGS
// =============================================================================

export const PLATFORM_TAGS = {
  COMPETITIVE: 'competitive',
  PRACTICE: 'practice',
  INTERVIEW_PREP: 'interview-prep',
  CERTIFICATION: 'certification',
  FREE: 'free',
  PREMIUM: 'premium',
  BEGINNER_FRIENDLY: 'beginner-friendly',
  ADVANCED: 'advanced',
  OPEN_SOURCE: 'open-source',
  COMMUNITY: 'community',
  MENTORSHIP: 'mentorship',
  PROJECTS: 'projects',
  VIDEO_LEARNING: 'video-learning',
  INTERACTIVE: 'interactive',
  GAMIFIED: 'gamified',
  PROFESSIONAL: 'professional',
} as const;

export const PLATFORM_TAG_LABELS: Record<string, string> = {
  competitive: 'Competitive',
  practice: 'Practice',
  'interview-prep': 'Interview Prep',
  certification: 'Certification',
  free: 'Free',
  premium: 'Premium',
  'beginner-friendly': 'Beginner Friendly',
  advanced: 'Advanced',
  'open-source': 'Open Source',
  community: 'Community',
  mentorship: 'Mentorship',
  projects: 'Projects',
  'video-learning': 'Video Learning',
  interactive: 'Interactive',
  gamified: 'Gamified',
  professional: 'Professional',
};

// =============================================================================
// PLATFORM SORTING
// =============================================================================

export const PLATFORM_SORT_OPTIONS = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  CATEGORY: 'category',
  POPULARITY: 'popularity',
  RECENTLY_ADDED: 'recently_added',
  SYNC_PRIORITY: 'sync_priority',
  LAST_SYNCED: 'last_synced',
} as const;

export const PLATFORM_SORT_LABELS = {
  name_asc: 'Name (A-Z)',
  name_desc: 'Name (Z-A)',
  category: 'Category',
  popularity: 'Most Popular',
  recently_added: 'Recently Added',
  sync_priority: 'Sync Priority',
  last_synced: 'Last Synced',
} as const;

// =============================================================================
// PLATFORM FILTERS
// =============================================================================

export const PLATFORM_FILTER_OPTIONS = {
  ALL: 'all',
  CONNECTED: 'connected',
  NOT_CONNECTED: 'not_connected',
  AUTO_SYNC: 'auto_sync',
  MANUAL: 'manual',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  VERIFIED: 'verified',
} as const;

export const PLATFORM_FILTER_LABELS = {
  all: 'All Platforms',
  connected: 'Connected',
  not_connected: 'Not Connected',
  auto_sync: 'Auto Sync Enabled',
  manual: 'Manual Only',
  active: 'Active',
  inactive: 'Inactive',
  verified: 'Verified',
} as const;

// =============================================================================
// ERROR CODES
// =============================================================================

export const PLATFORM_ERROR_CODES = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  AUTH_FAILED: 'AUTH_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SYNC_FAILED: 'SYNC_FAILED',
  SCRAPER_ERROR: 'SCRAPER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  MAINTENANCE: 'MAINTENANCE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export const ERROR_CODE_MESSAGES = {
  CONNECTION_FAILED: 'Failed to connect to platform',
  AUTH_FAILED: 'Authentication failed',
  RATE_LIMITED: 'Rate limit exceeded',
  USER_NOT_FOUND: 'User not found on platform',
  INVALID_CREDENTIALS: 'Invalid credentials',
  TOKEN_EXPIRED: 'Authentication token expired',
  SYNC_FAILED: 'Synchronization failed',
  SCRAPER_ERROR: 'Error during data scraping',
  NETWORK_ERROR: 'Network connection error',
  TIMEOUT: 'Request timeout',
  MAINTENANCE: 'Platform is under maintenance',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getPlatformUrl(platformSlug: string, username: string): string | undefined {
  const patterns = PLATFORM_URL_PATTERNS as Record<string, string>;
  const pattern = patterns[platformSlug.toUpperCase()];
  return pattern?.replace('{username}', username);
}

export function getCategoryLabel(category: PlatformCategory): string {
  return PLATFORM_CATEGORY_LABELS[category];
}

export function getCategoryIcon(category: PlatformCategory): string {
  return PLATFORM_CATEGORY_ICONS[category];
}

export function getCategoryColor(category: PlatformCategory): string {
  return PLATFORM_CATEGORY_COLORS[category];
}

export function getSyncStatusLabel(status: keyof typeof SYNC_STATUS): string {
  return SYNC_STATUS_LABELS[status];
}

export function getSyncStatusColor(status: keyof typeof SYNC_STATUS): string {
  return SYNC_STATUS_COLORS[status];
}

export function getMetricLabel(metric: string): string {
  return METRIC_LABELS[metric] || metric;
}

export function isAutoSyncSupported(authType: keyof typeof AUTH_TYPES): boolean {
  return authType === 'OAUTH' || authType === 'API_KEY' || authType === 'SCRAPING';
}

export function requiresCredentials(authType: keyof typeof AUTH_TYPES): boolean {
  return authType === 'OAUTH' || authType === 'API_KEY';
}

// =============================================================================
// EXPORTS
// =============================================================================

const PLATFORMS_EXPORT = {
  CATEGORIES: PLATFORM_CATEGORIES,
  CATEGORY_LABELS: PLATFORM_CATEGORY_LABELS,
  CATEGORY_ICONS: PLATFORM_CATEGORY_ICONS,
  CATEGORY_COLORS: PLATFORM_CATEGORY_COLORS,
  AUTH_TYPES,
  AUTH_TYPE_LABELS,
  SYNC_STATUS,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_COLORS,
  CONNECTION_STATUS,
  CONNECTION_STATUS_LABELS,
  POPULAR_PLATFORMS,
  FEATURED_PLATFORMS,
  METRICS: PLATFORM_METRICS,
  METRIC_LABELS,
  DIFFICULTY_LEVELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  SYNC_PRIORITIES,
  HEALTH_STATUS: PLATFORM_HEALTH_STATUS,
  HEALTH_STATUS_LABELS,
  URL_PATTERNS: PLATFORM_URL_PATTERNS,
  SCRAPER_CONFIG,
  TAGS: PLATFORM_TAGS,
  TAG_LABELS: PLATFORM_TAG_LABELS,
  SORT_OPTIONS: PLATFORM_SORT_OPTIONS,
  FILTER_OPTIONS: PLATFORM_FILTER_OPTIONS,
  ERROR_CODES: PLATFORM_ERROR_CODES,
  ERROR_MESSAGES: ERROR_CODE_MESSAGES,
};

export default PLATFORMS_EXPORT;