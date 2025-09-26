# Supabase Schema Changes - September 24, 2025

## Issue: Fix Sync System for Built-in Content

### Problem
The sync system is incorrectly trying to sync built-in exercises (string IDs like "arm-circles") and built-in catalogs, causing database errors. Additionally, the `exercise_catalogs` table lacks proper sync metadata columns but is included in the sync order.

### Root Cause Analysis
1. **Built-in exercises** with string/slug IDs (e.g., "arm-circles", "plank") were being synced when they should be local-only
2. **Built-in catalogs** with string IDs (e.g., "general-fitness", "tai-chi") were being synced when they should be local-only
3. **exercise_catalogs table** is missing sync metadata columns (`owner_id`, `version`, `deleted`) but is included in sync order
4. **Client-side filtering** was not properly implemented to exclude built-in content

### Solution
1. **Client-side**: Implement proper filtering in `collectDirtyBatch()` to exclude built-in content
2. **Client-side**: Create helper utilities (`isBuiltin`, `isBuiltinCatalog`) for consistent filtering
3. **Server-side**: Remove `exercise_catalogs` from sync tables since catalogs should remain built-in only
4. **Schema**: No schema changes needed - catalogs remain as reference data without sync metadata

### Changes Applied

#### 1. Client-Side Filtering (✅ COMPLETED)
- Created `src/utils/syncFilters.ts` with helper methods:
  - `isBuiltin(exercise)` - detects built-in exercises (string IDs)
  - `isCustom(exercise)` - detects user-created exercises (UUID IDs)
  - `isBuiltinCatalog(catalog)` - detects built-in catalogs (string IDs)
  - `isCustomCatalog(catalog)` - detects user-created catalogs (UUID IDs)

- Updated `src/services/correctSyncService.ts`:
  - Import sync filter utilities
  - Added filtering in `collectDirtyBatch()` to exclude built-in exercises and catalogs
  - Enhanced debug logging for filtered records

#### 2. Server-Side Edge Function Updates (⏳ PENDING)
Need to update `supabase/functions/sync_v2/index.ts`:
- Remove `exercise_catalogs` from `SYNC_TABLES` array
- Remove `exercise_catalogs` from `MUTABLE_FIELD_ALLOWLIST`
- Add server-side validation to reject built-in exercise IDs if any slip through

### Schema Status
- **exercise_catalogs**: Keep as-is (no sync metadata needed, reference data only)
- **exercises**: Has proper sync metadata columns ✅
- **user_favorites**: Has proper sync metadata columns ✅
- **All other sync tables**: Have proper sync metadata columns ✅

### Verification Steps
1. ✅ Built-in exercises filtered from sync payload
2. ✅ Built-in catalogs filtered from sync payload
3. ⏳ Server rejects any built-in content that slips through
4. ⏳ Integration test with mixed built-in and custom exercises
5. ⏳ Verify no database errors in sync logs

### Files Modified
- `apps/frontend/src/utils/syncFilters.ts` (NEW)
- `apps/frontend/src/services/correctSyncService.ts` (MODIFIED)
- `supabase/functions/sync_v2/index.ts` (TO BE MODIFIED)

### Testing Required
- Unit tests for sync filter utilities
- Integration tests for sync system with mixed content
- Manual testing of built-in vs custom exercise sync behavior
- Verify no false update prompts for new users

---

**Status**: IN PROGRESS
**Next Steps**: Update server-side edge function to complete the fix

---
### 2025-09-24 (Later Update) - Enforce UUID-only Pull & Helper Expansion

Additional client-side safeguards added:
- Skip any non-UUID exercise in server pull application (`applyServerTableChanges`) even if server erroneously returns one.
- Added `isSharedWithMe` helper in `syncFilters.ts` for future replacement of ad-hoc shared detection logic; does not alter current runtime behavior yet (no breaking changes).
- Replaced inline UUID regex in `App.tsx` favorite toggle with `isCustom` helper for consistency and single source of truth.

Server Impact: None (no new migrations). Edge function hardening still recommended but not yet modified in workspace in this commit.

Testing Checklist (to run):
1. Create custom exercise (UUID) -> ensure it appears in push payload.
2. Toggle favorite on built-in exercise -> ensure no `exercises` push for slug ID.
3. Force full sync -> verify logs show skips for any injected non-UUID exercise rows.
4. Confirm `toggleExerciseFavorite` still updates UI and underlying storage.

Security Note: Defensive skipping reduces risk of malicious server data poisoning local catalog with spoofed slug IDs.

### 2025-09-24 (Server Hardening Update) - Edge Function UUID Enforcement

Server-side `sync_v2` edge function updated to enforce UUID-only exercise processing:
- Introduced shared `UUID_PATTERN` constant at top-level (single source of truth).
- Rejects exercise upsert attempts whose `id` does not match UUID pattern (counts as push error with explicit message).
- Skips (silently) delete requests for non-UUID exercise IDs (prevents noisy errors from legacy clients or tampered payloads).
- Filters pull responses: any non-UUID exercise rows (should not exist) are removed with a WARN log including count diff.

Rationale:
- Defense-in-depth complementing client-side filters; prevents accidental introduction of built-in slug IDs into cloud dataset.
- Mitigates catalog poisoning attack where malicious client could attempt to upsert slug-named exercises to influence other users (those are now rejected server-side).

Schema / Migration Impact: None.

Testing Recommendations:
1. Attempt to sync a crafted exercise with id `arm-circles` -> expect rejection in `sync_metadata.detailed_errors`.
2. Delete request with id `plank` -> expect silent skip (no error, no delete executed) and WARN log.
3. Valid UUID exercise upsert and delete continue to succeed.
4. Confirm pull payload never contains slug IDs; if server dataset is clean, WARN log should not appear.

Status: Server hardening COMPLETE (client + server both enforce UUID-only policy).

### 2025-09-24 (Singleton ID Normalization)
Observed a push error for `app_settings` where a client placeholder primary key (e.g. `default-app-settings`) conflicted with existing server UUID record. Added server-side normalization:
- On singleton UPDATE: If incoming `id` differs from existing DB `id`, drop it (prevents accidental PK mutation). Non-UUID placeholder always dropped.
- On singleton INSERT: Drop non-UUID `id` so database can assign canonical UUID.
Result: Eliminates push errors for singleton tables caused by placeholder IDs while preserving integrity.