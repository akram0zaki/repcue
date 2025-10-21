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
- [x] Feature flag added: `LEGAL_ACCEPTANCE_V3_ENABLED = true` in `src/config/features.ts`
- [x] Migration tracker created: `docs/migration-tracking/supabase-changes_20251021.md`
- [x] Types created: `apps/frontend/src/types/legal.ts` with all interfaces

## Phase 1 — Backend Live Manifest (2A)
1. [x] Add Express route `GET /api/legal/manifest` serving a JSON manifest file from backend sources (LA-REQ-002, 3, 4):
   - **CORRECTION**: Using Supabase Edge Function instead of Express (backend is 100% Supabase)
   - ETag support (hash of body) and `Cache-Control: max-age=60, stale-while-revalidate=86400`.
   - Serve same JSON schema as in Architecture Spec.
   - Security: same-origin only; no PII.
   - **COMPLETED**: Created `supabase/functions/legal-manifest/index.ts`
   - **DEPLOYED TO DEV**: v1 (2025-10-21) - Function ID: d9b2a9d3-37c5-4e65-873d-060664ae2a70
2. [x] Author baseline manifest and sample docs (EN/NL/AR) under `apps/frontend/public/legal/` (LA-REQ-004, 011, 012, 021).
   - **COMPLETED**: All 10 documents copied with numeric prefixes (01- through 10-)
   - Files: 01-terms_conditions.en.md, 02-privacy_policy.en.md, 03-cookie_policy.en.md, 04-medical_disclaimer.en.md, 05-liability_waiver.en.md, 06-dpa.en.md, 07-subscription_policy.en.md, 08-community_guidelines.en.md, 09-imprint.en.md, 10-appendices.en.md
3. [x] Add script to compute sha256 (base64) and update manifest.json (LA-REQ-021).
   - **COMPLETED**: Created `scripts/generate-legal-hashes.js`
   - Generated `apps/frontend/public/legal/manifest.json` with SHA-256 hashes
   - 6 required documents, 4 optional, effective date 2025-11-01
4. [x] Create Supabase migration for `legal_acceptances` table with RLS policies
   - **COMPLETED**: Created `supabase/migrations/20251021-01-create-legal-acceptances-table.sql`
   - Composite PK (user_id, doc_id), RLS policies, indexes for performance
   - **APPLIED TO DEV**: ✅ Success (2025-10-21)
5. [x] Create Supabase Edge Function for serving live legal manifest
   - **COMPLETED**: Created `supabase/functions/legal-manifest/index.ts`
   - ETag support, cache validation, graceful degradation, baseline manifest embedded
   - **DEPLOYED TO DEV**: ✅ Success (2025-10-21) - v1 active

**Phase 1 Status**: ✅ **COMPLETE** — All backend components created and deployed to dev environment

## Phase 2 — Frontend Services & Types
1. [x] Types: Add interfaces for ConsentV3, LegalAcceptance, LegalManifest, etc. (LA-REQ-012, 020).
   - **COMPLETED**: Extended consent types to V3 with legalAcceptances field
   - File: `apps/frontend/src/types/consent.ts` - Added ConsentDataV3 interface
   - File: `apps/frontend/src/types/legal.ts` - Updated LegalAcceptanceStatus interface
2. [x] ConsentService: V2→V3 migration, new `legalAcceptances` field; boolean/null returns; logger usage (LA-REQ-026).
   - **COMPLETED**: Added V2→V3 migration in ConsentService
   - Migration creates empty legalAcceptances array
   - Added methods: `getLegalAcceptances()`, `setLegalAcceptances()`, `updateLegalAcceptance()`
   - All methods return boolean (success/failure) following project conventions
3. [x] LegalDocsService: load baseline + live manifest; diff logic; recordAcceptance API (LA-REQ-001, 004, 006–008, 020).
   - **COMPLETED**: Created `apps/frontend/src/services/legalDocsService.ts`
   - Features:
     - Load baseline manifest from `/legal/manifest.json`
     - Load live manifest from Edge Function with ETag support
     - Document retrieval with locale fallback (user locale → base locale → en)
     - Acceptance tracking and status checking
     - Diff logic to detect new/changed documents
     - effectiveFrom date handling with isEffectiveNow() method
