/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: unknown; // <-- Accept any type now
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Format log entry
   */
  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      formatted += ` | context: ${JSON.stringify(context)}`;
    }

    if (error) {
      // Handle Error objects specially, else stringify
      if (error instanceof Error) {
        formatted += ` | error: ${error.name}: ${error.message}`;
        if (this.isDevelopment && error.stack) {
          formatted += `\nStack: ${error.stack}`;
        }
      } else {
        formatted += ` | error: ${JSON.stringify(error)}`;
      }
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
    };
  }

  debug(message: string, context?: Record<string, any>, error?: unknown): void {
    if (!this.isDevelopment) return;
    const entry = this.createEntry('debug', message, context, error);
    console.debug(this.formatLog(entry));
  }

  info(message: string, context?: Record<string, any>, error?: unknown): void {
    const entry = this.createEntry('info', message, context, error);
    console.info(this.formatLog(entry));
  }

  warn(message: string, context?: Record<string, any>, error?: unknown): void {
    const entry = this.createEntry('warn', message, context, error);
    console.warn(this.formatLog(entry));
  }

  error(message: string, error?: unknown, context?: Record<string, any>): void {
    const entry = this.createEntry('error', message, context, error);
    console.error(this.formatLog(entry));

    // In production, send to error tracking service (Sentry, etc.)
    if (!this.isDevelopment && error) {
      // Example: Sentry.captureException(error, { contexts: { custom: context } });
    }
  }
}

// Export singleton instance
export const logger = new Logger();
