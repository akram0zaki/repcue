# Phase 1 Deployment Summary — Legal Acceptance V3

**Date:** October 21, 2025  
**Environment:** Development (repcue-dev - xwzrsfkzqxdybjrkkkvh)  
**Status:** ✅ Complete

---

## Deployed Components

### 1. Database Migration

**File:** `supabase/migrations/20251021-01-create-legal-acceptances-table.sql`

**Table Created:** `public.legal_acceptances`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_id text NOT NULL,
  accepted_version text NOT NULL,
  content_hash text NOT NULL,
  locale text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, doc_id)
);
```

**Security:**
- Row Level Security (RLS) enabled
- 4 policies: SELECT, INSERT, UPDATE, DELETE (users can only access own records)
- Grants: `authenticated` role has full CRUD access

**Performance:**
- 3 indexes created:
  - `idx_legal_acceptances_user_id` (lookup by user)
  - `idx_legal_acceptances_doc_id` (lookup by document)
  - `idx_legal_acceptances_accepted_at` (DESC order for latest records)

**Deployment Result:** ✅ Success  
**Deployment Time:** 2025-10-21

---

### 2. Edge Function — `legal-manifest`

**File:** `supabase/functions/legal-manifest/index.ts`

**Purpose:**
Serve live legal manifest JSON with ETag-based cache validation

**Function Details:**
- **ID:** d9b2a9d3-37c5-4e65-873d-060664ae2a70
- **Slug:** legal-manifest
- **Version:** 1
- **Status:** ACTIVE
- **JWT Verification:** Enabled
- **Created:** 2025-10-21
- **Updated:** 2025-10-21

**Features Implemented:**
- ✅ ETag generation using crypto.subtle.digest (SHA-256 hex)
- ✅ Cache-Control headers: `max-age=60, stale-while-revalidate=86400`
- ✅ 304 Not Modified responses via If-None-Match
- ✅ CORS headers for same-origin policy
- ✅ Graceful degradation with baseline manifest fallback
- ✅ X-Legal-Manifest-Version header
- ✅ X-Legal-Manifest-Fallback header on error

**Baseline Manifest Embedded:**
- 10 documents (6 required, 4 optional)
- Effective date: 2025-11-01
- All documents in English (en) locale
- SHA-256 base64 content hashes for all files

**Deployment Result:** ✅ Success  
**Deployment Time:** 2025-10-21

---

### 3. Legal Documents (Baseline)

**Location:** `apps/frontend/public/legal/`

**Files Created:**
1. **01-terms_conditions.en.md** (required) - v1.0.0
2. **02-privacy_policy.en.md** (required) - v1.0.0
3. **03-cookie_policy.en.md** (required) - v1.0.0
4. **04-medical_disclaimer.en.md** (required) - v1.0.0
5. **05-liability_waiver.en.md** (required) - v1.0.0
6. **06-dpa.en.md** (optional) - v1.0.0
7. **07-subscription_policy.en.md** (optional) - v1.0.0
8. **08-community_guidelines.en.md** (optional) - v1.0.0
9. **09-imprint.en.md** (required) - v1.0.0
10. **10-appendices.en.md** (optional) - v1.0.0

**Manifest File:** `apps/frontend/public/legal/manifest.json`
- Generated with SHA-256 base64 content hashes
- Updated timestamp: 2025-10-21T19:16:19.758Z
- Includes document metadata (id, title, version, required, policy, effectiveFrom, locales)

---

### 4. Supporting Files

**Hash Generation Script:**
- **File:** `scripts/generate-legal-hashes.js`
- **Purpose:** Compute SHA-256 base64 hashes and generate manifest.json
- **Status:** ✅ Working (ES module)

**Types:**
- **File:** `apps/frontend/src/types/legal.ts`
- **Interfaces:** LegalAcceptance, ConsentV3, LegalDoc, LegalManifest, LegalAcceptanceStatus, LegalAcceptanceRow

**Feature Flag:**
- **File:** `apps/frontend/src/config/features.ts`
- **Flag:** `LEGAL_ACCEPTANCE_V3_ENABLED = true`

**Migration Tracker:**
- **File:** `docs/migration-tracking/supabase-changes_20251021.md`
- **Purpose:** Track all Supabase changes for dev → prod deployment

---

## Testing Recommendations

### Manual Testing

1. **Test Edge Function:**
   ```bash
   # Get legal manifest
   curl -H "Authorization: Bearer YOUR_ANON_KEY" \
        https://xwzrsfkzqxdybjrkkkvh.supabase.co/functions/v1/legal-manifest

   # Test ETag validation (should return 304)
   curl -H "Authorization: Bearer YOUR_ANON_KEY" \
        -H "If-None-Match: \"ETAG_FROM_FIRST_REQUEST\"" \
        https://xwzrsfkzqxdybjrkkkvh.supabase.co/functions/v1/legal-manifest
   ```

2. **Verify Database Table:**
   - Check Supabase dashboard for `legal_acceptances` table
   - Verify RLS policies are active
   - Confirm indexes are created

3. **Test Baseline Manifest:**
   - Access `apps/frontend/public/legal/manifest.json`
   - Verify all 10 documents listed
   - Confirm content hashes match files

### Automated Testing (Future)

Once frontend services are implemented (Phase 2):
- Unit tests for manifest parsing and diff logic
- Integration tests for offline/online scenarios
- E2E tests for legal gate flow

---

## Next Steps

### Phase 2: Frontend Services & Types

1. **Extend ConsentService to V3:**
   - Migrate V2 → V3 schema
   - Add `legalAcceptances` field to consent object
   - Implement acceptance tracking methods

2. **Create LegalDocsService:**
   - Load baseline manifest from `/legal/manifest.json`
   - Fetch live manifest from Edge Function
   - Diff logic to detect new/changed documents
   - Record acceptance API (local + sync to Supabase)

3. **Create LegalUpdateService:**
   - Schedule manifest checks (boot, 4h interval, reconnect)
   - Emit events for legal updates
   - Workout-aware deferral logic

4. **Service Worker Configuration:**
   - Network-first strategy for manifest endpoint
   - Stale-while-revalidate for .md files
   - Cache invalidation on contentHash change

### Phase 3: UI Components

1. **LegalCenterPage** (`/legal`)
2. **LegalDocumentModal** (markdown rendering)
3. **LegalGate** (full-screen blocking modal)

---

## Production Deployment Checklist

Before deploying to production (`zumzzuvfsuzvvymhpymk`):

- [ ] Complete Phase 2 (Frontend Services)
- [ ] Complete Phase 3 (UI Components)
- [ ] Complete Phase 5 (Testing & QA)
- [ ] Review migration tracker for drift
- [ ] Backup production database
- [ ] Apply migration to production
- [ ] Deploy Edge Function to production
- [ ] Test critical workflows in production
- [ ] Monitor for errors in first 24 hours
- [ ] Verify Supabase dashboard for table creation
- [ ] Check RLS policies in production
- [ ] Confirm Edge Function logs show no errors

---

## Known Issues & Resolutions

### Issue: Deno Hash Module Not Found
**Problem:** Initial deployment failed with "Module not found" error for `std@0.168.0/hash/mod.ts`

**Solution:** Replaced `createHash` import with Web Crypto API (`crypto.subtle.digest`)

**Status:** ✅ Resolved

---

## References

- **PRD:** `docs/implementation-plans/legal-acceptance/PRD-legal-acceptance.md`
- **Architecture Spec:** `docs/implementation-plans/legal-acceptance/architecture-spec-legal-acceptance.md`
- **Implementation Plan:** `docs/implementation-plans/legal-acceptance/implementation-plan-legal-acceptance.md`
- **Migration Tracker:** `docs/migration-tracking/supabase-changes_20251021.md`

---

**Deployment Summary Completed:** October 21, 2025  
**Next Phase:** Phase 2 — Frontend Services & Types
