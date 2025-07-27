/**
 * Unit Tests for useInstallPrompt Hook
 * 
 * Tests all functionality including:
 * - beforeinstallprompt event handling
 * - Install success/failure scenarios
 * - iOS Safari detection and handling
 * - Analytics tracking (privacy-compliant)
 * - Local storage persistence
 * - Error handling and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the platform detection utilities first
vi.mock('../../utils/platformDetection', () => ({
  isIOS: vi.fn(() => false),
  canInstall: vi.fn(() => true),
  getBrowserName: vi.fn(() => 'chrome'),
  getOSName: vi.fn(() => 'windows'),
}));

import { useInstallPrompt } from '../useInstallPrompt';
import * as platformDetection from '../../utils/platformDetection';

/**
 * Mock BeforeInstallPromptEvent
 */
class MockBeforeInstallPromptEvent extends Event {
  platforms: string[] = ['web'];
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  private _outcome: 'accepted' | 'dismissed' = 'accepted';

  constructor(type: string, outcome: 'accepted' | 'dismissed' = 'accepted') {
    super(type);
    this._outcome = outcome;
    this.userChoice = Promise.resolve({
      outcome: this._outcome,
      platform: 'web'
    });
  }

  prompt(): Promise<void> {
    return Promise.resolve();
  }

  setOutcome(outcome: 'accepted' | 'dismissed'): void {
    this._outcome = outcome;
    this.userChoice = Promise.resolve({
      outcome: this._outcome,
      platform: 'web'
    });
  }
}

