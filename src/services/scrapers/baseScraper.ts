// src/services/scrapers/baseScraper.ts

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '@/lib/logger';

export interface ScraperCredentials {
  username?: string;
  token?: string;
  email?: string;
  password?: string;
  apiKey?: string;
  cookies?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ScraperEntry {
  date: Date;
  problems?: number;
  timeSpent?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface ScraperResult {
  success: boolean;
  entries: ScraperEntry[];
  error?: string;
  metadata?: {
    username?: string;
    profileUrl?: string;
    lastFetched?: Date;
    totalProblems?: number;
    rating?: number;
    rank?: string;
    streak?: number;
    [key: string]: any;
  };
}

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

export abstract class BaseScraper {
  abstract platformName: string;
  abstract platformSlug: string;
  
  protected baseUrl: string = '';
  protected timeout: number = 30000;
  protected maxRetries: number = 3;
  protected retryDelay: number = 1000;
  protected rateLimit: RateLimitConfig = { requests: 60, windowMs: 60000 };

  // Abstract method - must be implemented by each scraper
  abstract fetchData(credentials: ScraperCredentials): Promise<ScraperResult>;

  // HTTP request with retry logic
  protected async request<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.retryRequest(() =>
      axios({
        url,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...config?.headers,
        },
        ...config,
      })
    );
  }

  // GET request helper
  protected async get<T = any>(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.request<T>(url, { method: 'GET', params, headers });
    return response.data;
  }

  // POST request helper
  protected async post<T = any>(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.request<T>(url, { method: 'POST', data, headers });
    return response.data;
  }

  // Retry wrapper with exponential backoff
  protected async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries,
    delay: number = this.retryDelay
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && this.isRetryableError(error)) {
        logger.info(`[${this.platformName}] Retrying in ${delay}ms... (${retries} attempts left)`);
        await this.sleep(delay);
        return this.retryRequest(fn, retries - 1, Math.min(delay * 2, 30000));
      }
      throw error;
    }
  }

  // Check if error is retryable
  protected isRetryableError(error: any): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      return (
        !status ||
        status >= 500 ||
        status === 429 ||
        status === 408 ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT'
      );
    }
    return false;
  }

  // Error handler - returns standardized error result
  protected handleError(error: any): ScraperResult {
    logger.error(`[${this.platformName}] Scraper error:`, error instanceof Error ? error : new Error(String(error)));

    let errorMessage = 'An unknown error occurred';

    if (error instanceof AxiosError) {
      const status = error.response?.status;
      switch (status) {
        case 401:
          errorMessage = 'Authentication failed. Please reconnect your account.';
          break;
        case 403:
          errorMessage = 'Access forbidden. Your account may not have required permissions.';
          break;
        case 404:
          errorMessage = `User not found on ${this.platformName}. Please check your username.`;
          break;
        case 429:
          errorMessage = 'Rate limited. Please try again in a few minutes.';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = `${this.platformName} is temporarily unavailable. Please try again later.`;
          break;
        default:
          errorMessage = error.message || `Failed to fetch data from ${this.platformName}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      entries: [],
      error: errorMessage,
    };
  }

  // Sleep utility
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Parse date from various formats
  protected parseDate(input: string | number | Date): Date {
    if (input instanceof Date) return input;
    
    if (typeof input === 'number') {
      // Unix timestamp (seconds or milliseconds)
      return new Date(input < 10000000000 ? input * 1000 : input);
    }
    
    return new Date(input);
  }

  // Get date string in YYYY-MM-DD format
  protected toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Get dates from last N days
  protected getDateRange(days: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { start, end };
  }

  // Group items by date
  protected groupByDate<T>(
    items: T[],
    getDate: (item: T) => Date
  ): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    
    for (const item of items) {
      const dateStr = this.toDateString(getDate(item));
      const existing = groups.get(dateStr) || [];
      existing.push(item);
      groups.set(dateStr, existing);
    }
    
    return groups;
  }

  // Count unique items by date
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

  // Convert count map to entries
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

  // Validate required credentials
  protected validateCredentials(
    credentials: ScraperCredentials,
    required: (keyof ScraperCredentials)[]
  ): void {
    for (const field of required) {
      if (!credentials[field]) {
        throw new Error(`${this.platformName} requires ${field}`);
      }
    }
  }

  // Create success result
  protected success(
    entries: ScraperEntry[],
    metadata?: ScraperResult['metadata']
  ): ScraperResult {
    return {
      success: true,
      entries,
      metadata: {
        lastFetched: new Date(),
        ...metadata,
      },
    };
  }

  // Create failure result
  protected failure(error: string): ScraperResult {
    return {
      success: false,
      entries: [],
      error,
    };
  }

  // Create placeholder result for unsupported platforms
  protected notSupported(reason?: string): ScraperResult {
    return {
      success: false,
      entries: [],
      error: reason || `Auto-sync for ${this.platformName} is not yet available. Please use manual tracking.`,
    };
  }
}

export default BaseScraper;