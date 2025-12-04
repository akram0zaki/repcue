/**
 * Native Capabilities Utility for Capacitor iOS App
 * 
 * This module provides runtime detection of native platform features
 * and exposes native capabilities (haptics, dialogs, etc.) in a
 * cross-platform manner.
 * 
 * Usage:
 *   import { isNativePlatform, isIOS, triggerHaptic } from './nativeCapabilities';
 */

import { Capacitor } from '@capacitor/core';
import logger from './logger';

// ============================================
// Platform Detection
// ============================================

/**
 * Check if running inside a Capacitor native app (iOS or Android)
 * This is determined at runtime, not build time.
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get the current platform ('ios', 'android', or 'web')
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

/**
 * Check if running as iOS native app
 */
export const isIOS = (): boolean => {
  return isNativePlatform() && getPlatform() === 'ios';
};

/**
 * Check if running as Android native app (future use)
 */
export const isAndroid = (): boolean => {
  return isNativePlatform() && getPlatform() === 'android';
};

/**
 * Check if running as web (PWA or browser)
 */
export const isWeb = (): boolean => {
  return !isNativePlatform();
};

// ============================================
// Haptic Feedback
// ============================================

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Trigger haptic feedback on native platforms
 * Falls back to vibration API on web if available
 * 
 * @param type - The type of haptic feedback
 */
export const triggerHaptic = async (type: HapticType = 'medium'): Promise<void> => {
  if (!isNativePlatform()) {
    // Fallback to web vibration API if available
    if ('vibrate' in navigator) {
      try {
        const pattern = getVibrationPattern(type);
        navigator.vibrate(pattern);
      } catch (error) {
        logger.warn('Web vibration failed:', error);
      }
    }
    return;
  }

  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
      case 'selection':
        await Haptics.selectionStart();
        await Haptics.selectionEnd();
        break;
    }
  } catch (error) {
    logger.warn('Haptic feedback failed:', error);
  }
};

/**
 * Get vibration pattern for web fallback
 */
const getVibrationPattern = (type: HapticType): number | number[] => {
  switch (type) {
    case 'light':
      return 10;
    case 'medium':
      return 25;
    case 'heavy':
      return 50;
    case 'success':
      return [10, 50, 10];
    case 'warning':
      return [25, 50, 25];
    case 'error':
      return [50, 100, 50];
    case 'selection':
      return 5;
    default:
      return 25;
  }
};

/**
 * Trigger selection haptic (for UI interactions like toggles, pickers)
 */
export const triggerSelectionHaptic = async (): Promise<void> => {
  await triggerHaptic('selection');
};

/**
 * Trigger impact haptic (for button presses, timer events)
 */
export const triggerImpactHaptic = async (style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> => {
  await triggerHaptic(style);
};

/**
 * Trigger notification haptic (for success/warning/error states)
 */
export const triggerNotificationHaptic = async (type: 'success' | 'warning' | 'error'): Promise<void> => {
  await triggerHaptic(type);
};

// ============================================
// Native Preferences (Storage)
// ============================================

/**
 * Save a value to native preferences (iOS) or localStorage (web)
 * Use for critical settings that should survive cache clears
 */
export const saveNativePreference = async (key: string, value: string): Promise<void> => {
  if (isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
    } catch (error) {
      logger.error('Failed to save native preference:', error);
      // Fallback to localStorage
      localStorage.setItem(key, value);
    }
  } else {
    localStorage.setItem(key, value);
  }
};

/**
 * Get a value from native preferences (iOS) or localStorage (web)
 */
export const getNativePreference = async (key: string): Promise<string | null> => {
  if (isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      logger.error('Failed to get native preference:', error);
      // Fallback to localStorage
      return localStorage.getItem(key);
    }
  } else {
    return localStorage.getItem(key);
  }
};

/**
 * Remove a value from native preferences
 */
export const removeNativePreference = async (key: string): Promise<void> => {
  if (isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
    } catch (error) {
      logger.error('Failed to remove native preference:', error);
    }
  }
  localStorage.removeItem(key);
};

// ============================================
// App Lifecycle
// ============================================

/**
 * Register app state change listener (foreground/background)
 * Returns cleanup function
 */
export const onAppStateChange = (
  callback: (isActive: boolean) => void
): (() => void) => {
  if (!isNativePlatform()) {
    // Web fallback using visibility API
    const handleVisibility = () => {
      callback(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }

  let cleanup: (() => void) | null = null;

  // Async setup for native
  (async () => {
    try {
      const { App } = await import('@capacitor/app');
      const listener = await App.addListener('appStateChange', (state) => {
        callback(state.isActive);
      });
      cleanup = () => listener.remove();
    } catch (error) {
      logger.error('Failed to register app state listener:', error);
    }
  })();

  return () => {
    if (cleanup) cleanup();
  };
};

/**
 * Register back button listener (Android only, but included for completeness)
 */
export const onBackButton = (
  callback: () => void
): (() => void) => {
  if (!isNativePlatform() || !isAndroid()) {
    return () => {}; // No-op for web and iOS
  }

  let cleanup: (() => void) | null = null;

  (async () => {
    try {
      const { App } = await import('@capacitor/app');
      const listener = await App.addListener('backButton', callback);
      cleanup = () => listener.remove();
    } catch (error) {
      logger.error('Failed to register back button listener:', error);
    }
  })();

  return () => {
    if (cleanup) cleanup();
  };
};

// ============================================
// Debug Utilities
// ============================================

/**
 * Log platform information for debugging
 */
export const logPlatformInfo = (): void => {
  logger.log('🔍 Platform Detection Info:');
  logger.log('  isNativePlatform:', isNativePlatform());
  logger.log('  getPlatform:', getPlatform());
  logger.log('  isIOS:', isIOS());
  logger.log('  isAndroid:', isAndroid());
  logger.log('  isWeb:', isWeb());
};

// Auto-log in development
if (import.meta.env.DEV) {
  // Defer logging to avoid blocking initialization
  setTimeout(() => {
    logPlatformInfo();
  }, 100);
}
