/**
 * iOS Keyboard utility
 * Manages keyboard behavior on iOS native app via Capacitor
 * 
 * @module iosKeyboard
 */
import { Keyboard, KeyboardStyle, KeyboardResize } from '@capacitor/keyboard';
import type { PluginListenerHandle } from '@capacitor/core';
import { isNativePlatform, isIOS } from './nativeCapabilities';
import logger from './logger';

/**
 * Keyboard visibility change handler type
 */
export type KeyboardVisibilityHandler = (info: {
  keyboardHeight: number;
  isVisible: boolean;
}) => void;

// Store registered listeners for cleanup
const keyboardListeners: {
  willShow?: PluginListenerHandle;
  willHide?: PluginListenerHandle;
  didShow?: PluginListenerHandle;
  didHide?: PluginListenerHandle;
} = {};

/**
 * Configure keyboard behavior for iOS
 * Sets up keyboard with appropriate styling and resize behavior
 * 
 * @param style - 'dark' or 'light' keyboard style
 * @param resizeMode - How the web view should resize when keyboard appears
 */
export async function configureKeyboard(
  style: 'dark' | 'light' = 'dark',
  resizeMode: 'body' | 'ionic' | 'native' | 'none' = 'body'
): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    logger.log('[Keyboard] Not running on iOS native - skipping configuration');
    return;
  }

  try {
    // Set keyboard style
    const keyboardStyle = style === 'dark' ? KeyboardStyle.Dark : KeyboardStyle.Light;
    await Keyboard.setStyle({ style: keyboardStyle });
    
    // Set resize mode
    let resize: KeyboardResize;
    switch (resizeMode) {
      case 'body':
        resize = KeyboardResize.Body;
        break;
      case 'ionic':
        resize = KeyboardResize.Ionic;
        break;
      case 'native':
        resize = KeyboardResize.Native;
        break;
      case 'none':
        resize = KeyboardResize.None;
        break;
      default:
        resize = KeyboardResize.Body;
    }
    await Keyboard.setResizeMode({ mode: resize });
    
    // IMPORTANT: Keep scroll ENABLED - disabling it breaks page scrolling in WKWebView
    // The setScroll option controls whether the WebView can scroll, not just keyboard-related scrolling
    await Keyboard.setScroll({ isDisabled: false });
    
    logger.log(`[Keyboard] Configured: style=${style}, resize=${resizeMode}`);
  } catch (error) {
    logger.warn('[Keyboard] Configuration failed:', error);
  }
}

/**
 * Set keyboard style based on app theme
 * 
 * @param isDarkTheme - Whether the app is in dark theme
 */
export async function setKeyboardForTheme(isDarkTheme: boolean): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    const style = isDarkTheme ? KeyboardStyle.Dark : KeyboardStyle.Light;
    await Keyboard.setStyle({ style });
    logger.log(`[Keyboard] Theme updated: dark=${isDarkTheme}`);
  } catch (error) {
    logger.warn('[Keyboard] Theme update failed:', error);
  }
}

/**
 * Show the keyboard
 * Note: This requires an input element to be focused
 */
export async function showKeyboard(): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    await Keyboard.show();
    logger.log('[Keyboard] Show requested');
  } catch (error) {
    logger.warn('[Keyboard] Show failed:', error);
  }
}

/**
 * Hide the keyboard
 */
export async function hideKeyboard(): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    await Keyboard.hide();
    logger.log('[Keyboard] Hidden');
  } catch (error) {
    logger.warn('[Keyboard] Hide failed:', error);
  }
}

/**
 * Enable or disable keyboard accessory bar (iOS specific)
 * The accessory bar shows Done/Next/Previous buttons above the keyboard
 * 
 * @param enable - Whether to show the accessory bar
 */
export async function setAccessoryBarVisible(enable: boolean): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    await Keyboard.setAccessoryBarVisible({ isVisible: enable });
    logger.log(`[Keyboard] Accessory bar: ${enable ? 'visible' : 'hidden'}`);
  } catch (error) {
    logger.warn('[Keyboard] Accessory bar setting failed:', error);
  }
}

/**
 * Enable or disable scroll adjustment when keyboard shows
 * When disabled, the page won't scroll when keyboard appears
 * 
 * @param disable - Whether to disable scroll adjustment
 */
