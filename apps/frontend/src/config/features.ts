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

// Global debug logging flag: set true for verbose console output during development only.
// SECURITY: Do not leak sensitive data into logs. This flag gates verbosity, not secrets.
export const DEBUG = false;
