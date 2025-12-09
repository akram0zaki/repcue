// Central feature flags (client-visible; avoid secrets here)
// Allow test environment override using window.__VIDEO_DEMOS_DISABLED__ for deterministic E2E
// (Fails closed: if override indicates disabled, feature off; otherwise default true)

// Narrowed global override without using 'any'; the Window interface is augmented in test env
const globalOverride = typeof window !== 'undefined' && (window as Window & { __VIDEO_DEMOS_DISABLED__?: boolean }).__VIDEO_DEMOS_DISABLED__ === true;
export const VIDEO_DEMOS_ENABLED = !globalOverride; // Global kill switch for video-guided demos (Phase 0)

// Sync feature flag - enable now that Edge Functions are implemented
export const SYNC_ENABLED = true;
// Use Supabase functions.invoke for sync (dev reliability favors direct fetch). Default false.
export const SYNC_USE_INVOKE = false;

// Sync engine is now permanently V2 - legacy sync service has been removed
// This flag is kept for backward compatibility but always returns 'v2'
export const SYNC_ENGINE = 'v2' as const;

// Global debug logging flag: set true for verbose console output during development only.
// SECURITY: Do not leak sensitive data into logs. This flag gates verbosity, not secrets.
export const DEBUG = true;
// Extra-verbose sync diagnostics. Set to true temporarily when triaging sync issues.
export const SYNC_DEBUG = false;

// AI Workout Builder feature flags
// Enable/disable the entire AI Assistant feature (button visibility, flow access)
export const AI_WORKOUT_BUILDER = true;
// Beta testing mode - if true, restricts access to specific users (future use)
export const AI_WORKOUT_BETA = false;

// Legal Acceptance V3 feature flag
// Enable versioned legal document acceptance system (Terms, Privacy Policy, etc.)
// When enabled, users must accept current legal documents to use the app
export const LEGAL_ACCEPTANCE_V3_ENABLED = true;

// Theme Customization System
// Default theme ID - used for new users and fallback
export const DEFAULT_THEME_ID = 'winter-chill' as const;
// Enable/disable theme customization feature
// Starting enabled (true) on feature branch for development and testing
export const THEME_CUSTOMIZATION_ENABLED = true;

// Video R2 Hosting Migration
// Enable Cloudflare R2-based video hosting with /media/* proxy
// When enabled, uses new variants structure; when disabled, falls back to legacy video paths
export const VIDEO_R2_ENABLED = true; // Enabled for testing R2 video hosting

// Video CDN Base URL
// Production CDN for video assets - used by native apps to load videos
// since they can't use relative /media/* paths (which only work in Cloudflare Pages)
// Configure per environment via VITE_VIDEO_CDN_URL, defaults to production
export const VIDEO_CDN_BASE_URL = import.meta.env.VITE_VIDEO_CDN_URL || 'https://repcue.me';

// Smart Video Caching System
// Enable persistent IndexedDB caching for instant video playback and offline access
// When enabled, videos are cached locally and never re-downloaded (40x faster load times)
export const VIDEO_CACHING_ENABLED = true; // Enabled for persistent video caching

// PWA Install Prompt Controls
// Completely disabled due to persistent flashing bug across platforms
export const INSTALL_PROMPT_ENABLED = false; // Globally disabled until flashing issue resolved
export const INSTALL_PROMPT_IOS_ENABLED = false; // iOS-specific disable (kept for future)

// ============================================
// Capacitor iOS Native App Features
// ============================================

// Import platform detection utilities (lazy to avoid circular deps)
// These use runtime detection via Capacitor.isNativePlatform()
import { isNativePlatform, isIOS, isAndroid, isWeb, getPlatform } from '../utils/nativeCapabilities';

// Re-export platform detection for convenience
export { isNativePlatform, isIOS, isAndroid, isWeb, getPlatform };

// Alias functions for clarity in feature flag context
export const isNativeApp = isNativePlatform;
export const isIOSApp = isIOS;
export const isAndroidApp = isAndroid;
export const isWebApp = isWeb;
export const getNativePlatform = getPlatform;

// ============================================
// Platform-Aware Feature Flags
// ============================================

/**
 * Should install prompts be shown?
 * Returns false for native apps (already installed), respects feature flag for web
 */
export const shouldShowInstallPrompt = (): boolean => {
  if (isNativePlatform()) return false; // Never show in native apps
  return INSTALL_PROMPT_ENABLED;
};

// PWA Update Prompt Controls
// - Web: Show update prompts for service worker updates
// - Native: App updates come through App Store
export const WEB_UPDATE_PROMPT_ENABLED = true;

/**
 * Should PWA update prompts be shown?
 * Returns false for native apps (they update via App Store)
 */
export const shouldShowUpdatePrompt = (): boolean => {
  if (isNativePlatform()) return false;
  return WEB_UPDATE_PROMPT_ENABLED;
};

// Service Worker Registration
// - Web: Full service worker with update handling
// - Native: Service worker for caching only, no update UI
export const SERVICE_WORKER_ENABLED = true;

/**
 * Should service worker handle update prompts?
 * Native apps use SW for caching but not update UI
 */
export const shouldServiceWorkerPromptUpdates = (): boolean => {
  if (isNativePlatform()) return false;
  return SERVICE_WORKER_ENABLED;
};

// Push Notifications Strategy
// - Web: Use Web Push API (when implemented)
// - Native: Use Capacitor Push Notifications plugin
export const WEB_PUSH_ENABLED = false; // Not yet implemented
export const NATIVE_PUSH_ENABLED = true; // Enable for native apps

/**
 * Which push notification system to use
 */
export const getPushNotificationStrategy = (): 'web' | 'native' | 'none' => {
  if (isNativePlatform() && NATIVE_PUSH_ENABLED) return 'native';
  if (isWebApp() && WEB_PUSH_ENABLED) return 'web';
  return 'none';
};

// Native Haptics
// - Enable enhanced haptic feedback on iOS via Capacitor Haptics plugin
export const NATIVE_HAPTICS_ENABLED = true;

/**
 * Should native haptics be used?
 */
export const shouldUseNativeHaptics = (): boolean => {
  return isNativePlatform() && NATIVE_HAPTICS_ENABLED;
};

// Native Dialogs
// - iOS: Use Capacitor Dialog plugin for native-feeling alerts
// - Web: Use custom modal components
export const NATIVE_DIALOGS_ENABLED = true;

/**
 * Should native dialogs be used instead of custom modals?
 */
export const shouldUseNativeDialogs = (): boolean => {
  return isNativePlatform() && NATIVE_DIALOGS_ENABLED;
};

