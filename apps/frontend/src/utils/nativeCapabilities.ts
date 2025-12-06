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
// Deep Link Handling (Universal Links / App Links)
// ============================================

// Module-level flag to ensure getLaunchUrl is ONLY checked ONCE per app session
// This is critical because getLaunchUrl() always returns the same URL until app restart
let launchUrlChecked = false;
let launchUrlHandled = false;

// Key for persistent storage of handled auth callback URLs
const HANDLED_AUTH_CALLBACK_KEY = 'repcue_handled_auth_callback';

/**
 * Mark a launch URL as handled, storing persistently so it survives WebView reloads
 * For auth callbacks, we store a hash of the access_token to allow future re-auth
 */
export const markLaunchUrlHandled = async (url?: string): Promise<void> => {
  launchUrlHandled = true;
  
  // For auth callback URLs, persist a signature to prevent re-processing after WebView reload
  if (url && url.includes('access_token')) {
    try {
      // Extract access_token and create a simple signature
      const tokenMatch = url.match(/access_token=([^&]+)/);
      if (tokenMatch) {
        const tokenPrefix = tokenMatch[1].substring(0, 32); // First 32 chars as signature
        await saveNativePreference(HANDLED_AUTH_CALLBACK_KEY, tokenPrefix);
        logger.log('🔐 Marked auth callback as handled (persistent)');
      }
    } catch (error) {
      logger.warn('Failed to persist auth callback marker:', error);
    }
  }
};

/**
 * Check if launch URL was already handled (memory check only)
 */
export const wasLaunchUrlHandled = (): boolean => {
  return launchUrlHandled;
};

/**
 * Check if we've already checked the launch URL this session
 * This prevents multiple getLaunchUrl() calls which always return the same URL
 */
export const wasLaunchUrlChecked = (): boolean => {
  return launchUrlChecked;
};

/**
 * Mark that we've checked the launch URL (call immediately after getLaunchUrl)
 */
export const markLaunchUrlChecked = (): void => {
  launchUrlChecked = true;
};

/**
 * Check if a specific auth callback URL was already processed
 * This checks persistent storage for WebView reload scenarios
 */
export const wasAuthCallbackHandled = async (url: string): Promise<boolean> => {
  // Fast path: memory check
  if (launchUrlHandled) {
    return true;
  }
  
  // Check persistent storage for auth callback URLs
  if (url.includes('access_token')) {
    try {
      const tokenMatch = url.match(/access_token=([^&]+)/);
      if (tokenMatch) {
        const tokenPrefix = tokenMatch[1].substring(0, 32);
        const storedPrefix = await getNativePreference(HANDLED_AUTH_CALLBACK_KEY);
        
        if (storedPrefix === tokenPrefix) {
          logger.log('🔐 Auth callback already handled (from persistent storage)');
          launchUrlHandled = true; // Update memory flag
          return true;
        }
      }
    } catch (error) {
      logger.warn('Failed to check persistent auth callback marker:', error);
    }
  }
  
  return false;
};

/**
 * Clear the handled auth callback marker (call on logout or for testing)
 */
export const clearHandledAuthCallback = async (): Promise<void> => {
  launchUrlHandled = false;
  launchUrlChecked = false; // Also reset the checked flag so next login can process
  await removeNativePreference(HANDLED_AUTH_CALLBACK_KEY);
  logger.log('🔐 Cleared auth callback marker');
};

export type DeepLinkHandler = (url: URL, isLaunchUrl: boolean) => void;

/**
 * Register a handler for deep links (Universal Links on iOS, App Links on Android)
 * This is triggered when the app is opened via a link like https://repcue.me/auth/callback
 * 
 * CRITICAL: getLaunchUrl() always returns the same URL until the app is killed.
 * We use launchUrlChecked flag to ensure we only process it ONCE per app session.
 * 
 * @param handler - Function to handle the incoming URL
 * @returns Cleanup function to remove the listener
 */
export const onDeepLink = (handler: DeepLinkHandler): (() => void) => {
  if (!isNativePlatform()) {
    // Web doesn't need this - URLs are handled by the router
    return () => {};
  }

  let cleanup: (() => void) | null = null;

  (async () => {
    try {
      const { App } = await import('@capacitor/app');
      
      // Handle app opened via URL while running (Universal Links / App Links)
      const listener = await App.addListener('appUrlOpen', (event) => {
        logger.log('🔗 Deep link received (app running):', event.url.substring(0, 80));
        try {
          const url = new URL(event.url);
          handler(url, false); // false = not a launch URL
        } catch (error) {
          logger.error('Failed to parse deep link URL:', error);
        }
      });
      
      cleanup = () => listener.remove();
      
      // CRITICAL: Only check getLaunchUrl() ONCE per app session
      // This flag is checked SYNCHRONOUSLY before any async operations
      if (launchUrlChecked) {
        logger.log('🔗 Launch URL already checked this session, skipping getLaunchUrl');
        return;
      }
      
      // Mark as checked IMMEDIATELY (synchronously) to prevent race conditions
      markLaunchUrlChecked();
      
      // Now safely get the launch URL - this will only happen once per app session
      const launchUrl = await App.getLaunchUrl();
      if (launchUrl?.url) {
        // Check persistent storage for auth callbacks that survived WebView reload
        const alreadyHandled = await wasAuthCallbackHandled(launchUrl.url);
        
        if (!alreadyHandled) {
          logger.log('🚀 App launched with URL (first check):', launchUrl.url.substring(0, 80));
          try {
            const url = new URL(launchUrl.url);
            handler(url, true); // true = is a launch URL
          } catch (error) {
            logger.error('Failed to parse launch URL:', error);
          }
        } else {
          logger.log('🔗 Launch URL already handled (persistent), skipping');
        }
      }
    } catch (error) {
      logger.error('Failed to register deep link handler:', error);
    }
  })();

  return () => {
    if (cleanup) cleanup();
  };
};

// ============================================
// Screen Wake Lock (Keep Awake)
// ============================================

/**
 * Keep the screen awake (prevent auto-lock)
 * Use during active workouts to prevent the screen from dimming/locking
 * 
 * @returns Promise that resolves when screen wake lock is acquired
 */
export const keepScreenAwake = async (): Promise<void> => {
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    await KeepAwake.keepAwake();
    logger.log('🔆 Screen wake lock acquired');
  } catch (error) {
    logger.warn('Failed to keep screen awake:', error);
  }
};

/**
 * Allow the screen to sleep again (re-enable auto-lock)
 * Call this when the workout ends or is paused
 * 
 * @returns Promise that resolves when screen wake lock is released
 */
export const allowScreenSleep = async (): Promise<void> => {
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    await KeepAwake.allowSleep();
    logger.log('😴 Screen wake lock released');
  } catch (error) {
    logger.warn('Failed to release screen wake lock:', error);
  }
};

/**
 * Check if the screen is currently being kept awake
 * 
 * @returns Promise<boolean> - true if screen is being kept awake
 */
export const isScreenKeptAwake = async (): Promise<boolean> => {
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    const result = await KeepAwake.isKeptAwake();
    return result.isKeptAwake;
  } catch (error) {
    logger.warn('Failed to check screen wake lock status:', error);
    return false;
  }
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
