/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/logger.ts
import * as Sentry from "@sentry/nextjs";
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: unknown;
  requestId?: string;
  userId?: string;
  duration?: number;
}

interface RateLimitInfo {
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private rateLimitMap = new Map<string, RateLimitInfo>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 10; // Max same message per window

  /**
   * Safe stringify (prevents crash on circular JSON)
   */
  private safeStringify(value: unknown, indent?: number): string {
    const seen = new WeakSet();
    try {
      return JSON.stringify(value, (key, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        // Mask sensitive fields
        if (this.isSensitiveKey(key)) return "[REDACTED]";
        return val;
      }, indent);
    } catch {
      return String(value);
    }
  }

  /**
   * Check if key contains sensitive data
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i, /secret/i, /token/i, /key/i, /auth/i,
      /credit/i, /card/i, /cvv/i, /ssn/i, /api[-_]?key/i,
    ];
    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Check rate limiting for repeated messages
   */
  private shouldLog(key: string): boolean {
    const now = Date.now();
    const info = this.rateLimitMap.get(key);

    if (!info) {
      this.rateLimitMap.set(key, {
        count: 1,
        firstOccurrence: now,
        lastOccurrence: now,
      });
      return true;
    }

    // Reset if window expired
    if (now - info.firstOccurrence > this.RATE_LIMIT_WINDOW) {
      this.rateLimitMap.set(key, {
        count: 1,
        firstOccurrence: now,
        lastOccurrence: now,
      });
      return true;
    }

    info.count++;
    info.lastOccurrence = now;

    // Allow logging up to max, then only every 10th
    if (info.count <= this.RATE_LIMIT_MAX) {
      return true;
    }

    // Log every 10th occurrence after limit
    return info.count % 10 === 0;
  }

  /**
   * Normalize unknown error into readable format
   */
  private formatError(error: unknown): string {
    if (!error) return "";

    if (error instanceof Error) {
      let out = `${error.name}: ${error.message}`;
      if (this.isDevelopment && error.stack) {
        out += `\nStack: ${error.stack}`;
      }
      // Include cause if available
      if ((error as any).cause) {
        out += `\nCause: ${this.formatError((error as any).cause)}`;
      }
      return out;
    }

    if (typeof error === "string") return error;
    if (typeof error === "number") return String(error);

    return this.safeStringify(error);
  }

  /**
   * Format log entry
   */
  private formatLog(entry: LogEntry): string {
    if (!this.isDevelopment) {
      return JSON.stringify(entry);
    }

    const { level, message, timestamp, context, error, requestId, userId, duration } = entry;

    const parts: string[] = [
      `[${timestamp}]`,
      `[${level.toUpperCase()}]`,
    ];

    if (requestId) parts.push(`[${requestId}]`);
    if (userId) parts.push(`[user:${userId}]`);

    parts.push(message);

    if (duration !== undefined) {
      parts.push(`(${duration}ms)`);
    }

    let formatted = parts.join(" ");

    if (context && Object.keys(context).length > 0) {
      formatted += ` | ${this.safeStringify(context)}`;
    }

    if (error) {
      formatted += ` | error: ${this.formatError(error)}`;
    }

    return formatted;
  }

  /**
   * Create log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: unknown
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      requestId: context?.requestId,
      userId: context?.userId,
      duration: context?.duration,
    };
  }

  /**
   * Debug level - only in development
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!this.isDevelopment) return;
    const entry = this.createEntry("debug", message, context);
    console.debug(this.formatLog(entry));
  }

  /**
   * Info level
   */
  info(message: string, context?: Record<string, any>): void {
    const entry = this.createEntry("info", message, context);
    console.info(this.formatLog(entry));
  }

  /**
   * Warning level
   */
  warn(message: string, context?: Record<string, any>): void {
    const entry = this.createEntry("warn", message, context);
    console.warn(this.formatLog(entry));
  }

  /**
   * Error level with rate limiting
   */
  error(message: string, context?: Record<string, any>, error?: unknown): void {
    // Rate limit key based on message + error type
    const errorType = error instanceof Error ? error.name : 'unknown';
    const rateLimitKey = `${message}:${errorType}`;

    if (!this.shouldLog(rateLimitKey)) {
      return; // Skip rate-limited logs
    }

    const entry = this.createEntry("error", message, context, error);
    console.error(this.formatLog(entry));

    // In production, send to error tracking service
    if (!this.isDevelopment && error) {
      this.sendToErrorTracking(entry);
    }
  }

  /**
   * Send to error tracking service (Sentry, etc.)
   */
  private sendToErrorTracking(entry: LogEntry): void {

    if (typeof Sentry !== 'undefined') {
      Sentry.captureException(
        entry.error instanceof Error ? entry.error : new Error(String(entry.error)),
        { contexts: { custom: entry.context } }
      );
    }
  }

  /**
   * Log API request (for middleware/routes)
   */
  api(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: Record<string, any>
  ): void {
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    const message = `${method} ${path} ${statusCode}`;

    const entry = this.createEntry(level, message, {
      ...context,
      duration,
      statusCode,
    });

    if (level === "error") {
      console.error(this.formatLog(entry));
    } else if (level === "warn") {
      console.warn(this.formatLog(entry));
    } else {
      console.info(this.formatLog(entry));
    }
  }

  /**
   * Log database query (for debugging)
   */
  query(operation: string, model: string, duration: number, context?: Record<string, any>): void {
    if (!this.isDevelopment) return;

    const message = `DB ${operation} ${model}`;
    const entry = this.createEntry("debug", message, { ...context, duration });
    console.debug(this.formatLog(entry));
  }

  /**
   * Log external service call
   */
  external(
    service: string,
    operation: string,
    success: boolean,
    duration: number,
    context?: Record<string, any>
  ): void {
    const level = success ? "info" : "error";
    const message = `[${service}] ${operation} ${success ? "SUCCESS" : "FAILED"}`;

    const entry = this.createEntry(level, message, { ...context, duration });

    if (level === "error") {
      console.error(this.formatLog(entry));
    } else {
      console.info(this.formatLog(entry));
    }
  }

  /**
   * Create a child logger with preset context
   */
  child(context: Record<string, any>): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Time a function execution
   */
  async time<T>(
    label: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { ...context, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed`, { ...context, duration }, error);
      throw error;
    }
  }
}

/**
 * Child logger with preset context
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, any>
  ) { }

  debug(message: string, context?: Record<string, any>): void {
    this.parent.debug(message, { ...this.context, ...context });
  }

  info(message: string, context?: Record<string, any>): void {
    this.parent.info(message, { ...this.context, ...context });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.parent.warn(message, { ...this.context, ...context });
  }

  error(message: string, context?: Record<string, any>, error?: unknown): void {
    this.parent.error(message, { ...this.context, ...context }, error);
  }
}

// Export singleton instance
export const logger = new Logger();