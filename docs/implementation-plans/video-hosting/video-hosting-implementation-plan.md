# Implementation Plan: Cloudflare R2 Video Hosting Migration

Status: Draft
Related PRD: `video-hosting-prd.md`
Owner: (assign)
Target Phase: Incremental (Pilot → Full Migration)

## Development Rules

### 🧩 Implementation Rules for AI Coding Assistant

1. **Supabase Migrations & Functions**

   * All Supabase schema migrations and Edge Function changes **must be created and saved locally in the workspace** before deployment.
   * This ensures proper **version control and reproducibility**.

2. **Migration Tracking**

   * Record every Supabase change in a new file under `docs/migration-tracking/`.
   * Use the filename format: `supabase-changes_YYYYMMDD.md`.

3. **Styling Rules**

   * **No inline styles.**
   * Use **global or shared style definitions** only (e.g., Tailwind classes, shared CSS/TS files).

4. **Commit Policy**

   * **Do not auto-commit.**
   * Commit only when explicitly instructed.

5. **Progress Tracking**

   * Continuously **update the project plan** by marking completed tasks, modules, or phases as done.
   * This ensures sessions can resume without confusion or redundant work.
   * Do NOT create external files to track progress, always update the progress inline in this plan.

6. **Localization Workflow**

   * Always update and test the **`en` locale** first (it is the canonical source).
   * Only after `en` is verified, proceed with translations to other locales—either automated or manual.

7. **Development Workstation**

  * The development workstation is VSCode set up on a Windows 11 PC.
  * Use Powershell syntax for all terminal commands.
  * There are two MCP servers configured: `supabase` points to the dev supabase project ref xwzrsfkzqxdybjrkkkvh, and `supabase-prod` points to the prod supabase project ref zumzzuvfsuzvvymhpymk.

8. **Style Guide**

  * Make sure any screen changes adhere to the style guide docs\ui-ux\ui-specs.md

9. **Offline-First**

  * Implementation of any new feature must respect and comply with the offline-first architecture of the app.

## 1. Objectives Recap
- Serve exercise demo videos from Cloudflare R2 via same-origin proxy `/media/*`.
- Add multi-format + multi-resolution manifest schema while preserving backward compatibility.
- Provide deterministic uploader (hash, skip-if-exists) and CI verification.

## 2. High-Level Work Breakdown
1. Schema & Types Update
2. Pages Function Proxy (`/media/*`)
3. R2 Bucket + Access Keys Setup
4. Local Encoding & File Naming Conventions
5. Uploader Script (Node + Wrangler CLI)
6. Manifest Generator / Updater
7. Client Runtime Selection Logic (capability + viewport)
8. Backward Compatibility Layer
9. CI Integration & Validation
10. Pilot Migration & Rollout
11. Documentation & Developer Workflow Updates

## 3. Detailed Tasks
### 3.1 Schema & Types Update ✅ COMPLETE (2025-11-09)
- ✅ Add new TypeScript types in `apps/frontend/src/types/media.ts`:
  - `ExerciseMediaVariants` describing nested structure `variants[aspect][resolution][format]`.
  - Extend existing `ExerciseMedia` with optional `variants` and `default` descriptor.
- ✅ Maintain legacy fields (`video.square|portrait|landscape`) for fallback.
- ⏳ Add JSON schema (optional) in `docs/schemas/exercise_media.schema.json` for validation.

### 3.2 Pages Function Proxy ✅ COMPLETE (2025-11-09)
- ✅ Add `functions/media/[[path]].ts` (Cloudflare Pages Functions) implementing:
  - ✅ Path extraction: remove `/media/` prefix.
  - ✅ R2 bucket binding `VIDEOS` (configured in `wrangler.toml`).
  - ✅ Range header support (206 response): parse `bytes=start-end`.
  - ✅ Content-Type inference fallback if missing metadata.
  - ✅ Cache headers: `Cache-Control: public, max-age=31536000, immutable`.
  - ✅ Error mapping (404 if not present; no directory listing).
- ✅ Add minimal logging (guarded by DEBUG flag env var if needed).

