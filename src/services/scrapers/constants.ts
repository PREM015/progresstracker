// src/services/scrapers/constants.ts
// Comprehensive scraper constants, error codes, and configuration
// Merged and optimized for the ProgressTracker application

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * Comprehensive error codes for all scraper operations
 * Using const object for better type inference and tree-shaking
 */
export const ScraperErrorCode = {
  // Authentication Errors
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  OAUTH_FAILED: 'OAUTH_FAILED',

  // User/Profile Errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PROFILE_PRIVATE: 'PROFILE_PRIVATE',
  INVALID_USERNAME: 'INVALID_USERNAME',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',

  // Rate Limiting & Quotas
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',

  // Network Errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  CONNECTION_RESET: 'CONNECTION_RESET',
  DNS_ERROR: 'DNS_ERROR',
  SSL_ERROR: 'SSL_ERROR',
  PROXY_ERROR: 'PROXY_ERROR',

  // Platform Errors
  PLATFORM_DOWN: 'PLATFORM_DOWN',
  PLATFORM_MAINTENANCE: 'PLATFORM_MAINTENANCE',
  API_ERROR: 'API_ERROR',
  API_CHANGED: 'API_CHANGED',
  BLOCKED: 'BLOCKED',
  IP_BLOCKED: 'IP_BLOCKED',
  GEO_BLOCKED: 'GEO_BLOCKED',
  CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED',
  CLOUDFLARE_BLOCKED: 'CLOUDFLARE_BLOCKED',

  // Parsing Errors
  PARSE_ERROR: 'PARSE_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  SCHEMA_CHANGED: 'SCHEMA_CHANGED',
  UNEXPECTED_FORMAT: 'UNEXPECTED_FORMAT',
  JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
  HTML_PARSE_ERROR: 'HTML_PARSE_ERROR',

  // Feature Errors
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  PREMIUM_REQUIRED: 'PREMIUM_REQUIRED',

  // Data Errors
  NO_DATA: 'NO_DATA',
  STALE_DATA: 'STALE_DATA',
  INCOMPLETE_DATA: 'INCOMPLETE_DATA',

  // Generic
  UNKNOWN: 'UNKNOWN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ScraperErrorCodeType = (typeof ScraperErrorCode)[keyof typeof ScraperErrorCode];

/**
 * Human-readable error messages for each error code
 */
export const ERROR_MESSAGES: Record<ScraperErrorCodeType, string> = {
  [ScraperErrorCode.AUTH_FAILED]: 'Authentication failed. Please check your credentials.',
  [ScraperErrorCode.AUTH_EXPIRED]: 'Your session has expired. Please reconnect your account.',
  [ScraperErrorCode.AUTH_REQUIRED]: 'Authentication is required for this platform.',
  [ScraperErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials provided.',
  [ScraperErrorCode.TOKEN_EXPIRED]: 'Access token has expired. Please reconnect.',
  [ScraperErrorCode.TOKEN_INVALID]: 'Access token is invalid. Please reconnect.',
  [ScraperErrorCode.OAUTH_FAILED]: 'OAuth authentication failed. Please try again.',

  [ScraperErrorCode.USER_NOT_FOUND]: 'User not found. Please check your username.',
  [ScraperErrorCode.PROFILE_PRIVATE]: 'This profile is private and cannot be accessed.',
  [ScraperErrorCode.INVALID_USERNAME]: 'Invalid username format.',
  [ScraperErrorCode.ACCOUNT_SUSPENDED]: 'This account has been suspended.',
  [ScraperErrorCode.ACCOUNT_DELETED]: 'This account has been deleted.',

  [ScraperErrorCode.RATE_LIMITED]: 'Rate limited. Please try again in a few minutes.',
  [ScraperErrorCode.QUOTA_EXCEEDED]: 'API quota exceeded. Please try again later.',
  [ScraperErrorCode.TOO_MANY_REQUESTS]: 'Too many requests. Please slow down.',
  [ScraperErrorCode.DAILY_LIMIT_REACHED]: 'Daily limit reached. Try again tomorrow.',

  [ScraperErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection.',
  [ScraperErrorCode.TIMEOUT]: 'Request timed out. Please try again.',
  [ScraperErrorCode.CONNECTION_REFUSED]: 'Connection refused by the server.',
  [ScraperErrorCode.CONNECTION_RESET]: 'Connection was reset. Please try again.',
  [ScraperErrorCode.DNS_ERROR]: 'DNS resolution failed.',
  [ScraperErrorCode.SSL_ERROR]: 'SSL/TLS error. Connection not secure.',
  [ScraperErrorCode.PROXY_ERROR]: 'Proxy connection error.',

  [ScraperErrorCode.PLATFORM_DOWN]: 'Platform is temporarily unavailable.',
  [ScraperErrorCode.PLATFORM_MAINTENANCE]: 'Platform is under maintenance.',
  [ScraperErrorCode.API_ERROR]: 'API returned an error.',
  [ScraperErrorCode.API_CHANGED]: 'API has changed. Scraper needs update.',
  [ScraperErrorCode.BLOCKED]: 'Access has been blocked.',
  [ScraperErrorCode.IP_BLOCKED]: 'Your IP has been blocked.',
  [ScraperErrorCode.GEO_BLOCKED]: 'Access blocked from your location.',
  [ScraperErrorCode.CAPTCHA_REQUIRED]: 'CAPTCHA verification required.',
  [ScraperErrorCode.CLOUDFLARE_BLOCKED]: 'Blocked by Cloudflare protection.',

  [ScraperErrorCode.PARSE_ERROR]: 'Failed to parse response data.',
  [ScraperErrorCode.INVALID_RESPONSE]: 'Received invalid response from server.',
  [ScraperErrorCode.EMPTY_RESPONSE]: 'Received empty response from server.',
  [ScraperErrorCode.SCHEMA_CHANGED]: 'Response schema has changed.',
  [ScraperErrorCode.UNEXPECTED_FORMAT]: 'Unexpected data format received.',
  [ScraperErrorCode.JSON_PARSE_ERROR]: 'Failed to parse JSON response.',
  [ScraperErrorCode.HTML_PARSE_ERROR]: 'Failed to parse HTML response.',

  [ScraperErrorCode.NOT_SUPPORTED]: 'This feature is not supported.',
  [ScraperErrorCode.NOT_IMPLEMENTED]: 'This feature is not yet implemented.',
  [ScraperErrorCode.FEATURE_DISABLED]: 'This feature has been disabled.',
  [ScraperErrorCode.PREMIUM_REQUIRED]: 'Premium subscription required.',

  [ScraperErrorCode.NO_DATA]: 'No data available.',
  [ScraperErrorCode.STALE_DATA]: 'Data is outdated.',
  [ScraperErrorCode.INCOMPLETE_DATA]: 'Data is incomplete.',

  [ScraperErrorCode.UNKNOWN]: 'An unknown error occurred.',
  [ScraperErrorCode.INTERNAL_ERROR]: 'Internal server error.',
};

// =============================================================================
// USER AGENTS
// =============================================================================

/**
 * User agents organized by browser type
 * Updated to latest versions (2024)
 */
export const USER_AGENTS = {
  chrome: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  ],
  firefox: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
  ],
  safari: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  ],
  edge: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  ],
  mobile: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; Samsung Galaxy S24) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  ],
  bot: [
    'ProgressTracker/1.0 (+https://progresstracker.app/bot)',
    'ProgressTrackerSync/1.0',
  ],
} as const;

