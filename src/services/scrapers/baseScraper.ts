// src/services/scrapers/baseScraper.ts
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '@/lib/logger';
import { userAgentManager } from './userAgentManager';
import { rateLimitManager } from './rateLimitManager';
import { proxyManager } from './proxyManager';
import { ScraperErrorCode } from './constants';
import { dateUtils, sleep, retryWithBackoff, validateUrlForSSRF } from './utils';
import type {
  ScraperCredentials,
  ScraperEntry,
  ScraperResult,
  ScraperMetadata,
  ScraperConfig,
  ScraperCapabilities,
  RateLimitConfig,
} from './types';

export abstract class BaseScraper {
  abstract platformName: string;
  abstract platformSlug: string;

  protected baseUrl: string = '';
  protected timeout: number = 30000;
  protected maxRetries: number = 3;
  protected retryDelay: number = 1000;
  protected rateLimit: RateLimitConfig = { requests: 60, windowMs: 60000 };
  protected useProxy: boolean = false;
  protected requiresAuth: boolean = false;

  // ==========================================================================
  // ABSTRACT METHODS - Must be implemented by each scraper
  // ==========================================================================

  /**
   * Fetch raw data from the platform
   * This is the main method each scraper must implement
   */
  abstract fetchData(credentials: ScraperCredentials): Promise<ScraperResult>;

  // ==========================================================================
  // PUBLIC METHODS - Can be overridden if needed
  // ==========================================================================

  /**
   * Main scrape method - calls fetchData internally
   * Can be overridden by subclasses for custom behavior
   */
  async scrape(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      // Validate required credentials
      if (this.requiresAuth) {
        this.validateCredentials(credentials, ['username']);
      }

      // Call the platform-specific fetchData
      return await this.fetchData(credentials);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Parse and normalize scraped data
   * Override this in subclasses for custom parsing
   */
  async parseData(result: ScraperResult): Promise<Record<string, unknown>> {
    if (!result.success || !result.entries) {
      return {};
    }

    // Aggregate data from entries
    let totalProblems = 0;
    let easyProblems = 0;
    let mediumProblems = 0;
    let hardProblems = 0;
    let commits = 0;
    let pullRequests = 0;
    let timeSpent = 0;

    for (const entry of result.entries) {
      totalProblems += entry.problems || 0;
      easyProblems += entry.easy || 0;
      mediumProblems += entry.medium || 0;
      hardProblems += entry.hard || 0;
      commits += entry.commits || 0;
      pullRequests += entry.pullRequests || 0;
      timeSpent += entry.timeSpent || 0;
    }

    return {
      problemsSolved: totalProblems,
      problemsAttempted: totalProblems,
      easyProblems,
      mediumProblems,
      hardProblems,
      commits,
      pullRequests,
      timeSpent,
      rating: result.metadata?.rating,
      rank: result.metadata?.rank,
      streak: result.metadata?.streak,
      points: result.metadata?.points,
      totalSubmissions: result.metadata?.totalSubmissions,
      acceptedSubmissions: result.metadata?.acceptedSubmissions,
      ...result.metadata,
    };
  }

  /**
   * Get scraper capabilities
   */
  getCapabilities(): ScraperCapabilities {
    return {
      supportsDateRange: true,
      supportsIncremental: false,
      requiresAuth: this.requiresAuth,
      requiresOAuth: false,
      requiresApiKey: false,
      supportsPagination: false,
      hasRateLimit: true,
      needsScraping: true,
    };
  }

  /**
   * Configure scraper
   */
  configure(config: ScraperConfig): void {
    if (config.timeout) this.timeout = config.timeout;
    if (config.maxRetries) this.maxRetries = config.maxRetries;
    if (config.retryDelay) this.retryDelay = config.retryDelay;
    if (config.rateLimit) {
      this.rateLimit = config.rateLimit;
      rateLimitManager.configure(this.platformSlug, config.rateLimit);
    }
  }

  // ==========================================================================
  // PROTECTED METHODS - Available to subclasses
  // ==========================================================================

  /**
   * HTTP request with retry logic and rate limiting
   */
  protected async request<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    // 0. SSRF Prevention
    validateUrlForSSRF(url);

    // 1. Wait for rate limit
    await rateLimitManager.acquire(this.platformSlug);

    const requestConfig: AxiosRequestConfig = {
      url,
      timeout: this.timeout,
      headers: {
        'User-Agent': userAgentManager.getForPlatform(this.platformSlug),
        Accept: 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...config?.headers,
      },
      ...config,
    };

    // Add proxy if enabled
    if (this.useProxy && proxyManager.isEnabled()) {
      const proxy = proxyManager.getNext();
      if (proxy) {
        requestConfig.proxy = {
          host: proxy.host,
          port: proxy.port,
          protocol: proxy.protocol,
          auth:
            proxy.username && proxy.password
              ? { username: proxy.username, password: proxy.password }
              : undefined,
        };
      }
    }

    return retryWithBackoff(() => axios(requestConfig), this.maxRetries, this.retryDelay);
  }

