# RepCue Video System

This document explains how the exercise video feature works end-to-end, including encoding, hosting on Cloudflare R2 behind a same-origin proxy, the manifest format, client selection, caching, accessibility, and developer workflows.

## Goals
- Keep videos optional: if unavailable or disabled, UI falls back gracefully with no UX regression.
- Same-origin delivery: client requests `/media/...` paths; no third-party domains.
- Cross-browser playback: prefer WebM, fall back to MP4 when needed.
- Multi-tier caching: Memory → IndexedDB → Service Worker for instant playback.
- Deterministic, cacheable delivery using content-hash filenames where enabled.
- **Native app support**: Capacitor iOS/Android apps load videos from production CDN with CORS.

## Architecture Overview
- **Encoding** (local): source clips → ffmpeg → MP4 (H.264), short seamless loops with watermark
- **Storage**: Cloudflare R2 bucket `repcue-videos` (public objects)
- **Delivery**: Cloudflare Pages Function proxy at `/media/*` (supports Range requests, cache headers, and CORS)
- **Manifest**: `apps/frontend/public/exercise_media.json` (array of media entries with variants)
- **Caching**: `VideoCacheService` provides IndexedDB-based persistent blob caching with LRU eviction
- **Client**: selects the right format and aspect, respects reduced motion, and integrates with the timer
- **Native Apps**: Capacitor iOS/Android apps use absolute URLs to production CDN (`https://repcue.me/media/*`)

## Feature Flags & Settings
Feature flags are defined in `apps/frontend/src/config/features.ts`:

- `VIDEO_DEMOS_ENABLED`: master on/off for rendering videos (default: `true`)
- `VIDEO_R2_ENABLED`: toggles use of `variants` and `/media/*` proxy (default: `true`); when disabled, falls back to legacy `/videos/...` URLs
- `VIDEO_CACHING_ENABLED`: enables persistent IndexedDB caching for instant playback (default: `true`)
- User setting: "Show Exercise Demo Videos" toggle in Settings page (`appSettings.show_exercise_videos`)
- Reduced motion: if `prefers-reduced-motion: reduce` → video feature disabled automatically
- Test override: `window.__VIDEO_DEMOS_DISABLED__ = true` for E2E testing

## File Naming & Variants
Current naming convention (non-hashed):
- **Pattern**: `exerciseId_v1_WIDTHxHEIGHT.ext`
- **Example**: `burpees_v1_1920x1080.mp4`

Hash-based naming (optional, for immutable caching):
- **Pattern**: `exerciseId_v1_WIDTHxHEIGHT_hash8.ext`
- **Example**: `burpees_v1_1920x1080_95dc97e6.webm`

Notes:
- Version (`v1`) increments if content meaningfully changes.
- Hash-based names enable `Cache-Control: public, max-age=31536000, immutable`.
- Non-hashed names use `Cache-Control: public, max-age=3600, must-revalidate`.
- The Pages Function validates paths against both patterns.

## Manifest Format
The manifest is an **array** of `ExerciseMedia` objects stored in `apps/frontend/public/exercise_media.json`.

Current format:
```json
[
  {
    "id": "pushup",
    "repsPerLoop": 1,
    "fps": 30,
    "duration": 5.93,
    "video": {},
    "variants": {
      "landscape": {
        "1080": {
          "mp4": {
            "url": "/media/pushup_v1_1920x1080.mp4"
          }
        }
      }
    },
    "default": {
      "aspect": "landscape",
      "res": "1080"
    },
    "thumbnail": "/thumbnails/pushup.jpg"
  }
]
```

TypeScript types (from `src/types/media.ts`):
```typescript
export type ExerciseMedia = {
  id: string;                    // matches Exercise.id
  repsPerLoop: 1 | 2;           // reps per video loop
  fps: 24 | 30;                 // source framerate
  duration?: number;            // accurate duration in seconds
  thumbnail?: string;           // /thumbnails/<id>.jpg - poster frame
  video?: { ... };              // legacy paths (deprecated)
  variants?: AspectVariants;    // R2-based variants
  default?: DefaultVariant;     // recommended variant
};
```

Legacy format (still supported for backward compatibility):
```json
{
  "id": "pushup",
  "video": { "landscape": "/videos/pushup.mp4" }
}
```

## Client Selection Logic
Video selection is handled by `src/utils/selectVideoVariant.ts`:

- **Aspect ratio**: chosen by viewport dimensions:
  - Portrait: aspect ratio < 0.75 (tall screens)
  - Landscape: aspect ratio > 1.33 (wide screens)
  - Square: everything else
