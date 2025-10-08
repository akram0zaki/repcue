# RepCue Admin Module – Product Requirements Document (PRD)

Version: 0.9 (Draft)
Owner: Admin/Backoffice Initiative
Last updated: 2025-10-08

## 1. Problem Statement
RepCue needs an internal backoffice to safely manage premium catalog access, review and approve user-generated content (especially videos), manage app releases/feature flags, and monitor the health of the system. The solution must fit our privacy-first, offline-first, and no third-party tracking principles, while leaving room to adopt AI-assisted moderation.

## 2. Goals & Non-Goals

### 2.1 Goals
- R1. Role-gated admin UI accessible only to authorized admins.
- R2. Catalog access control: grant/revoke user access to premium catalogs (with expiration, notes, audit).
- R3. Content moderation: human review queue for user uploads (videos first; extensible to text/media). Approve/reject with reasons.
- R4. Publication pipeline: approved videos become publicly consumable by clients (no service keys in clients).
- R5. Releases management: set current version, min supported version, update policy (force/optional), and notes.
- R6. Observability: success rate per route, TPS, latency p50/p95/p99, error categories over time ranges.
- R7. Audit logging: record who did what, when, and why for sensitive actions.
- R8. Privacy & security: comply with existing RLS policies and consent system; store only minimum necessary data.
- R9. Future AI moderation: provide schema/flows to store AI signals (confidence/labels), allow human override.

### 2.2 Non-Goals
- NG1. Full-blown subscription billing (out of scope; future integration).
- NG2. External analytics SaaS (must remain first-party; Supabase logs acceptable).
- NG3. End-user facing features (this module is internal/admin only).

## 3. Users & Roles
- R10. Admin: full access to all admin screens, can manage other admins (when permitted by `admin_users.permissions`).
- R11. Moderator: can review/approve/reject content; cannot modify releases or admins by default.
- R12. Read-only auditor: can view dashboards/logs but cannot mutate data.

Role source of truth: `admin_users` table with JSON `permissions` (e.g., `{ version_management, audit_access, content_moderation, catalog_access }`).

## 4. Functional Requirements

### 4.1 Catalog Access (R2)
- R2.1 Search users by email and grant catalog access (`user_catalog_access`).
- R2.2 Set expiration, notes, and granted_by fields; audit each change.
- R2.3 Revoke access; keep historical audit trail.
- R2.4 Export active entitlements CSV.

### 4.2 Content Moderation (R3, R4, R9)
- R3.1 Review queue for new uploads (videos in `video_files` with `upload_pending=false` but not yet published; or new moderation records).
- R3.2 Approve: publish video and make it consumable by clients (link to storage path or copy to public bucket); mark moderation record approved.
- R3.3 Reject: mark rejected with reason; (optional) delete or quarantine storage object(s).
- R3.4 Bulk actions for batched approvals/rejections.
- R3.5 AI fields: store `ai_confidence`, `ai_reasoning`, `labels/tags` (extensible) in `content_moderation` linked to content.
- R3.6 Human override always wins; show provenance (AI vs human) on each item.

### 4.2.1 Public App Visibility Rules (Frontend) (R4)
- R4.1 Users see approved videos only (exercise_videos.is_approved=true).
- R4.2 Upload owners may preview their own unapproved video within the app (clearly labeled "Awaiting approval").
- R4.3 Built-in videos and same-origin static media continue to work unchanged.
- R4.4 Fallbacks: if a video is not approved (and viewer is not the owner), show description/placeholder.
- R4.5 i18n: strings for pending approval badge/tooltips and moderation states.

### 4.3 Releases (R5)
- R5.1 View current and historical app versions (`app_versions`).
- R5.2 Create or edit a release with version, policy, notes; commit audit log.
- R5.3 Toggle feature flags if present.

### 4.4 Observability (R6)
- R6.1 Dashboards: success rate per route/time bucket, TPS, latency p50/p95/p99.
- R6.2 Filters by env, route pattern, method, status class, time range.
- R6.3 Drilldown to recent errors with correlation IDs.

### 4.5 Audit (R7)
- R7.1 All admin mutations produce an `audit_logs` row: `{actor_id, action, resource_type, resource_id, details, success}`.
- R7.2 View audit timeline with filters and export.

## 5. Data & Schema

Existing tables in repo:
- `user_catalog_access` (present; used by AI workout function)
- `admin_users` (present; used by version management RLS)
- `video_files` (present; source of truth for user uploads; handled by `sync_v2` to storage)
- `exercise_videos` (present; not integrated in app flows; has `is_approved`)
- `content_moderation` (present; not integrated)
- `audit_logs` (present)

Required adjustments:
- R12.1 Establish a clear pipeline:
  - Upload (client) → `video_files` (with storage_path) → Moderation record in `content_moderation` (content_type='video', content_id=video_files.id).
  - On approve: either (A) mark `exercise_videos` row (published catalog of videos) referencing `storage_path` OR (B) mark `video_files` as `published=true` via a new column. Preference: keep `video_files` for uploads and use `exercise_videos` for published assets to allow multiple approved variants per exercise.
- R12.2 Add columns:
  - `exercise_videos.published_at TIMESTAMPTZ`, `reviewer_id UUID`, `moderation_id UUID` (FK to `content_moderation`), `catalog_id TEXT` nullable (if ties to a catalog context).
  - `content_moderation.labels JSONB` (optional) for AI tags.
- R12.3 Views for observability:
  - `v_http_success_rate`, `v_http_tps`, `v_http_latency` built on `metrics_http_requests` (new table) with time buckets.

## 6. Security & Privacy (R8)
- R8.1 RLS restricts admin UIs to `admin_users.is_active=true` and permission flags.
- R8.2 No service keys in clients; privileged actions go through Edge Functions.
- R8.3 Metrics sampling with anonymous session hash; no third-party beacons.

## 7. UX & Accessibility
- R13. 3–5 simple pages, keyboard friendly, WCAG AA.
- R14. Clear moderation decisions, diff of AI vs human decision.

## 8. Performance & Reliability
- R15. Paginated tables with server-side filtering.
- R16. Backoff and retries on Edge Function calls; correlation IDs.

## 9. Risks & Mitigations
- Mixed schemas (`video_files` vs `exercise_videos`) → Define single publication-of-record (`exercise_videos`) and keep `video_files` for raw uploads.
- Metrics volume → sample 5–10% of client requests.
- Admin misuse → audit logs + permission flags.

## 10. Acceptance Criteria
- Admins can grant/revoke catalog access and see effect in AI builder.
- Moderators can approve user videos and they become playable to users under RLS.
- Basic dashboards render success%, TPS, latency.
- All admin actions appear in `audit_logs`.
- AI fields stored and visible on items (even if not enforced yet).
