# Supabase Changes - 2025-12-01

## Overview
Fixed storage RLS policies for `exercise-videos` bucket to enable VideoUploadService direct uploads.

## Database Migrations

### 20251201_fix_exercise_videos_storage_policies.sql

**Problem**: VideoUploadService was failing with "new row violates row-level security policy" error when trying to upload custom exercise videos to Supabase Storage.

**Root Cause**: The existing storage policies were incorrectly configured:
1. INSERT policy allowed any authenticated user to upload anywhere in the bucket
2. UPDATE policy checked wrong folder position `[2]` (exerciseId) instead of `[1]` (userId)
3. DELETE policy had the same wrong position check

**Storage Path Format**: `{userId}/{exerciseId}/{fileName}.mp4`
- Position `[1]` = userId (first folder)
- Position `[2]` = exerciseId (second folder)

**Changes Made**:
1. Dropped incorrect policies:
   - `Users can upload exercise videos n3qp65_0` (INSERT)
   - `Users can manage their own videos n3qp65_0` (UPDATE)
   - `Users can manage their own videos n3qp65_1` (DELETE)

2. Created correct policies:
   - `Users can upload to own exercise-videos folder` (INSERT) - validates `[1] = auth.uid()`
   - `Users can update own exercise-videos` (UPDATE) - validates `[1] = auth.uid()`
   - `Users can delete own exercise-videos` (DELETE) - validates `[1] = auth.uid()`

**SELECT policy retained**: `Anyone can view exercise videos n3qp65_0` - bucket is public, anyone can read.

## Deployment Status

| Environment | Status | Notes |
|-------------|--------|-------|
| Development (repcue-dev) | ✅ Applied | Migration applied, video upload tested successfully |
| Production (RepCue) | ✅ Applied | Migration applied 2025-12-01 |

## Related Changes

### Previous Session (2025-11-30/12-01)
- Created `VideoUploadService` for background video uploads
- Removed `video_files` from sync_v2 scope (was causing 5.2MB payload timeouts)
- sync_v2 deployed: v66 (dev), v37 (prod)

## Verification Checklist
- [x] Apply migration to dev environment
- [x] Test video upload in dev
- [x] Apply migration to prod environment
- [ ] Test video upload in prod
- [ ] Verify existing videos still accessible

---

## Migration #2: Add SELECT Policies for exercise-videos Storage Bucket

### 20251201_add_exercise_videos_select_policy.sql

**Problem**: Video uploads still failing in production with 400 errors despite INSERT policy being correct.

**Root Cause Analysis**: Investigation revealed:
1. INSERT/UPDATE/DELETE policies existed and were correctly configured ✅
2. Upload path was correct (`{userId}/{exerciseId}/{fileName}.mp4`) ✅
3. `storage.foldername()` function returns expected values ✅
4. **SELECT policy was MISSING** ❌

Supabase Storage may require SELECT permissions for:
- Checking if a file exists before upsert operations
- Reading file metadata during upload operations

**Changes Made**:
```sql
-- Add SELECT policy for authenticated users to read their own videos
CREATE POLICY "Users can read own exercise-videos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exercise-videos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Add public read policy since the bucket is public
CREATE POLICY "Public can read exercise-videos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'exercise-videos');
```

### Deployment Status

| Environment | Status | Notes |
|-------------|--------|-------|
| Development (repcue-dev) | ✅ Applied | Migration applied 2025-12-01 |
| Production (RepCue) | ✅ Applied | Migration applied 2025-12-01 |

### Rollback Plan
```sql
DROP POLICY IF EXISTS "Users can read own exercise-videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read exercise-videos" ON storage.objects;
```

---

## Migration #3: Add video_files Unique Constraint for Upsert Support

### 20251201_add_video_files_unique_constraint.sql

**Problem**: VideoUploadService failing with error:
```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**Root Cause**: The existing `idx_video_files_unique_per_exercise` is a unique **index**, not a unique **constraint**. PostgreSQL's `ON CONFLICT` clause requires an actual constraint when specifying column names for upsert.

**Changes Made**:
```sql
-- Drop the existing unique index (it doesn't work with upsert ON CONFLICT)
DROP INDEX IF EXISTS idx_video_files_unique_per_exercise;

-- Add a proper unique constraint instead
ALTER TABLE video_files
ADD CONSTRAINT video_files_exercise_owner_unique 
UNIQUE (exercise_id, owner_id);
```

### Deployment Status

| Environment | Status | Notes |
|-------------|--------|-------|
| Development (repcue-dev) | ✅ Applied | Migration applied, video sharing tested successfully |
| Production (RepCue) | ⏳ Pending | |

### Related Code Changes
- `apps/frontend/src/services/videoUploadService.ts`:
  - Added deduplication logic in `getPendingVideoFiles()` - keeps only one pending per exercise
  - Changed upsert conflict column from `id` to `exercise_id,owner_id`
  - Added cleanup of duplicate pending entries in `markUploadComplete()`

### Rollback Plan
```sql
-- Drop the constraint
ALTER TABLE video_files DROP CONSTRAINT IF EXISTS video_files_exercise_owner_unique;

-- Re-create the index
CREATE UNIQUE INDEX idx_video_files_unique_per_exercise 
ON video_files (exercise_id, owner_id) 
WHERE deleted = false;
```