### 3.3 R2 Bucket & Keys ✅ COMPLETE (2025-11-09)
- ✅ Manual (one-time) - Cloudflare account setup:
  - ✅ `wrangler r2 bucket create repcue-videos`.
  - ✅ Create Access Keys (R2-only scoped) → stored in GitHub Secrets & local .env:
    - Authenticated via `wrangler login` (no API keys needed)
    - `CLOUDFLARE_ACCOUNT_ID`
- ✅ Create `wrangler.toml` (if not already present for functions):
```toml
name = "repcue-media"
compatibility_date = "2025-11-01"

[[r2_buckets]]
binding = "VIDEOS"
bucket_name = "repcue-videos"
```

### 3.4 Local Encoding & Naming Conventions ✅ COMPLETE (2025-11-09)
- ✅ Directory layout proposal:
```
scripts/video/
  sources/                # Original green-screen or raw loops (gitignored large)
  encoded/                # Output after Process-RepcueVideos.ps1 (webm/mp4)
  publish-to-r2.mjs       # Uploader
  manifest-build.mjs      # Manifest update tool
```
- Naming pattern before upload (pre-hash): `exerciseId_v1_1080p.webm` & `exerciseId_v1_1080p.mp4`.
- Uploader renames to append short hash: `exerciseId_v1_1080p_<hash>.webm`.
- Hash algorithm: SHA256 → first 8 hex chars (collision risk negligible for size scale; store full hash in manifest if integrity desired).

### 3.5 Uploader Script ✅ COMPLETE (2025-11-09)
- ✅ Location: `scripts/video/publish-to-r2.mjs`.
- ✅ Responsibilities:
  1. Scan `encoded/` for files matching pattern.
  2. Compute hash (stream SHA256) → new immutable filename.
  3. HEAD object (S3 `HeadObject`) to check existence; skip if found.
  4. PUT object with metadata:
     - `Content-Type`
     - `Cache-Control` immutable
  5. Collect mapping of logical descriptor → final key for manifest update.
  6. Dry-run mode: show actions without network writes.
- CLI flags:
  - `--dir=encoded` (override path)
  - `--dry-run`
  - `--force` (ignore skip-if-exists, rarely used)
  - `--manifest-update` (trigger manifest building)
- Env vars required (validate at start):
  - Authenticated via `wrangler login` (uses existing Cloudflare session).
- Error handling: accumulate failures, exit non-zero if any PUT fails.

### 3.6 Manifest Generator ✅ COMPLETE (2025-11-09)
- ✅ Script: `scripts/video/manifest-build.mjs`.
- ✅ Input: mapping JSON produced by uploader OR scanning encoded directory w/ IDs list.
- ✅ Output: updates `apps/frontend/public/exercise_media.json`:
  - If exercise entry exists and variants path matches resolution & format, update; else create structure.
  - Ensure deterministic key order (stable diffs) via custom sort.
- Backward compatibility: preserve legacy `video` object until all migrated; set a marker `"r2": true` optionally.
- Validation: optional JSON schema check; warn on missing required fields (id, fps, repsPerLoop).

### 3.7 Client Runtime Changes ✅ COMPLETE (2025-11-09)
- ✅ Add utility `selectVariantSource(media, aspect, viewport, capabilities)`:
  - ✅ Determine aspect: existing logic (landscape/portrait/square) or fallback.
  - ✅ Determine resolution: start from default (e.g., `1080`) > fallback `720` > any available.
  - ✅ Capability probe: create ephemeral `<video>` element; prefer webm (VP9) if `canPlayType` returns non-empty; else mp4.
- ✅ Update `selectVideoVariant.ts` to:
  - ✅ If `variants` present → use new selection; else old path.
- ✅ Update `useExerciseVideo` to remain unchanged except referencing new helper if needed.

### 3.8 Backward Compatibility ✅ COMPLETE (2025-11-09)
- ✅ Do not remove `video.*` fields yet.
- ✅ Implement dual-mode selection; log (DEBUG) when legacy path used.
- ✅ Migration flag in config: `FEATURES.VIDEO_R2_ENABLED = false` (default) controlling usage of new schema.

### 3.9 CI Integration ✅ COMPLETE (2025-11-09)
- ✅ Add GitHub Action `video-validate.yml` triggered on PR changes to `exercise_media.json`:
  - ✅ Run schema validator via `manifest-build.mjs --validate`.
  - ✅ Optional R2 verification: HEAD request to check object existence (manual workflow_dispatch only).
