# PRD: RepCue Exercise Video Hosting Migration (Cloudflare R2)

## 1. Overview
RepCue's exercise demo videos (short looping instructional clips) are growing beyond practical limits for inclusion in the Git monorepo and free static hosting tiers. This PRD proposes migrating storage of built‑in exercise videos to Cloudflare R2 with a same‑origin proxy via Cloudflare Pages Functions, delivering efficient, cached access while preserving UX, privacy, and performance goals.

## 2. Problem Statement
- Current approach stores or plans to store large binary video assets in the repository / build output.
- Scaling risk: >100 MB of media quickly consumes Git bandwidth and repository size; increases CI times and Cloudflare Pages build duration.
- Need multi-format (WebM VP9/AV1, MP4 H.264) fallback for cross‑browser compatibility, with future room for resolution adaptation.
- Must maintain "privacy-first" & "same-origin only" media policy.

## 3. Goals & Non-Goals
### Goals
1. Decouple large video binaries from repo & Pages builds.
2. Provide deterministic, cached, low‑latency delivery worldwide using immutable URLs.
3. Support format fallback (webm preferred, mp4 fallback) per variant.
4. Keep same-origin semantics (client sees `/media/...`).
5. Enable incremental publishing: only new or changed encodes uploaded.
6. Support manifest-driven metadata (`exercise_media.json`) without enumerating bucket at runtime.
7. Provide clear local tooling: encode → upload → manifest update.
8. Maintain accessibility (reduced motion respect) and not regress timer/video UX.

### Non-Goals
- User-uploaded exercise videos (remain in Supabase Storage initially).
- Adaptive bitrate streaming / HLS / DASH (not necessary for short loops).
- DRM or signed URLs (public built-in content only for now).

## 4. Users / Stakeholders
- Developer / Maintainer: needs fast builds, simple publishing workflow.
- End Users: must load videos quickly; fallback gracefully if browser lacks codec.
- Future Contributors: need a repeatable script/process without manual R2 console steps.

## 5. Functional Requirements
FR1. Store built-in exercise videos in an R2 bucket `repcue-videos`.
FR2. Access via Pages Function proxy path `/media/<key>` supporting byte range for seeking.
FR3. Each exercise may declare multiple variants (aspect + resolution + format) in manifest.
FR4. Client selects best playable format using `HTMLVideoElement.canPlayType`.
FR5. Manifest remains small; only textual metadata in repo.
FR6. Upload script computes content hash and appends short hash to filename to ensure immutability.
FR7. Upload script skips files already present (HEAD check).
FR8. Cache-Control headers: `public,max-age=31536000,immutable` for hashed objects.
FR9. Error handling: missing video falls back to no video (existing behavior) without crashing timer.
FR10. Provide dry-run mode for uploader.
FR11. Provide integrity verification (optional: SHA256 stored in manifest) to detect tampered files.

## 6. Non-Functional Requirements
NFR1. Performance: Video first byte < 300ms for cached regions; encode sizes minimized (<1–3 MB typical per loop).
NFR2. Reliability: Strong consistency of writes (R2); manifest updates atomic with app build.
NFR3. Security: Same origin or trusted proxy prevents mixed content; strict CSP maintained.
NFR4. Privacy: No external tracking/hotlink; only controlled bucket access.
NFR5. Maintainability: Simple scripts; no manual bucket listing required in runtime flow.
NFR6. Scalability: Handles hundreds of videos with negligible repo impact.

## 7. Proposed Architecture
1. **Encoding Pipeline (local)**: Source → ffmpeg → optimized `*.webm` & `*.mp4`.
2. **Uploader (Node)**: Reads local `dist/videos/` folder, hashes content, constructs immutable filename `exerciseId_v1_<res>_<hash>.webm` etc.
3. **R2 Bucket**: Objects stored with metadata (Content-Type, Cache-Control).
4. **Pages Function Proxy**: `GET /media/<key>` streams object from R2. Handles Range requests.
5. **Manifest (`exercise_media.json`)**: Extended schema referencing `/media/<key>` paths.
6. **Client Selection**: Capability & viewport-based choosing format & aspect.
7. **Fallback**: If webm unsupported, pick mp4; if both missing, no video.

## 8. Data Model Changes
Current:
```json
"pushup": { "id": "pushup", "video": { "landscape": "/videos/pushup.mp4" } }
```
New (proposed):
```json
"pushup": {
  "id": "pushup",
  "repsPerLoop": 1,
  "fps": 30,
  "variants": {
    "landscape": {
      "1080": { "webm": "/media/pushup_v1_1080_a1b2c3.webm", "mp4": "/media/pushup_v1_1080_a1b2c3.mp4" },
      "720":   { "webm": "/media/pushup_v1_720_d4e5f6.webm" }
    }
  },
  "default": { "aspect": "landscape", "res": "1080" }
}
```
Backward compatibility: if `variants` absent, existing `video.square|portrait|landscape` fields used.

