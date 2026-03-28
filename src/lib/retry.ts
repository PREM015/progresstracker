// src/lib/retry.ts
// Retry utilities for transient failures

// =============================================================================
// TYPES
// =============================================================================

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  retryIf?: (error: unknown) => boolean;
}

export interface RetryResult<T> {
  data: T;
  attempts: number;
  totalDurationMs: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'retryIf' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 500,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

// =============================================================================
// CORE RETRY FUNCTION
// =============================================================================

/**
 * Execute an async function with exponential backoff retry.
 *
 * @example
 * const result = await withRetry(() => fetchData(), { maxAttempts: 5 });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const startTime = Date.now();
  let attempt = 0;
  let delay = opts.initialDelay;

  while (true) {
    attempt++;
    try {
      const data = await fn();
      return { data, attempts: attempt, totalDurationMs: Date.now() - startTime };
    } catch (error) {
      if (attempt >= opts.maxAttempts) throw error;

      if (opts.retryIf && !opts.retryIf(error)) throw error;

      // Calculate next delay with exponential backoff
      if (opts.jitter) {
        delay = Math.min(opts.maxDelay, delay * opts.backoffMultiplier * (0.5 + Math.random() * 0.5));
      } else {
        delay = Math.min(opts.maxDelay, delay * opts.backoffMultiplier);
      }

      opts.onRetry?.(attempt, error as Error, delay);
      await sleep(delay);
    }
  }
}

// =============================================================================
// RETRY PREDICATES
// =============================================================================

/**
 * Standard retry predicate: retry on network errors and 5xx responses.
 */
export function shouldRetryRequest(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('ETIMEDOUT')) return true;
    if (error.message.includes('ECONNRESET')) return true;
    if (error.message.includes('ENOTFOUND')) return true;
    if (error.message.includes('fetch failed')) return true;
  }

  // HTTP response errors
  const status = (error as { status?: number })?.status;
  if (status) {
    return status === 429 || status >= 500;
  }

  return false;
}

/**
 * Retry only on specific HTTP status codes.
 */
export function shouldRetryOnStatus(...statusCodes: number[]): (error: unknown) => boolean {
  return (error: unknown): boolean => {
    const status = (error as { status?: number; statusCode?: number })?.status
      ?? (error as { status?: number; statusCode?: number })?.statusCode;
    return statusCodes.includes(status ?? 0);
  };
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeoutMs?: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureAt?: Date;
  private readonly opts: Required<CircuitBreakerOptions>;

  constructor(private readonly name: string, options: CircuitBreakerOptions = {}) {
    this.opts = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeoutMs: options.timeoutMs ?? 60000,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const elapsed = this.lastFailureAt
        ? Date.now() - this.lastFailureAt.getTime()
        : Infinity;
      if (elapsed < this.opts.timeoutMs) {
        throw new Error(`Circuit breaker '${this.name}' is open`);
      }
      this.state = 'half_open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'half_open') {
      this.successCount++;
      if (this.successCount >= this.opts.successThreshold) {
        this.state = 'closed';
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureAt = new Date();
    if (this.failureCount >= this.opts.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureAt = undefined;
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
