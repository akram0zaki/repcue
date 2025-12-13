# Video Playback Architecture Audit - RepCue

**Audit Date**: 2025-12-09  
**Status**: In Progress  
**Platform Focus**: iOS Capacitor App

---

## Executive Summary

The video architecture uses a **multi-layered caching system** with URL resolution, but has **video URL lifecycle issues** that cause iOS Capacitor playback problems. The core issue is how video URLs transition between states (network URL → cached blob URL) and how different components handle these transitions.

**Key Insight:** The core problem is not variant selection or which components use caching - it's the **lifecycle management of video URLs during caching transitions**.

---

## Architectural Decisions (Confirmed)

1. **selectVideoVariant** - Keep for future-proofing (multiple variants planned), not causing issues
2. **SharedExerciseVideo** - Acceptable to bypass cache (preview before saving, will cache when user saves)
3. **Core Focus** - Video URL lifecycle and caching state transitions

---

## 1. Video Components

### 1.1 VideoThumbnail.tsx
**Path:** `src/components/VideoThumbnail.tsx`

| Aspect | Details |
|--------|---------|
| **Purpose** | Displays exercise video thumbnails with play/pause controls. Used in exercise lists and detail views. |
| **Video Loading** | Direct URL resolution via `loadExerciseMedia()` + `selectVideoVariant()` |
| **Caching** | ✅ Uses `resolveVideoUrl()` which routes through `VideoCacheService` |
| **Native Handling** | ✅ Skips probe for native apps |
| **CORS** | ✅ `crossOrigin="anonymous"` |
| **Used By** | `HomePage`, `ExercisePage`, `ExerciseDetailPage` |

**Key Code Flow:**
```
exercise → loadExerciseMedia() → selectVideoVariant() → resolveVideoUrl() → <video src={videoUrl}>
```

**Status:** ✅ Most reliable component

---

### 1.2 SharedExerciseVideo.tsx
**Path:** `src/components/SharedExerciseVideo.tsx`

| Aspect | Details |
|--------|---------|
| **Purpose** | Video player for shared exercise pages with fullscreen support |
| **Video Loading** | ⚠️ **Direct URL** for built-in exercises, NOT through cache service |
| **Caching** | ❌ **Does NOT use `resolveVideoUrl()`** - only uses `selectVideoVariant()` directly |
| **Native Handling** | Relies on `normalizeVideoUrl()` for URL normalization only |
| **CORS** | ✅ `crossOrigin="anonymous"` |
| **Used By** | Shared exercise pages |

**🚨 Issue:** This component sets video URL directly from `selectVideoVariant()` without going through `resolveVideoUrl()` for caching:
```typescript
// Line ~210 - Missing cache resolution!
const selectedPath = selectVideoVariant(media, ...);
if (selectedPath) {
  setVideoUrl(selectedPath);  // Direct URL, not cached!
}
```

**Status:** ✅ Acceptable - preview before save, caching happens when user saves exercise

---

### 1.3 TimerPage Video Handling
**Path:** `src/pages/TimerPage.tsx`

| Aspect | Details |
|--------|---------|
| **Purpose** | Main timer page with exercise video during workout |
| **Video Loading** | ⚠️ Complex dual-path - uses `useExerciseVideo` hook BUT also maintains own `videoUrl` state |
| **Caching** | Partial - hook uses cache, but page state bypasses it |
| **Used By** | Timer page exclusively |

**🚨 Issue:** TimerPage maintains its own `videoUrl` state (line ~227) that can bypass the hook's cached URL:
```typescript
// TimerPage creates its own video URL state
const [videoUrl, setVideoUrl] = useState<string | null>(null);

// Later updates it directly from selectVideoVariant, not from the hook's cached URL
const update = () => setVideoUrl(selectVideoVariant(exerciseVideo.media));
```

**Status:** ⚠️ Needs review - may bypass cache

---

## 2. Video Hooks

### 2.1 useExerciseVideo
**Path:** `src/hooks/useExerciseVideo.ts`

| Aspect | Details |
|--------|---------|
| **Purpose** | Main hook for timer page video playback with loop detection and playback control |
| **Video Loading** | ✅ Routes through `resolveVideoUrl()` for caching |
| **Features** | Playback rate control, loop detection, visibility change handling |
| **Used By** | `TimerPage` exclusively |

**Status:** ✅ Properly uses cache service

---

### 2.2 useVideoPrefetch
**Path:** `src/hooks/useVideoPrefetch.ts`

| Aspect | Details |
|--------|---------|
| **Purpose** | Intelligent video prefetching for workouts and rest periods |
| **Video Loading** | ⚠️ Mixed - uses both `resolveVideoUrl()` and direct `selectVideoVariant()` |
| **Used By** | Internal to workout flow |

