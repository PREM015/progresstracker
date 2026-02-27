// ===== FILE: src/types/scraper.ts =====
// Complete scraper types for platform data extraction

import type { PlatformCategory as PrismaPlatformCategory } from '@prisma/client';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Scraper status */
export type ScraperStatus = 'idle' | 'running' | 'completed' | 'failed' | 'rate_limited' | 'blocked';

/** Scraper method */
export type ScraperMethod = 'api' | 'graphql' | 'rest' | 'scraping' | 'rss' | 'webhook' | 'hybrid';

/** Data source type */
export type DataSourceType = 'official_api' | 'unofficial_api' | 'web_scrape' | 'rss_feed' | 'manual';

/** Authentication method for scrapers */
export type ScraperAuthMethod = 'none' | 'api_key' | 'oauth' | 'bearer' | 'basic' | 'cookie' | 'session';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Scraper configuration */
export interface ScraperConfig {
  platformSlug: string;
  platformName: string;
  method: ScraperMethod;
  dataSource: DataSourceType;
  authMethod: ScraperAuthMethod;

  // Endpoints
  baseUrl: string;
  endpoints: ScraperEndpoint[];

  // Rate limiting
  rateLimit: {
    requests: number;
    window: number; // seconds
    retryAfter?: number;
  };

  // Retry configuration
  retry: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number; // ms
    maxDelay: number; // ms
  };

  // Timeout
  timeout: number; // ms

  // Parsing
  selectors?: ScraperSelectors;
  transformers?: DataTransformer[];

  // Headers
  defaultHeaders?: Record<string, string>;

  // Proxy
  useProxy?: boolean;
  proxyConfig?: ProxyConfig;

  // Features
  supportsIncremental: boolean;
  supportsBulk: boolean;
  requiresAuthentication: boolean;
}

/** Scraper endpoint definition */
export interface ScraperEndpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description?: string;
  params?: EndpointParam[];
  headers?: Record<string, string>;
  body?: unknown;
  responseType: 'json' | 'html' | 'xml' | 'text';
  rateLimit?: {
    requests: number;
    window: number;
  };
}

/** Endpoint parameter */
export interface EndpointParam {
  name: string;
  type: 'path' | 'query' | 'header' | 'body';
  required: boolean;
  default?: string | number;
  description?: string;
}

/** CSS/XPath selectors for web scraping */
export interface ScraperSelectors {
  container?: string;
  items?: string;
  fields: Record<string, SelectorConfig>;
}

/** Selector configuration */
export interface SelectorConfig {
  selector: string;
  type: 'css' | 'xpath';
  attribute?: string;
  transform?: string; // Function name or expression
  multiple?: boolean;
  optional?: boolean;
}

/** Data transformer */
export interface DataTransformer {
  field: string;
  type: 'number' | 'date' | 'string' | 'boolean' | 'array';
  transform?: (value: unknown) => unknown;
  format?: string;
  default?: unknown;
}

/** Proxy configuration */
export interface ProxyConfig {
  enabled: boolean;
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  protocol?: 'http' | 'https' | 'socks4' | 'socks5';
  rotationEnabled?: boolean;
  rotationInterval?: number;
}

// =============================================================================
// SCRAPER RESULT TYPES
// =============================================================================

/** Main scraper result */
export interface ScraperResult<T = ScrapedData> {
  success: boolean;
  platform: string;
  username: string;
  data: T | null;
  rawData?: unknown;
  metadata: ScraperMetadata;
  error?: ScraperError;
}

/** Scraped data (normalized) */
export interface ScrapedData {
  // User profile
  profile?: ScrapedProfile;

  // Statistics
  stats?: ScrapedStats;

  // Activity
  recentActivity?: ScrapedActivity[];

  // Submissions/Problems
  submissions?: ScrapedSubmission[];
  problemsSolved?: ScrapedProblem[];

  // Contests
  contests?: ScrapedContest[];

  // Contributions (GitHub-style)
  contributions?: ScrapedContribution[];

  // Courses/Certifications
  courses?: ScrapedCourse[];
  certifications?: ScrapedCertification[];

  // Projects
  projects?: ScrapedProject[];

  // Custom data
  custom?: Record<string, unknown>;
}

/** Scraped profile data */
export interface ScrapedProfile {
  username: string;
  displayName?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  joinDate?: Date;
  profileUrl: string;
  isVerified?: boolean;
  isPremium?: boolean;
  badges?: string[];
  socialLinks?: Record<string, string>;
}

/** Scraped statistics */
export interface ScrapedStats {
  // Problems
  totalSolved?: number;
  totalAttempted?: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  acceptanceRate?: number;

  // Ranking
  ranking?: number;
  globalRank?: number;
  countryRank?: number;
  percentile?: number;

  // Rating
  rating?: number;
  maxRating?: number;
  ratingChange?: number;

  // Points
  points?: number;
  totalPoints?: number;
  reputation?: number;

  // Contributions
  contributions?: number;
  commits?: number;
  pullRequests?: number;
  issues?: number;
  reviews?: number;

  // Streak
  currentStreak?: number;
  longestStreak?: number;

  // Time
  totalTime?: number; // minutes
  avgTimePerProblem?: number;

  // Misc
  followers?: number;
  following?: number;
  stars?: number;
  repositories?: number;
}

