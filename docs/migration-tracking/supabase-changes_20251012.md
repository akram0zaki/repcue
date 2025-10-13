# Supabase Changes - 2025-10-12

## Database Migration: Fix exec_sql for DML Operations

### Issue: Workout Delete Sync Failures

**Problem**: Users were experiencing sync errors when trying to delete workouts. The error message showed:
```
exec_sql error: syntax error at or near "SET" - Query: UPDATE workouts SET deleted = true, updated_at = NOW() WHERE id = $1 AND owner_id = $2
```

**Root Cause**: The `exec_sql` RPC function was only designed to handle SELECT queries. It wrapped all queries in `SELECT array_to_json(array_agg(row_to_json(t))) FROM (...)`, which caused DML (UPDATE/DELETE/INSERT) statements to fail.

**Migration Created**: `supabase/migrations/20251012-01-fix-exec-sql-for-dml.sql`

**Changes**:
1. Modified `exec_sql` function to detect query type (SELECT vs UPDATE/DELETE/INSERT)
2. For SELECT queries: Returns results as JSON array (existing behavior)
3. For DML queries: Executes the query and returns affected row count as JSON
4. Added proper grants for authenticated and service_role
5. Added function documentation comment

**Status**: ✅ Applied to Both Environments
- Development (repcue-dev): Applied 2025-10-12
- Production (RepCue): Applied 2025-10-12

**Testing Required**:
- [x] Test workout deletion via sync (fixed by this migration)
- [x] Test exercise deletion via sync
- [x] Verify SELECT queries still work (pull operations)
- [x] Check sync logs for any errors

**Related Issues**:
- Custom exercises not syncing to server
- Workout delete operations failing with SQL syntax errors
- Sync returning partial_success status with multiple delete errors

---

## Frontend Architecture Fix: ExerciseDetailPage Offline-First Violation

### Issue: Direct Supabase Query in ExerciseDetailPage

**Problem**: When clicking on a custom exercise to view its details, the page made a direct REST API call to Supabase instead of loading from IndexedDB, resulting in:
- 406 (Not Acceptable) errors
- "Cannot coerce the result to a single JSON object" errors
- Page failed to load exercise details
- Violated the app's offline-first architecture

**Root Cause**: The `loadExerciseDetails` function in [ExerciseDetailPage.tsx](apps/frontend/src/pages/ExerciseDetailPage.tsx) was making direct `supabase.from('exercises').select()` calls for user-created exercises instead of using the StorageService.

**Fix Applied**:
1. Replaced direct Supabase query with `storageService.getExerciseById(id)` for offline-first data access
2. Removed unnecessary `supabase` import
3. Removed Supabase availability check

**Code Changes**:
```typescript
// BEFORE (violated offline-first):
const { data, error } = await supabase
  .from('exercises')
  .select(`
    *,
    profiles!owner_id(display_name)
  `)
  .eq('id', id)
  .eq('deleted', false)
  .single();

// AFTER (offline-first):
exerciseData = await storageService.getExerciseById(id);
```

**Files Modified**:
- ✅ [apps/frontend/src/pages/ExerciseDetailPage.tsx](apps/frontend/src/pages/ExerciseDetailPage.tsx)
- ✅ [apps/frontend/src/services/storageService.ts](apps/frontend/src/services/storageService.ts) - Added `getExerciseById()` method

**New Method Added**:
```typescript
/**
 * Get a single exercise by ID from IndexedDB (offline-first).
 * Handles both user-created exercises (UUID) and built-in exercises.
 */
public async getExerciseById(exerciseId: string): Promise<Exercise | null>
```

**Architecture Benefits**:
- Respects offline-first principle
- Data loaded from IndexedDB (instant, works offline)
- Sync service handles background synchronization with Supabase
- No direct coupling between UI components and Supabase
- Consistent with the rest of the app's data access patterns

**Status**: ✅ Fixed - 2025-10-12

---

## Frontend Fix: Missing Category Field in Exercise Form

### Issue: Exercise Sync Failing with NOT NULL Constraint

**Problem**: When creating/editing exercises and uploading videos, sync failed with error:
```
null value in column "category" of relation "exercises" violates not-null constraint
```

**Root Cause**: The [ExerciseForm.tsx](apps/frontend/src/components/ExerciseForm.tsx) was refactored to use badge/tag system (e.g., `category:core`) but the database still had a NOT NULL constraint on the `category` column.

**Resolution**: Instead of extracting category from tags, we made the database column optional (see migration below). The frontend no longer needs to handle the `category` field at all - categorization is handled via the tag-based system.

**Files Modified**:
- ✅ [apps/frontend/src/components/ExerciseForm.tsx](apps/frontend/src/components/ExerciseForm.tsx) - Confirmed no category field is sent (tag-based only)

**Status**: ✅ Resolved - 2025-10-12 (via database migration)

---

## Database Migration: Make Category Column Optional

### Migration: Make exercises.category Nullable

**Issue**: The `category` column in the `exercises` table had a NOT NULL constraint, but the app has moved to a badge/tag-based architecture where category is managed via tags (e.g., `category:core`).

**Solution**: Made the `category` column optional (nullable) to align with the modern tag-based architecture while maintaining backward compatibility.