/**
 * Flat array of all user agents for random selection
 */
export const ALL_USER_AGENTS: string[] = [
  ...USER_AGENTS.chrome,
  ...USER_AGENTS.firefox,
  ...USER_AGENTS.safari,
  ...USER_AGENTS.edge,
];

/**
 * Get a random user agent
 */
export function getRandomUserAgent(type?: keyof typeof USER_AGENTS): string {
  const agents = type ? USER_AGENTS[type] : ALL_USER_AGENTS;
  return agents[Math.floor(Math.random() * agents.length)];
}

// =============================================================================
// RATE LIMITS
// =============================================================================

/**
 * Rate limit configuration type
 */
export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  retryAfterMs?: number;
}

/**
 * Default rate limits by auth type
 */
export const DEFAULT_RATE_LIMITS_BY_TYPE: Record<string, RateLimitConfig> = {
  oauth: { requests: 5000, windowMs: 3600000 }, // 5000/hour
  api_key: { requests: 1000, windowMs: 3600000 }, // 1000/hour
  scraping: { requests: 30, windowMs: 60000 }, // 30/min
  manual: { requests: 100, windowMs: 60000 }, // 100/min
  default: { requests: 30, windowMs: 60000 }, // 30/min
};

/**
 * Platform-specific rate limits
 */