/** Scraped activity item */
export interface ScrapedActivity {
  id?: string;
  type: string;
  title: string;
  description?: string;
  url?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** Scraped submission */
export interface ScrapedSubmission {
  id: string;
  problemId?: string;
  problemTitle: string;
  problemUrl?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  status: 'accepted' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compile_error' | 'pending';
  language: string;
  runtime?: number;
  memory?: number;
  timestamp: Date;
  code?: string;
}

/** Scraped problem */
export interface ScrapedProblem {
  id: string;
  title: string;
  url?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  solvedAt?: Date;
  attempts?: number;
}

/** Scraped contest */
export interface ScrapedContest {
  id: string;
  name: string;
  url?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  rank?: number;
  score?: number;
  totalParticipants?: number;
  problemsSolved?: number;
  rating?: number;
  ratingChange?: number;
}

/** Scraped contribution (GitHub-style) */
export interface ScrapedContribution {
  date: string; // YYYY-MM-DD
  count: number;
  level?: 0 | 1 | 2 | 3 | 4;
}

/** Scraped course */
export interface ScrapedCourse {
  id: string;
  title: string;
  provider?: string;
  url?: string;
  progress: number; // percentage
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // hours
  certificate?: string;
}

/** Scraped certification */
export interface ScrapedCertification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
  skills?: string[];
}

/** Scraped project */
export interface ScrapedProject {
  id: string;
  name: string;
  description?: string;
  url?: string;
  language?: string;
  stars?: number;
  forks?: number;
  watchers?: number;
  issues?: number;
  lastUpdated?: Date;
  createdAt?: Date;
  topics?: string[];
  isPrivate?: boolean;
  isFork?: boolean;
}

// =============================================================================
// METADATA & ERROR TYPES
// =============================================================================

/** Scraper metadata */
export interface ScraperMetadata {
  scrapedAt: Date;
  duration: number; // ms
  dataSource: DataSourceType;
  method: ScraperMethod;
  version: string;
  cached: boolean;
  cacheAge?: number;
  requestCount: number;
  bytesTransferred?: number;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: Date;
  };
}

/** Scraper error */
export interface ScraperError {
  code: ScraperErrorCode;
  message: string;
  details?: string;
  retryable: boolean;
  retryAfter?: number; // seconds
  statusCode?: number;
  originalError?: unknown;
}

/** Scraper error codes */
export type ScraperErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'USER_NOT_FOUND'
  | 'PROFILE_PRIVATE'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'PLATFORM_ERROR'
  | 'PLATFORM_DOWN'
  | 'BLOCKED'
  | 'CAPTCHA_REQUIRED'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN_ERROR';

// =============================================================================
// SCRAPER REGISTRY
// =============================================================================

/** Platform scraper info */
export interface PlatformScraperInfo {
  slug: string;
  name: string;
  category: PrismaPlatformCategory;
  method: ScraperMethod;
  dataSource: DataSourceType;
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  lastUpdated: Date;
  reliability: number; // 0-100
  avgResponseTime: number; // ms
  dataPoints: string[];
  limitations?: string[];
}

/** Scraper registry */
export const SCRAPER_REGISTRY: Record<string, Partial<PlatformScraperInfo>> = {
  leetcode: {
    slug: 'leetcode',
    name: 'LeetCode',
    category: 'DSA',
    method: 'graphql',
    dataSource: 'unofficial_api',
    status: 'active',
    dataPoints: ['profile', 'stats', 'submissions', 'contests'],
  },
  github: {
    slug: 'github',
    name: 'GitHub',
    category: 'GIT',
    method: 'api',
    dataSource: 'official_api',
    status: 'active',
    dataPoints: ['profile', 'stats', 'contributions', 'repositories'],
  },
  codeforces: {
    slug: 'codeforces',
    name: 'Codeforces',
    category: 'DSA',
    method: 'api',
    dataSource: 'official_api',
    status: 'active',
    dataPoints: ['profile', 'stats', 'submissions', 'contests'],
  },
  hackerrank: {
    slug: 'hackerrank',
    name: 'HackerRank',
    category: 'DSA',
    method: 'scraping',
    dataSource: 'web_scrape',
    status: 'active',
    dataPoints: ['profile', 'stats', 'badges'],
  },
  codechef: {
    slug: 'codechef',
    name: 'CodeChef',
    category: 'DSA',
    method: 'api',
    dataSource: 'official_api',
    status: 'active',
    dataPoints: ['profile', 'stats', 'contests'],
  },
  geeksforgeeks: {
    slug: 'geeksforgeeks',
    name: 'GeeksforGeeks',
    category: 'DSA',
    method: 'scraping',
    dataSource: 'web_scrape',
    status: 'active',
    dataPoints: ['profile', 'stats'],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Check if error is retryable */
export function isRetryableError(error: ScraperError): boolean {
  const retryableCodes: ScraperErrorCode[] = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMITED',
    'PLATFORM_ERROR',
    'PLATFORM_DOWN',
  ];
  return retryableCodes.includes(error.code);
}

/** Get retry delay with exponential backoff */
export function getRetryDelay(
  attempt: number,
  config: ScraperConfig['retry']
): number {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  );
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

/** Create scraper error */
export function createScraperError(
  code: ScraperErrorCode,
  message: string,
  options?: Partial<ScraperError>
): ScraperError {
  return {
    code,
    message,
    retryable: isRetryableError({ code, message, retryable: false }),
    ...options,
  };
}

/** Normalize scraped data to tracker entry format */
export function normalizeScrapedData(
  data: ScrapedData,
  platform: string
): Partial<TrackerEntryInput> {
  return {
    problems: data.stats?.totalSolved || 0,
    timeSpent: data.stats?.totalTime,
    notes: `${platform}: ${data.stats?.ranking ? `Rank: ${data.stats.ranking}` : ''}`,
  };
}

// Import for tracker entry reference
import { TrackerEntryInput } from '@/lib/validators';

export default ScraperResult;