- **Resolution**: prefer native or next higher resolution, fallback to highest available
- **Format**: probe via `HTMLVideoElement.canPlayType` → prefer WebM (VP9); if unsupported, use MP4 (H.264)
- **Feature flag**: if `VIDEO_R2_ENABLED` is `true` and `variants` present, use R2 paths; otherwise fall back to legacy `video.*` paths
- **Reduced motion**: if `prefers-reduced-motion: reduce`, video feature is disabled entirely
- **Timer sync**: for rep-based loops with `repsPerLoop`, the client detects loop boundaries via `timeupdate` event to trigger a visual rep pulse; authoritative rep logic remains in timer state
- **Playback rate**: video playback rate is adjusted based on `repSpeedFactor` (inverse: 0.5 factor = 2x playback speed)
- **Native app URL normalization**: For Capacitor iOS/Android apps, relative `/media/*` URLs are automatically converted to absolute `https://repcue.me/media/*` URLs via `normalizeVideoUrl()` function

## Video Caching System
RepCue includes a multi-tier caching system via `VideoCacheService` (`src/services/videoCacheService.ts`):

### Cache Tiers
1. **Memory cache**: In-memory Map of URL → blob URL (instant access)
2. **IndexedDB**: Persistent blob storage with 90-day expiration
3. **Service Worker**: Runtime cache for `/media/*` paths

### Features
- **LRU eviction**: Automatically removes least-recently-used videos when storage is full
- **Storage quota monitoring**: Respects 80% max quota, keeps 10% free
- **De-duplication**: Concurrent fetches for same URL share a single network request
- **Blob URL lifecycle**: Automatic cleanup of blob URLs on component unmount
- **Consent-aware**: Respects user consent via ConsentService

### URL Resolution
The `resolveVideoUrl` utility (`src/utils/resolveVideoUrl.ts`) handles multiple URL schemes:
- Regular HTTP/HTTPS URLs: cached via VideoCacheService (web only)
- `blob:` URLs: returned directly
- `blob-pending-sync://` / `blob-video://`: custom exercises stored locally
- `shared-video://`: references another exercise's video file

**Important: Native App Caching Behavior**
On native iOS/Android apps, IndexedDB blob caching is **disabled**. This is because iOS WKWebView has compatibility issues with blob URLs created from IndexedDB stored video data, causing `MEDIA_ERR_SRC_NOT_SUPPORTED` errors. Native apps use direct CDN URLs instead and rely on iOS's built-in HTTP caching.

## Proxy & Headers (Cloudflare Pages Functions)
The media proxy is implemented in `functions/media/[[path]].ts`:

- **Path**: `/media/<key>` → fetches from R2 bucket `repcue-videos`
- **Range support**: responds with `206 Partial Content` when `Range: bytes=start-end` is provided
- **CORS support**: Allows cross-origin requests from native apps and web origins:
  - `https://repcue.me`, `https://www.repcue.me`, `https://dev.repcue.me`
  - `capacitor://localhost` (iOS Capacitor apps)
  - `http://localhost` (Android Capacitor apps)
  - `http://localhost:5173` (Vite dev server)
- **Headers**:
  - `Content-Type`: inferred from extension or R2 metadata (`video/webm`, `video/mp4`)
  - `Cache-Control`: 
    - Hashed names: `public, max-age=31536000, immutable`
    - Non-hashed names: `public, max-age=3600, must-revalidate`
  - `Accept-Ranges`: `bytes`
  - `X-Content-Type-Options`: `nosniff`
  - `Access-Control-Allow-Origin`: Set to requesting origin if in allowed list
  - `Access-Control-Allow-Methods`: `GET, HEAD, OPTIONS`
  - `Access-Control-Expose-Headers`: `Content-Length, Content-Range, Accept-Ranges`
- **Validation**: 
  - Rejects paths containing traversal patterns (`..`, `\\`, `//`)
  - Enforces filename regex: `^[a-z0-9_-]+_v1_\d{3,4}x\d{3,4}(_[a-f0-9]{8,})?\.(mp4|webm)$`
- **Fallback**: If hashed file not found, automatically tries non-hashed variant
- **Preflight**: Handles OPTIONS requests for CORS preflight with 204 response

## Encoding Guidelines (ffmpeg)
Current production workflow produces MP4 (H.264) with watermark:
- **Format**: MP4 with `-movflags +faststart` for progressive playback
- **CRF**: ~23–25 for quality/size balance
- **Watermark**: scaled proportionally, semi-transparent, positioned with padding
- **Loop duration**: keep short (≤8s), clean background, clear movement