  /**
   * GET request helper
   */
  protected async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.request<T>(url, {
      method: 'GET',
      params,
      headers,
    });
    return response.data;
  }

  /**
   * POST request helper
   */
  protected async post<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.request<T>(url, {
      method: 'POST',
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    return response.data;
  }

  /**
   * GraphQL request helper
   */
  protected async graphql<T = unknown>(
    url: string,
    query: string,
    variables?: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.post<{ data: T; errors?: Array<{ message: string }> }>(
      url,
      { query, variables },
      headers
    );

    if (response.errors?.length) {
      throw new Error(response.errors[0].message);
    }

    return response.data;
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      return (
        !status ||
        status >= 500 ||
        status === 429 ||
        status === 408 ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND'
      );
    }
    return false;
  }

  /**
   * Handle errors and return standardized result
   */
  protected handleError(error: unknown): ScraperResult {
    const logContext = { platform: this.platformName };

    if (error instanceof Error) {
      logger.error(`[${this.platformName}] Scraper error`, logContext, error);
    } else {
      logger.error(
        `[${this.platformName}] Scraper error`,
        logContext,
        new Error(String(error))
      );
    }

    let errorMessage = 'An unknown error occurred';
    let errorCode: string = ScraperErrorCode.UNKNOWN;

    if (error instanceof AxiosError) {
      const status = error.response?.status;

      switch (status) {
        case 401:
          errorMessage = 'Authentication failed. Please reconnect your account.';
          errorCode = ScraperErrorCode.AUTH_FAILED;
          break;
        case 403:
          errorMessage = 'Access forbidden. Your account may not have required permissions.';
          errorCode = ScraperErrorCode.BLOCKED;
          break;
        case 404:
          errorMessage = `User not found on ${this.platformName}. Please check your username.`;
          errorCode = ScraperErrorCode.USER_NOT_FOUND;
          break;
        case 429:
          errorMessage = 'Rate limited. Please try again in a few minutes.';
          errorCode = ScraperErrorCode.RATE_LIMITED;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = `${this.platformName} is temporarily unavailable. Please try again later.`;
          errorCode = ScraperErrorCode.PLATFORM_DOWN;
          break;
        default:
          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            errorMessage = `Request to ${this.platformName} timed out. Please try again.`;
            errorCode = ScraperErrorCode.TIMEOUT;
          } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMessage = `Unable to connect to ${this.platformName}. Please check your network.`;
            errorCode = ScraperErrorCode.NETWORK_ERROR;
          } else {
            errorMessage = error.message || `Failed to fetch data from ${this.platformName}`;
          }
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      entries: [],
      error: errorMessage,
      errorCode,
      metadata: {
        lastFetched: new Date(),
        status: 'failed',
      },
    };
  }

  /**
   * Parse date from various formats
   */
  protected parseDate(input: string | number | Date): Date {
    return dateUtils.parse(input);
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  protected toDateString(date: Date): string {
    return dateUtils.toDateString(date);
  }

  /**
   * Get date range for last N days
   */
  protected getDateRange(days: number): { start: Date; end: Date } {
    return dateUtils.getRange(days);
  }

  /**
   * Group items by date
   */
  protected groupByDate<T>(items: T[], getDate: (item: T) => Date): Map<string, T[]> {
    const groups = new Map<string, T[]>();

    for (const item of items) {
      const dateStr = this.toDateString(getDate(item));
      const existing = groups.get(dateStr) || [];
      existing.push(item);
      groups.set(dateStr, existing);
    }

    return groups;
  }

  /**
   * Count unique items by date
   */
  protected countByDate<T>(
    items: T[],
    getDate: (item: T) => Date,
    getId?: (item: T) => string
  ): Map<string, number> {
    const counts = new Map<string, number>();
    const seen = new Map<string, Set<string>>();

    for (const item of items) {
      const dateStr = this.toDateString(getDate(item));

      if (getId) {
        const id = getId(item);
        const seenIds = seen.get(dateStr) || new Set();
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        seen.set(dateStr, seenIds);
      }

      counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
    }

    return counts;
  }

  /**
   * Convert count map to entries
   */
  protected countsToEntries(
    counts: Map<string, number>,
    noteTemplate: (count: number) => string
  ): ScraperEntry[] {
    return Array.from(counts.entries()).map(([dateStr, count]) => ({
      date: new Date(dateStr),
      problems: count,
      notes: noteTemplate(count),
    }));
  }

  /**
   * Validate required credentials
   */
  protected validateCredentials(
    credentials: ScraperCredentials,
    required: (keyof ScraperCredentials)[]
  ): void {
    for (const field of required) {
      if (!credentials[field]) {
        throw new Error(`${this.platformName} requires ${String(field)}`);
      }
    }
  }

  /**
   * Create success result
   */
  protected success(entries: ScraperEntry[], metadata?: ScraperMetadata): ScraperResult {
    return {
      success: true,
      entries,
      metadata: {
        lastFetched: new Date(),
        status: 'success',
        ...metadata,
      },
    };
  }

  /**
   * Create partial success result
   */
  protected partial(entries: ScraperEntry[], error: string, metadata?: ScraperMetadata): ScraperResult {
    return {
      success: true,
      entries,
      error,
      metadata: {
        lastFetched: new Date(),
        status: 'partial',
        ...metadata,
      },
    };
  }

  /**
   * Create failure result
   */
  protected failure(error: string, errorCode: string = ScraperErrorCode.UNKNOWN): ScraperResult {
    return {
      success: false,
      entries: [],
      error,
      errorCode,
    };
  }

  /**
   * Create not supported result
   */
  protected notSupported(reason?: string): ScraperResult {
    return {
      success: false,
      entries: [],
      error:
        reason ||
        `Auto-sync for ${this.platformName} is not yet available. Please use manual tracking.`,
      errorCode: ScraperErrorCode.NOT_SUPPORTED,
    };
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return sleep(ms);
  }
}

export default BaseScraper;

// Re-export types for convenience
export type { ScraperCredentials, ScraperEntry, ScraperResult, ScraperMetadata };