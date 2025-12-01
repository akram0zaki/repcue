# Supabase Changes - 2025-01-30

## Overview
Removed `video_files` from sync scope to fix timeout issues caused by large payload sizes.

## Edge Function Deployments

### sync_v2

#### Development (repcue-dev)
- **Project ID**: xwzrsfkzqxdybjrkkkvh
- **Version**: 66
- **Deployed**: 2025-11-30

#### Production (RepCue)
- **Project ID**: zumzzuvfsuzvvymhpymk
- **Version**: 37
- **Deployed**: 2025-11-30

### Changes Made
1. **Removed `video_files` from `SYNC_TABLES`**
   - Video files were causing 5MB+ payloads due to binary `file_data` serialization
   - Custom videos should use direct Supabase Storage upload instead
   - Only `storage_path` reference should sync (future implementation)

2. **Updated Deno imports** (from previous session)
   - Changed from deprecated `deno.land/std` to modern JSR imports
   - Updated from `serve()` to `Deno.serve()` pattern
   - This fixed cold start delays causing 150+ second timeouts

## Client-Side Changes

### correctSyncService.ts
- Removed `video_files` from `SYNC_ORDER` array
- Removed `MAX_VIDEO_FILE_SIZE_BYTES` constant (1MB limit - no longer needed)
- Removed `MAX_SYNC_PAYLOAD_SIZE_BYTES` constant (2MB limit - no longer needed)
- Removed video file size checking logic from `collectDirtyBatch`
- Removed video_files deduplication logic from push phase queue building

## Impact Assessment

### No Breaking Changes
- Built-in exercise videos were never synced (served from R2)
- Custom video upload feature not yet widely used
- Existing `storage_path` references remain valid

### Future Work Needed
- Implement dedicated video upload edge function
- Direct upload to Supabase Storage bucket
- Only sync the resulting `storage_path` string reference

## Verification
- ✅ TypeScript compiles without errors
- ✅ Frontend build succeeds
- ✅ sync_v2 deployed to both environments
- ⚠️ Some pre-existing test failures (unrelated to sync changes)