describe('useInstallPrompt', () => {
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockRemoveEventListener: ReturnType<typeof vi.fn>;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock window.addEventListener
    mockAddEventListener = vi.fn();
    mockRemoveEventListener = vi.fn();
    
    Object.defineProperty(window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true,
    });
    
    Object.defineProperty(window, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true,
    });

    // Mock localStorage
    mockLocalStorage = {};
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
      },
      writable: true,
    });

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      writable: true,
    });

    // Mock document.referrer
    Object.defineProperty(document, 'referrer', {
      value: '',
      writable: true,
    });

    // Mock navigator.standalone
    Object.defineProperty(navigator, 'standalone', {
      value: false,
      writable: true,
    });

    // Reset platform detection mocks
    vi.mocked(platformDetection.isIOS).mockReturnValue(false);
    vi.mocked(platformDetection.canInstall).mockReturnValue(true);
    vi.mocked(platformDetection.getBrowserName).mockReturnValue('chrome');
    vi.mocked(platformDetection.getOSName).mockReturnValue('windows');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.isAvailable).toBe(false);
      expect(result.current.canShowPrompt).toBe(false);
      expect(result.current.isInstalling).toBe(false);
      expect(result.current.isInstalled).toBe(false);
      expect(result.current.installError).toBe(null);
      expect(result.current.installMethod).toBe('unsupported');
      expect(result.current.needsManualInstructions).toBe(false);
    });

    it('should set up event listeners', () => {
      renderHook(() => useInstallPrompt());

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'appinstalled',
        expect.any(Function)
      );
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useInstallPrompt());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
      );
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'appinstalled',
        expect.any(Function)
      );
    });

    it('should detect if app is already installed via standalone mode', () => {
      (window.matchMedia as any).mockReturnValue({ matches: true });

      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.isInstalled).toBe(true);
    });

    it('should detect if app is already installed via iOS standalone', () => {
      Object.defineProperty(navigator, 'standalone', {
        value: true,
        writable: true,
      });

      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.isInstalled).toBe(true);
    });

    it('should detect if app is already installed via Android referrer', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'android-app://com.example.app',
        writable: true,
      });

      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.isInstalled).toBe(true);
    });
  });

  describe('beforeinstallprompt event handling', () => {
    it('should handle beforeinstallprompt event', () => {
      const { result } = renderHook(() => useInstallPrompt());

      // Simulate beforeinstallprompt event
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      expect(result.current.isAvailable).toBe(true);
      expect(result.current.canShowPrompt).toBe(true);
      expect(result.current.installMethod).toBe('native_prompt');
    });

    it('should prevent default behavior on beforeinstallprompt', () => {
      renderHook(() => useInstallPrompt());

      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      const preventDefaultSpy = vi.spyOn(mockEvent, 'preventDefault');
      
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not show prompt if on cooldown', () => {
      // Set dismissal date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      mockLocalStorage['repcue_install_prompt_dismissed'] = yesterday.toISOString();

      const { result } = renderHook(() => useInstallPrompt());

      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      expect(result.current.isAvailable).toBe(true);
      expect(result.current.canShowPrompt).toBe(false);
    });

    it('should show prompt after cooldown period', () => {
      // Set dismissal date to 8 days ago
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      mockLocalStorage['repcue_install_prompt_dismissed'] = eightDaysAgo.toISOString();

      const { result } = renderHook(() => useInstallPrompt());

      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      expect(result.current.isAvailable).toBe(true);
      expect(result.current.canShowPrompt).toBe(true);
    });
  });

  describe('iOS Safari handling', () => {
    it('should handle iOS Safari (no beforeinstallprompt)', () => {
      vi.mocked(platformDetection.isIOS).mockReturnValue(true);

      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.isAvailable).toBe(true);
      expect(result.current.canShowPrompt).toBe(true);
      expect(result.current.installMethod).toBe('manual_instructions');
      expect(result.current.needsManualInstructions).toBe(true);
    });

    it('should not show iOS prompt if on cooldown', () => {
      vi.mocked(platformDetection.isIOS).mockReturnValue(true);
      
      // Set dismissal date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      mockLocalStorage['repcue_install_prompt_dismissed'] = yesterday.toISOString();

      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.isAvailable).toBe(true);
      expect(result.current.canShowPrompt).toBe(false);
    });
  });

  describe('install prompt functionality', () => {
    it('should successfully prompt for install', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      // Set up beforeinstallprompt
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt', 'accepted');
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      // Prompt for install
      let installResult: boolean = false;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult).toBe(true);
      expect(result.current.canShowPrompt).toBe(false); // Should be false after successful install
    });

    it('should handle install dismissal', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      // Set up beforeinstallprompt with dismissal
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt', 'dismissed');
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      // Prompt for install
      let installResult: boolean = true;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult).toBe(false);
      expect(result.current.canShowPrompt).toBe(false);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'repcue_install_prompt_dismissed',
        expect.any(String)
      );
    });

    it('should handle install errors', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      // Set up beforeinstallprompt that will fail
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      mockEvent.prompt = vi.fn().mockRejectedValue(new Error('Install failed'));
      
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      // Prompt for install
      let installResult: boolean = true;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult).toBe(false);
      expect(result.current.installError).toBe('Install failed');
    });

    it('should not prompt if no deferred prompt available', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      let installResult: boolean = true;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult).toBe(false);
    });

    it('should not prompt if already installing', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      // Set up beforeinstallprompt
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      // Create a slow installation by making prompt take time
      let resolvePrompt: () => void;
      const slowPromptPromise = new Promise<void>((resolve) => {
        resolvePrompt = resolve;
      });
      
      mockEvent.prompt = vi.fn(async () => {
        await slowPromptPromise;
      });

      // Start first install without awaiting
      const firstInstallPromise = result.current.promptInstall();
      
      // Wait a bit to ensure the first install has set isInstalling to true
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Now try second install - this should return false immediately
      let secondInstallResult: boolean | null = null;
      await act(async () => {
        secondInstallResult = await result.current.promptInstall();
      });

      expect(secondInstallResult).toBe(false);

      // Now resolve the first prompt and wait for completion
      resolvePrompt!();
      await act(async () => {
        await firstInstallPromise;
      });
    });
  });

  describe('dismissal functionality', () => {
    it('should dismiss prompt and store timestamp', () => {
      const { result } = renderHook(() => useInstallPrompt());

      // Set up prompt
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      expect(result.current?.canShowPrompt).toBe(true);

      // Dismiss prompt
      act(() => {
        result.current?.dismissPrompt();
      });

      expect(result.current?.canShowPrompt).toBe(false);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'repcue_install_prompt_dismissed',
        expect.any(String)
      );
    });
  });

  describe('error handling', () => {
    it('should reset install error', () => {
      const { result } = renderHook(() => useInstallPrompt());

      // Simulate an error by calling resetError (which should exist and work)
      act(() => {
        result.current?.resetError();
      });

      expect(result.current?.installError).toBe(null);
    });
  });

  describe('analytics functionality', () => {
    it('should track install events', () => {
      const { result } = renderHook(() => useInstallPrompt());

      // Set up beforeinstallprompt
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      const analytics = result.current?.getInstallAnalytics();
      expect(analytics).toBeDefined();
      expect(Array.isArray(analytics)).toBe(true);
    });

    it('should load analytics from localStorage', () => {
      const existingAnalytics = [{
        timestamp: '2025-01-01T00:00:00.000Z',
        platform: 'windows',
        browser: 'chrome',
        outcome: 'accepted' as const,
        method: 'native_prompt' as const,
      }];

      mockLocalStorage['repcue_install_analytics'] = JSON.stringify(existingAnalytics);

      const { result } = renderHook(() => useInstallPrompt());

      const analytics = result.current?.getInstallAnalytics();
      expect(analytics).toHaveLength(1);
      expect(analytics?.[0]).toMatchObject(existingAnalytics[0]);
    });

    it('should clear analytics', () => {
      const { result } = renderHook(() => useInstallPrompt());

      act(() => {
        result.current?.clearAnalytics();
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('repcue_install_analytics');
      expect(result.current?.getInstallAnalytics()).toHaveLength(0);
    });

    it('should limit analytics entries for privacy', () => {
      // Create more than 50 analytics entries
      const manyAnalytics = Array.from({ length: 60 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        platform: 'windows',
        browser: 'chrome',
        outcome: 'accepted' as const,
        method: 'native_prompt' as const,
      }));

      mockLocalStorage['repcue_install_analytics'] = JSON.stringify(manyAnalytics);

      const { result } = renderHook(() => useInstallPrompt());

      // Add one more event to trigger the limit
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1];

      act(() => {
        eventHandler?.(mockEvent);
      });

      const analytics = result.current?.getInstallAnalytics();
      expect(analytics?.length).toBeLessThanOrEqual(50);
    });
  });

  describe('appinstalled event handling', () => {
    it('should handle appinstalled event', () => {
      const { result } = renderHook(() => useInstallPrompt());

      // Simulate appinstalled event
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'appinstalled'
      )?.[1];

      act(() => {
        eventHandler?.(new Event('appinstalled'));
      });

      expect(result.current?.isInstalled).toBe(true);
      expect(result.current?.isAvailable).toBe(false);
      expect(result.current?.canShowPrompt).toBe(false);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw errors
      (localStorage.getItem as any).mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Should not throw
      expect(() => {
        renderHook(() => useInstallPrompt());
      }).not.toThrow();
    });

    it('should handle invalid JSON in localStorage', () => {
      mockLocalStorage['repcue_install_analytics'] = 'invalid json';

      // Should not throw and should use empty array
      const { result } = renderHook(() => useInstallPrompt());
      expect(result.current?.getInstallAnalytics()).toHaveLength(0);
    });

    it('should handle missing matchMedia', () => {
      delete (window as any).matchMedia;

      // Should not throw
      expect(() => {
        renderHook(() => useInstallPrompt());
      }).not.toThrow();
    });
  });
});
