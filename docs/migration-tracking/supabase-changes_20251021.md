# Supabase Changes Tracker - Legal Acceptance V3

**Date:** October 21, 2025  
**Feature:** Legal Acceptance & Consent V3  
**Status:** In Progress

---

## Overview

This tracker documents all Supabase schema migrations and Edge Function changes for the Legal Acceptance V3 feature. All changes must be applied to the **development environment first**, then tracked here for production deployment.

**Development Project:** repcue-dev (xwzrsfkzqxdybjrkkkvh)  
**Production Project:** RepCue (zumzzuvfsuzvvymhpymk)

---

## Database Migrations

### Migration: Create `legal_acceptances` Table

**Status:** ✅ Created (workspace)  
**Migration File:** `supabase/migrations/20251021-01-create-legal-acceptances-table.sql`

**Purpose:**
- Store user acceptance records for legal documents (Terms, Privacy Policy, etc.)
- Sync acceptance across devices for authenticated users
- Support version + contentHash based acceptance tracking

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

-- Enable Row Level Security
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own acceptances"
  ON public.legal_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acceptances"
  ON public.legal_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own acceptances"
  ON public.legal_acceptances
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own acceptances"
  ON public.legal_acceptances
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_legal_acceptances_user_id ON public.legal_acceptances(user_id);
CREATE INDEX idx_legal_acceptances_doc_id ON public.legal_acceptances(doc_id);
```

**Applied to Dev:** ✅ Success (2025-10-21)  
**Applied to Prod:** ✅ Success (2025-10-22 via MCP)

---

## Edge Functions

### Function: `legal-manifest`

**Status:** ✅ Deployed to Dev  
**Function Path:** `supabase/functions/legal-manifest/index.ts`

**Purpose:**
- Serve live legal manifest JSON with ETag support
- Enable dynamic legal document updates without app rebuild
- Support cache validation and stale-while-revalidate pattern

**Key Features:**
- ETag generation based on manifest content hash (via crypto.subtle.digest)
- Cache-Control headers for optimal caching
- CORS support for same-origin policy
- Graceful degradation (fallback to baseline manifest)

**Deployment Details:**
- **Dev Version:** v1 (deployed 2025-10-21)
- **Function ID:** d9b2a9d3-37c5-4e65-873d-060664ae2a70
- **Status:** ACTIVE
- **JWT Verification:** Enabled

**Deployed to Dev:** ✅ Success (2025-10-21)  
**Deployed to Prod:** ✅ Success (2025-10-22 via MCP - Version 1)

---

## Environment Synchronization Checklist

Before production deployment, verify:

- [x] Database schema matches between dev and prod
- [x] Edge Functions are deployed and tested in dev
- [x] RLS policies are properly configured
- [x] Performance indexes are in place
- [x] All migrations are idempotent (safe to re-run)
- [x] Backup strategy is in place
- [x] Migration applied to production (2025-10-22)
- [x] Edge Function deployed to production (2025-10-22)

---

## Rollback Plan

If issues arise after production deployment:

1. **Database Rollback:**
   - Drop table: `DROP TABLE IF EXISTS public.legal_acceptances CASCADE;`
   - Revert to previous migration state

2. **Edge Function Rollback:**
   - Disable function via Supabase dashboard
   - Frontend falls back to baseline manifest automatically

3. **Feature Flag Rollback:**
   - Set `LEGAL_ACCEPTANCE_V3_ENABLED = false` in `src/config/features.ts`
   - Deploy frontend update

---

## Notes

- Essential consent (cookies) remains device-local and is NOT synced
- Legal acceptance is per-user and syncs across devices
- Conflict resolution: last-write-wins by `accepted_at` timestamp
- If timestamps equal, higher semver version prevails

---

## Change Log

| Date | Change | Status |
|------|--------|--------|
| 2025-10-21 | Created tracker file | ✅ Done |
| 2025-10-21 | Created migration SQL (workspace) | ✅ Done |
| 2025-10-21 | Created Edge Function (workspace) | ✅ Done |
| 2025-10-21 | Applied migration to dev | ✅ Done |
| 2025-10-21 | Deployed Edge Function to dev (v1) | ✅ Done |
| 2025-10-22 | Applied migration to prod (via MCP) | ✅ Done |
| 2025-10-22 | Deployed Edge Function to prod (v1 via MCP) | ✅ Done |
