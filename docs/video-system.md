# RepCue Video System

This document explains how the exercise video feature works end-to-end, including encoding, hosting on Cloudflare R2 behind a same-origin proxy, the manifest format, client selection, caching, accessibility, and developer workflows.

## Goals
- Keep videos optional: if unavailable or disabled, UI falls back gracefully with no UX regression.
- Same-origin delivery: client requests `/media/...` paths; no third-party domains.
- Cross-browser playback: prefer WebM, fall back to MP4 when needed.
- Deterministic, cacheable delivery using immutable filenames (content hash) where enabled.

## Architecture Overview
- Encoding (local): source clips → ffmpeg → WebM (VP9) + MP4 (H.264), short seamless loops
- Storage: Cloudflare R2 bucket (public objects)
- Delivery: Cloudflare Pages Function proxy at `/media/*` (supports Range requests and sets cache headers)
- Manifest: `apps/frontend/public/exercise_media.json` (references `/media/...` keys and describes variants)
- Client: selects the right format and aspect, respects reduced motion, and integrates with the timer

## Feature Flags & Settings
- `FEATURES.VIDEO_DEMOS`: master on/off for rendering videos
- `FEATURES.VIDEO_R2`: toggles use of `variants` and `/media/*` proxy (legacy path uses direct `/videos/...` URLs)
- User setting: "Show demo videos when available" (UI toggle)
- Reduced motion: if `prefers-reduced-motion: reduce` → video feature disabled automatically

## File Naming & Variants
- Pre-upload (encoded locally):
  - `exerciseId_v1_1920x1080.mp4`
  - `exerciseId_v1_1080x1920.webm`
  - `exerciseId_v1_1080x1080.webm`
- Immutable (R2): uploader may append a short hash to create immutable keys, e.g.
  - `exerciseId_v1_1920x1080_ab12cd34.mp4`

Notes:
- Version (`v1`) increments if content meaningfully changes.
- Hash-based names enable `Cache-Control: public, max-age=31536000, immutable`.

## Manifest Format
Legacy (supported):
```json
{
  "pushup": {
    "id": "pushup",
    "video": { "landscape": "/videos/pushup.mp4" }
  }
}
```

R2 variants (preferred):
```json
{
  "pushup": {
    "id": "pushup",
    "repsPerLoop": 1,
    "fps": 30,
    "variants": {
      "landscape": {
        "1080": { "webm": "/media/pushup_v1_1080_ab12cd34.webm", "mp4": "/media/pushup_v1_1080_ab12cd34.mp4" },
        "720":   { "webm": "/media/pushup_v1_720_de34fa56.webm" }
      },
      "portrait": {
        "1080": { "webm": "/media/pushup_v1_1080x1920_9a8b7c6d.webm" }
      },
      "square": {
        "1080": { "webm": "/media/pushup_v1_1080x1080_11223344.webm" }
      }
    },
    "default": { "aspect": "landscape", "res": "1080" }
  }
}
```

Backward compatibility: if `variants` is absent, the client uses legacy `video.square|portrait|landscape`.

## Client Selection Logic
- Aspect: choose by viewport (portrait for tall screens, landscape for wide, else square)
- Resolution: prefer default (e.g., 1080) then descend (720, etc.)
- Format: probe via `HTMLVideoElement.canPlayType` → prefer WebM; if unsupported, use MP4
- Reduced motion: video disabled and UI falls back to ring-only
- Timer sync: for rep-based loops with `repsPerLoop: 1`, the client listens for loop boundaries (time wrap) to trigger a visual rep pulse; authoritative rep logic remains in timer state

## Proxy & Headers (Cloudflare Pages Functions)
- Path: `/media/<key>` → fetches from R2 bucket
- Range support: responds with `206 Partial Content` when `Range: bytes=start-end` is provided
- Headers:
  - `Content-Type`: set from object metadata (e.g., `video/webm`, `video/mp4`)
  - `Cache-Control`: `public, max-age=31536000, immutable` for hashed names
  - `Accept-Ranges`: `bytes`
  - `X-Content-Type-Options`: `nosniff`
- Validation: reject keys containing traversal patterns; enforce expected filename regex

## Encoding Guidelines (ffmpeg)
- MP4 (H.264): use `-movflags +faststart`, target CRF ~23–25
- WebM (VP9): CRF ~32–36; 2-pass optional for tricky content
- Loop duration: keep short (≤4s), clean background, clear movement
- Watermark: scaled proportionally to width; applied after chroma key compositing (if used)

## Caching & Prefetch
- Service worker: runtime cache for `/media/*` (stale-while-revalidate), bounded entries
- Prefetch: add `<link rel="prefetch" as="video">` for “up next” exercise during rest/countdown
- Immutable keys enable long-lived CDN/browser caching; new content uses a new hash/path

## Security & Privacy
- Same-origin proxy avoids third-party domains in CSP
- Enforce strict path validation and headers; deny-by-default for unexpected keys
- No tracking; videos are public instructional content
- Keys in CI are scoped to R2 only and rotated per policy

## Developer Workflows
1) Encode videos (local): use the provided PowerShell/ffmpeg scripts; export WebM + MP4 variants at target resolutions
2) Rename to convention (if needed): `exerciseId_v1_<WxH>.<ext>`
3) Upload to R2: `scripts/video/publish-to-r2.mjs --dir=encoded --dry-run` (remove `--dry-run` to upload)
   - Required env vars: `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
4) Update manifest: run the manifest builder or enable `--manifest-update` during upload
5) Verify locally: feature flags on; test Chrome/Firefox/Safari + mobile; check seeking (Range)
6) Commit manifest changes; CI validates schema and asset patterns

## Troubleshooting
- Video not playing in Safari: ensure MP4 fallback exists and `+faststart` is set
- Choppy playback: check CRF/bitrate; reduce resolution or simplify background
- 404 from `/media/...`: confirm object key; check manifest path and R2 upload logs
- Seeking broken: verify Range header handling; test with DevTools network panel for 206 responses

## References
- Implementation plan: `docs/implementation-plans/video-hosting/video-hosting-implementation-plan.md`
- PRD: `docs/implementation-plans/video-hosting/video-hosting-prd.md`
- Catalogs & badges: `docs/exercise-catalog.md`
- PWA & caching: `docs/pwa-system.md`
- Hosting: `docs/hosting-guide.md`