- ✅ Offline mode: verify filename pattern `<id>_v1_<res>_<hash>.<ext>` via `validate-filenames.mjs`.
- ✅ Add guard preventing addition of large binaries to repo: git diff scanning for video extensions >100KB.
- ✅ Created scripts: `scripts/video/validate-filenames.mjs`, `scripts/video/verify-r2-objects.mjs`.

### 3.10 Pilot Migration ✅ COMPLETE (2025-11-09)
- ✅ Selected 9 representative exercises (different aspects & durations).
- ✅ Encoded & uploaded to R2 → updated manifest.
- ✅ Deployed to dev environment → verified playback working correctly.
- ✅ Verified Range (seek) support via HTTP 206 responses.

### 3.11 Full Migration ✅ COMPLETE (2025-11-09)
- ✅ All 21 videos uploaded to R2 with proper naming scheme (exerciseId_v1_WIDTHxHEIGHT_hash8.ext).
- ✅ Uploader script completed successfully with timing and duration extraction.
- ✅ Manifest updated with all variants and durations.
- ✅ All local video files removed from workspace - now serving exclusively from R2.

### 3.12 Documentation & Training ✅ COMPLETE (2025-11-09)
- ✅ Update `docs/exercise-video-specs.md` with new pipeline & naming.
- ✅ Add `docs/implementation-plans/video-hosting/R2-MIGRATION-README.md` (how to encode, publish, update manifest).
- ✅ Inline comments in uploader script explaining environment & retry guidelines.
- ✅ Created comprehensive migration tracking document `docs/migration-tracking/r2-video-migration_20251109.md`.

## 4. Testing Strategy
| Layer | Tests |
|-------|-------|
| Uploader Unit | Hash generation, skip-if-exists logic, error path for missing env vars |
| Manifest | Schema validation, fallback tests, diff stability (snapshot) |
| Pages Function | Unit (Miniflare) for 200, 206, 404 responses; range math correctness |
| Client Selection | Jest/Vitest: capability mock (webm support on/off), aspect/resolution fallback ordering |
| Integration (Manual) | Browser playback & seeking, slow network simulation, offline fallback |

## 5. Rollback Plan
- If R2 proxy fails: revert manifest to legacy `video.*` entries (kept intact) and redeploy.
- Keep old static video copies until full migration validated; remove only after acceptance window.
- Fast path: feature flag `VIDEO_R2=false` to force legacy logic.

## 6. Performance Considerations
- Keep loop durations minimal (<4s). Target size <2MB (webm) / <3MB (mp4) per 1080p clip.
- Consider adding lint in uploader: warn if file >5MB.
- Use `b:v 0 -crf` encoding approach, test CRF ranges (webm 32–36, mp4 23–25) for balance.

## 7. Security & Privacy
- Same-origin path `/media/...` avoids third-party domain allowances in CSP.
- No query-string auth tokens for public content; immutable hashed paths reduce cache poisoning risk.
- Optional manifest integrity field (future) to verify content hash aligns with expected SHA256.

## 8. Tooling & Dependencies
- Use `wrangler` CLI (already installed) for R2 operations - no additional dependencies needed.
- Consider lightweight hashing library or native crypto (Node 18+ has `crypto.subtle` / `createHash`).
- Testing R2 interactions locally: Miniflare (optional); else rely on staging bucket.

