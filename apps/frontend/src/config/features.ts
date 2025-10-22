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
