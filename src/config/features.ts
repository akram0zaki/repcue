// Central feature flags (client-visible; avoid secrets here)
// Allow test environment override using window.__VIDEO_DEMOS_DISABLED__ for deterministic E2E
// (Fails closed: if override indicates disabled, feature off; otherwise default true)
const globalOverride = typeof window !== 'undefined' && (window as any).__VIDEO_DEMOS_DISABLED__ === true;
export const VIDEO_DEMOS_ENABLED = !globalOverride; // Global kill switch for video-guided demos (Phase 0)
