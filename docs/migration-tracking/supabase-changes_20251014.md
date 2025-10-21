# Supabase Changes - October 14, 2025

## Module 2.7.5: Personal Records Sync Support

### Summary
Added cross-device sync capability for personal records (PRs) to enable true offline-first architecture compliance. PRs now sync across devices via the sync_v2 edge function.

### Database Changes

#### Migration: `20251014-01-create-personal-records-table.sql`

**Applied to**: Development (xwzrsfkzqxdybjrkkkvh) ✅  
**Status**: Applied manually via Supabase Console  
**Date**: October 14, 2025

**Changes**:
1. **Created `personal_records` table** with sync metadata
   - Primary fields: `id`, `exercise_id`, `exercise_name`, `record_type`, `value`, `achieved_at`
   - Optional fields: `workout_id`, `previous_record`, `improvement_percentage`
   - Sync metadata: `owner_id`, `created_at`, `updated_at`, `version`, `deleted`
   - Constraints: Check constraints on `record_type`, `value`, `previous_record`, `improvement_percentage`
   - Foreign keys: `workout_id` → `workouts(id)`, `owner_id` → `auth.users(id)`

2. **Created Performance Indexes**:
   - `idx_personal_records_owner_updated_id`: Primary sync index (owner_id, updated_at DESC, id)
   - `idx_personal_records_exercise`: Exercise lookup (exercise_id, owner_id)
   - `idx_personal_records_type`: Record type filtering (record_type, owner_id)
   - `idx_personal_records_exercise_achieved`: Latest records per exercise (exercise_id, achieved_at DESC)

3. **Implemented Row Level Security (RLS)**:
   - Policy: "Users can view own personal records" (SELECT)
   - Policy: "Users can insert own personal records" (INSERT)
   - Policy: "Users can update own personal records" (UPDATE)
   - Policy: "Users can delete own personal records" (DELETE)

4. **Created Trigger**: `set_personal_records_updated_at`
   - Auto-updates `updated_at` timestamp on record modification
   - Function: `update_personal_records_updated_at()`

5. **Added Documentation Comments**:
   - Table comment: Purpose and sync support
   - Column comments: Field descriptions and usage

### Edge Function Changes

#### Updated: `sync_v2/index.ts`

**Deployed to**: Development (xwzrsfkzqxdybjrkkkvh) ✅  
**Version**: Latest  
**Date**: October 14, 2025

**Changes**:
1. **Added to SYNC_TABLES array**:
   ```typescript
   const SYNC_TABLES = [
     // ... existing tables ...
     'personal_records'  // NEW
   ];
   ```

2. **Added Field Allowlist**:
   ```typescript
   personal_records: new Set([
     'id', 'exercise_id', 'exercise_name', 'record_type', 'value',
     'achieved_at', 'workout_id', 'previous_record', 'improvement_percentage',
     'owner_id', 'created_at', 'updated_at', 'version', 'deleted'
   ])
   ```

### Frontend Changes

#### Updated: `apps/frontend/src/types/coaching.ts`

**Changes**:
1. **Extended PersonalRecord interface** with `SyncMetadata`:
   ```typescript
   export interface PersonalRecord extends SyncMetadata {
     // ... existing fields ...
     // SyncMetadata provides: owner_id, created_at, updated_at, version, deleted
   }
   ```

#### Updated: `apps/frontend/src/services/storageService.ts`

**Changes**:
1. **Updated `savePersonalRecord()`**:
   - Now uses `prepareUpsert()` to add sync metadata and mark as dirty
   - Gets current user via `authService.getCurrentUser()`
   - Enables sync push on next sync cycle

2. **Updated `deletePersonalRecord()`**:
   - Changed from hard delete to soft delete (tombstone pattern)
   - Uses `prepareSoftDelete()` for sync compatibility
   - Marks record as `deleted: true` instead of removing from DB

3. **Updated `getPersonalRecords()`**:
   - Now uses `filterActiveRecords()` to exclude soft-deleted records
   - Returns only active PRs (deleted: false)

4. **Updated `getPersonalRecordsByExercise()`**:
   - Uses `filterActiveRecords()` before filtering by exercise
   - Ensures deleted records don't appear in results

### Architecture Impact

#### Offline-First Compliance ✅