export async function setScrollDisabled(disable: boolean): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    await Keyboard.setScroll({ isDisabled: disable });
    logger.log(`[Keyboard] Scroll: ${disable ? 'disabled' : 'enabled'}`);
  } catch (error) {
    logger.warn('[Keyboard] Scroll setting failed:', error);
  }
}

/**
 * Register keyboard visibility listeners
 * 
 * @param onShow - Callback when keyboard will show (with keyboard height)
 * @param onHide - Callback when keyboard will hide
 * @returns Cleanup function to remove listeners
 */
export async function addKeyboardListeners(
  onShow?: (keyboardHeight: number) => void,
  onHide?: () => void
): Promise<() => Promise<void>> {
  if (!isNativePlatform() || !isIOS()) {
    // Return no-op cleanup function
    return async () => {};
  }

  try {
    if (onShow) {
      keyboardListeners.willShow = await Keyboard.addListener('keyboardWillShow', (info) => {
        logger.log(`[Keyboard] Will show, height: ${info.keyboardHeight}`);
        onShow(info.keyboardHeight);
      });
    }

    if (onHide) {
      keyboardListeners.willHide = await Keyboard.addListener('keyboardWillHide', () => {
        logger.log('[Keyboard] Will hide');
        onHide();
      });
    }

    logger.log('[Keyboard] Listeners registered');
  } catch (error) {
    logger.warn('[Keyboard] Failed to add listeners:', error);
  }

  // Return cleanup function
  return async () => {
    await removeKeyboardListeners();
  };
}

/**
 * Register comprehensive keyboard visibility handler
 * Provides both keyboard height and visibility state
 * 
 * @param handler - Callback with keyboard info
 * @returns Cleanup function to remove listeners
 */
export async function onKeyboardVisibilityChange(
  handler: KeyboardVisibilityHandler
): Promise<() => Promise<void>> {
  if (!isNativePlatform() || !isIOS()) {
    return async () => {};
  }

  try {
    keyboardListeners.didShow = await Keyboard.addListener('keyboardDidShow', (info) => {
      handler({
        keyboardHeight: info.keyboardHeight,
        isVisible: true
      });
    });

    keyboardListeners.didHide = await Keyboard.addListener('keyboardDidHide', () => {
      handler({
        keyboardHeight: 0,
        isVisible: false
      });
    });

    logger.log('[Keyboard] Visibility change handler registered');
  } catch (error) {
    logger.warn('[Keyboard] Failed to add visibility handler:', error);
  }

  return async () => {
    await removeKeyboardListeners();
  };
}

/**
 * Remove all keyboard listeners
 */
export async function removeKeyboardListeners(): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    if (keyboardListeners.willShow) {
      await keyboardListeners.willShow.remove();
      keyboardListeners.willShow = undefined;
    }
    if (keyboardListeners.willHide) {
      await keyboardListeners.willHide.remove();
      keyboardListeners.willHide = undefined;
    }
    if (keyboardListeners.didShow) {
      await keyboardListeners.didShow.remove();
      keyboardListeners.didShow = undefined;
    }
    if (keyboardListeners.didHide) {
      await keyboardListeners.didHide.remove();
      keyboardListeners.didHide = undefined;
    }
    
    logger.log('[Keyboard] Listeners removed');
  } catch (error) {
    logger.warn('[Keyboard] Failed to remove listeners:', error);
  }
}

/**
 * Initialize keyboard with default RepCue settings
 * Should be called during app initialization
 */
export async function initializeKeyboard(): Promise<void> {
  await configureKeyboard('dark', 'body');
  await setAccessoryBarVisible(true); // Show Done button for easier dismissal
}

/**
 * React hook-friendly keyboard state manager
 * Use this in a useEffect to manage keyboard state
 * 
 * @example
 * ```tsx
 * useEffect(() => {
 *   const cleanup = setupKeyboardHandling((height) => {
 *     setKeyboardHeight(height);
 *   });
 *   return () => { cleanup?.then(fn => fn?.()); };
 * }, []);
 * ```
 */
export function setupKeyboardHandling(
  onHeightChange: (height: number) => void
): Promise<() => Promise<void>> | null {
  if (!isNativePlatform() || !isIOS()) {
    return null;
  }

  return onKeyboardVisibilityChange(({ keyboardHeight }) => {
    onHeightChange(keyboardHeight);
  });
}