## 9. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong cache headers → stale broken content | Users served invalid video | Use immutable hashed names + long max-age; re-upload new hash only |
| Large untrimmed videos inflate storage | Higher cost, slower load | Enforce loop length & size thresholds in uploader validation |
| Browser codec gaps (older Safari) | No playback | Provide mp4 fallback always for critical variants |
| Accidental overwrite of object | Serving unexpected content | Immutable names; disallow overwrite flag in script |
| Manifest drift vs bucket | Broken links | Uploader updates manifest only after successful PUT; CI verifies HEAD for each manifest URL |
| Range not supported | Seeking issues | Implement Range handling in Pages Function; test seeking in major browsers |
| Secrets leakage in CI | Compromise account | Use GitHub Actions encrypted secrets & least privileges (R2 only) |

## 10. Open Questions
1. Do we need integrity hash stored in manifest (SHA256)?
2. Will future user-uploaded public videos unify into same pipeline or remain in Supabase Storage?
3. Add AV1 format now or defer until encode cost justified?
4. Are subtitles / captions planned (affects storage & manifest)?

## 11. Success Metrics
- Repo size reduction: No binary exercise loops ≥1 MB in Git.
- Build time improvement: Pages build unaffected by video size growth (no large static copying).
- Cache efficiency: >95% GET requests result in cache hits after initial warm.
- Playback compatibility: ≥99% of video playback attempts succeed across target browsers.
- Uploader idempotency: Re-running yields 0 PUTs when no source changes.

## 12. Rollout Plan
1. Implement uploader & manifest schema (behind feature flag `VIDEO_R2` initially). 
2. Migrate a pilot set (5 exercises) to R2. 
3. Verify playback, seeking, reduced motion behavior. 
4. Migrate remainder; remove old local references. 
5. Remove legacy `/videos/` static assets from build. 
6. Enable feature flag globally.

## 13. Out of Scope (Future Work)
- Dynamic bandwidth/resolution selection.
- Automatic per-device encode ladder.
- Server-side analytics of video engagement.

---
End of PRD.
 
## 14. Gaps & Decisions (Proposed)

These are identified areas needing explicit decisions or additional work. Each item links to mitigations planned in the implementation plan.

- Security headers and CSP: Ensure `media-src`/`default-src` allow same-origin `/media/*`. Add `X-Content-Type-Options: nosniff`, set correct `Content-Type`, `Accept-Ranges`, and avoid long caching on 4xx/5xx (set `Cache-Control: no-store` for errors). Map to OWASP A05/A06.
- Path validation and traversal: Pages Function must sanitize requested keys (deny `..`, leading slashes, backslashes) and enforce a strict filename pattern `<id>_v1_<res>_<hash>.<ext>`. Deny by default for mismatches. OWASP A01.
- Range request correctness: Validate `bytes=start-end` ranges, handle out-of-bounds, and test 206 caching behavior on Cloudflare. Document fallback to full file when invalid.
- Integrity verification: Decide whether to store `sha256` in manifest in addition to filename-short-hash. If yes, define client/uploader verification points and CI checks.
- Observability & SLOs: Define SLOs (e.g., P50 TTFB ≤ 300ms cached, ≥95% cache hit). Add Pages Function logs, Cloudflare analytics dashboards, and alert thresholds (4xx/5xx spikes, cache miss rate > target).
- Cost guardrails: Establish monthly budgets for Class A/B ops and object count growth. Implement uploader HEAD result caching and dry-run safeguards to minimize calls. Add CI rule to prevent committing binaries > threshold.
- Retention & cleanup: Immutable filenames grow storage. Define retention policy and tooling to remove orphaned older hashes once manifest has moved on (e.g., keep last N versions per asset).
- Hotlinking stance: Same-origin proxy still yields publicly embeddable URLs. Decide whether to restrict by Referer or leave public. Out of scope for MVP but document policy.
- Local development parity: Specify local dev strategy for `/media/*` (wrangler dev binding to R2, or local file proxy) to avoid blocking contributors.
- Accessibility: Clarify plan for captions/subtitles or rationale for omission. Ensure `aria-label` text and reduced-motion gating are present. Add acceptance for keyboard-only and screen reader experience.
- Codec profile and fast start: For MP4, confirm H.264 Baseline/Main profile and `-movflags +faststart`. Document CRF ranges and compatibility matrix (iOS Safari).
- Disaster recovery & backups: Source and encoded assets should have a backup strategy (e.g., periodic archival to a separate bucket). Document RPO/RTO expectations.
- Secrets & least privilege: Keys must be scoped to the single bucket with rotation schedule. Keep secrets in CI with environment separation (staging vs production).
- Error handling UX: Define client behavior when `/media/...` fails mid-session (silent fallback already) and whether to surface a subtle indicator in DEBUG builds.