**Before (Offline-Only)**:
- ❌ PRs stored only in local IndexedDB
- ❌ Lost when switching devices
- ❌ Lost when clearing browser data
- ❌ No cross-device history

**After (True Offline-First)**:
- ✅ PRs stored locally first (immediate access)
- ✅ Sync to server when online
- ✅ Pull from server on new devices
- ✅ Conflict resolution via version numbers
- ✅ Works offline, syncs when online
- ✅ Cross-device PR history preserved

#### Sync Behavior

1. **Create PR Offline**:
   - Stored in IndexedDB immediately
   - Marked as dirty (needs sync)
   - On next sync: pushed to server

2. **Update PR Offline**:
   - Version incremented locally
   - Marked as dirty
   - On next sync: conflict resolution via version comparison

3. **Delete PR Offline**:
   - Soft deleted (deleted: true)
   - Marked as dirty
   - On next sync: tombstone synced to server

4. **Pull PRs from Server**:
   - Newer server records overwrite local
   - Version-based conflict resolution
   - Tombstones respected (deleted records filtered)

### Testing Checklist

- [ ] **Single Device**:
  - [ ] Create PR offline → sync → verify in Supabase
  - [ ] Update PR offline → sync → verify changes
  - [ ] Delete PR offline → sync → verify soft delete

- [ ] **Cross-Device**:
  - [ ] Device A: Create PR → sync
  - [ ] Device B: Pull sync → verify PR appears
  - [ ] Device B: Update PR → sync
  - [ ] Device A: Pull sync → verify updated PR

- [ ] **Conflict Resolution**:
  - [ ] Device A & B: Update same PR offline
  - [ ] Sync both → verify version-based resolution

- [ ] **Data Integrity**:
  - [ ] Verify RLS prevents cross-user access
  - [ ] Verify deleted records don't appear in UI
  - [ ] Verify indexes improve query performance

### Production Deployment Plan

**Prerequisites**:
- ✅ Dev migration applied and tested
- ✅ Edge function deployed to dev
- ✅ Frontend changes tested locally
- ⏳ Manual testing complete
- ⏳ E2E sync testing complete

**Deployment Steps**:
1. Apply migration to production:
   - Run `20251014-01-create-personal-records-table.sql` in prod console
   - Or use Supabase CLI: `supabase db push --project-ref zumzzuvfsuzvvymhpymk`

2. Deploy edge function to production:
   ```bash
   supabase functions deploy sync_v2 --project-ref zumzzuvfsuzvvymhpymk
   ```

3. Deploy frontend changes:
   - Merge to main branch
   - Deploy via CI/CD pipeline
   - Or manual deployment to hosting

4. Monitor:
   - Check Supabase logs for sync errors
   - Monitor edge function execution
   - Watch for RLS policy violations
   - Track sync performance metrics

### Rollback Plan

**If issues arise**:

1. **Disable Sync** (emergency):
   ```typescript
   // In sync_v2/index.ts, temporarily remove from SYNC_TABLES
   const SYNC_TABLES = [
     // 'personal_records', // DISABLED
   ];
   // Redeploy function
   ```

2. **Database Rollback**:
   ```sql
   -- Drop table (will lose all PRs on server)
   DROP TABLE IF EXISTS personal_records CASCADE;
   ```

3. **Frontend Rollback**:
   - Revert to previous version
   - PRs continue working locally (offline-only mode)

### Notes

- Personal records will continue working offline even if sync fails
- No breaking changes to existing functionality
- Backward compatible with pre-sync PRs in IndexedDB
- Sync is opt-in (requires user authentication)

### Related Files

- Migration: `supabase/migrations/20251014-01-create-personal-records-table.sql`
- Edge Function: `supabase/functions/sync_v2/index.ts`
- Types: `apps/frontend/src/types/coaching.ts`
- Service: `apps/frontend/src/services/storageService.ts`
- Tests: TBD (manual testing first)

### Task Reference

- **Module**: 2.7.5 - Cross-Device Sync for Personal Records
- **Plan**: `docs/implementation-plans/repcue-ai-coach/ai-coach-implementation-plan.md`
- **Estimated Time**: 3 hours
- **Actual Time**: ~2 hours
- **Status**: ✅ Dev deployment complete, ready for testing