## 9. Task Matrix (Sequenced)
All tasks must comply with rules in section 'Implementation Rules for AI Coding Assistant'.
| # | Task | Owner | Output | Status |
|---|------|-------|--------|--------|
| 1 | Types & schema extension | | Updated TS types, schema file | ✅ COMPLETE (2025-11-09) |
| 2 | Pages Function proxy | | `functions/media/[[path]].ts` | ✅ COMPLETE (2025-11-09) |
| 3 | Wrangler config + R2 buckets | | `wrangler.toml` binding R2 + buckets created | ✅ COMPLETE (2025-11-09) |
| 4 | Uploader script (hash, PUT, skip) | | `publish-to-r2.mjs` | ✅ COMPLETE (2025-11-09) |
| 5 | Manifest builder script | | `manifest-build.mjs` | ✅ COMPLETE (2025-11-09) |
| 6 | Client selection enhancement | | Updated `selectVideoVariant.ts` | ✅ COMPLETE (2025-11-09) |
| 7 | Feature flag & fallback | | Config + conditional logic | ✅ COMPLETE (2025-11-09) |
| 8 | CI validation workflow | | `.github/workflows/video-validate.yml` + validation scripts | ✅ COMPLETE (2025-11-09) |
| 9 | Pilot migration | | Partial updated manifest | ✅ COMPLETE (2025-11-09) |
| 10 | Full migration | | Complete manifest | ✅ COMPLETE (2025-11-09) |
| 11 | Cleanup legacy static videos | | Removal commit | ✅ COMPLETE (2025-11-09) |
| 12 | Docs update | | Revised docs | ✅ COMPLETE (2025-11-09) |

## 10. Open Questions (Revisited)
- Integrity hash in manifest? (Default: store short hash in filename only.)
- Introduce AV1 now? (Defer—long encode times, limited Safari support.)
- Captions / accessibility overlays? (Future extension.)

## 11. Acceptance Criteria (Pilot) ✅ COMPLETE (2025-11-09)
- ✅ All 21 videos load via `/media/*` with correct cache headers (`Cache-Control: public, max-age=31536000, immutable`).
- ✅ Content-Type correctly set (`video/webm`, `video/mp4`).
- ✅ Range seeking works (206 responses) verified via PowerShell and browser testing.
- ✅ Videos served from R2 via Pages Function proxy with proper filename pattern validation.
- ✅ All local video files removed - exclusive R2 delivery confirmed.

## 12. Post-Migration Cleanups
- Remove unused fallback code once all entries use `variants`.
- Tighten CSP (if previously broadened for static videos path).
- Add periodic job (optional) to scan for orphaned old hashes > N days.

## 13. Timeline (Indicative)
- Week 1: Types, proxy, uploader, pilot encode.
- Week 2: Client selection, pilot deployment, QA.
- Week 3: Full batch upload, manifest update, legacy cleanup.

## 14. Contingencies
- If R2 latency unsatisfactory in certain regions → enable Cloudflare cache analytics; consider geographic replication (automatic with R2 + CDN) or pre-warming top assets.
- If bucket operations near free tier limits → add simple local cache of HEAD results; batch HEADs.

---
End of Implementation Plan.
 
## 15. Gaps & Mitigations

