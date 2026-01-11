// src/lib/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
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
      formatted += ` | error: ${error.name}: ${error.message}`;
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
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };
  }

  /**
   * Debug log (development only)
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!this.isDevelopment) return;

    const entry = this.createEntry('debug', message, context);
    console.debug(this.formatLog(entry));
  }

  /**
   * Info log
   */
  info(message: string, context?: Record<string, any>): void {
    const entry = this.createEntry('info', message, context);
    console.info(this.formatLog(entry));
  }

  /**
   * Warning log
   */
  warn(message: string, context?: Record<string, any>): void {
    const entry = this.createEntry('warn', message, context);
    console.warn(this.formatLog(entry));
  }

  /**
   * Error log
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
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
