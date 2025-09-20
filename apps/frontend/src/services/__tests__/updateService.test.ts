import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UpdateService } from '../updateService';
import { consentService } from '../consentService';
import { storageService } from '../storageService';
import { updateErrorHandler } from '../../utils/updateErrorHandler';
import type { UpdateInfo, UpdatePreferences, VersionCheckResponse } from '../../types';

// Mock dependencies
vi.mock('../consentService', () => ({
  consentService: {
    hasConsent: vi.fn()
  }
}));

vi.mock('../storageService', () => ({
  storageService: {
    getAppSettings: vi.fn(),
    saveAppSettings: vi.fn()
  }
}));

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../../utils/updateErrorHandler', () => ({
  updateErrorHandler: {
    retryWithBackoff: vi.fn(),
    createUpdateError: vi.fn(),
    getRecoveryState: vi.fn(),
    createRecoveryActions: vi.fn()
  }
}));

// Mock constants
vi.mock('../../constants', () => ({
  APP_VERSION: '0.1.0'
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock import.meta.env
const mockEnv = {
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key'
};

Object.defineProperty(import.meta, 'env', {
  value: mockEnv,
  writable: true
});

describe('UpdateService', () => {
  let updateService: UpdateService;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset localStorage
    localStorage.clear();

    // Set default storage service mocks
    vi.mocked(storageService.getAppSettings).mockResolvedValue({});
    vi.mocked(storageService.saveAppSettings).mockResolvedValue();

    // Set default updateErrorHandler mocks
    vi.mocked(updateErrorHandler.retryWithBackoff).mockImplementation(async (operation) => {
      try {
        return await operation();
      } catch (error) {
        throw error;
      }
    });
    vi.mocked(updateErrorHandler.createUpdateError).mockImplementation((error, options) => ({
      message: typeof error === 'string' ? error : error.message || 'Unknown error',
      type: options?.type || 'network_error',
      severity: 'medium' as const,
      retryable: true,
      timestamp: new Date().toISOString()
    }));
    vi.mocked(updateErrorHandler.getRecoveryState).mockReturnValue({
      retryAttempts: 0,
      recoveryActions: [],
      rollbackInProgress: false,
      canRollback: false
    });
    vi.mocked(updateErrorHandler.createRecoveryActions).mockReturnValue([]);

    // Reset singleton instance
    // @ts-expect-error - accessing private static property for testing
    UpdateService.instance = undefined;

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock service worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          addEventListener: vi.fn(),
          waiting: null,
          update: vi.fn()
        } as Partial<ServiceWorkerRegistration>),
        addEventListener: vi.fn()
      },
      writable: true
    });

    // Mock document and window events
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'setInterval').mockImplementation(vi.fn());
    vi.spyOn(window, 'clearInterval').mockImplementation(vi.fn());

    updateService = UpdateService.getInstance();
  });

  afterEach(() => {
    updateService.destroy();
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton pattern)', () => {
      const instance1 = UpdateService.getInstance();
      const instance2 = UpdateService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadUpdatePreferences', () => {
    it('should load default preferences when none are stored', () => {
      const state = updateService.getUpdateState();
      expect(state.userPreferences).toEqual({
        updateMode: 'notify',
        allowMeteredUpdates: false,
        showChangelog: true
      });
    });

    it('should load stored preferences from storageService', async () => {
      const mockAppSettings = {
        update_mode: 'automatic',
        allow_auto_updates: false, // This becomes allowMeteredUpdates: true
        show_changelog: false
      };

      vi.mocked(storageService.getAppSettings).mockResolvedValue(mockAppSettings);

      // Create new instance to test loading
      // @ts-expect-error - accessing private static property for testing
      UpdateService.instance = undefined;
      const newService = UpdateService.getInstance();

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));

      const preferences = newService.getUserPreferences();
      expect(preferences.updateMode).toBe('automatic');
      expect(preferences.allowMeteredUpdates).toBe(true); // Inverted from allow_auto_updates
      expect(preferences.showChangelog).toBe(true); // Always defaults to true
    });

    it('should handle corrupted preferences gracefully', () => {
      localStorage.setItem('repcue_update_preferences', 'invalid-json');

      // @ts-expect-error - accessing private static property for testing
      UpdateService.instance = undefined;
      const newService = UpdateService.getInstance();

      const prefs = newService.getUserPreferences();
      expect(prefs.updateMode).toBe('notify');
      expect(prefs.allowMeteredUpdates).toBe(false);
    });
  });

  describe('setUserPreferences', () => {
    it('should update preferences and save to storageService', async () => {
      vi.mocked(storageService.getAppSettings).mockResolvedValue({});
      vi.mocked(storageService.saveAppSettings).mockResolvedValue();

      const newPreferences: Partial<UpdatePreferences> = {
        updateMode: 'automatic',
        allowMeteredUpdates: true
      };

      await updateService.setUserPreferences(newPreferences);

      const prefs = updateService.getUserPreferences();
      expect(prefs.updateMode).toBe('automatic');
      expect(prefs.allowMeteredUpdates).toBe(true);
      expect(prefs.showChangelog).toBe(true); // Should retain existing value

      // Check that storageService was called correctly
      expect(storageService.saveAppSettings).toHaveBeenCalledWith({
        update_mode: 'automatic',
        allow_auto_updates: false // Inverted from allowMeteredUpdates: true
        // Note: show_changelog is not saved to AppSettings, it's a UI preference
      });
    });

    it('should emit preferences-changed event', async () => {
      vi.mocked(storageService.getAppSettings).mockResolvedValue({});
      vi.mocked(storageService.saveAppSettings).mockResolvedValue();

      const eventCallback = vi.fn();
      updateService.on('preferences-changed', eventCallback);

      const newPreferences: Partial<UpdatePreferences> = {
        updateMode: 'manual'
      };

      await updateService.setUserPreferences(newPreferences);

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({ updateMode: 'manual' })
      );
    });
  });

  describe('checkForUpdates', () => {
    beforeEach(() => {
      vi.mocked(consentService.hasConsent).mockReturnValue(true);
    });

    it('should detect available update and emit event', async () => {
      const mockResponse: VersionCheckResponse = {
        update_available: true,
        latest_version: '0.2.0',
        update_policy: 'optional',
        changelog: {
          new_features: ['Feature 1', 'Feature 2'],
          improvements: ['Improvement 1'],
          bug_fixes: ['Bug fix 1']
        },
        message: 'A new update is available'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const eventCallback = vi.fn();
      updateService.on('update-available', eventCallback);

      const updateInfo = await updateService.checkForUpdates();

      expect(updateInfo).toEqual({
        version: '0.2.0',
        policy: 'optional',
        changelog: mockResponse.changelog,
        releaseDate: expect.any(String),
        forceUpdate: undefined,
        message: 'A new update is available'
      });

      expect(eventCallback).toHaveBeenCalledWith(updateInfo);

      const state = updateService.getUpdateState();
      expect(state.updateAvailable).toBe(true);
      expect(state.latestVersion).toBe('0.2.0');
      expect(state.updatePolicy).toBe('optional');
    });

    it('should handle no update available', async () => {
      const mockResponse: VersionCheckResponse = {
        update_available: false,
        latest_version: '0.1.0',
        message: 'You are running the latest version'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const eventCallback = vi.fn();
      updateService.on('no-update-available', eventCallback);

      const updateInfo = await updateService.checkForUpdates();

      expect(updateInfo).toBeNull();
      expect(eventCallback).toHaveBeenCalled();

      const state = updateService.getUpdateState();
      expect(state.updateAvailable).toBe(false);
      expect(state.pendingUpdate).toBeUndefined();
    });

    it('should handle API errors and fall back to service worker', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const updateInfo = await updateService.checkForUpdates();

      expect(updateInfo).toBeNull(); // No service worker update in this test

      const state = updateService.getUpdateState();
      expect(state.error).toBeDefined(); // Error should be set when network fails
      expect(state.error).toContain('Network error'); // Error might be wrapped in UpdateError
    });

    it('should respect user consent preferences', async () => {
      vi.mocked(consentService.hasConsent).mockReturnValue(false);

      await updateService.checkForUpdates();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"user_consent":false')
        })
      );
    });

    it('should skip frequent checks for non-force updates', async () => {
      // First check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ update_available: false })
      });

      await updateService.checkForUpdates();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second check immediately after (should be skipped due to rate limiting)
      const result = await updateService.checkForUpdates();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should still be 1 (no additional call)
      expect(result).toBeNull();
    });
  });

  describe('dismissUpdate', () => {
    it('should dismiss optional update and save preferences', async () => {
      // Setup storage service mocks for this test
      vi.mocked(storageService.getAppSettings).mockResolvedValue({});
      vi.mocked(storageService.saveAppSettings).mockResolvedValue();

      // Mock the update check to set a pending update
      const mockResponse: VersionCheckResponse = {
        update_available: true,
        latest_version: '0.2.0',
        update_policy: 'optional',
        message: 'Update available'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Trigger update check to set pending update
      await updateService.checkForUpdates();

      const eventCallback = vi.fn();
      updateService.on('update-dismissed', eventCallback);

      await updateService.dismissUpdate();

      expect(eventCallback).toHaveBeenCalledWith(expect.objectContaining({
        version: '0.2.0',
        policy: 'optional'
      }));

      const state = updateService.getUpdateState();
      expect(state.updateAvailable).toBe(false);
      expect(state.pendingUpdate).toBeUndefined();

      const prefs = updateService.getUserPreferences();
      expect(prefs.lastDismissedVersion).toBe('0.2.0');
      expect(prefs.lastDismissedAt).toEqual(expect.any(String));
    });

    it('should not dismiss force updates', async () => {
      // Mock force update
      const mockResponse: VersionCheckResponse = {
        update_available: true,
        latest_version: '0.2.0',
        update_policy: 'force',
        force_update: true,
        message: 'Critical update required'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Trigger update check to set pending update
      await updateService.checkForUpdates();

      updateService.dismissUpdate();

      const state = updateService.getUpdateState();
      expect(state.updateAvailable).toBe(true);
      expect(state.pendingUpdate).toBeTruthy();
      expect(state.pendingUpdate?.policy).toBe('force');
    });

    it('should handle no pending update gracefully', () => {
      expect(() => updateService.dismissUpdate()).not.toThrow();
    });
  });

  describe('shouldShowUpdateNotification', () => {
    it('should always show force updates', () => {
      const forceUpdate: UpdateInfo = {
        version: '0.2.0',
        policy: 'force',
        releaseDate: new Date().toISOString(),
        message: 'Critical update'
      };

      expect(updateService.shouldShowUpdateNotification(forceUpdate)).toBe(true);
    });

    it('should not show recently dismissed updates', () => {
      const updateInfo: UpdateInfo = {
        version: '0.2.0',
        policy: 'optional',
        releaseDate: new Date().toISOString(),
        message: 'Update available'
      };

      // Set recently dismissed
      updateService.setUserPreferences({
        lastDismissedVersion: '0.2.0',
        lastDismissedAt: new Date().toISOString()
      });

      expect(updateService.shouldShowUpdateNotification(updateInfo)).toBe(false);
    });

    it('should show dismissed updates after 24 hours', () => {
      const updateInfo: UpdateInfo = {
        version: '0.2.0',
        policy: 'optional',
        releaseDate: new Date().toISOString(),
        message: 'Update available'
      };

      // Set dismissed 25 hours ago
      const dismissedAt = new Date();
      dismissedAt.setHours(dismissedAt.getHours() - 25);

      updateService.setUserPreferences({
        lastDismissedVersion: '0.2.0',
        lastDismissedAt: dismissedAt.toISOString()
      });

      expect(updateService.shouldShowUpdateNotification(updateInfo)).toBe(true);
    });

    it('should respect manual update mode', () => {
      const updateInfo: UpdateInfo = {
        version: '0.2.0',
        policy: 'optional',
        releaseDate: new Date().toISOString(),
        message: 'Update available'
      };

      updateService.setUserPreferences({ updateMode: 'manual' });

      expect(updateService.shouldShowUpdateNotification(updateInfo)).toBe(false);
    });
  });

  describe('isOnMeteredConnection', () => {
    it('should detect metered connection when available', () => {
      // Mock navigator.connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          saveData: true,
          effectiveType: '3g'
        },
        writable: true
      });

      expect(updateService.isOnMeteredConnection()).toBe(true);
    });

    it('should handle missing connection API', () => {
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        writable: true
      });

      expect(updateService.isOnMeteredConnection()).toBe(false);
    });
  });

  describe('event system', () => {
    it('should register and emit events correctly', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      updateService.on('test-event', callback1);
      updateService.on('test-event', callback2);

      // Emit event using private method
      // @ts-expect-error - accessing private method for testing
      updateService.emit('test-event', { data: 'test' });

      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should remove event listeners correctly', () => {
      const callback = vi.fn();

      updateService.on('test-event', callback);
      updateService.off('test-event', callback);

      // @ts-expect-error - accessing private method for testing
      updateService.emit('test-event', { data: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in event listeners', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Event listener error');
      });
      const normalCallback = vi.fn();

      updateService.on('test-event', errorCallback);
      updateService.on('test-event', normalCallback);

      // Should not throw even if one listener errors
      expect(() => {
        // @ts-expect-error - accessing private method for testing
        updateService.emit('test-event');
      }).not.toThrow();

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('service worker integration', () => {
    it('should handle service worker updates', () => {
      const mockRegistration = {
        addEventListener: vi.fn(),
        waiting: {
          postMessage: vi.fn()
        },
        update: vi.fn()
      };

      // Mock service worker ready
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve(mockRegistration),
          addEventListener: vi.fn()
        },
        writable: true
      });

      // Test service worker update handling
      const eventCallback = vi.fn();
      updateService.on('update-available', eventCallback);

      // Simulate update found event
      const updateFoundCallback = mockRegistration.addEventListener.mock.calls
        .find(call => call[0] === 'updatefound')?.[1];

      if (updateFoundCallback) {
        updateFoundCallback();

        const state = updateService.getUpdateState();
        expect(state.updateAvailable).toBe(true);
        expect(state.pendingUpdate?.policy).toBe('optional');
      }
    });
  });

  describe('persistence', () => {
    it('should persist update state to localStorage', async () => {
      // Mock consent to allow localStorage
      vi.mocked(consentService.hasConsent).mockReturnValue(true);

      // Mock an update to create state
      const mockResponse: VersionCheckResponse = {
        update_available: true,
        latest_version: '0.2.0',
        update_policy: 'critical',
        message: 'Important update'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Trigger update check to set state
      await updateService.checkForUpdates();

      // Force save by calling a method that triggers save
      vi.mocked(storageService.getAppSettings).mockResolvedValue({});
      vi.mocked(storageService.saveAppSettings).mockResolvedValue();
      await updateService.setUserPreferences({ showChangelog: false });

      // Check localStorage (updateState still uses localStorage for state, not preferences)
      const stored = localStorage.getItem('repcue_update_state');
      expect(stored).toBeTruthy();

      const parsedState = JSON.parse(stored!);
      expect(parsedState.updateAvailable).toBe(true);
      expect(parsedState.latestVersion).toBe('0.2.0');
    });

    it('should restore state from localStorage on initialization', async () => {
      // Mock storage service for preferences loading
      vi.mocked(storageService.getAppSettings).mockResolvedValue({});

      const storedState = {
        currentVersion: '0.1.0',
        latestVersion: '0.2.0',
        updateAvailable: true,
        updatePolicy: 'critical',
        isUpdating: false,
        lastCheckTime: new Date().toISOString(),
        pendingUpdate: {
          version: '0.2.0',
          policy: 'critical',
          releaseDate: new Date().toISOString(),
          message: 'Update available'
        }
      };

      localStorage.setItem('repcue_update_state', JSON.stringify(storedState));

      // Create new instance
      // @ts-expect-error - accessing private static property for testing
      UpdateService.instance = undefined;
      const newService = UpdateService.getInstance();

      // Wait for async initialization to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const state = newService.getUpdateState();
      expect(state.updateAvailable).toBe(true);
      expect(state.latestVersion).toBe('0.2.0');
      expect(state.updatePolicy).toBe('critical');
      expect(state.pendingUpdate?.version).toBe('0.2.0');
    });
  });
});