export const PLATFORM_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Git Platforms (OAuth - high limits)
  github: { requests: 5000, windowMs: 3600000 },
  gitlab: { requests: 2000, windowMs: 3600000 },
  bitbucket: { requests: 1000, windowMs: 3600000 },

  // DSA Platforms (Scraping - be conservative)
  leetcode: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  codeforces: { requests: 10, windowMs: 60000, retryAfterMs: 60000 },
  codechef: { requests: 10, windowMs: 60000, retryAfterMs: 60000 },
  hackerrank: { requests: 15, windowMs: 60000, retryAfterMs: 30000 },
  hackerearth: { requests: 10, windowMs: 60000, retryAfterMs: 60000 },
  geeksforgeeks: { requests: 10, windowMs: 60000, retryAfterMs: 60000 },
  atcoder: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  codewars: { requests: 30, windowMs: 60000, retryAfterMs: 20000 },
  exercism: { requests: 30, windowMs: 60000, retryAfterMs: 20000 },
  topcoder: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  spoj: { requests: 10, windowMs: 60000, retryAfterMs: 60000 },
  interviewbit: { requests: 10, windowMs: 60000, retryAfterMs: 60000 },

  // Hackathon Platforms
  kaggle: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  devpost: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  devfolio: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  unstop: { requests: 15, windowMs: 60000, retryAfterMs: 45000 },
  mlh: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },

  // Learning Platforms
  coursera: { requests: 30, windowMs: 60000, retryAfterMs: 20000 },
  udemy: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  freecodecamp: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  codecademy: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  datacamp: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  pluralsight: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },

  // Job Platforms
  linkedin: { requests: 50, windowMs: 60000, retryAfterMs: 60000 },
  indeed: { requests: 20, windowMs: 60000, retryAfterMs: 30000 },
  naukri: { requests: 15, windowMs: 60000, retryAfterMs: 45000 },
  glassdoor: { requests: 15, windowMs: 60000, retryAfterMs: 45000 },

  // Design Platforms
  dribbble: { requests: 30, windowMs: 60000, retryAfterMs: 20000 },
  behance: { requests: 30, windowMs: 60000, retryAfterMs: 20000 },
};

/**
 * Get rate limit for a platform
 */
export function getRateLimit(platformSlug: string): RateLimitConfig {
  return PLATFORM_RATE_LIMITS[platformSlug] || DEFAULT_RATE_LIMITS_BY_TYPE.default;
}

// =============================================================================
// TIMEOUT CONFIGURATION
// =============================================================================

/**
 * Timeout configuration by operation type (in milliseconds)
 */
