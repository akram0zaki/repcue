# Architecture & Specification — Legal Acceptance & Consent V3

Date: 2025-10-21
Status: Draft

## 1. High-Level Architecture
- LegalDocsService (frontend): Loads and diffs legal manifest (baseline + live), figures out outstanding docs.
- LegalUpdateService (frontend): Schedules checks (boot, 4h, reconnect), emits events, coordinates gating with UpdateNotificationManager.
- ConsentService V3 (frontend): Stores essential consent + legalAcceptances locally; migrates V2→V3.
- Supabase (backend): Stores cross-device legal acceptance; RLS per-user.
- Express API (backend): Serves live manifest with ETag/Cache-Control.
- Service Worker: network-first for manifest; stale-while-revalidate for .md documents.

## 2. Data Models (TypeScript)
```ts
// Consent V3 stored locally
export interface LegalAcceptance {
  docId: string;
  acceptedVersion: string; // semver
  contentHash: string; // sha256 base64
  acceptedAt: string; // ISO
  acceptedLocale: string; // recorded for audit
}

export interface ConsentV3 {
  version: 3;
  timestamp: string; // ISO
  essentialAccepted: boolean;
  cookiesAccepted: boolean;
  analyticsAccepted: boolean;
  marketingAccepted: boolean;
  dataRetentionDays: number;
  legalAcceptances: LegalAcceptance[];
}

export type LegalPolicy = 'force' | 'deferred';

export interface LegalDocLocale {
  locale: string; // 'en' | 'nl' | 'ar'
  path: string;   // /legal/<id>.<locale>.md
  contentHash: string; // sha256 base64
}

export interface LegalDoc {
  id: string;
  title: string;
  version: string; // semver
  required: boolean;
  policy?: LegalPolicy; // default 'deferred'
  effectiveFrom?: string; // ISO date (midnight UTC)
  locales: LegalDocLocale[];
}

export interface LegalManifest {
  updatedAt: string; // ISO
  documents: LegalDoc[];
}
```

## 3. Manifest JSON (baseline + live)
- Baseline file: `apps/frontend/public/legal/manifest.json` (bundled).
- Live endpoint: `GET /api/legal/manifest` (Express) returns LegalManifest with ETag and Cache-Control.
- Client selection of locale per doc:
  - Preferred locale from user settings.
  - If ar-* → ar; else if exact locale missing → en.

## 4. Backend — Express Endpoint
- Route: `GET /api/legal/manifest`
- Behavior:
  - Responds 304 when If-None-Match matches current ETag.
  - Payload is a JSON file stored server-side (2A). Future: source from Supabase DB (2B).
  - Headers: `ETag`, `Cache-Control: max-age=60, stale-while-revalidate=86400`, `Content-Type: application/json`.
- Security: same-origin only; no PII; HTTPS assumed.

## 5. Supabase Schema & RLS
- Table: `legal_acceptances`
  - user_id uuid not null references auth.users (or profiles.id)
  - doc_id text not null
  - accepted_version text not null
  - content_hash text not null
  - locale text not null
  - accepted_at timestamptz not null default now()
  - primary key (user_id, doc_id)
- RLS Policies (pseudocode):
  - enable row level security
  - policy select_own: using (auth.uid() = user_id)
  - policy upsert_own: with check (auth.uid() = user_id)
  - policy delete_own: using (auth.uid() = user_id)
- Sync Strategy:
  - On sign-in: fetch server rows, merge with local by (doc_id);
    - If server.accepted_at > local.accepted_at → use server; else upsert local to server.
    - If accepted_at equal and version differs, prefer higher semver.

## 6. Services — Contracts
```ts
// LegalDocsService (frontend)
class LegalDocsService {
  static getInstance(): LegalDocsService;
  loadManifest(): Promise<LegalManifest>; // tries live → baseline fallback
  getOutstandingRequiredDocs(consent: ConsentV3, userLocale: string): Promise<LegalDoc[]>;
  recordAcceptance(acceptances: Array<{docId: string; version: string; contentHash: string; acceptedLocale: string}>): Promise<boolean>;
  needsLegalGate(consent: ConsentV3, userLocale: string): Promise<boolean>;
}

// LegalUpdateService (frontend)
class LegalUpdateService {
  static getInstance(): LegalUpdateService;
  start(): void; // schedule boot + periodic + reconnect checks
  stop(): void;
  on(event: 'legal-update-available' | 'legal-gate-required' | 'legal-accepted', handler: (...args:any[]) => void): void;
}

// ConsentService additions
// - migrate V2→V3 on boot
// - persist ConsentV3
```

### Diff Logic (core)
- For each LegalDoc in manifest (required=true):
  - Use chosen locale variant (fallback applied) to get `contentHash`.
  - Find local acceptance by `docId`.
  - If none → outstanding.
  - Else if `acceptedVersion < doc.version` → outstanding.
  - Else if `acceptedVersion == doc.version` AND `contentHash != accepted.contentHash` → outstanding.
  - Else if `effectiveFrom` exists:
    - If `effectiveFrom <= today` and doc is outstanding → gate now.
    - If `effectiveFrom > today` → notify (non-blocking) until date arrives.
- Policy override: if `policy='force'` and outstanding → immediate gate (workout-aware deferral configurable; force can override if mandated).

## 7. UI Components
- LegalCenterPage (`/legal`): lists docs with title, version, effective date, language availability; links to per-doc modal/page.
- LegalDocumentModal: renders selected markdown file in a focus-trapped modal; supports long content (scrollable), RTL for Arabic.
- LegalGate: full-screen gating flow with checklist of required docs; each item has a “View” button opening modal; primary action "Accept all and continue" enabled once all required docs are acknowledged.
  - Optional docs (future): present as separate, unticked checkboxes not required to proceed. "Accept all" applies to required docs only; optional require explicit ticking.

## 8. Service Worker
- Manifest: network-first (try /api/legal/manifest with If-None-Match; fallback to cached baseline).
- Docs (.md): cache-first with stale-while-revalidate.
- Ensure manifest is excluded from precache revision pinning (or use runtime caching route).

## 9. Update Scheduling & Events
- Scheduling: boot + every 4h + on network reconnect.
- Events:
  - 'legal-update-available' (payload: list of changed docs)
  - 'legal-gate-required' (payload: required docs outstanding)
  - 'legal-accepted' (payload: list of acceptances recorded)
- Reuse UpdateNotificationManager to surface banners for non-blocking notifications.

## 10. Security & Accessibility
- Markdown rendered via react-markdown + remark-gfm + rehype-sanitize; disallow/inert raw HTML.
- Same-origin fetch only; HTTPS enforced by hosting.
- Modals are focus-trapped, keyboard navigable, labelled, with visible focus states; respect reduced motion.
- No PII stored in manifest or client logs; Supabase acceptance rows limited to user_id links by RLS.

## 11. Telemetry & Logging
- Use logger utility for debug/warn/error. No external telemetry.

## 12. Migration Plan (V2→V3)
- Map V2.hasConsented → V3.essentialAccepted; copy rest; set legalAcceptances=[].
- On next boot, check manifest and gate only if required docs are outstanding.

## 13. Evolution to DB-Backed Manifest (2B)
- Supabase tables:
  - legal_documents (id, title, required, policy, effective_from, version)
  - legal_document_locales (doc_id, locale, path, content_hash)
- Edge Function: generate manifest JSON from DB with ETag; cache headers.
- Backend Express endpoint proxies Edge Function response for same-origin and consistent headers.
- Client: no change (still hits /api/legal/manifest).
