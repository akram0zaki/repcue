# Implementation Plan — Legal Acceptance & Consent V3

Date: 2025-10-21
Status: Draft

This plan references PRD requirement IDs (LA-REQ-xxx).

## Development Rules

### 🧩 Development Rules for AI Coding Assistant

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

## Phase 0 — Preparation
- [x] Confirm design choices (done in chat) — (LA-REQ-001..025)
- [x] Folder structure confirmed: `docs/implementation-plans/legal-acceptance/docs` for authoring.

## Phase 1 — Backend Live Manifest (2A)
1. Add Express route `GET /api/legal/manifest` serving a JSON manifest file from backend sources (LA-REQ-002, 3, 4):
   - ETag support (hash of body) and `Cache-Control: max-age=60, stale-while-revalidate=86400`.
   - Serve same JSON schema as in Architecture Spec.
   - Security: same-origin only; no PII.
2. Author baseline manifest and sample docs (EN/NL/AR) under `apps/frontend/public/legal/` (LA-REQ-004, 011, 012, 021).
3. Add script to compute sha256 (base64) and update manifest.json (LA-REQ-021).

## Phase 2 — Frontend Services & Types
1. Types: Add interfaces for ConsentV3, LegalAcceptance, LegalManifest, etc. (LA-REQ-012, 020).
2. ConsentService: V2→V3 migration, new `legalAcceptances` field; boolean/null returns; logger usage (LA-REQ-026).
3. LegalDocsService: load baseline + live manifest; diff logic; recordAcceptance API (LA-REQ-001, 004, 006–008, 020).
4. LegalUpdateService: schedule checks on boot, 4h, reconnect; emit events (LA-REQ-016).
5. Service Worker routes: runtime caching per spec (manifest network-first; docs stale-while-revalidate) (LA-REQ-004, 005, 015).

## Phase 3 — UI
1. LegalCenterPage (`/legal`): list all docs with version, effectiveFrom, locale indicators (LA-REQ-013, 011).
2. LegalDocumentModal: render markdown via react-markdown + remark-gfm + rehype-sanitize; RTL for Arabic; a11y (LA-REQ-012, 018).
3. LegalGate (full-screen): checklist of required docs with View buttons opening modals; accept-all and continue when all required are acknowledged (LA-REQ-014, 016).
   - Optional docs (future): show unticked, non-blocking checkboxes; accept-all acts on required only (LA-REQ-015, 016).
4. Integrate with UpdateNotificationManager for non-blocking notifications (future effectiveFrom or optional docs) (LA-REQ-006–008).

## Phase 4 — Supabase Sync
1. Migration SQL (workspace-first): `supabase/migrations/<ts>_create_legal_acceptances.sql` (LA-REQ-018, 024):
   - Create table `legal_acceptances` with PK (user_id, doc_id).
   - Enable RLS; add select/upsert/delete policies for auth.uid().
   - Document in `docs/migration-tracking/supabase-changes_YYYYMMDD.md`.
2. Client sync:
   - On sign-in: fetch rows, merge with local via last-write-wins by `accepted_at`; tie-breaker: higher semver (LA-REQ-019).
   - On acceptance: upsert to server.
   - On sign-out: keep local record; do not delete server rows.

## Phase 5 — Testing & QA
1. Unit tests:
   - Consent V2→V3 migration (malformed inputs) (LA-REQ-026).
   - Diff logic for new doc, version bump, hash change; effectiveFrom now/future (LA-REQ-006–008, 020).
   - Locale fallback ar-*→ar, others→en (LA-REQ-011).
2. Integration tests:
   - Boot scenarios: offline-only baseline; online with changed manifest (LA-REQ-004).
   - Workout-aware deferral then gating (reuse Update patterns) (LA-REQ-006).
3. E2E (Cypress):
   - First run → LegalGate → Consent Banner.
   - Legal update with effectiveFrom future shows notification, becomes blocking on/after date.
   - Arabic RTL rendering; modal a11y checks (LA-REQ-018).

## Phase 6 — Docs & Ops
1. Update `docs/consent-system.md` to describe Consent V3 and legal system, including developer workflow (LA-REQ-021, 026).
2. Add `README` to `apps/frontend/public/legal/` documenting manifest maintenance (LA-REQ-021).
3. CHANGELOG.md entries for each shipped change.

## Phase 7 — Future Improvements (Path to 2B)
1. Supabase DB for legal docs:
   - Tables: `legal_documents` (id, title, required, policy, effective_from, version), `legal_document_locales` (doc_id, locale, path, content_hash) (LA-REQ-003, 022).
2. Edge Function `legal-manifest`:
   - Query tables, build manifest JSON; set ETag/Cache-Control.
3. Express `/api/legal/manifest` proxies the edge function for same-origin and consistent headers.
4. Editorial Workflow:
   - Admin UI to edit/publish versions and upload localized markdown; publish regenerates manifest.
5. Client remains unchanged (still hits `/api/legal/manifest`).

## Acceptance & Rollout
- Feature-flag the Legal system initially; enable internally, then phased rollout.
- Verify no regressions in timer UX, a11y, and offline functionality.

## Open Questions (tracked)
- None — decisions captured from user selections.