**🚨 Issue at Line ~129:** For built-in exercises, it calls `selectVideoVariant()` directly without `resolveVideoUrl()`:
```typescript
videoUrl = selectVideoVariant(media);  // Not cached!
```

**Status:** ⚠️ Inconsistent caching

---

## 3. Video Services

### 3.1 VideoCacheService
**Path:** `src/services/videoCacheService.ts`

| Aspect | Details |
|--------|---------|
| **Purpose** | 3-tier caching: Memory → IndexedDB → Network |
| **Storage** | IndexedDB with 90-day expiration, LRU eviction |
| **Key Methods** | `fetchAndCache()`, `getCachedVideo()`, `clearCache()` |

**iOS-Specific Consideration:** The service validates blob URLs using HEAD requests, which can fail on Safari/WKWebView. Current code trusts memory cache to avoid validation issues.

**Status:** ✅ Well implemented

---

### 3.2 videoUploadService
**Path:** `src/services/videoUploadService.ts`

For custom exercise video uploads - not directly relevant to playback issues.

---

## 4. Video URL Utilities

### 4.1 resolveVideoUrl.ts
**Path:** `src/utils/resolveVideoUrl.ts`

| Aspect | Details |
|--------|---------|
| **Purpose** | Central URL resolution with caching and native URL conversion |
| **Native Handling** | ✅ Converts `/media/*` to absolute URLs for native apps |
| **Caching** | ✅ Routes through `VideoCacheService` |
| **CDN Base URL** | `https://repcue.me` |

**Status:** ✅ Correct implementation

---

### 4.2 selectVideoVariant.ts
**Path:** `src/utils/selectVideoVariant.ts`

| Aspect | Details |
|--------|---------|
| **Purpose** | Select optimal video variant based on viewport and codec support |
| **Native Handling** | ✅ Converts relative URLs via `normalizeVideoUrl()` |
| **Output** | Raw URL string (may be relative or absolute) |
| **CDN Base URL** | `https://dev.repcue.me` |

**🚨 CDN URL Mismatch:**
- `resolveVideoUrl.ts` uses: `https://repcue.me`
- `selectVideoVariant.ts` uses: `https://dev.repcue.me`

**Status:** ❌ CDN URL mismatch - needs fix

---

### 4.3 videoSources.ts
**Path:** `src/utils/videoSources.ts`

Simple utility to create `<source>` elements from URLs.

**Status:** ✅ Simple utility, no issues

---

### 4.4 loadExerciseMedia.ts
**Path:** `src/utils/loadExerciseMedia.ts`

Loads and caches `/exercise_media.json` metadata index.

**Status:** ✅ Working correctly

---

## 5. Pages Rendering Videos

| Page | Component Used | Hook Used | Video Loading Path | Status |
|------|----------------|-----------|-------------------|--------|
| **TimerPage** | Direct `<video>` | `useExerciseVideo` | ⚠️ Complex dual-path | ⚠️ Review |
| **HomePage** | `VideoThumbnail` | None | `resolveVideoUrl()` | ✅ OK |
| **ExercisePage** | `VideoThumbnail` | None | `resolveVideoUrl()` | ✅ OK |
| **ExerciseDetailPage** | `VideoThumbnail` | None | `resolveVideoUrl()` | ✅ OK |
| **SharedExercisePage** | `SharedExerciseVideo` | None | ❌ Direct URL | ❌ Fix needed |

---

## 6. Critical Issues Summary

### 🔴 Issue 1: Video URL Lifecycle During Caching Transitions (HIGH - CORE ISSUE)
**Files:** Multiple components handling URL state

**Problem:** When a video URL transitions from network URL to cached blob URL, components may:
- Hold stale references to the original network URL
- Not properly update when blob URL becomes available
- Have race conditions between fetch completion and component render

**Root Cause Analysis (2025-12-09):**

The core issue is **NOT** a lifecycle/transition problem. It's a **code path bypass**:

1. `useExerciseVideo` hook correctly resolves URLs through `resolveVideoUrl()` → cache → blob URL
2. The hook exports `videoUrl` (cached blob URL) but **TimerPage ignores it**
3. TimerPage maintains its own `videoUrl` state (line ~227) that calls `selectVideoVariant()` directly
4. This bypasses caching entirely - videos load from network instead of cache

**Code Evidence (TimerPage.tsx lines 387-393):**
```typescript
useEffect(() => {
  if (!exerciseVideo.media) { setVideoUrl(null); return; }
  const update = () => setVideoUrl(selectVideoVariant(exerciseVideo.media)); // ❌ BYPASSES CACHE
  update();
  window.addEventListener('resize', update);
  return () => window.removeEventListener('resize', update);
}, [exerciseVideo.media]);
```