WebM (VP9) encoding (optional, for future use):
- CRF ~32–36; 2-pass optional for tricky content
- Better compression but less universal browser support

## Caching & Prefetch
- **VideoCacheService**: IndexedDB-based persistent caching (90-day expiration, LRU eviction)
- **Service worker**: Runtime cache for `/media/*` (stale-while-revalidate), bounded entries
- **Prefetch**: During rest/countdown, next exercise video URL can be pre-resolved
- **Cache-Control headers**: Immutable keys enable long-lived CDN/browser caching; new content uses a new hash/path
- **Blob URL cleanup**: Automatic revocation when component unmounts or video URL changes

## Security & Privacy
- Same-origin proxy avoids third-party domains in CSP
- Strict path validation with regex enforcement; deny-by-default for unexpected keys
- Path traversal prevention (rejects `..`, `\\`, `//`)
- No tracking; videos are public instructional content
- Consent-aware caching: IndexedDB caching respects ConsentService
- Keys in CI are scoped to R2 only and rotated per policy
- CORS restricted to specific allowed origins for native app support

## Native App Support (Capacitor iOS/Android)

### URL Resolution
In Capacitor native apps, relative `/media/*` paths resolve to `capacitor://localhost/media/*` which doesn't exist locally. The video system handles this by:

1. **URL Normalization** (`selectVideoVariant.ts`): The `normalizeVideoUrl()` function detects native platforms via `isNativePlatform()` and converts relative URLs to absolute production CDN URLs:
   ```typescript
   // /media/burpees_v1_1920x1080.mp4 → https://repcue.me/media/burpees_v1_1920x1080.mp4
   ```

2. **CORS Headers**: The Cloudflare Pages Function includes `capacitor://localhost` in the allowed origins list, enabling cross-origin video loading.

3. **Video Element Configuration**: All `<video>` elements include:
   - `playsInline`: Required for inline playback on iOS (prevents fullscreen takeover)
   - `crossOrigin="anonymous"`: Enables CORS requests to external CDN

### iOS-Specific Configuration
- **Info.plist**: App Transport Security exceptions for `repcue.me` and `supabase.co` domains
- **Capacitor Config**: `allowNavigation` includes `https://repcue.me/*` and `https://*.repcue.me/*`
- **WKWebView**: Configured for inline media playback via Capacitor defaults

### iOS Blob URL Limitation
**Critical**: iOS WKWebView cannot reliably play blob URLs created from IndexedDB stored video data. This causes `MEDIA_ERR_SRC_NOT_SUPPORTED` (error code 4) even though the same blob URLs work correctly on web browsers.

**Workaround**: The `resolveVideoUrl` function detects native platforms and bypasses IndexedDB blob caching entirely, returning direct CDN URLs instead. iOS will use its native HTTP caching mechanism for video files.

```typescript
// In resolveVideoUrl.ts
if (isNativePlatform()) {
  // Skip blob cache, use direct URL
  return fetchUrl; // https://repcue.me/media/...
}
```

### Video Probe Behavior
The `VideoThumbnail` component normally probes video URLs with a Range request to verify they exist before displaying. For native apps, this probe is **skipped** because:
- WKWebView's `fetch()` with Range headers is unreliable for cross-origin requests
- The resolved URLs are trusted (we control the CDN)
- Skipping the probe improves load performance

### Debugging Native Video Issues
- Check Xcode console for `[Video] Native app: converting relative URL to absolute` logs
- Look for `Skipping probe for native app, trusting URL` to confirm probe skip is working
- Verify CORS headers in network requests (should see `Access-Control-Allow-Origin: capacitor://localhost`)
- Ensure production Cloudflare Pages deployment includes the CORS-enabled proxy function

## Developer Workflows

### Video Processing Pipeline
See `scripts/video/README.md` for detailed steps:

1. **Encode videos with watermark** (PowerShell):
   ```powershell
   .\scripts\video\Process-RepcueVideos.ps1 -InputDir "path/to/source" -WatermarkPath "path/to/logo.png" -WatermarkScale 0.3 -WatermarkOpacity 0.6
   ```

2. **Rename to convention** (PowerShell):
   ```powershell
   .\scripts\video\Rename_Video_Files.ps1 -InputDir "path/to/encoded" -MappingCsv .\scripts\video\exercise-video-id-mapping.csv
   ```

3. **Upload to R2** (Node.js, requires wrangler CLI):
   ```bash
   # Dry-run first
   node scripts/video/publish-to-r2-wrangler.mjs --dir="path/to/videos" --dry-run
   
   # Actual upload
   node scripts/video/publish-to-r2-wrangler.mjs --dir="path/to/videos"
   ```
   - Outputs `upload-mapping.json` with metadata (duration, dimensions, hashes)