export const TIMEOUT_CONFIG = {
  // Request timeouts
  default: 30000, // 30 seconds
  fast: 10000, // 10 seconds (for health checks)
  slow: 60000, // 60 seconds (for heavy scraping)
  
  // Auth-specific
  oauth: 15000, // 15 seconds
  api: 20000, // 20 seconds
  scraping: 45000, // 45 seconds
  
  // Operation-specific
  healthCheck: 5000, // 5 seconds
  graphql: 30000, // 30 seconds
  download: 120000, // 2 minutes
  puppeteer: 60000, // 1 minute
} as const;

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  minDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  jitterFactor: 0.1, // Add 10% random jitter
  
  // Retry on these status codes
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  
  // Don't retry on these error codes
  noRetryErrors: [
    ScraperErrorCode.AUTH_FAILED,
    ScraperErrorCode.INVALID_CREDENTIALS,
    ScraperErrorCode.USER_NOT_FOUND,
    ScraperErrorCode.PROFILE_PRIVATE,
    ScraperErrorCode.NOT_SUPPORTED,
    ScraperErrorCode.CAPTCHA_REQUIRED,
  ],
} as const;

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(attempt: number): number {
  const baseDelay = Math.min(
    RETRY_CONFIG.minDelayMs * Math.pow(RETRY_CONFIG.backoffFactor, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  const jitter = baseDelay * RETRY_CONFIG.jitterFactor * Math.random();
  return Math.floor(baseDelay + jitter);
}

// =============================================================================
// HEALTH CHECK ENDPOINTS
// =============================================================================

/**
 * Health check endpoint configuration
 */
export interface HealthCheckEndpoint {
  url: string;
  method?: 'GET' | 'HEAD';
  expectedStatus?: number;
  timeout?: number;
}

/**
 * Platform health check endpoints
 */
export const HEALTH_CHECK_ENDPOINTS: Record<string, HealthCheckEndpoint> = {
  // DSA Platforms
  leetcode: { url: 'https://leetcode.com/graphql', method: 'HEAD', timeout: 5000 },
  codeforces: { url: 'https://codeforces.com/api/user.info?handles=tourist', timeout: 5000 },
  codechef: { url: 'https://www.codechef.com', method: 'HEAD', timeout: 5000 },
  hackerrank: { url: 'https://www.hackerrank.com', method: 'HEAD', timeout: 5000 },
  hackerearth: { url: 'https://www.hackerearth.com', method: 'HEAD', timeout: 5000 },
  geeksforgeeks: { url: 'https://www.geeksforgeeks.org', method: 'HEAD', timeout: 5000 },
  atcoder: { url: 'https://atcoder.jp', method: 'HEAD', timeout: 5000 },
  codewars: { url: 'https://www.codewars.com/api/v1/code-challenges/valid-braces', timeout: 5000 },
  exercism: { url: 'https://exercism.org/api/v2/tracks', timeout: 5000 },
  topcoder: { url: 'https://api.topcoder.com/v5/members/tourist', timeout: 5000 },
  spoj: { url: 'https://www.spoj.com', method: 'HEAD', timeout: 5000 },
  interviewbit: { url: 'https://www.interviewbit.com', method: 'HEAD', timeout: 5000 },
  projecteuler: { url: 'https://projecteuler.net', method: 'HEAD', timeout: 5000 },
  dmoj: { url: 'https://dmoj.ca/api/v2/problems', timeout: 5000 },

  // Git Platforms
  github: { url: 'https://api.github.com/zen', timeout: 3000 },
  gitlab: { url: 'https://gitlab.com/api/v4/version', timeout: 3000 },
  bitbucket: { url: 'https://api.bitbucket.org/2.0', method: 'HEAD', timeout: 3000 },
  codeberg: { url: 'https://codeberg.org/api/v1/version', timeout: 5000 },

  // Hackathon Platforms
  devpost: { url: 'https://devpost.com', method: 'HEAD', timeout: 5000 },
  devfolio: { url: 'https://devfolio.co', method: 'HEAD', timeout: 5000 },
  mlh: { url: 'https://mlh.io', method: 'HEAD', timeout: 5000 },
  unstop: { url: 'https://unstop.com', method: 'HEAD', timeout: 5000 },
  kaggle: { url: 'https://www.kaggle.com', method: 'HEAD', timeout: 5000 },
  producthunt: { url: 'https://www.producthunt.com', method: 'HEAD', timeout: 5000 },

  // Learning Platforms
  coursera: { url: 'https://www.coursera.org', method: 'HEAD', timeout: 5000 },
  udemy: { url: 'https://www.udemy.com', method: 'HEAD', timeout: 5000 },
  edx: { url: 'https://www.edx.org', method: 'HEAD', timeout: 5000 },
  freecodecamp: { url: 'https://www.freecodecamp.org', method: 'HEAD', timeout: 5000 },
  codecademy: { url: 'https://www.codecademy.com', method: 'HEAD', timeout: 5000 },
  pluralsight: { url: 'https://www.pluralsight.com', method: 'HEAD', timeout: 5000 },
  datacamp: { url: 'https://www.datacamp.com', method: 'HEAD', timeout: 5000 },
  khanacademy: { url: 'https://www.khanacademy.org', method: 'HEAD', timeout: 5000 },

  // Job Platforms
  linkedin: { url: 'https://www.linkedin.com', method: 'HEAD', timeout: 5000 },
  indeed: { url: 'https://www.indeed.com', method: 'HEAD', timeout: 5000 },
  glassdoor: { url: 'https://www.glassdoor.com', method: 'HEAD', timeout: 5000 },
  naukri: { url: 'https://www.naukri.com', method: 'HEAD', timeout: 5000 },
  wellfound: { url: 'https://wellfound.com', method: 'HEAD', timeout: 5000 },
  internshala: { url: 'https://internshala.com', method: 'HEAD', timeout: 5000 },

  // Design Platforms
  dribbble: { url: 'https://dribbble.com', method: 'HEAD', timeout: 5000 },
  behance: { url: 'https://www.behance.net', method: 'HEAD', timeout: 5000 },

  // Open Source Programs
  hacktoberfest: { url: 'https://hacktoberfest.com', method: 'HEAD', timeout: 5000 },
  gssoc: { url: 'https://gssoc.girlscript.tech', method: 'HEAD', timeout: 5000 },
  kwoc: { url: 'https://kwoc.kossiitkgp.org', method: 'HEAD', timeout: 5000 },
};

// =============================================================================
// PLATFORM CLASSIFICATIONS
// =============================================================================

/**
 * Platforms organized by category
 */
export const PLATFORM_CATEGORIES = {
  DSA: [
    'leetcode', 'codeforces', 'codechef', 'hackerrank', 'hackerearth',
    'geeksforgeeks', 'atcoder', 'codewars', 'exercism', 'topcoder',
    'spoj', 'interviewbit', 'binarysearch', 'projecteuler', 'dmoj',
    'cses', 'algoexpert', 'codingame',
  ],
  GIT: [
    'github', 'gitlab', 'bitbucket', 'codeberg', 'sourceforge',
  ],
  HACKATHON: [
    'devpost', 'devfolio', 'mlh', 'unstop', 'kaggle', 'codingame',
    'producthunt', 'replit', 'hackathoncom',
  ],
  LEARNING: [
    'coursera', 'udemy', 'edx', 'pluralsight', 'linkedinlearning',
    'freecodecamp', 'codecademy', 'udacity', 'skillshare', 'khanacademy',
    'datacamp', 'scrimba', 'frontendmasters', 'egghead', 'sololearn',
  ],
  JOB: [
    'linkedin', 'indeed', 'glassdoor', 'naukri', 'wellfound', 'internshala',
    'monster', 'hired', 'dice', 'simplyhired', 'ziprecruiter', 'instahyre',
    'angellist', 'levels',
  ],
  OPENSOURCE: [
    'gsoc', 'outreachy', 'lfx', 'gssoc', 'hacktoberfest', 'kwoc',
    'swoc', 'jwoc', 'ssoc', 'mlhfellowship',
  ],
  COMPANY: [
    'amazonjobs', 'microsoftcareers', 'googlecareers', 'metacareers',
    'applecareers', 'netflixjobs', 'ibmcareers', 'salesforcecareers',
  ],
  DESIGN: [
    'dribbble', 'behance',
  ],
  DATA_SCIENCE: [
    'kaggle', 'datacamp',
  ],
} as const;

/**
 * Platforms with working auto-sync (tested and reliable)
 */
export const WORKING_SCRAPERS = new Set([
  // DSA - Most reliable
  'leetcode',
  'codeforces',
  'codechef',
  'hackerrank',
  'atcoder',
  'codewars',
  'exercism',
  'geeksforgeeks',

  // Git - OAuth based, very reliable
  'github',
  'gitlab',
  'bitbucket',

  // Others
  'kaggle',
  'freecodecamp',
  'devpost',
  'topcoder',
  'gssoc',
  'kwoc',
]);

/**
 * Platforms requiring OAuth authentication
 */
export const OAUTH_PLATFORMS = new Set([
  'github', 'gitlab', 'bitbucket', 'linkedin', 'google', 'microsoft',
  'dribbble', 'behance', 'producthunt', 'devpost', 'devfolio', 'mlh',
  'coursera', 'edx', 'udacity', 'khanacademy', 'hacktoberfest', 'replit',
]);

/**
 * Platforms requiring API key
 */
export const API_KEY_PLATFORMS = new Set([
  'wakatime', 'toggl', 'clockify', 'exercism',
]);

/**
 * Platforms requiring web scraping (Puppeteer/Playwright)
 */
export const SCRAPING_PLATFORMS = new Set([
  'leetcode', 'codeforces', 'codechef', 'hackerrank', 'hackerearth',
  'geeksforgeeks', 'spoj', 'interviewbit', 'naukri', 'internshala',
  'codecademy', 'datacamp', 'pluralsight', 'unstop', 'atcoder',
]);

/**
 * Platforms that are manual-only (no auto-sync possible)
 */
export const MANUAL_ONLY_PLATFORMS = new Set([
  'algoexpert', 'projecteuler', 'cses', 'indeed', 'glassdoor',
  'monster', 'dice', 'simplyhired', 'ziprecruiter', 'skillshare',
  'frontendmasters', 'egghead', 'gsoc', 'outreachy', 'lfx',
  'amazonjobs', 'microsoftcareers', 'googlecareers', 'metacareers',
  'applecareers', 'netflixjobs', 'ibmcareers', 'salesforcecareers',
]);

// =============================================================================
// HTTP HEADERS
// =============================================================================

/**
 * Common headers for requests
 */
export const DEFAULT_HEADERS = {
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
} as const;

/**
 * Headers for API requests
 */
export const API_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
} as const;

/**
 * Headers for GraphQL requests
 */
export const GRAPHQL_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Origin': 'https://leetcode.com',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

const ScrapersConstants = {
  ScraperErrorCode,
  ERROR_MESSAGES,
  USER_AGENTS,
  ALL_USER_AGENTS,
  getRandomUserAgent,
  PLATFORM_RATE_LIMITS,
  DEFAULT_RATE_LIMITS_BY_TYPE,
  getRateLimit,
  TIMEOUT_CONFIG,
  RETRY_CONFIG,
  calculateRetryDelay,
  HEALTH_CHECK_ENDPOINTS,
  PLATFORM_CATEGORIES,
  WORKING_SCRAPERS,
  OAUTH_PLATFORMS,
  API_KEY_PLATFORMS,
  SCRAPING_PLATFORMS,
  MANUAL_ONLY_PLATFORMS,
  DEFAULT_HEADERS,
  API_HEADERS,
  GRAPHQL_HEADERS,
};

export default ScrapersConstants;