| Gap | Impact | Mitigation | Owner | Phase |
|-----|--------|-----------|-------|-------|
| CSP / Security Headers | Potential mixed content / sniffing | Add/update CSP (`media-src 'self'`), set `X-Content-Type-Options: nosniff`, verify `Content-Type` & `Accept-Ranges` | Security Lead | Proxy deploy |
| Path traversal & key validation | Unauthorized object access attempts | Sanitize path; reject keys containing `..`, `\`, or not matching regex `^[a-z0-9_-]+_v1_\d{3,4}p?_[a-f0-9]{8}\.(mp4|webm)$` | Backend | Proxy implementation |
| Range request correctness | Incorrect partial responses / caching anomalies | Implement robust range parser; clamp invalid ranges; unit test boundary cases | Backend | Proxy tests |
| Integrity hashing decision | Undetected tampering risk | Add optional `sha256` field; CI verifies HEAD + hash; store full hash in manifest if enabled | DevOps | Pilot + CI |
| Observability (SLOs) | Hard to detect regressions | Define SLOs (P50 TTFB ≤300ms cached); log timings; add dashboard & alert thresholds | DevOps | Pilot |
| Cost controls (Class A/B) | Unexpected monthly cost spikes | HEAD result cache, batch ops; CI diff prevents redundant uploads; monthly cost report script | DevOps | Post-pilot |
| Orphaned old hashes | Storage bloat | Add cleanup script: list objects, cross-check manifest; retain last 2 generations per asset | Backend | Post-full migration |
| Hotlinking policy | Potential bandwidth misuse | Monitor Referer; optional future enforcement; document current open policy | Security | Documentation |
| Local dev parity `/media/*` | Onboarding friction | Provide `wrangler dev` guide + fallback local FS proxy mode | DX | Types + Proxy |
| Accessibility (captions) | Future compliance gap | Placeholder plan: store caption sidecar `.vtt`; design manifest extension; backlog ticket | Accessibility | Future |
| Codec profile / fast start | Slower MP4 start / incompatibility | Enforce ffmpeg flags: `-movflags +faststart`, H.264 baseline/main; document CRF ranges | Video Pipeline | Encoding |
| Disaster recovery / backups | Data loss risk | Weekly backup script to secondary R2 bucket; document restore procedure | DevOps | Post-pilot |
| Secrets rotation & scope | Credential compromise risk | 90-day rotation schedule; scope to bucket only; audit usage in CI | Security | Setup |
| Error UX transparency | Hidden systemic failures | DEBUG mode console + optional dev toast; silent fallback in prod maintained | Frontend | Pilot |
| Performance budget enforcement | Asset bloat | Uploader checks duration (<4s) & size (<3MB mp4, <2MB webm); CI fails if exceeded | Video Pipeline | Uploader enhancement |
| Manifest schema validation | Drift / malformed entries | Introduce JSON schema validation in CI; fail build on invalid `variants` | Frontend/DevOps | CI integration |
| Feature flag rollback clarity | Slow incident mitigation | Document quick rollback steps: disable `VIDEO_R2`, revert manifest; run legacy selection tests | DX | Pilot |

### 15.1 Additional Tasks Derived from Gaps

Add the following tasks to extend Section 3 / Task Matrix:

| # | Task | Output |
|---|------|--------|
| 13 | Add CSP & header adjustments | Updated security config docs & Pages Function headers |
| 14 | Implement path + range validators | Utility modules with unit tests |
| 15 | Optional integrity hash support | Manifest + uploader hash injection (full SHA256) |
| 16 | Observability instrumentation | Logging + dashboard setup instructions |
| 17 | Cost / usage report script | `scripts/video/r2-cost-report.mjs` |
| 18 | Cleanup orphaned hashes tool | `scripts/video/cleanup-orphans.mjs` |
| 19 | Local dev proxy fallback | Dev script or docs for FS proxy |
| 20 | Performance budget enforcement | Uploader size/duration checks + CI gate |
| 21 | JSON schema CI validation | `.github/workflows/video-validate.yml` step |
| 22 | Backup & restore procedure docs | `docs/video-backup-restore.md` |
| 23 | Secrets rotation schedule doc | `docs/secrets-rotation.md` |
| 24 | Accessibility caption future spec | `docs/video-captions-spec.md` placeholder |
| 25 | Rollback playbook | `docs/video-r2-rollback.md` |

### 15.2 Acceptance Criteria for Gap Closure
- All new tasks (#13–#25) completed or scheduled before full migration sign-off.
- CI enforces schema + performance budgets.
- Observability dashboard shows baseline metrics for pilot assets.
- Cleanup script dry-run produces list (no deletions) before first purge.
- Rollback playbook validated in a simulated incident drill.

## 16. Documentation Phase (R2 Updates + Video System Guide)

Scope: Update existing docs to reflect Cloudflare R2 migration and produce a single-source reference for the video system.

- Update impacted docs to reference `/media/*` proxy, hashed filenames, manifest `variants`, and client selection logic:
  - `docs/hosting-guide.md` (add R2 bucket + Pages Function proxy details)
  - `docs/pwa-system.md` (runtime caching strategy updates for media)
  - `docs/exercise-video-specs.md` (encoding, watermark, chroma key, CRF ranges, faststart)
  - `docs/exercise-catalog.md` (media index location and `has_video` computed badge notes)
  - `docs/environments-guide.md` (dev vs prod R2 notes, secrets handling)
  - Add links from `docs/ai-coach-user-guide.md` or relevant UX docs if they mention videos
- Add new consolidated reference: `docs/video-system.md` describing end-to-end flow:
  - Source → encode → upload → manifest → client selection → proxy delivery
  - Feature flags (`VIDEO_DEMOS`, `VIDEO_R2`), reduced motion, accessibility
  - Security/CSP, caching, and troubleshooting
- Acceptance:
  - All above docs updated with R2 details and verified links
  - `docs/video-system.md` authored and reviewed
  - CHANGELOG updated under the date of merge