4. **Generate manifest**:
   ```bash
   node scripts/video/manifest-build.mjs
   ```
   - Reads `upload-mapping.json`
   - Updates `apps/frontend/public/exercise_media.json`

5. **Verify and commit**:
   - Test locally with feature flags enabled
   - Test Chrome/Firefox/Safari + mobile
   - Check seeking (Range requests) in DevTools
   - Commit manifest changes

### Utility Scripts
| Script | Purpose |
|--------|---------|
| `publish-to-r2-wrangler.mjs` | Upload videos to R2 via wrangler CLI |
| `manifest-build.mjs` | Generate/update exercise_media.json |
| `verify-media-existence.mjs` | Check manifest entries exist in R2 |
| `validate-filenames.mjs` | Validate filename conventions |
| `purge-media-cache.mjs` | Purge Cloudflare cache for videos |

## Troubleshooting
- **Video not playing in Safari**: ensure MP4 fallback exists and `+faststart` is set; check blob URL validity
- **Choppy playback**: check CRF/bitrate; reduce resolution or simplify background
- **404 from `/media/...`**: confirm object key in R2; check manifest path and upload logs
- **Seeking broken**: verify Range header handling; test with DevTools network panel for 206 responses
- **IndexedDB cache issues**: check browser storage quota; clear via `VideoCacheService.clearAll()`
- **Blob URL "Load failed"**: Safari-specific issue; blob URLs may fail HEAD validation but work for playback
- **Native app video white screen**: Check that CORS headers are deployed to Cloudflare; verify `crossOrigin="anonymous"` on video elements
- **iOS video not loading**: Ensure Info.plist has ATS exceptions; check that URL normalization is working (look for absolute URLs in logs)
- **iOS MEDIA_ERR_SRC_NOT_SUPPORTED**: This error with blob URLs indicates the iOS blob caching workaround may not be active. Verify `isNativePlatform()` returns `true` and `resolveVideoUrl` is bypassing cache
- **iOS video plays then restarts**: May indicate blob URL issues; ensure native apps are using direct CDN URLs, not cached blob URLs
- **Android video issues**: Verify `http://localhost` is in CORS allowed origins; check for mixed content warnings

## Implementation Files

### Core Files
| File | Purpose |
|------|---------|
| `src/config/features.ts` | Feature flags (`VIDEO_DEMOS_ENABLED`, `VIDEO_R2_ENABLED`, `VIDEO_CACHING_ENABLED`) + native platform detection |
| `src/types/media.ts` | TypeScript types for media manifest |
| `src/utils/loadExerciseMedia.ts` | Loads and caches `exercise_media.json` |
| `src/utils/selectVideoVariant.ts` | Viewport-aware variant selection + native app URL normalization |
| `src/utils/resolveVideoUrl.ts` | URL resolution for various schemes (including native app handling) |
| `src/hooks/useExerciseVideo.ts` | React hook for video playback integration |
| `src/services/videoCacheService.ts` | IndexedDB-based persistent video caching |
| `src/pages/TimerPage.tsx` | Timer UI with video integration |
| `src/components/VideoThumbnail.tsx` | Video thumbnail with `crossOrigin` attribute |
| `public/exercise_media.json` | Video manifest (array format) |
| `functions/media/[[path]].ts` | Cloudflare Pages Function proxy (with CORS support) |

### iOS/Capacitor Configuration
| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor config with `allowNavigation` for CDN |
| `ios/App/App/Info.plist` | App Transport Security exceptions |
| `ios/App/App/AppDelegate.swift` | WKWebView configuration |

### Scripts
| File | Purpose |
|------|---------|
| `scripts/video/Process-RepcueVideos.ps1` | Encode and watermark videos |
| `scripts/video/Rename_Video_Files.ps1` | Rename to RepCue schema |
| `scripts/video/publish-to-r2-wrangler.mjs` | Upload to R2 via wrangler |
| `scripts/video/manifest-build.mjs` | Generate manifest from upload mapping |
| `scripts/video/exercise-video-id-mapping.csv` | Source filename to exercise ID mapping |

## References
- Implementation plan: `docs/implementation-plans/video-implementation-plan.md`
- Video hosting PRD: `docs/implementation-plans/video-hosting/video-hosting-prd.md`
- R2 migration tracking: `docs/migration-tracking/r2-video-migration_20251109.md`
- Exercise catalog: `docs/exercise-catalog.md`
- PWA & caching: `docs/pwa-system.md`
- Hosting guide: `docs/hosting-guide.md`
