# RepCue Admin Module – Design & Implementation Plan

Version: 0.9 (Draft)
Maps to: docs/implementation-plans/admin-module/admin-module-prd.md

## Phase 0 – Discovery & Stabilization (1–2 days)
- T0.1 Audit current schemas and flows; decide publication-of-record for videos (R12, R3). [R1, R3]
- T0.2 Wire up local feature flag to show Admin entry for admins only (guarded by `admin_users`). [R1]

## Phase 1 – Foundations (Auth, Roles, Shell) (2–3 days)
- T1.1 Admin role guard: client `useAuth` + server RLS checks against `admin_users` (permissions JSON). [R1, R10–R12]
- T1.2 Admin shell app route (`/admin`) with nav to: Members, Content, Releases, Observability, Audit. [R1]
- T1.3 Audit logging helper (Edge Function) to append `audit_logs` with `{actor_id, action, resource_type, resource_id, details}`. [R7]

## Phase 2 – Catalog Access (2 days)
- T2.1 Admin UI: search by email; grant/revoke catalog access; set expiration/notes. [R2.1–R2.3]
- T2.2 Export CSV for active entitlements; server-side filtering for `expires_at`. [R2.4]
- T2.3 Write actions audited via helper. [R7]

## Phase 3 – Content Moderation (Video) (1–1.5 weeks)
- T3.1 Define pipeline contract:
  - Upload (client) → `video_files` (storage handled by `sync_v2`) → create `content_moderation` row (content_type='video', content_id=video_files.id). [R12.1, R3]
- T3.2 Schema upgrades: add `exercise_videos.published_at`, `reviewer_id`, `moderation_id`, `catalog_id?`; add `content_moderation.labels JSONB`. [R12.2, R9]
- T3.3 Edge Function `moderate_video`:
  - approve: create/ upsert `exercise_videos` row referencing `storage_path`, set `is_approved=true`, link `moderation_id`, set `published_at`, audit. [R3.2, R4, R7]
  - reject: mark `content_moderation` rejected with reason; optional delete/quarantine storage; audit. [R3.3, R7]
  - bulk endpoint for batch approve/reject. [R3.4]
- T3.4 Admin UI: Review queue grid (pending), preview player via signed URL edge function, Approve/Reject with reason; bulk actions; filters. [R3.1–R3.6]
- T3.5 Client consumption: confirm app reads published videos from `exercise_videos` (publication-of-record) or ensure mapping to current player source resolution. [R4]

### Phase 3a – Public Frontend changes (approved visibility) (2–3 days)
- T3a.1 Update `useExerciseVideo` and `VideoThumbnail` resolution logic:
  - if viewer is owner: allow preview using `video_files` (pending or confirmed) with a "Pending approval" badge. [R4.1–R4.4]
  - if viewer is not owner: use only approved `exercise_videos` (is_approved=true); otherwise fall back to description/placeholder. [R4.1, R4.4]
- T3a.2 Add a light data accessor in `StorageService` (or a small client fetch) to read approved `exercise_videos` mapped by exercise_id; cache locally for offline. [R4.1]
- T3a.3 UI badges & i18n: add strings for pending approval labels/tooltips; show subtle state in Exercise cards and Timer when owner previews. [R4.5]
- T3a.4 Tests: owner vs non-owner visibility, pending vs approved, fallback behavior in ExercisePage and TimerPage. [R4]

## Phase 4 – Releases & Feature Flags (2–3 days)
- T4.1 Admin UI for releases: list/create/edit in `app_versions` with policy and notes. [R5.1–R5.2]
- T4.2 Optional feature flags table UI (if enabled); toggle values; audit. [R5.3, R7]

## Phase 5 – Observability (4–5 days)
- T5.1 Create `metrics_http_requests` table and views `v_http_success_rate`, `v_http_tps`, `v_http_latency` (time buckets). [R6]
- T5.2 Frontend fetch wrapper with ~10% sampling; payload: route pattern, method, status, latency_ms, env, client_version, session_hash. Consent-aware. [R6, R8]
- T5.3 Edge Function `ingest_metrics` to insert; rate-limiting per IP if necessary. [R6, R8]
- T5.4 Admin charts: success%, TPS, latency p50/p95/p99; filters by env/method/status/route/time range. [R6]

## Phase 6 – Audit & Permissions Polish (1–2 days)
- T6.1 Admin users management page (optional; or CLI only) – list admins, toggle active, edit permissions. [R10–R12]
- T6.2 Audit log viewer with filters (actor, action, resource, date), export CSV. [R7]

## Design Notes
- Video publication-of-record: prefer `exercise_videos` for public assets; keep `video_files` for raw uploads and ownership. Avoid duplicating binaries—store a single storage_path, reference it from `exercise_videos`.
- RLS: privileged writes only through Edge Functions; clients read approved `exercise_videos` via RLS policies (approved=true).
- AI moderation: `content_moderation` stores AI hints (confidence, reasoning, labels). Human reviewers see AI hints but can override; store final `human_decision` and `reviewed_at`.
- Observability: no third-party beacons; first-party metrics with sampling and anonymous session hash.

## Deliverables & Mapping to PRD
- D1 Admin shell & role guard (R1, R10–R12) — Phase 1
- D2 Catalog access UI & audit (R2, R7) — Phase 2
- D3 Moderation pipeline, schema, endpoints, UI (R3, R4, R9, R12, R7) — Phase 3
- D4 Releases & flags (R5, R7) — Phase 4
- D5 Observability data+UI (R6) — Phase 5
- D6 Audit views & admin management (R7, R10–R12) — Phase 6

## Testing & Validation
- Unit tests: Edge Functions (moderate_video, ingest_metrics), permission guards.
- Integration: Approve flow results in playable video under app RLS; catalog access changes reflect in AI workout function.
- E2E: Admin flows via Playwright; verify dashboards and moderation actions.

## Risks & Mitigations
- Schema drift across dev/prod → follow migration tracking and advisors; keep tracker in `docs/migration-tracking/`.
- Video storage costs → keep single copy; consider lifecycle policies later.
- Metrics volume → sampling + retention window.
