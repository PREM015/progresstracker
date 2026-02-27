// src/services/scrapers/scraperHealthCheck.ts
import axios from 'axios';
import { logger } from '@/lib/logger';
import type { HealthCheckResult } from './types';

interface PlatformEndpoint {
  url: string;
  method?: 'GET' | 'HEAD';
  expectedStatus?: number[];
  timeout?: number;
}

const PLATFORM_ENDPOINTS: Record<string, PlatformEndpoint> = {
  leetcode: { url: 'https://leetcode.com/graphql', method: 'HEAD' },
  codeforces: { url: 'https://codeforces.com/api/user.info?handles=tourist' },
  codechef: { url: 'https://www.codechef.com', method: 'HEAD' },
  hackerrank: { url: 'https://www.hackerrank.com', method: 'HEAD' },
  geeksforgeeks: { url: 'https://www.geeksforgeeks.org', method: 'HEAD' },
  github: { url: 'https://api.github.com/zen' },
  gitlab: { url: 'https://gitlab.com/api/v4/version' },
  kaggle: { url: 'https://www.kaggle.com', method: 'HEAD' },
  atcoder: { url: 'https://atcoder.jp', method: 'HEAD' },
  codewars: { url: 'https://www.codewars.com/api/v1/code-challenges/valid-braces' },
  exercism: { url: 'https://exercism.org/api/v2/tracks' },
  freecodecamp: { url: 'https://api.freecodecamp.org/api/users/get-public-profile?username=test' },
  devpost: { url: 'https://devpost.com', method: 'HEAD' },
  linkedin: { url: 'https://www.linkedin.com', method: 'HEAD' },
  coursera: { url: 'https://www.coursera.org', method: 'HEAD' },
};

class ScraperHealthCheck {
  private results: Map<string, HealthCheckResult> = new Map();
  private lastFullCheck: Date | null = null;

  /**
   * Check single platform health
   */
  async check(platform: string): Promise<HealthCheckResult> {
    const endpoint = PLATFORM_ENDPOINTS[platform.toLowerCase()];
    
    if (!endpoint) {
      return {
        platform,
        healthy: true, // Assume healthy if no endpoint defined
        responseTime: 0,
        lastChecked: new Date(),
        error: 'No health endpoint configured',
      };
    }

    const startTime = Date.now();

    try {
      const response = await axios({
        url: endpoint.url,
        method: endpoint.method || 'GET',
        timeout: endpoint.timeout || 10000,
        validateStatus: (status) => {
          const expected = endpoint.expectedStatus || [200, 201, 204, 301, 302];
          return expected.includes(status);
        },
      });

      const result: HealthCheckResult = {
        platform,
        healthy: true,
        responseTime: Date.now() - startTime,
        statusCode: response.status,
        lastChecked: new Date(),
      };

      this.results.set(platform.toLowerCase(), result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        platform,
        healthy: false,
        responseTime: Date.now() - startTime,
        statusCode: axios.isAxiosError(error) ? error.response?.status : undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };

      this.results.set(platform.toLowerCase(), result);
      logger.warn(`Health check failed for ${platform}`, { error: result.error });
      return result;
    }
  }

  /**
   * Check all platforms
   */
  async checkAll(): Promise<HealthCheckResult[]> {
    const platforms = Object.keys(PLATFORM_ENDPOINTS);
    const results: HealthCheckResult[] = [];

    // Run checks in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < platforms.length; i += batchSize) {
      const batch = platforms.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((p) => this.check(p)));
      results.push(...batchResults);
    }

    this.lastFullCheck = new Date();
    logger.info('Health check completed', {
      total: results.length,
      healthy: results.filter((r) => r.healthy).length,
      unhealthy: results.filter((r) => !r.healthy).length,
    });

    return results;
  }

  /**
   * Get cached result
   */
  getResult(platform: string): HealthCheckResult | undefined {
    return this.results.get(platform.toLowerCase());
  }

  /**
   * Get all cached results
   */
  getAllResults(): HealthCheckResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Check if platform is healthy (uses cache)
   */
  isHealthy(platform: string, maxAge: number = 300000): boolean {
    const result = this.results.get(platform.toLowerCase());
    
    if (!result) return true; // Assume healthy if not checked
    
    const age = Date.now() - result.lastChecked.getTime();
    if (age > maxAge) return true; // Stale data, assume healthy
    
    return result.healthy;
  }

  /**
   * Get unhealthy platforms
   */
  getUnhealthy(): string[] {
    return Array.from(this.results.entries())
      .filter(([, result]) => !result.healthy)
      .map(([platform]) => platform);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    avgResponseTime: number;
    lastChecked: Date | null;
  } {
    const results = this.getAllResults();
    const healthy = results.filter((r) => r.healthy);
    const avgResponseTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
      : 0;

    return {
      total: results.length,
      healthy: healthy.length,
      unhealthy: results.length - healthy.length,
      avgResponseTime: Math.round(avgResponseTime),
      lastChecked: this.lastFullCheck,
    };
  }

  /**
   * Clear cached results
   */
  clear(): void {
    this.results.clear();
    this.lastFullCheck = null;
  }
}

export const scraperHealthCheck = new ScraperHealthCheck();
export default scraperHealthCheck;