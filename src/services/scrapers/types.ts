// src/services/scrapers/types.ts
import type { PlatformCategory } from '@prisma/client';

/**
 * Scraper credentials interface
 */
export interface ScraperCredentials {
  username?: string;
  email?: string;
  password?: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  cookies?: string;
  sessionId?: string;
  userId?: string;
  profileUrl?: string;
  credentials?: Record<string, unknown>;
}

/**
 * Single scraper entry (one day of activity)
 */
export interface ScraperEntry {
  date: Date;
  problems?: number;
  commits?: number;
  pullRequests?: number;
  issues?: number;
  timeSpent?: number; // minutes
  easy?: number;
  medium?: number;
  hard?: number;
  xp?: number;
  points?: number;
  rating?: number;
  ratingChange?: number;
  rank?: number;
  rankChange?: number;
  streak?: number;
  notes?: string;
  category?: PlatformCategory;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Scraper result
 */
export interface ScraperResult {
  success: boolean;
  entries: ScraperEntry[];
  error?: string;
  errorCode?: string;
  metadata?: ScraperMetadata;
  rawData?: unknown;
}

/**
 * Scraper metadata
 */
export interface ScraperMetadata {
  status?: 'success' | 'partial' | 'failed';
  username?: string;
  displayName?: string;
  profileUrl?: string;
  avatarUrl?: string;
  lastFetched?: Date;
  totalProblems?: number;
  totalCommits?: number;
  totalProjects?: number;
  rating?: number;
  maxRating?: number;
  rank?: string;
  level?: number;
  xp?: number;
  points?: number;
  streak?: number;
  longestStreak?: number;
  badges?: number;
  certificates?: number;
  followers?: number;
  following?: number;
  reputation?: number;
  contributions?: number;
  [key: string]: unknown;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  retryAfter?: number;
}

/**
 * Proxy configuration
 */
export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
  country?: string;
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  rateLimit?: RateLimitConfig;
  proxy?: ProxyConfig;
  userAgent?: string;
  headers?: Record<string, string>;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  platform: string;
  healthy: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  lastChecked: Date;
}

/**
 * Scraper capability flags
 */
export interface ScraperCapabilities {
  supportsDateRange: boolean;
  supportsIncremental: boolean;
  requiresAuth: boolean;
  requiresOAuth: boolean;
  requiresApiKey: boolean;
  supportsPagination: boolean;
  hasRateLimit: boolean;
  needsScraping: boolean;
}