**Migration Created**: `supabase/migrations/20251012-02-make-category-optional.sql`

**Changes**:
1. Removed NOT NULL constraint from `exercises.category` column
2. Added documentation comment explaining the change
3. Set default value 'general' for any existing NULL categories

**SQL**:
```sql
ALTER TABLE exercises
ALTER COLUMN category DROP NOT NULL;

COMMENT ON COLUMN exercises.category IS
'Exercise category. Optional field maintained for backward compatibility. Modern exercises use tag-based categorization (e.g., category:core in tags array). Can be null for exercises that only use tags.';

UPDATE exercises
SET category = 'general'
WHERE category IS NULL;
```

**Status**: ✅ Applied to Both Environments
- Development (repcue-dev): Applied 2025-10-12
- Production (RepCue): Applied 2025-10-12

**Benefits**:
- Aligns database schema with tag-based architecture
- Exercises can now be created without explicitly setting category
- Maintains backward compatibility for existing code
- Frontend can derive category from tags when needed

**Note**: The frontend ExerciseForm no longer sends the category field - categorization is purely tag-based now.

---

## Edge Function Updates

### webauthn-authenticate (v13)

**Issue**: When authenticating with biometrics and providing an email address, the edge function returned a 500 error with: "TypeError: r.replace is not a function"

**Root Cause**: The `generateAuthenticationOptions` function was receiving credential IDs as `Uint8Array` objects, but SimpleWebAuthn v12+ expects them as base64url strings.

**Fix Applied**:
- Added `uint8ArrayToBase64url()` helper function to convert credential ID bytes to base64url format
- Updated `allowCredentials` mapping to convert credential IDs from stored byte arrays to base64url strings before passing to SimpleWebAuthn

**Code Changes**:
```typescript
// Helper function to convert bytes to base64url
function uint8ArrayToBase64url(bytes: Uint8Array): string {
  const binaryString = String.fromCharCode(...bytes);
  const base64 = btoa(binaryString);
  // Convert base64 to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Use conservative transport list for better cross-browser compatibility
const transports: AuthenticatorTransport[] = ['internal', 'usb', 'ble', 'nfc'];

allowCredentials = userAuthenticators.map(auth => {
  const credentialBytes = new Uint8Array(JSON.parse(auth.credential_id));
  return {
    id: uint8ArrayToBase64url(credentialBytes),
    type: 'public-key' as const,
    transports
  };
})
```

**Testing**:
- Biometric authentication without email: ✓ Works (discoverable credentials flow)
- Biometric authentication with email: ✓ Fixed (now properly converts credential IDs)

**Environment**: Both Development and Production

**Status**: ✅ Deployed to both environments
- Development (repcue-dev): v13 - Deployed 2025-10-12
- Production (RepCue): v9 - Deployed 2025-10-12

---

## Edge Function Fix: Video URL Scheme After Sync Completion

### Issue: Synced Videos Still Show "Pending Sync" Message

**Problem**: After successfully uploading a video to Supabase storage, the UI continued to display "الفيديو في انتظار المزامنة" (Video pending sync) message even though the video was fully synced and accessible.

**Root Cause**:
1. The sync_v2 edge function was correctly uploading videos to storage
2. However, after upload, it was keeping the exercise's `custom_video_url` as `blob-pending-sync://` instead of changing it to `blob-video://`
3. The VideoUploadWidget component shows the pending sync message for ANY `blob-pending-sync://` URL
4. Therefore, even after successful sync, the UI continued to show the pending message

**Files Modified**:

1. **supabase/functions/sync_v2/index.ts** - Line 292
   - **Before**: `custom_video_url: \`blob-pending-sync://\${exercise_id}/\${file_name}\``
   - **After**: `custom_video_url: \`blob-video://\${exercise_id}/\${file_name}\``
   - Also added logging at line 302 to confirm URL scheme change

2. **apps/frontend/src/components/VideoUploadWidget.tsx** - Line 342
   - **Before**: Shows pending message for `isLocalBlob` (includes both `blob-pending-sync://` AND `blob-video://`)
   - **After**: Shows pending message ONLY for `blob-pending-sync://` URLs
   - Change: `{isLocalBlob && (` → `{currentVideoUrl.startsWith('blob-pending-sync://') && (`

**Behavior**:
- Local upload: Creates `blob-pending-sync://` URL → Shows pending message ✓
- After sync: Changes to `blob-video://` URL → Hides pending message ✓
- Status text at bottom:
  - `blob-pending-sync://` → "Local video (offline-ready)"
  - `blob-video://` → "Local video (synced)"

**Status**: ✅ Fixed and Deployed to Both Environments
- Edge function deployed to development: 2025-10-12
- Edge function deployed to production: 2025-10-12
- Frontend component updated and built: 2025-10-12

**Testing**:
- Upload video to custom exercise
- Verify UI shows "Video ready offline - will sync when online"
- Trigger sync (or wait for automatic sync)
- After sync completes, verify pending message disappears
- Video should continue playing normally from IndexedDB

**Documentation Updated**:
- ✅ [docs/sync-system.md](docs/sync-system.md) - Added detailed video URL scheme documentation explaining the lifecycle and behavior of `blob-pending-sync://` vs `blob-video://` URLs
