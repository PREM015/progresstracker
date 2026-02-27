// src/lib/performanceTracking.ts
/**
 * Performance Tracking & Metrics
 * Web Vitals, custom metrics, and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count' | 'percent';
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface WebVitals {
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  FID?: number; // First Input Delay
  INP?: number; // Interaction to Next Paint
  LCP?: number; // Largest Contentful Paint
  TTFB?: number; // Time to First Byte
}

export interface TimingResult {
  duration: number;
  startTime: number;
  endTime: number;
}

export interface PerformanceReport {
  pageLoad: number;
  apiCalls: Array<{
    endpoint: string;
    method: string;
    duration: number;
    status: number;
  }>;
  webVitals: WebVitals;
  customMetrics: PerformanceMetric[];
  endpointStats: Array<{
    endpoint: string;
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  }>;
  timestamp: string;
}

// =============================================================================
// PERFORMANCE TRACKING SERVICE
// =============================================================================

class PerformanceTrackingService {
  private readonly log = logger.child({ service: 'performance' });
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private webVitals: WebVitals = {};

  // Per-endpoint latency ring buffers for percentile monitoring
  private apiLatencies: Map<string, number[]> = new Map();
  private readonly maxLatencySamples = 200;

  // Cache hit/miss counters for hit-rate monitoring
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Start a timer
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End a timer and record the metric
   */
  endTimer(name: string, tags?: Record<string, string>): TimingResult | null {
    const startTime = this.timers.get(name);

    if (startTime === undefined) {
      this.log.warn('Timer not found', { name });
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.timers.delete(name);

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      tags,
      timestamp: new Date(),
    });

    return { duration, startTime, endTime };
  }

  /**
   * Time an async function
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        tags: { ...tags, status: 'success' },
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        tags: { ...tags, status: 'error' },
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Time a sync function
   */
  timeSync<T>(
    name: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T {
    const startTime = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - startTime;

      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        tags: { ...tags, status: 'success' },
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        tags: { ...tags, status: 'error' },
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log slow operations
    if (metric.unit === 'ms' && metric.value > 1000) {
      this.log.warn('Slow operation detected', {
        name: metric.name,
        duration: metric.value,
        tags: metric.tags,
      });
    }

    // Send to Sentry if available
    this.sendToSentry(metric);
  }

  /**
   * Record Web Vitals
   */
  recordWebVital(name: keyof WebVitals, value: number): void {
    this.webVitals[name] = value;

    this.recordMetric({
      name: `web_vital_${name}`,
      value,
      unit: name === 'CLS' ? 'count' : 'ms',
      tags: { type: 'web_vital' },
      timestamp: new Date(),
    });

    this.log.debug('Web Vital recorded', { name, value });
  }

  /**
   * Get Web Vitals handler for Next.js
   */
  getWebVitalsHandler() {
    return (metric: { name: string; value: number }) => {
      const vitalsMap: Record<string, keyof WebVitals> = {
        CLS: 'CLS',
        FCP: 'FCP',
        FID: 'FID',
        INP: 'INP',
        LCP: 'LCP',
        TTFB: 'TTFB',
      };

      const vitalName = vitalsMap[metric.name];
      if (vitalName) {
        this.recordWebVital(vitalName, metric.value);
      }
    };
  }

  /**
   * Get recent metrics
   */
  getMetrics(options?: {
    name?: string;
    since?: Date;
    limit?: number;
  }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (options?.name) {
      filtered = filtered.filter((m) => m.name === options.name);
    }

    if (options?.since) {
      filtered = filtered.filter((m) => m.timestamp >= options.since!);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics
      .filter((m) => m.name === name)
      .map((m) => m.value)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return null;
    }

    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
    };
  }

  /**
   * Get current Web Vitals
   */
  getWebVitals(): WebVitals {
    return { ...this.webVitals };
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const apiMetrics = this.metrics
      .filter((m) => m.name.startsWith('api_'))
      .slice(-50)
      .map((m) => ({
        endpoint: m.tags?.endpoint || 'unknown',
        method: m.tags?.method || 'GET',
        duration: m.value,
        status: parseInt(m.tags?.status || '200'),
      }));

    return {
      pageLoad: this.webVitals.LCP || 0,
      apiCalls: apiMetrics,
      webVitals: this.getWebVitals(),
      customMetrics: this.metrics.slice(-100),
      endpointStats: this.getEndpointStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.webVitals = {};
  }

  /**
   * Track API call performance
   */
  trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status: number
  ): void {
    this.recordMetric({
      name: 'api_call',
      value: duration,
      unit: 'ms',
      tags: {
        endpoint,
        method,
        status: String(status),
        success: status < 400 ? 'true' : 'false',
      },
      timestamp: new Date(),
    });

    // Store in per-endpoint ring buffer for percentile queries
    const key = `${method} ${endpoint}`;
    let buf = this.apiLatencies.get(key);
    if (!buf) {
      buf = [];
      this.apiLatencies.set(key, buf);
    }
    buf.push(duration);
    if (buf.length > this.maxLatencySamples) {
      buf.shift();
    }
  }

  /**
   * Track a cache access (hit or miss) for hit-rate monitoring
   */
  trackCacheAccess(hit: boolean): void {
    if (hit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  /**
   * Get cache hit rate as a percentage
   */
  getCacheHitRate(): { hits: number; misses: number; total: number; rate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total,
      rate: total > 0 ? Math.round((this.cacheHits / total) * 10000) / 100 : 0,
    };
  }

  /**
   * Get per-endpoint latency stats with P50, P95, P99
   */
  getEndpointStats(): Array<{
    endpoint: string;
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  }> {
    const results: Array<{
      endpoint: string; count: number; min: number; max: number;
      avg: number; p50: number; p95: number; p99: number;
    }> = [];

    for (const [endpoint, durations] of this.apiLatencies) {
      const sorted = [...durations].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      results.push({
        endpoint,
        count: sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: Math.round(sum / sorted.length),
        p50: this.percentile(sorted, 50),
        p95: this.percentile(sorted, 95),
        p99: this.percentile(sorted, 99),
      });
    }

    return results.sort((a, b) => b.p95 - a.p95); // slowest first
  }

  /**
   * Track database query performance
   */
  trackDbQuery(
    operation: string,
    model: string,
    duration: number
  ): void {
    this.recordMetric({
      name: 'db_query',
      value: duration,
      unit: 'ms',
      tags: {
        operation,
        model,
      },
      timestamp: new Date(),
    });

    // Alert on slow queries
    if (duration > 1000) {
      this.log.warn('Slow database query', { operation, model, duration });
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private percentile(sortedValues: number[], p: number): number {
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private sendToSentry(metric: PerformanceMetric): void {
    if (typeof Sentry === 'undefined') return;

    try {
      // Use Sentry's metrics API if available
      Sentry.setMeasurement(metric.name, metric.value, metric.unit === 'ms' ? 'millisecond' : 'none');
    } catch {
      // Sentry metrics might not be available
    }
  }
}

// =============================================================================
// SINGLETON & EXPORTS
// =============================================================================

export const performanceTracking = new PerformanceTrackingService();

/**
 * Create a performance decorator
 */
export function trackPerformance(name: string, tags?: Record<string, string>) {
  return function <T extends (...args: unknown[]) => unknown>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const startTime = performance.now();

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result.finally(() => {
            const duration = performance.now() - startTime;
            performanceTracking.recordMetric({
              name,
              value: duration,
              unit: 'ms',
              tags,
              timestamp: new Date(),
            });
          });
        }

        const duration = performance.now() - startTime;
        performanceTracking.recordMetric({
          name,
          value: duration,
          unit: 'ms',
          tags,
          timestamp: new Date(),
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        performanceTracking.recordMetric({
          name,
          value: duration,
          unit: 'ms',
          tags: { ...tags, error: 'true' },
          timestamp: new Date(),
        });
        throw error;
      }
    } as T;

    return descriptor;
  };
}

export default performanceTracking;