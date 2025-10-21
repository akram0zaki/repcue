/**
 * Logger utility for Edge Functions
 *
 * Provides structured logging with correlation IDs for request tracking.
 */

/**
 * Generates a unique correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `ai-coach-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Logs an info message
 */
export function logInfo(correlationId: string, message: string, metadata?: Record<string, any>): void {
  console.log(JSON.stringify({
    level: 'INFO',
    correlationId,
    message,
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  }));
}

/**
 * Logs a warning message
 */
export function logWarn(correlationId: string, message: string, metadata?: Record<string, any>): void {
  console.warn(JSON.stringify({
    level: 'WARN',
    correlationId,
    message,
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  }));
}

/**
 * Logs an error message
 */
export function logError(correlationId: string, message: string, metadata?: Record<string, any>): void {
  console.error(JSON.stringify({
    level: 'ERROR',
    correlationId,
    message,
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  }));
}

/**
 * Logs a debug message
 */
export function logDebug(correlationId: string, message: string, metadata?: Record<string, any>): void {
  const debug = Deno.env.get('DEBUG') === 'true';
  if (debug) {
    console.log(JSON.stringify({
      level: 'DEBUG',
      correlationId,
      message,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    }));
  }
}
