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
