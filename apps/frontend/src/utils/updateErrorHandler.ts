import type {
  UpdateError,
  UpdateErrorType,
  UpdateErrorSeverity,
  RetryConfig,
  RecoveryAction,
  UpdateRecoveryState
} from '../types';
import logger from './logger';

/**
 * Comprehensive error handling and recovery utilities for PWA updates
 * Implements retry logic with exponential backoff and automatic recovery
 */

export class UpdateErrorHandler {
  private static instance: UpdateErrorHandler;
  private recoveryState: UpdateRecoveryState;
  private retryConfig: RetryConfig;

  private constructor() {
    this.recoveryState = {
      retryAttempts: 0,
      recoveryActions: [],
      rollbackInProgress: false,
      canRollback: false
    };

    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      retryableErrors: [
        'network_error',
        'download_error',
        'timeout_error',
        'service_worker_error'
      ]
    };
  }

  public static getInstance(): UpdateErrorHandler {
    if (!UpdateErrorHandler.instance) {
      UpdateErrorHandler.instance = new UpdateErrorHandler();
    }
    return UpdateErrorHandler.instance;
  }

  /**
   * Create a standardized UpdateError from various error sources
   */
  public createUpdateError(
    originalError: Error | string | unknown,
    context: {
      type?: UpdateErrorType;
      severity?: UpdateErrorSeverity;
      metadata?: Record<string, unknown>;
    } = {}
  ): UpdateError {
    const errorMessage = typeof originalError === 'string'
      ? originalError
      : (originalError as { message?: string })?.message || 'Unknown error occurred';

    const errorType = context.type || this.categorizeError(originalError);
    const severity = context.severity || this.determineSeverity(errorType);

    return {
      type: errorType,
      severity,
      message: this.getUserFriendlyMessage(errorType, errorMessage),
      originalError: originalError instanceof Error ? originalError : undefined,
      timestamp: new Date().toISOString(),
      retryable: this.isRetryableError(errorType),
      userActionRequired: this.requiresUserAction(errorType),
      metadata: {
        ...context.metadata,
        suggestedActions: this.getSuggestedActions(errorType)
      }
    };
  }

  /**
   * Automatically categorize errors based on their characteristics
   */
  private categorizeError(error: unknown): UpdateErrorType {
    if (!error) return 'unknown_error';

    const errorObj = error as { 
      message?: string; 
      toString?: () => string; 
      status?: number; 
      statusCode?: number; 
      name?: string; 
    };
    
    const message = (errorObj.message || errorObj.toString?.() || '').toLowerCase();
    const statusCode = errorObj.status || errorObj.statusCode;

    // Network-related errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      (statusCode && statusCode >= 500) ||
      errorObj.name === 'NetworkError'
    ) {
      return 'network_error';
    }

    // Download-related errors
    if (
      message.includes('download') ||
      message.includes('content-length') ||
      message.includes('incomplete') ||
      statusCode === 416 || // Range Not Satisfiable
      statusCode === 413    // Payload Too Large
    ) {
      return 'download_error';
    }

    // Installation errors
    if (
      message.includes('install') ||
      message.includes('activate') ||
      message.includes('service worker') ||
      message.includes('cache')
    ) {
      return 'installation_error';
    }

    // Timeout errors
    if (
      message.includes('timeout') ||
      message.includes('abort') ||
      errorObj.name === 'TimeoutError' ||
      errorObj.name === 'AbortError'
    ) {
      return 'timeout_error';
    }

    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      statusCode === 401 ||
      statusCode === 403
    ) {
      return 'permission_error';
    }

    // Storage errors
    if (
      message.includes('storage') ||
      message.includes('quota') ||
      message.includes('disk') ||
      errorObj.name === 'QuotaExceededError'
    ) {
      return 'storage_error';
    }

    // Service worker specific errors
    if (
      message.includes('service worker') ||
      message.includes('sw.js') ||
      errorObj.name === 'ServiceWorkerError'
    ) {
      return 'service_worker_error';
    }

    // Verification errors
    if (
      message.includes('verification') ||
      message.includes('integrity') ||
      message.includes('checksum') ||
      message.includes('signature')
    ) {
      return 'verification_error';
    }

    return 'unknown_error';
  }

  /**
   * Determine error severity based on type and context
   */
  private determineSeverity(errorType: UpdateErrorType): UpdateErrorSeverity {
    switch (errorType) {
      case 'rollback_error':
      case 'verification_error':
        return 'critical';

      case 'installation_error':
      case 'service_worker_error':
      case 'compatibility_error':
        return 'high';

      case 'download_error':
      case 'storage_error':
      case 'permission_error':
        return 'medium';

      case 'network_error':
      case 'timeout_error':
        return 'low';

      default:
        return 'medium';
    }
  }

  /**
   * Check if an error type is retryable
   */
  private isRetryableError(errorType: UpdateErrorType): boolean {
    return this.retryConfig.retryableErrors.includes(errorType);
  }

  /**
   * Check if error requires user action
   */
  private requiresUserAction(errorType: UpdateErrorType): boolean {
    return [
      'permission_error',
      'storage_error',
      'compatibility_error',
      'rollback_error'
    ].includes(errorType);
  }

  /**
   * Get user-friendly error messages
   */
  private getUserFriendlyMessage(errorType: UpdateErrorType, originalMessage: string): string {
    const messages: Record<UpdateErrorType, string> = {
      network_error: 'Unable to connect to update servers. Please check your internet connection.',
      download_error: 'Failed to download the update. This may be due to a poor connection or server issues.',
      installation_error: 'The update could not be installed properly. Your app may need to be restarted.',
      verification_error: 'Update verification failed. The update file may be corrupted.',
      storage_error: 'Insufficient storage space or storage access denied. Please free up space and try again.',
      service_worker_error: 'Update service encountered an error. Try refreshing the app.',
      timeout_error: 'Update process timed out. Please try again.',
      permission_error: 'Permission denied. Please check your browser settings and try again.',
      compatibility_error: 'This update is not compatible with your browser or device.',
      rollback_error: 'Failed to restore previous version. Please contact support.',
      unknown_error: 'An unexpected error occurred during the update process.'
    };

    return messages[errorType] || originalMessage;
  }

  /**
   * Get suggested recovery actions for each error type
   */
  private getSuggestedActions(errorType: UpdateErrorType): string[] {
    const actions: Record<UpdateErrorType, string[]> = {
      network_error: [
        'Check your internet connection',
        'Try connecting to a different network',
        'Wait and try again later'
      ],
      download_error: [
        'Retry the download',
        'Check available storage space',
        'Try using a more stable connection'
      ],
      installation_error: [
        'Restart the application',
        'Clear browser cache',
        'Try updating again'
      ],
      verification_error: [
        'Clear browser cache',
        'Retry the update',
        'Contact support if problem persists'
      ],
      storage_error: [
        'Free up storage space',
        'Clear browser cache and data',
        'Close other applications'
      ],
      service_worker_error: [
        'Refresh the page',
        'Clear browser cache',
        'Restart your browser'
      ],
      timeout_error: [
        'Check your connection speed',
        'Try again with a better connection',
        'Wait and retry later'
      ],
      permission_error: [
        'Check browser permissions',
        'Allow notifications and cache storage',
        'Try in an incognito/private window'
      ],
      compatibility_error: [
        'Update your browser',
        'Try a different browser',
        'Contact support for assistance'
      ],
      rollback_error: [
        'Restart the application',
        'Clear all browser data',
        'Contact support immediately'
      ],
      unknown_error: [
        'Restart the application',
        'Check browser console for details',
        'Contact support with error details'
      ]
    };

    return actions[errorType] || ['Contact support for assistance'];
  }

  /**
   * Implement exponential backoff retry logic
   */
  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    error: UpdateError,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };

    if (!error.retryable || this.recoveryState.retryAttempts >= config.maxAttempts) {
      throw error;
    }

    this.recoveryState.retryAttempts++;
    this.recoveryState.lastRetryTime = new Date().toISOString();

    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, this.recoveryState.retryAttempts - 1),
      config.maxDelay
    );

    logger.log(`Retrying operation after ${delay}ms (attempt ${this.recoveryState.retryAttempts}/${config.maxAttempts})`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      const result = await operation();
      this.recoveryState.retryAttempts = 0; // Reset on success
      return result;
    } catch (retryError) {
      const newError = this.createUpdateError(retryError, {
        type: error.type,
        metadata: {
          ...error.metadata,
          retryAttempt: this.recoveryState.retryAttempts,
          maxAttempts: config.maxAttempts
        }
      });

      if (this.recoveryState.retryAttempts < config.maxAttempts) {
        return this.retryWithBackoff(operation, newError, customConfig);
      } else {
        throw newError;
      }
    }
  }

  /**
   * Set up automatic rollback capability
   */
  public enableRollback(previousVersion: string): void {
    this.recoveryState.previousVersion = previousVersion;
    this.recoveryState.canRollback = true;

    // Store previous version in localStorage for persistence
    try {
      localStorage.setItem('repcue_previous_version', previousVersion);
      localStorage.setItem('repcue_rollback_available', 'true');
    } catch (error) {
      logger.error('Failed to store rollback information:', error);
    }
  }

  /**
   * Perform automatic rollback to previous version
   */
  public async performRollback(): Promise<void> {
    if (!this.recoveryState.canRollback || !this.recoveryState.previousVersion) {
      throw this.createUpdateError('Rollback not available', {
        type: 'rollback_error',
        severity: 'critical'
      });
    }

    this.recoveryState.rollbackInProgress = true;

    try {
      logger.log(`Starting rollback to version ${this.recoveryState.previousVersion}`);

      // Clear current service worker cache
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Force reload to previous version
      window.location.reload();

    } catch (error) {
      this.recoveryState.rollbackInProgress = false;
      throw this.createUpdateError(error, {
        type: 'rollback_error',
        severity: 'critical',
        metadata: {
          previousVersion: this.recoveryState.previousVersion
        }
      });
    }
  }

  /**
   * Create recovery actions for a specific error
   */
  public createRecoveryActions(error: UpdateError): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    // Common retry action for retryable errors
    if (error.retryable && this.recoveryState.retryAttempts < this.retryConfig.maxAttempts) {
      actions.push({
        id: 'retry',
        label: 'Retry Update',
        description: `Attempt to update again (${this.recoveryState.retryAttempts + 1}/${this.retryConfig.maxAttempts})`,
        action: async () => {
          // This will be implemented by the calling service
          throw new Error('Retry action must be implemented by caller');
        }
      });
    }

    // Rollback action for critical errors
    if (this.recoveryState.canRollback && error.severity === 'critical') {
      actions.push({
        id: 'rollback',
        label: 'Rollback to Previous Version',
        description: `Restore previous version ${this.recoveryState.previousVersion}`,
        action: () => this.performRollback(),
        dangerous: true,
        confirmationRequired: true
      });
    }

    // Clear cache action for installation/service worker errors
    if (['installation_error', 'service_worker_error', 'verification_error'].includes(error.type)) {
      actions.push({
        id: 'clear-cache',
        label: 'Clear Cache and Retry',
        description: 'Clear browser cache and attempt update again',
        action: async () => {
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
        }
      });
    }

    // Force reload action for severe errors
    if (['installation_error', 'rollback_error', 'compatibility_error'].includes(error.type)) {
      actions.push({
        id: 'force-reload',
        label: 'Force Reload',
        description: 'Reload the application completely',
        action: () => window.location.reload(),
        dangerous: true
      });
    }

    return actions;
  }

  /**
   * Get current recovery state
   */
  public getRecoveryState(): UpdateRecoveryState {
    return { ...this.recoveryState };
  }

  /**
   * Reset recovery state
   */
  public resetRecoveryState(): void {
    this.recoveryState = {
      retryAttempts: 0,
      recoveryActions: [],
      rollbackInProgress: false,
      canRollback: this.recoveryState.canRollback, // Preserve rollback capability
      previousVersion: this.recoveryState.previousVersion
    };
  }

  /**
   * Update retry configuration
   */
  public updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Handle critical errors that require immediate attention
   */
  public handleCriticalError(error: UpdateError): void {
    logger.error('Critical update error:', error);

    // If rollback is available and this is a critical error, attempt automatic rollback
    if (this.recoveryState.canRollback && error.severity === 'critical') {
      logger.log('Attempting automatic rollback due to critical error');
      this.performRollback().catch(rollbackError => {
        logger.error('Automatic rollback failed:', rollbackError);
        // At this point, we need to show a blocking error screen
        this.showEmergencyErrorScreen(error, rollbackError);
      });
    } else {
      // Show critical error screen
      this.showEmergencyErrorScreen(error);
    }
  }

  /**
   * Show emergency error screen for unrecoverable errors
   */
  private showEmergencyErrorScreen(originalError: UpdateError, rollbackError?: unknown): void {
    // Dispatch a custom event that the UI can listen to
    window.dispatchEvent(new CustomEvent('critical-update-error', {
      detail: {
        originalError,
        rollbackError,
        recoveryActions: this.createRecoveryActions(originalError)
      }
    }));
  }
}

// Export singleton instance
export const updateErrorHandler = UpdateErrorHandler.getInstance();