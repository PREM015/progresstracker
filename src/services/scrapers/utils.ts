// src/services/scrapers/utils.ts
import { logger } from '@/lib/logger';
import type { ScraperEntry } from './types';

/**
 * Date utilities for scrapers
 */
export const dateUtils = {
  /**
   * Parse date from various formats
   */
  parse(input: string | number | Date): Date {
    if (input instanceof Date) return input;
    if (typeof input === 'number') {
      // Unix timestamp (seconds or milliseconds)
      return new Date(input < 10000000000 ? input * 1000 : input);
    }
    return new Date(input);
  },

  /**
   * Format date as YYYY-MM-DD
   */
  toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  },

  /**
   * Get date range for last N days
   */
  getRange(days: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  },

  /**
   * Check if date is within range
   */
  isInRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  },

  /**
   * Get start of day
   */
  startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  /**
   * Get days between two dates
   */
  daysBetween(start: Date, end: Date): number {
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },
};

/**
 * Group items by date
 */
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => Date
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const dateStr = dateUtils.toDateString(getDate(item));
    const existing = groups.get(dateStr) || [];
    existing.push(item);
    groups.set(dateStr, existing);
  }

  return groups;
}

/**
 * Count unique items by date
 */
export function countByDate<T>(
  items: T[],
  getDate: (item: T) => Date,
  getId?: (item: T) => string
): Map<string, number> {
  const counts = new Map<string, number>();
  const seen = new Map<string, Set<string>>();

  for (const item of items) {
    const dateStr = dateUtils.toDateString(getDate(item));

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
 * Convert count map to scraper entries
 */
export function countsToEntries(
  counts: Map<string, number>,
  noteTemplate: (count: number, date: string) => string
): ScraperEntry[] {
  return Array.from(counts.entries()).map(([dateStr, count]) => ({
    date: new Date(dateStr),
    problems: count,
    notes: noteTemplate(count, dateStr),
  }));
}

/**
 * Merge entries for same date
 */
export function mergeEntries(entries: ScraperEntry[]): ScraperEntry[] {
  const merged = new Map<string, ScraperEntry>();

  for (const entry of entries) {
    const dateStr = dateUtils.toDateString(entry.date);
    const existing = merged.get(dateStr);

    if (existing) {
      merged.set(dateStr, {
        ...existing,
        problems: (existing.problems || 0) + (entry.problems || 0),
        commits: (existing.commits || 0) + (entry.commits || 0),
        pullRequests: (existing.pullRequests || 0) + (entry.pullRequests || 0),
        issues: (existing.issues || 0) + (entry.issues || 0),
        timeSpent: (existing.timeSpent || 0) + (entry.timeSpent || 0),
        xp: (existing.xp || 0) + (entry.xp || 0),
        points: (existing.points || 0) + (entry.points || 0),
        notes: existing.notes
          ? `${existing.notes}; ${entry.notes || ''}`
          : entry.notes,
        metadata: { ...existing.metadata, ...entry.metadata },
      });
    } else {
      merged.set(dateStr, entry);
    }
  }

  return Array.from(merged.values());
}

/**
 * Sanitize username for URL
 */
export function sanitizeUsername(username: string): string {
  return encodeURIComponent(username.trim().toLowerCase());
}

/**
 * Extract username from profile URL
 */
export function extractUsernameFromUrl(url: string, pattern: RegExp): string | null {
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Delay execution
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 30000
): Promise<T> {
  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx) except for rate limits (429) and timeouts (408)
      const status = error?.response?.status || error?.status;
      if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429 && status !== 408) {
        throw error;
      }

      if (attempt < maxRetries) {
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: lastError?.message || String(lastError),
        });
        await sleep(delay);
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Parse number from string with fallback
 */
export function parseNumber(value: string | number | undefined, fallback: number = 0): number {
  if (typeof value === 'number') return value;
  if (!value) return fallback;

  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Extract numbers from text
 */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}

/**
 * Calculate streak from dates
 */
export function calculateStreak(dates: Date[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  // Sort dates descending
  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  const uniqueDays = new Set(sorted.map((d) => dateUtils.toDateString(d)));
  const daysList = Array.from(uniqueDays).sort().reverse();

  let current = 0;
  let longest = 0;
  let streak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of daysList) {
    const date = new Date(dateStr);

    if (!prevDate) {
      // Check if streak is current (today or yesterday)
      const today = new Date();
      const diffDays = dateUtils.daysBetween(date, today);
      if (diffDays <= 1) {
        streak = 1;
        current = 1;
      }
    } else {
      const diffDays = dateUtils.daysBetween(date, prevDate);
      if (diffDays === 1) {
        streak++;
        if (current > 0) current++;
      } else {
        longest = Math.max(longest, streak);
        streak = 1;
        current = 0;
      }
    }

    prevDate = date;
  }

  longest = Math.max(longest, streak);

  return { current, longest };
}

/**
 * SSRF Prevention - Check if a URL points to a private/internal IP
 */
export function isPrivateIP(hostname: string): boolean {
  // Common localhost/private patterns
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^::1$/,
    /^fd[0-9a-f]{2}:/i,
    /^fe[89ab][0-9a-f]:/i,
  ];

  if (privatePatterns.some((pattern) => pattern.test(hostname))) {
    return true;
  }

  // More robust check would involve DNS resolution, 
  // but for scrapers with hardcoded base URLs, we mainly check the dynamic parts.
  return false;
}

/**
 * Validate URL for SSRF
 */
export function validateUrlForSSRF(url: string): void {
  try {
    const parsed = new URL(url);
    
    // 1. Protocol Restriction
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Forbidden protocol: ${parsed.protocol}`);
    }

    // 2. Private IP / Localhost check
    if (isPrivateIP(parsed.hostname)) {
      throw new Error(`Forbidden destination: ${parsed.hostname}`);
    }

    // 3. Port check (allow only standard web ports)
    if (parsed.port && !['80', '443'].includes(parsed.port)) {
      throw new Error(`Forbidden port: ${parsed.port}`);
    }
  } catch (error) {
    logger.error('SSRF validation failed', { url, error: error instanceof Error ? error.message : String(error) });
    throw new Error(`SSRF Validation Failed: ${error instanceof Error ? error.message : 'Invalid URL'}`);
  }
}