**Fix:** Remove TimerPage's own `videoUrl` state and use `exerciseVideo.videoUrl` from the hook instead. The hook already handles viewport-responsive variant selection via `selectVideoVariant()`.

**Status:** ✅ Root cause identified - fix documented in Issue 3

---

### 🟡 Issue 2: CDN URL Mismatch (MEDIUM)
**Files:** `resolveVideoUrl.ts`, `selectVideoVariant.ts`

- Both files now import `VIDEO_CDN_BASE_URL` from `config/features.ts`
- Centralized config supports environment override via `VITE_VIDEO_CDN_URL`
- Default: `https://repcue.me` (production)

**Fix:** ✅ Unified to single constant in `config/features.ts`

**Status:** ✅ Fixed (2025-12-09)

---

### ✅ Issue 3: TimerPage Dual Video URL State (MEDIUM) → **MERGED INTO ISSUE 1**
**File:** `src/pages/TimerPage.tsx`

**This was the root cause of Issue 1.** TimerPage maintained its own `videoUrl` state that bypassed the `useExerciseVideo` hook's cached URL.

**Fix Applied (2025-12-09):**
1. ✅ Removed local `videoUrl` state from TimerPage
2. ✅ Removed the effect that called `selectVideoVariant()` directly (bypassing cache)
3. ✅ All video sources now use `exerciseVideo.videoUrl` from the hook
4. ✅ TypeScript compilation verified

**Status:** ✅ Fixed (2025-12-09) - Awaiting manual testing

---

### 🟡 Issue 4: useVideoPrefetch Inconsistent Caching (MEDIUM)
**File:** `src/hooks/useVideoPrefetch.ts`

The prefetch hook sometimes uses `selectVideoVariant()` directly without `resolveVideoUrl()` for built-in exercises.

**Fix:** Ensure all paths go through `resolveVideoUrl()`.

**Status:** ❌ Not fixed

---

### 🟢 Issue 5: Blob URL Lifecycle Inconsistency (LOW)
**Files:** `VideoThumbnail.tsx`, `useExerciseVideo.ts`

- `VideoThumbnail` revokes blob URLs on unmount
- `useExerciseVideo` explicitly does NOT revoke (by design, for caching)

This inconsistency could cause issues if blob URLs are shared across components.

**Fix:** Standardize blob URL lifecycle strategy.

**Status:** ❌ Not fixed

---

## 7. Hostname/CORS Issue (Resolved)

### Issue
Changing `hostname` in Capacitor config from `localhost` to `repcue.app` changed the WebView origin from `capacitor://localhost` to `capacitor://repcue.app`, which wasn't in the CORS allowed origins.

### Resolution
Reverted hostname change on 2025-12-09. iOS fullscreen message will continue to show `capacitor://localhost/timer` which is confusing but doesn't break functionality.

**Status:** ✅ Resolved (reverted)

---

## 8. Recommended Fix Priority

1. **✅ DONE**: Revert hostname change to restore video playback
2. **✅ DONE**: Fix Issue 2 - CDN URL mismatch (centralized in `config/features.ts`)
3. **✅ DONE**: Investigate Issue 1 - Root cause identified (TimerPage bypasses cache)
4. **✅ DONE**: Fix Issue 3 - TimerPage now uses `exerciseVideo.videoUrl` from hook
5. **MEDIUM**: Fix Issue 4 - useVideoPrefetch inconsistent caching
6. **LOW**: Fix Issue 5 - Standardize blob URL lifecycle
7. **FUTURE**: Consider unifying video components into single pattern

---

## 9. Testing Checklist

After fixes, verify video playback on:

- [ ] iOS Simulator - ExercisePage (video thumbnails)
- [ ] iOS Simulator - TimerPage (workout video)
- [ ] iOS Simulator - ExerciseDetailPage (video thumbnail)
- [ ] iOS Simulator - HomePage (video thumbnails)
- [ ] iOS Simulator - SharedExercisePage (if applicable)
- [ ] iOS Physical Device - all above
- [ ] Web Browser - all above (regression test)
- [ ] PWA - all above (regression test)

---

## 10. Change Log

| Date | Change | Status |
|------|--------|--------|
| 2025-12-09 | Initial audit conducted | Complete |
| 2025-12-09 | Hostname change reverted | Complete |
| 2025-12-09 | Identified CDN URL mismatch | ✅ Fixed |
| 2025-12-09 | Centralized VIDEO_CDN_BASE_URL in features.ts | Complete |
| 2025-12-09 | Identified SharedExerciseVideo cache bypass | Acceptable |
| 2025-12-09 | Investigated Issue 1 - found root cause in TimerPage | Complete |
| 2025-12-09 | Root cause: TimerPage bypasses useExerciseVideo's cached URL | ✅ Fixed |
| 2025-12-09 | Fixed TimerPage to use exerciseVideo.videoUrl from hook | Complete |
