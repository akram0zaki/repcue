import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UpdateErrorHandler } from '../updateErrorHandler';
import type {
  UpdateError,
  UpdateErrorType,
  UpdateErrorSeverity,
  UpdateRecoveryState
} from '../../types';

// Mock logger
vi.mock('../logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('UpdateErrorHandler', () => {
  let errorHandler: UpdateErrorHandler;

  beforeEach(() => {
    // Create fresh instance for each test
    errorHandler = UpdateErrorHandler.getInstance();

    // Reset the singleton instance
    (UpdateErrorHandler as any).instance = undefined;
    errorHandler = UpdateErrorHandler.getInstance();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });

    // Mock window location
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true
    });

    // Mock caches
    Object.defineProperty(window, 'caches', {
      value: {
        keys: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(true)
      },
      writable: true
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Error Creation and Categorization', () => {
    it('should create update error from Error object', () => {
      const originalError = new Error('Network request failed');
      const error = errorHandler.createUpdateError(originalError);

      expect(error.type).toBe('network_error');
      expect(error.severity).toBe('low');
      expect(error.message).toContain('connect to update servers');
      expect(error.originalError).toBe(originalError);
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    it('should create update error from string message', () => {
      const error = errorHandler.createUpdateError('Service worker activation failed');

      expect(error.type).toBe('installation_error');
      expect(error.severity).toBe('high');
      expect(error.message).toContain('could not be installed properly');
      expect(error.retryable).toBe(false);
    });

    it('should categorize network errors correctly', () => {
      const networkErrors = [
        new Error('fetch failed'),
        new Error('Network request failed'),
        { status: 500, message: 'Server error' },
        { name: 'NetworkError', message: 'Connection failed' }
      ];

      networkErrors.forEach(err => {
        const error = errorHandler.createUpdateError(err);
        expect(error.type).toBe('network_error');
        expect(error.retryable).toBe(true);
      });
    });

    it('should categorize download errors correctly', () => {
      const downloadErrors = [
        new Error('Download incomplete'),
        { status: 416, message: 'Range not satisfiable' },
        { status: 413, message: 'Payload too large' }
      ];

      downloadErrors.forEach(err => {
        const error = errorHandler.createUpdateError(err);
        expect(error.type).toBe('download_error');
        expect(error.severity).toBe('medium');
      });
    });

    it('should categorize installation errors correctly', () => {
      const installationErrors = [
        new Error('Service worker installation failed'),
        new Error('Cache activation error'),
        new Error('Failed to activate service worker')
      ];

      installationErrors.forEach(err => {
        const error = errorHandler.createUpdateError(err);
        expect(error.type).toBe('installation_error');
        expect(error.severity).toBe('high');
      });
    });

    it('should categorize timeout errors correctly', () => {
      const timeoutErrors = [
        new Error('Request timeout'),
        { name: 'TimeoutError', message: 'Operation timed out' },
        { name: 'AbortError', message: 'Request aborted' }
      ];

      timeoutErrors.forEach(err => {
        const error = errorHandler.createUpdateError(err);
        expect(error.type).toBe('timeout_error');
        expect(error.retryable).toBe(true);
      });
    });

    it('should categorize storage errors correctly', () => {
      const storageErrors = [
        new Error('Quota exceeded'),
        { name: 'QuotaExceededError', message: 'Storage quota exceeded' },
        new Error('Disk full')
      ];

      storageErrors.forEach(err => {
        const error = errorHandler.createUpdateError(err);
        expect(error.type).toBe('storage_error');
        expect(error.severity).toBe('medium');
      });
    });

    it('should set correct severity levels', () => {
      const criticalError = errorHandler.createUpdateError('Rollback failed', {
        type: 'rollback_error'
      });
      expect(criticalError.severity).toBe('critical');

      const highError = errorHandler.createUpdateError('Installation failed', {
        type: 'installation_error'
      });
      expect(highError.severity).toBe('high');

      const mediumError = errorHandler.createUpdateError('Download failed', {
        type: 'download_error'
      });
      expect(mediumError.severity).toBe('medium');

      const lowError = errorHandler.createUpdateError('Network timeout', {
        type: 'timeout_error'
      });
      expect(lowError.severity).toBe('low');
    });

    it('should include suggested actions in metadata', () => {
      const error = errorHandler.createUpdateError('Network failed', {
        type: 'network_error'
      });

      expect(error.metadata?.suggestedActions).toContain('Check your internet connection');
      expect(error.metadata?.suggestedActions).toContain('Try connecting to a different network');
    });
  });

  describe('Retry Logic with Exponential Backoff', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry operation with exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');

      const error = errorHandler.createUpdateError('Network failed', {
        type: 'network_error'
      });

      const retryPromise = errorHandler.retryWithBackoff(operation, error);
      
      // Fast-forward through all timers
      await vi.runAllTimersAsync();
      
      const result = await retryPromise;

      expect(operation).toHaveBeenCalledTimes(3);
      expect(result).toBe('success');
    }, 10000);

    it('should fail after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const error = errorHandler.createUpdateError('Network failed', {
        type: 'network_error'
      });

      // Update config to fail faster
      errorHandler.updateRetryConfig({ maxAttempts: 2 });

      const retryPromise = errorHandler.retryWithBackoff(operation, error);
      
      // Fast-forward through all timers
      await vi.runAllTimersAsync();
      
      await expect(retryPromise).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Permission denied'));
      const error = errorHandler.createUpdateError('Permission denied', {
        type: 'permission_error'
      });

      await expect(
        errorHandler.retryWithBackoff(operation, error)
      ).rejects.toThrow();

      expect(operation).not.toHaveBeenCalled();
    });

    it('should calculate correct backoff delays', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockRejectedValueOnce(new Error('Third failure'));

      const error = errorHandler.createUpdateError('Network failed', {
        type: 'network_error'
      });

      const promise = errorHandler.retryWithBackoff(operation, error);

      // Fast-forward through the delays
      await vi.advanceTimersByTimeAsync(1000); // First retry after 1s
      await vi.advanceTimersByTimeAsync(2000); // Second retry after 2s
      await vi.advanceTimersByTimeAsync(4000); // Third retry after 4s

      await expect(promise).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect maximum delay limit', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const error = errorHandler.createUpdateError('Network failed', {
        type: 'network_error'
      });

      // Set very high backoff multiplier but low max delay
      errorHandler.updateRetryConfig({
        maxAttempts: 3, // Reduce attempts for faster test
        baseDelay: 1000,
        backoffMultiplier: 10,
        maxDelay: 3000
      });

      const retryPromise = errorHandler.retryWithBackoff(operation, error);

      // Fast-forward through all timers
      await vi.runAllTimersAsync();

      try {
        await retryPromise;
      } catch (e) {
        // Expected to fail
      }

      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Recovery Actions', () => {
    it('should create appropriate recovery actions for retryable errors', () => {
      const error = errorHandler.createUpdateError('Network failed', {
        type: 'network_error'
      });

      const actions = errorHandler.createRecoveryActions(error);

      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('retry');
      expect(actions[0].label).toBe('Retry Update');
    });

    it('should create rollback action for critical errors', () => {
      errorHandler.enableRollback('1.0.0');

      const error = errorHandler.createUpdateError('Installation failed critically', {
        type: 'installation_error',
        severity: 'critical'
      });

      const actions = errorHandler.createRecoveryActions(error);

      const rollbackAction = actions.find(a => a.id === 'rollback');
      expect(rollbackAction).toBeDefined();
      expect(rollbackAction?.dangerous).toBe(true);
      expect(rollbackAction?.confirmationRequired).toBe(true);
    });

    it('should create clear cache action for installation errors', () => {
      const error = errorHandler.createUpdateError('Service worker failed', {
        type: 'installation_error'
      });

      const actions = errorHandler.createRecoveryActions(error);

      const clearCacheAction = actions.find(a => a.id === 'clear-cache');
      expect(clearCacheAction).toBeDefined();
      expect(clearCacheAction?.label).toBe('Clear Cache and Retry');
    });

    it('should create force reload action for severe errors', () => {
      const error = errorHandler.createUpdateError('Critical failure', {
        type: 'rollback_error',
        severity: 'critical'
      });

      const actions = errorHandler.createRecoveryActions(error);

      const forceReloadAction = actions.find(a => a.id === 'force-reload');
      expect(forceReloadAction).toBeDefined();
      expect(forceReloadAction?.dangerous).toBe(true);
    });
  });

  describe('Rollback Functionality', () => {
    it('should enable rollback capability', () => {
      errorHandler.enableRollback('1.0.0');

      const state = errorHandler.getRecoveryState();
      expect(state.canRollback).toBe(true);
      expect(state.previousVersion).toBe('1.0.0');
    });

    it('should store rollback information in localStorage', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');

      errorHandler.enableRollback('1.2.3');

      expect(setItemSpy).toHaveBeenCalledWith('repcue_previous_version', '1.2.3');
      expect(setItemSpy).toHaveBeenCalledWith('repcue_rollback_available', 'true');
    });

    it('should perform rollback when possible', async () => {
      // Enable rollback first
      errorHandler.enableRollback('1.0.0');

      // Mock navigator.serviceWorker if not already defined
      if (!('serviceWorker' in navigator)) {
        Object.defineProperty(navigator, 'serviceWorker', {
          value: {},
          writable: true,
          configurable: true
        });
      }

      // Mock caches API
      const mockCaches = {
        keys: vi.fn().mockResolvedValue(['cache1', 'cache2']),
        delete: vi.fn().mockResolvedValue(true)
      };
      
      // Mock both global.caches and window.caches
      global.caches = mockCaches;
      (window as any).caches = mockCaches;

      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });

      await errorHandler.performRollback();

      expect(mockCaches.keys).toHaveBeenCalled();
      expect(mockCaches.delete).toHaveBeenCalledTimes(2);
      expect(mockReload).toHaveBeenCalled();
    });

    it('should throw error when rollback not available', async () => {
      await expect(errorHandler.performRollback()).rejects.toThrow('Failed to restore previous version. Please contact support.');
    });

    it('should handle rollback errors gracefully', async () => {
      errorHandler.enableRollback('1.0.0');

      // Mock navigator.serviceWorker if not already defined
      if (!('serviceWorker' in navigator)) {
        Object.defineProperty(navigator, 'serviceWorker', {
          value: {},
          writable: true,
          configurable: true
        });
      }

      // Mock caches.keys to throw error
      const mockCaches = {
        keys: vi.fn().mockRejectedValue(new Error('Cache access failed')),
        delete: vi.fn(),
        open: vi.fn(),
        match: vi.fn(),
        has: vi.fn()
      };
      
      global.caches = mockCaches as any;
      (window as any).caches = mockCaches;

      await expect(errorHandler.performRollback()).rejects.toThrow();

      const state = errorHandler.getRecoveryState();
      expect(state.rollbackInProgress).toBe(false);
    });
  });

  describe('Critical Error Handling', () => {
    it('should dispatch critical error event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const error = errorHandler.createUpdateError('Critical failure', {
        type: 'rollback_error',
        severity: 'critical'
      });

      errorHandler.handleCriticalError(error);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'critical-update-error',
          detail: expect.objectContaining({
            originalError: error
          })
        })
      );
    });

    it('should attempt automatic rollback for critical errors', async () => {
      errorHandler.enableRollback('1.0.0');

      const mockCaches = {
        keys: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(true)
      };
      (window as any).caches = mockCaches;

      const error = errorHandler.createUpdateError('Critical failure', {
        type: 'verification_error',
        severity: 'critical'
      });

      errorHandler.handleCriticalError(error);

      // Allow time for async rollback
      await vi.runAllTimersAsync();

      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Recovery State Management', () => {
    it('should track recovery state correctly', () => {
      const initialState = errorHandler.getRecoveryState();

      expect(initialState.retryAttempts).toBe(0);
      expect(initialState.recoveryActions).toEqual([]);
      expect(initialState.rollbackInProgress).toBe(false);
      expect(initialState.canRollback).toBe(false);
    });

    it('should reset recovery state', () => {
      // Create some state
      errorHandler.enableRollback('1.0.0');

      errorHandler.resetRecoveryState();

      const state = errorHandler.getRecoveryState();
      expect(state.retryAttempts).toBe(0);
      expect(state.recoveryActions).toEqual([]);
      expect(state.rollbackInProgress).toBe(false);
      // Should preserve rollback capability
      expect(state.canRollback).toBe(true);
      expect(state.previousVersion).toBe('1.0.0');
    });

    it('should update retry configuration', async () => {
      vi.useFakeTimers();
      
      const newConfig = {
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 60000
      };

      errorHandler.updateRetryConfig(newConfig);

      // Test that new config is applied
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const error = errorHandler.createUpdateError('Test error', {
        type: 'network_error'
      });

      const retryPromise = errorHandler.retryWithBackoff(operation, error);
      
      // Fast-forward through all timers
      await vi.runAllTimersAsync();
      
      try {
        await retryPromise;
      } catch (e) {
        // Expected to fail
      }

      // Should attempt 5 times instead of default 3
      expect(operation).toHaveBeenCalledTimes(5);
      
      vi.useRealTimers();
    }, 10000);
  });

  describe('Error Context and Metadata', () => {
    it('should include custom metadata in errors', () => {
      const customMetadata = {
        updateVersion: '2.0.0',
        previousVersion: '1.9.0',
        customField: 'test value'
      };

      const error = errorHandler.createUpdateError('Test error', {
        type: 'network_error',
        metadata: customMetadata
      });

      expect(error.metadata).toMatchObject(customMetadata);
      expect(error.metadata?.suggestedActions).toBeDefined();
    });

    it('should track retry attempts in metadata', async () => {
      vi.useFakeTimers();
      
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'));

      const error = errorHandler.createUpdateError('Test error', {
        type: 'network_error'
      });

      const retryPromise = errorHandler.retryWithBackoff(operation, error);
      
      // Fast-forward through all timers
      await vi.runAllTimersAsync();

      try {
        await retryPromise;
      } catch (finalError: any) {
        expect(finalError.metadata?.retryAttempt).toBe(2);
        expect(finalError.metadata?.maxAttempts).toBe(3);
      }
      
      vi.useRealTimers();
    }, 10000);
  });

  describe('Error Message Localization', () => {
    it('should provide user-friendly messages for all error types', () => {
      const errorTypes = [
        'network_error',
        'download_error',
        'installation_error',
        'verification_error',
        'storage_error',
        'service_worker_error',
        'timeout_error',
        'permission_error',
        'compatibility_error',
        'rollback_error',
        'unknown_error'
      ] as const;

      errorTypes.forEach(type => {
        const error = errorHandler.createUpdateError('Test error', { type });
        expect(error.message).not.toContain('Test error');
        expect(error.message.length).toBeGreaterThan(10);
      });
    });

    it('should fall back to original message for unknown error types', () => {
      const error = errorHandler.createUpdateError('Custom error message', {
        type: 'unknown_error'
      });

      expect(error.message).toBe('An unexpected error occurred during the update process.');
    });
  });
});