4. [x] LegalUpdateService: schedule checks on boot, 4h, reconnect; emit events (LA-REQ-016).
   - **COMPLETED**: Created `apps/frontend/src/services/legalUpdateService.ts`
   - Features:
     - Initialize on app boot
     - Scheduled checks every 4 hours
     - Network reconnection listener
     - Custom events: `legal-updates-available`, `legal-check-completed`
     - Workout-aware detection (checks if user on /timer page)
     - Force check capability (bypasses cache)
5. [x] Service Worker routes: runtime caching per spec (manifest network-first; docs stale-while-revalidate) (LA-REQ-004, 005, 015).
   - **COMPLETED**: Updated `apps/frontend/vite.config.ts`
   - Added caching strategies:
     - Legal manifest: NetworkFirst (3s timeout, 1 hour expiration)
     - Legal markdown docs: StaleWhileRevalidate (7 days expiration)
     - Updated globPatterns to include `legal/**/*.{json,md}`

**Phase 2 Status**: ✅ **COMPLETE** — All frontend services, types, and Service Worker configuration implemented

## Phase 3 — UI

**Deliverables:**
1. ✅ **LegalCenterPage** (`apps/frontend/src/pages/LegalCenterPage.tsx`): 
   - Lists all legal documents with version, effectiveFrom, locale indicators (LA-REQ-013, 011)
   - Displays acceptance status with color-coded badges and icons
   - Shows countdown to effectiveFrom dates
   - Mobile-first responsive design with sticky header
   - RTL support for Arabic locales
   
2. ✅ **LegalDocumentModal** (`apps/frontend/src/components/legal/LegalDocumentModal.tsx`):
   - Renders markdown via react-markdown + remark-gfm + rehype-sanitize (LA-REQ-012)
   - Full-screen modal with scroll-to-bottom requirement before acceptance
   - RTL support for Arabic (LA-REQ-018)
   - Accessibility compliant (WCAG 2.1 AA) with focus trap, ESC key handler
   - Loading and error states
   - Body scroll prevention when open

3. ✅ **LegalGate** (`apps/frontend/src/components/legal/LegalGate.tsx`):
   - Full-screen blocking modal with checklist of required documents (LA-REQ-014, 016)
   - Individual "View" buttons opening LegalDocumentModal
   - Individual checkboxes for each document
   - "Accept All Required" button (enabled when all viewed)
   - "Continue" button (enabled when all required accepted)
   - Optional documents section (non-blocking) (LA-REQ-015, 016)
   - Mobile-first responsive design
   - RTL support for Arabic

4. ✅ **Icon Support** (`apps/frontend/src/components/icons/NavigationIcons.tsx`):
   - Added CheckCircleIcon, XCircleIcon, XMarkIcon, DocumentTextIcon, ClockIcon
   - Consistent SVG icon style matching project conventions

5. ✅ **Dependencies Installed**:
   - react-markdown 10.1.0
   - remark-gfm 4.0.1
   - rehype-sanitize 6.0.0

6. ✅ **Translation Files** (`apps/frontend/public/locales/*/legal.json`):
   - Created legal.json for all 8 locales (en, fr, de, es, nl, ar, ar-EG, fy)
   - All translation keys validated (i18n:scan shows no missing keys)

7. ✅ **Router Integration** (LA-REQ-013, 014):
   - Added `/legal` route to App.tsx for LegalCenterPage
   - Initialized legalDocsService and legalUpdateService on app boot
   - Integrated LegalGate into app flow (checks for blocking documents on boot)
   - Added navigation link to Legal Center in More menu
   - Added Routes.LEGAL constant to types
   - LegalCenterPage lazy-loaded for optimal performance

8. ⏳ **Pending**: Integrate with UpdateNotificationManager for non-blocking notifications (future effectiveFrom or optional docs) (LA-REQ-006–008) — deferred to later phase

**Phase 3 Status**: ✅ **COMPLETE** — All UI components implemented, router integrated, navigation added, TypeScript compilation clean

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
