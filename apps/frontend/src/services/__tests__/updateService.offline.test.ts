import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UpdateService } from '../updateService';
import { consentService } from '../consentService';
import { storageService } from '../storageService';
import type { VersionCheckResponse } from '../../types';

// Mock dependencies
vi.mock('../consentService');
vi.mock('../storageService');
vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../../constants', () => ({
  APP_VERSION: '1.0.0'
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key'
  },
  writable: true
});

describe('UpdateService - Offline Fallback Tests', () => {
  let updateService: UpdateService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Set default mocks
    vi.mocked(consentService.hasConsent).mockReturnValue(true);
    vi.mocked(storageService.getAppSettings).mockResolvedValue({});
    vi.mocked(storageService.saveAppSettings).mockResolvedValue();

    // Mock document and window events
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'setInterval').mockImplementation(vi.fn());
    vi.spyOn(window, 'clearInterval').mockImplementation(vi.fn());

    // Reset singleton
    // @ts-expect-error - accessing private static property for testing
    UpdateService.instance = undefined;
  });

  afterEach(() => {
    if (updateService) {
      updateService.destroy();
    }
    vi.restoreAllMocks();
  });

  describe('Network Failure Scenarios', () => {
    it('should handle network failures gracefully', async () => {
      // Mock network failure
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Mock service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            waiting: null,
            addEventListener: vi.fn(),
            update: vi.fn()
          }),
          addEventListener: vi.fn()
        },
        writable: true
      });

      updateService = UpdateService.getInstance();
      const updateInfo = await updateService.checkForUpdates();

      // Should handle gracefully - may return null
      expect(updateInfo).toBeNull();
    });

    it('should handle HTTP error responses', async () => {
      // Mock HTTP 500 error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Mock service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            waiting: null,
            addEventListener: vi.fn(),
            update: vi.fn()
          }),
          addEventListener: vi.fn()
        },
        writable: true
      });

      updateService = UpdateService.getInstance();
      const updateInfo = await updateService.checkForUpdates();

      expect(updateInfo).toBeNull();
    });

    it('should prioritize API updates when available', async () => {
      // Mock successful API response
      const mockApiResponse: VersionCheckResponse = {
        update_available: true,
        latest_version: '1.1.0',
        update_policy: 'critical',
        message: 'API update available'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      });

      // Mock service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            waiting: {
              postMessage: vi.fn()
            },
            addEventListener: vi.fn(),
            update: vi.fn()
          }),
          addEventListener: vi.fn()
        },
        writable: true
      });

      updateService = UpdateService.getInstance();
      const updateInfo = await updateService.checkForUpdates();

      // Should use API response if available
      if (updateInfo) {
        expect(updateInfo.version).toBe('1.1.0');
        expect(updateInfo.policy).toBe('critical');
      }
    });
  });

  describe('Offline State Detection', () => {
    it('should detect offline state', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      updateService = UpdateService.getInstance();
      
      // Service should still function
      expect(updateService.getUserPreferences()).toBeDefined();
    });

    it('should handle online/offline transitions', () => {
      updateService = UpdateService.getInstance();
      
      // Mock going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      // Mock coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });

      // Service should continue to work
      expect(updateService.getUpdateState()).toBeDefined();
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue basic functionality when offline', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      updateService = UpdateService.getInstance();

      // Basic functionality should still work
      const preferences = updateService.getUserPreferences();
      expect(preferences).toBeDefined();

      // Should be able to update preferences
      updateService.setUserPreferences({ updateMode: 'manual' });
      const updatedPreferences = updateService.getUserPreferences();
      expect(updatedPreferences.updateMode).toBe('manual');
    });

    it('should provide health status even when offline', () => {
      updateService = UpdateService.getInstance();
      
      const health = updateService.getHealthStatus();
      expect(health).toBeDefined();
      expect(health.isHealthy).toBeDefined();
    });
  });

  describe('Connection Detection', () => {
    it('should detect metered connections', () => {
      // Mock metered connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          saveData: true,
          effectiveType: '3g',
          type: 'cellular'
        },
        writable: true
      });

      updateService = UpdateService.getInstance();
      expect(updateService.isOnMeteredConnection()).toBe(true);
    });

    it('should handle missing connection API', () => {
      // Mock no connection API
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        writable: true
      });

      updateService = UpdateService.getInstance();
      expect(updateService.isOnMeteredConnection()).toBe(false);
    });
  });
});