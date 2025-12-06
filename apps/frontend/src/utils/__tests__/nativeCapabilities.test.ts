/**
 * Unit tests for nativeCapabilities.ts
 * Tests platform detection and native feature utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Capacitor before importing nativeCapabilities
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    selectionStart: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
    selectionEnd: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Heavy: 'HEAVY',
    Medium: 'MEDIUM',
    Light: 'LIGHT',
  },
  NotificationType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
    Error: 'ERROR',
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ value: null }),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue({ keys: [] }),
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    getInfo: vi.fn().mockResolvedValue({ name: 'RepCue', id: 'me.repcue.app', version: '1.0.0', build: '1' }),
    getLaunchUrl: vi.fn().mockResolvedValue({ url: null }),
    exitApp: vi.fn().mockResolvedValue(undefined),
    minimizeApp: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
vi.mock('../logger', () => ({
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocking
import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import {
  isNativePlatform,
  isIOS,
  isAndroid,
  isWeb,
  getPlatform,
  triggerHaptic,
  triggerNotificationHaptic,
  triggerImpactHaptic,
  triggerSelectionHaptic,
  saveNativePreference,
  getNativePreference,
  removeNativePreference,
  logPlatformInfo,
} from '../nativeCapabilities';

describe('nativeCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage for each test
    localStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Platform Detection', () => {
    describe('isNativePlatform', () => {
      it('should return true when Capacitor reports native platform', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
        expect(isNativePlatform()).toBe(true);
        expect(Capacitor.isNativePlatform).toHaveBeenCalled();
      });

      it('should return false when Capacitor reports web platform', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        expect(isNativePlatform()).toBe(false);
      });
    });

    describe('isIOS', () => {
      it('should return true when native platform and platform is ios', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
        vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
        expect(isIOS()).toBe(true);
      });

      it('should return false when native platform but platform is android', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
        vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
        expect(isIOS()).toBe(false);
      });

      it('should return false when not native platform even if platform is ios', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
        expect(isIOS()).toBe(false);
      });

      it('should return false when platform is web', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
        expect(isIOS()).toBe(false);
      });
    });

    describe('isAndroid', () => {
      it('should return true when native platform and platform is android', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
        vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
        expect(isAndroid()).toBe(true);
      });

      it('should return false when native platform but platform is ios', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
        vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
        expect(isAndroid()).toBe(false);
      });

      it('should return false when not native platform', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
        expect(isAndroid()).toBe(false);
      });
    });

    describe('isWeb', () => {
      it('should return true when not native platform', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        expect(isWeb()).toBe(true);
      });

      it('should return false when native platform', () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
        expect(isWeb()).toBe(false);
      });
    });

    describe('getPlatform', () => {
      it('should return the correct platform string', () => {
        vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
        expect(getPlatform()).toBe('ios');

        vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
        expect(getPlatform()).toBe('android');

        vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
        expect(getPlatform()).toBe('web');
      });
    });
  });

  describe('Haptic Feedback', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    });

    describe('triggerHaptic', () => {
      it('should trigger medium impact by default', async () => {
        await triggerHaptic();
        expect(Haptics.impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
      });

      it('should trigger light impact when specified', async () => {
        await triggerHaptic('light');
        expect(Haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
      });

      it('should trigger heavy impact when specified', async () => {
        await triggerHaptic('heavy');
        expect(Haptics.impact).toHaveBeenCalledWith({ style: 'HEAVY' });
      });

      it('should trigger success notification', async () => {
        await triggerHaptic('success');
        expect(Haptics.notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
      });

      it('should trigger warning notification', async () => {
        await triggerHaptic('warning');
        expect(Haptics.notification).toHaveBeenCalledWith({ type: 'WARNING' });
      });

      it('should trigger error notification', async () => {
        await triggerHaptic('error');
        expect(Haptics.notification).toHaveBeenCalledWith({ type: 'ERROR' });
      });

      it('should trigger selection haptic', async () => {
        await triggerHaptic('selection');
        expect(Haptics.selectionStart).toHaveBeenCalled();
        expect(Haptics.selectionEnd).toHaveBeenCalled();
      });

      it('should not trigger haptic on web platform', async () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        await triggerHaptic();
        expect(Haptics.impact).not.toHaveBeenCalled();
      });
    });

    describe('triggerNotificationHaptic', () => {
      it('should trigger success notification', async () => {
        await triggerNotificationHaptic('success');
        expect(Haptics.notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
      });

      it('should trigger warning notification', async () => {
        await triggerNotificationHaptic('warning');
        expect(Haptics.notification).toHaveBeenCalledWith({ type: 'WARNING' });
      });

      it('should trigger error notification', async () => {
        await triggerNotificationHaptic('error');
        expect(Haptics.notification).toHaveBeenCalledWith({ type: 'ERROR' });
      });

      it('should not trigger on web platform', async () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        await triggerNotificationHaptic('success');
        expect(Haptics.notification).not.toHaveBeenCalled();
      });
    });

    describe('triggerImpactHaptic', () => {
      it('should trigger medium impact by default', async () => {
        await triggerImpactHaptic();
        expect(Haptics.impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
      });

      it('should trigger impact with specified style', async () => {
        await triggerImpactHaptic('heavy');
        expect(Haptics.impact).toHaveBeenCalledWith({ style: 'HEAVY' });
      });

      it('should trigger light impact', async () => {
        await triggerImpactHaptic('light');
        expect(Haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
      });
    });

    describe('triggerSelectionHaptic', () => {
      it('should trigger selection haptic sequence', async () => {
        await triggerSelectionHaptic();
        expect(Haptics.selectionStart).toHaveBeenCalled();
        expect(Haptics.selectionEnd).toHaveBeenCalled();
      });

      it('should not trigger on web platform', async () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        await triggerSelectionHaptic();
        expect(Haptics.selectionStart).not.toHaveBeenCalled();
      });
    });
  });

  describe('Native Preferences', () => {
    describe('on native platform', () => {
      beforeEach(() => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      });

      describe('saveNativePreference', () => {
        it('should save string preference to Preferences', async () => {
          await saveNativePreference('testKey', 'testValue');
          expect(Preferences.set).toHaveBeenCalledWith({
            key: 'testKey',
            value: 'testValue',
          });
        });
      });

      describe('getNativePreference', () => {
        it('should return string preference value', async () => {
          vi.mocked(Preferences.get).mockResolvedValue({ value: 'testValue' });
          const result = await getNativePreference('testKey');
          expect(result).toBe('testValue');
          expect(Preferences.get).toHaveBeenCalledWith({ key: 'testKey' });
        });

        it('should return null for missing preference', async () => {
          vi.mocked(Preferences.get).mockResolvedValue({ value: null });
          const result = await getNativePreference('missingKey');
          expect(result).toBeNull();
        });
      });

      describe('removeNativePreference', () => {
        it('should remove preference by key', async () => {
          await removeNativePreference('testKey');
          expect(Preferences.remove).toHaveBeenCalledWith({ key: 'testKey' });
        });
      });
    });

    describe('on web platform (fallback to localStorage)', () => {
      beforeEach(() => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      });

      describe('saveNativePreference', () => {
        it('should save to localStorage on web', async () => {
          await saveNativePreference('webKey', 'webValue');
          expect(Preferences.set).not.toHaveBeenCalled();
          expect(localStorage.getItem('webKey')).toBe('webValue');
        });
      });

      describe('getNativePreference', () => {
        it('should get from localStorage on web', async () => {
          localStorage.setItem('webKey', 'webValue');
          const result = await getNativePreference('webKey');
          expect(Preferences.get).not.toHaveBeenCalled();
          expect(result).toBe('webValue');
        });

        it('should return null for missing preference', async () => {
          const result = await getNativePreference('missingKey');
          expect(result).toBeNull();
        });
      });

      describe('removeNativePreference', () => {
        it('should remove from localStorage on web', async () => {
          localStorage.setItem('webKey', 'webValue');
          await removeNativePreference('webKey');
          expect(Preferences.remove).not.toHaveBeenCalled();
          expect(localStorage.getItem('webKey')).toBeNull();
        });
      });
    });
  });

  describe('logPlatformInfo', () => {
    it('should log platform information without throwing', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
      
      // Should not throw
      expect(() => logPlatformInfo()).not.toThrow();
    });

    it('should handle web platform', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      
      expect(() => logPlatformInfo()).not.toThrow();
    });
  });
});
