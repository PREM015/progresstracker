// src/lib/errorTracking.ts
/**
 * Error Tracking & Reporting
 * Integrates with Sentry and provides error analytics
 */

import * as Sentry from '@sentry/nextjs';
import { prisma } from './prisma';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ErrorContext {
  userId?: string;
  email?: string;
  username?: string;
  requestId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  type: string;
  severity: 'fatal' | 'error' | 'warning' | 'info';
  context: ErrorContext;
  timestamp: Date;
  fingerprint?: string[];
  tags?: Record<string, string>;
}

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

// =============================================================================
// ERROR TRACKING SERVICE
// =============================================================================

class ErrorTrackingService {
  private readonly log = logger.child({ service: 'errorTracking' });
  private isInitialized = false;

  constructor() {
    this.isInitialized = !!process.env.SENTRY_DSN;
  }

  /**
   * Capture and report an error
   */
  captureError(
    error: Error | unknown,
    context?: ErrorContext,
    severity: ErrorSeverity = 'error'
  ): string | undefined {
    const err = error instanceof Error ? error : new Error(String(error));

    // Log locally
    this.log.error(err.message, context, err);

    // Skip Sentry in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEV_ENABLED) {
      return undefined;
    }

    if (!this.isInitialized) {
      return undefined;
    }

    try {
      // Set user context if available
      if (context?.userId) {
        Sentry.setUser({
          id: context.userId,
          email: context.email,
          username: context.username,
        });
      }

      // Set additional context
      if (context) {
        Sentry.setContext('custom', {
          requestId: context.requestId,
          path: context.path,
          method: context.method,
        });
      }

      // Capture with severity level
      const eventId = Sentry.captureException(err, {
        level: this.mapSeverity(severity),
        tags: {
          severity,
          ...(context?.requestId && { requestId: context.requestId }),
        },
      });

      return eventId;
    } catch (sentryError) {
      this.log.error('Failed to report to Sentry', {}, sentryError);
      return undefined;
    }
  }

  /**
   * Capture a message (non-error)
   */
  captureMessage(
    message: string,
    severity: ErrorSeverity = 'info',
    context?: ErrorContext
  ): string | undefined {
    this.log.info(message, context);

    if (!this.isInitialized) {
      return undefined;
    }

    try {
      return Sentry.captureMessage(message, {
        level: this.mapSeverity(severity),
        contexts: context ? { custom: context } : undefined,
      });
    } catch (error) {
      this.log.error('Failed to capture message', {}, error);
      return undefined;
    }
  }

  /**
   * Create error boundary handler for React
   */
  createErrorBoundaryHandler() {
    return (error: Error, errorInfo: { componentStack: string }) => {
      this.captureError(error, {
        componentStack: errorInfo.componentStack,
      }, 'error');
    };
  }

  /**
   * Set user context for all subsequent errors
   */
  setUser(user: { id: string; email?: string; username?: string } | null): void {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });
    } else {
      Sentry.setUser(null);
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, unknown>,
    level: Sentry.SeverityLevel = 'info'
  ): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(
    name: string,
    operation: string
  ): Sentry.Span | undefined {
    if (!this.isInitialized) return undefined;

    return Sentry.startInactiveSpan({
      name,
      op: operation,
    });
  }

  /**
   * Wrap async function with error tracking
   */
  wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    context?: ErrorContext
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.captureError(error, context);
        throw error;
      }
    }) as T;
  }

  /**
   * Flush pending events (for serverless)
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.isInitialized) return true;

    try {
      return await Sentry.flush(timeout);
    } catch {
      return false;
    }
  }

  /**
   * Get error statistics from database
   */
  async getErrorStats(
    days: number = 7
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    byDay: Array<{ date: string; count: number }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      // Get audit logs with error actions
      const errorLogs = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: since },
          status: 'failure',
        },
        select: {
          action: true,
          createdAt: true,
          category: true,
        },
      });

      // Count by type
      const byType: Record<string, number> = {};
      for (const log of errorLogs) {
        const key = log.category || log.action;
        byType[key] = (byType[key] || 0) + 1;
      }

      // Count by day
      const byDayMap = new Map<string, number>();
      for (const log of errorLogs) {
        const date = log.createdAt.toISOString().split('T')[0];
        byDayMap.set(date, (byDayMap.get(date) || 0) + 1);
      }

      const byDay = Array.from(byDayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        total: errorLogs.length,
        byType,
        byDay,
      };
    } catch (error) {
      this.log.error('Failed to get error stats', {}, error);
      return { total: 0, byType: {}, byDay: [] };
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private mapSeverity(severity: ErrorSeverity): Sentry.SeverityLevel {
    const map: Record<ErrorSeverity, Sentry.SeverityLevel> = {
      fatal: 'fatal',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    return map[severity];
  }
}

// =============================================================================
// SINGLETON & EXPORTS
// =============================================================================

export const errorTracking = new ErrorTrackingService();

/**
 * Quick error capture
 */
export function captureError(
  error: Error | unknown,
  context?: ErrorContext
): string | undefined {
  return errorTracking.captureError(error, context);
}

/**
 * Quick message capture
 */
export function captureMessage(
  message: string,
  severity?: ErrorSeverity,
  context?: ErrorContext
): string | undefined {
  return errorTracking.captureMessage(message, severity, context);
}

export default errorTracking;