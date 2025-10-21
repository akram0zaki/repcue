# PRD — Legal Acceptance & Consent V3

Date: 2025-10-21
Owner: RepCue
Status: Draft (Approved decisions inline)

## 1. Overview
Add a versioned, multi-locale legal acceptance system that works offline-first, syncs acceptance across devices for authenticated users, and integrates smoothly with existing consent and update flows. Consent V3 continues to handle storage/analytics/marketing, while a new Legal system manages required legal documents.

## 2. Goals
- Ensure users always accept the current required legal documents before using the app (subject to workout-aware deferral).
- Allow legal updates to be published without shipping a new app build.
- Support EN canonical with NL and AR locales (fallbacks: ar-* → ar; others → en).
- Cross-device legal acceptance sync for authenticated users.
- Preserve privacy-first: essential consent remains device-local; legal acceptance is per-user.

## 3. Non-Goals
- Building a full editorial CMS for legal content (future improvement).
- Storing device-level essential consent in the cloud (kept local by design).

## 4. Assumptions
- PWA offline-first, same-origin policy, strict CSP.
- No third-party analytics required for this epic.
- Existing Update System (docs/update-system.md) is available for pattern reuse.

## 5. Definitions
- Required legal documents: must be accepted to access the app (blocking gate, workout-aware).
- Optional legal documents: non-blocking; can be accepted later.
- Effective date: date from which acceptance becomes mandatory.

## 6. Requirements (numbered)

### Service Composition
- LA-REQ-001: Use separate services for legal logic (1B): LegalDocsService + LegalUpdateService. Integrate with UpdateNotificationManager lifecycle.

### Backend Source of Truth
- LA-REQ-002: Serve a live legal manifest via same-origin Express endpoint (2A), with ETag/Cache-Control and JSON payload.
- LA-REQ-003: Implementation plan must outline steps to evolve to a DB-backed manifest via Supabase Edge Function (2B) later, without breaking clients.

### PWA/Offline Behavior
- LA-REQ-004: Bundle a baseline manifest in the app to work fully offline; use network-first for live manifest with cache fallback (3A).
- LA-REQ-005: Cache legal markdown documents with stale-while-revalidate (15A).

### Prompt Policy & Effective Date
- LA-REQ-006: Required docs block access when acceptance is outstanding, deferring until workout completes, then gating (4A).
- LA-REQ-007: Each doc includes an effectiveFrom date. If effectiveFrom <= today, acceptance is mandatory now; if effectiveFrom is future, show notification with option to accept now or later (4A-extension).
- LA-REQ-008: Support a per-doc policy field: 'force' | 'deferred'. 'force' shows immediate blocking gate (emergency compliance) (14A).

### Acceptance Scope & Locales
- LA-REQ-009: Acceptance is version + contentHash based (not locale-bound); changing language alone must not require re-acceptance (5B).
- LA-REQ-010: Store the acceptedLocale alongside acceptance for auditability (5B).
- LA-REQ-011: i18n fallback rules: ar-* → ar; all other locales fallback to en (17A).

### Rendering & Security
- LA-REQ-012: Render markdown client-side using react-markdown + remark-gfm + rehype-sanitize, disable raw HTML or sanitize strictly (6A, 18A).

### UI/UX Patterns
- LA-REQ-013: Provide a Legal Center route listing all docs, with per-doc pages and deep links (7A).
- LA-REQ-014: During gating, open each required doc in a modal from a checklist; only after viewing/acknowledging all required docs enable "Accept all and continue" (7A-extension, 8A, 16A).
- LA-REQ-015: For future optional docs, "Accept all" acts on required docs only by default; optional docs are individually checkable and excluded unless explicitly selected (16A-compat).

### Scheduling & Triggers
- LA-REQ-016: Check for legal updates on boot, every 4 hours, and on network reconnection (9A).

### Persistence & Sync
- LA-REQ-017: Essential (storage) consent remains device-local (10A).
- LA-REQ-018: Legal acceptance is stored locally and synced to Supabase for authenticated users (10A).
- LA-REQ-019: Conflict resolution: last-write-wins by accepted_at timestamp; if timestamps equal, higher version prevails (11A).
- LA-REQ-020: Versioning signals: use semantic version + contentHash; changes to either require re-acceptance when effective (12A).

### Developer Workflow
- LA-REQ-021: Manual scripted workflow (13A): author .md → copy to public → compute sha256 (base64) → update manifest.json → changelog entry.
- LA-REQ-022: Implementation plan must include a path to evolve to DB-backed editorial workflow (13B) with minimal client change.

### Security & Compliance
- LA-REQ-023: Same-origin fetch only; HTTPS; CSP respected; no third-party calls for legal.
- LA-REQ-024: Follow OWASP A03/XSS mitigation for markdown and A01 access control for Supabase RLS.

### Telemetry (local logs only)
- LA-REQ-025: Use the project logger utility for debug/error logs; no external telemetry.

### Migration
- LA-REQ-026: Migrate Consent V2 → V3 automatically; prompt for legal acceptance only when required docs are outstanding.

## 7. Acceptance Criteria
- Booting the app offline shows the baseline manifest; no network required to proceed if acceptance already current.
- When a required doc’s version or hash changes with effectiveFrom <= today, the user is gated after the next workout boundary (or immediately if policy=force).
- Legal acceptance syncs across devices for a signed-in user.
- Changing app locale alone does not re-prompt acceptance.
- A Legal Center route lists all docs and opens them with correct locale and fallbacks.

## 8. Dependencies
- Update System (events, deferral patterns).
- Supabase (auth, table legal_acceptances with RLS).
- React 19, Vite PWA, Tailwind.

## 9. Risks & Mitigations
- Risk: Over-gating during workouts → Mitigation: workout-aware deferral.
- Risk: Locale drift → Mitigation: acceptance not tied to locale; store acceptedLocale.
- Risk: Stale cached manifest → Mitigation: ETag + network-first, baseline fallback.

## 10. Out of Scope
- Legal editorial UI (admin) and auditing dashboards (planned later).
