/**
 * iOS Status Bar utility
 * Manages status bar appearance on iOS native app via Capacitor
 * 
 * @module iosStatusBar
 */
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativePlatform, isIOS } from './nativeCapabilities';
import logger from './logger';

/**
 * Status bar style options
 */
export type StatusBarStyle = 'dark' | 'light' | 'default';

/**
 * Configure status bar for iOS
 * Sets up the status bar with appropriate style and overlay behavior
 * 
 * @param style - 'dark' for dark text, 'light' for light text, 'default' for system
 * @param overlay - Whether to overlay content under the status bar
 */
export async function configureStatusBar(
  style: StatusBarStyle = 'dark',
  overlay: boolean = false
): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    logger.log('[StatusBar] Not running on iOS native - skipping configuration');
    return;
  }

  try {
    // Set status bar style
    const capacitorStyle = style === 'dark' 
      ? Style.Dark 
      : style === 'light' 
        ? Style.Light 
        : Style.Default;
    
    await StatusBar.setStyle({ style: capacitorStyle });
    
    // Set overlay mode (iOS only)
    await StatusBar.setOverlaysWebView({ overlay });
    
    logger.log(`[StatusBar] Configured: style=${style}, overlay=${overlay}`);
  } catch (error) {
    logger.warn('[StatusBar] Configuration failed:', error);
  }
}

/**
 * Set status bar style based on app theme
 * 
 * @param isDarkTheme - Whether the app is in dark theme
 */
export async function setStatusBarForTheme(isDarkTheme: boolean): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    // Dark theme = light status bar text, Light theme = dark status bar text
    const style = isDarkTheme ? Style.Light : Style.Dark;
    await StatusBar.setStyle({ style });
    logger.log(`[StatusBar] Theme updated: dark=${isDarkTheme}`);
  } catch (error) {
    logger.warn('[StatusBar] Theme update failed:', error);
  }
}

/**
 * Set status bar background color (iOS 16+)
 * Note: This has limited effect on iOS as status bar background is typically controlled
 * by the underlying view. Use setBackgroundColorByHex for best compatibility.
 * 
 * @param color - Hex color string (e.g., '#ffffff')
 */
export async function setStatusBarColor(color: string): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    await StatusBar.setBackgroundColor({ color });
    logger.log(`[StatusBar] Color set: ${color}`);
  } catch (error) {
    // This may fail on older iOS versions or certain configurations
    logger.warn('[StatusBar] Color setting failed (may not be supported):', error);
  }
}

/**
 * Show the status bar
 */
export async function showStatusBar(): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    await StatusBar.show();
    logger.log('[StatusBar] Shown');
  } catch (error) {
    logger.warn('[StatusBar] Show failed:', error);
  }
}

/**
 * Hide the status bar
 * Use sparingly - hiding status bar can disorient users
 */
export async function hideStatusBar(): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    await StatusBar.hide();
    logger.log('[StatusBar] Hidden');
  } catch (error) {
    logger.warn('[StatusBar] Hide failed:', error);
  }
}

/**
 * Get current status bar info
 * 
 * @returns Status bar visibility and style info, or null if not supported
 */
export async function getStatusBarInfo(): Promise<{
  visible: boolean;
  style: string;
} | null> {
  if (!isNativePlatform() || !isIOS()) {
    return null;
  }

  try {
    const info = await StatusBar.getInfo();
    return {
      visible: info.visible,
      style: info.style
    };
  } catch (error) {
    logger.warn('[StatusBar] Get info failed:', error);
    return null;
  }
}

/**
 * Configure status bar for workout mode
 * Uses overlay to maximize screen real estate during active workout
 */
export async function configureForWorkout(): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    // Keep status bar visible but overlay content for more workout screen space
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light }); // Light text for better visibility during workout
    logger.log('[StatusBar] Configured for workout mode');
  } catch (error) {
    logger.warn('[StatusBar] Workout mode configuration failed:', error);
  }
}

/**
 * Configure status bar for normal app mode
 * Standard configuration with no overlay
 */
export async function configureForNormalMode(): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    return;
  }

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark }); // Dark text for standard views
    logger.log('[StatusBar] Configured for normal mode');
  } catch (error) {
    logger.warn('[StatusBar] Normal mode configuration failed:', error);
  }
}

/**
 * Initialize status bar with default RepCue settings
 * Should be called during app initialization
 */
export async function initializeStatusBar(): Promise<void> {
  await configureStatusBar('dark', false);
}
