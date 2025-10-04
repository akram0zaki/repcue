/**
 * Structured logger for export-data edge function
 * Provides consistent logging with correlation IDs and log levels
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogContext {
  correlationId: string;
  userId?: string;
  [key: string]: unknown;
}

export class Logger {
  private context: LogContext;

  constructor(correlationId: string) {
    this.context = { correlationId };
  }

  setUserId(userId: string): void {
    this.context.userId = userId;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...meta,
    };

    const logFn = level === 'ERROR' ? console.error : console.log;
    logFn(JSON.stringify(logEntry));
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('INFO', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('WARN', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('ERROR', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (Deno.env.get('DEBUG') === 'true') {
      this.log('DEBUG', message, meta);
    }
  }
}

/**
 * Generate a correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}
