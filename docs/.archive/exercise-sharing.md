# Exercise Sharing Architecture

This document explains the exercise sharing system in RepCue, including share creation, link distribution, and anonymous viewing.

## Overview

RepCue's exercise sharing system allows users to share their custom exercises through secure, time-limited links. The current implementation supports public sharing (anyone with the link) with basic permission levels.

## Components Involved

### Client-Side (Frontend)
- **ShareButton** (`src/components/ShareButton.tsx`) - Share link creation UI
- **StandaloneSharedExercise** (`src/StandaloneSharedExercise.tsx`) - Standalone viewing interface for shared exercises
- **Main App** routing handles `/share/{token}` routes separately from main application

### Server-Side (Supabase Edge Functions)
- **share-exercise** - Creates share records and tokens
- **get-shared-exercise** - Retrieves shared exercises for anonymous viewing
- **save-shared-exercise** - Saves shared exercises to user's library (authenticated users)
- **download-shared-video** - Handles video access for shared exercises

### Database Tables
- **exercise_shares** - Share records and permissions
- **exercises** - Exercise data
- **video_files** - Associated video content
- **user_favorites** - References to shared exercises (reference-based sharing)
- **profiles** - User display names

## Sharing Flow Overview

```
1. USER CREATES SHARE
   ↓
   ShareButton → share-exercise Edge Function
   ↓
   Generate token → Store in exercise_shares table
   ↓
   Return share URL: /share/{token}

2. RECIPIENT ACCESSES LINK
   ↓
   Browser loads /share/{token} → StandaloneSharedExercise.tsx
   ↓
   Extract token → Call get-shared-exercise?token={token}
   ↓
   Validate token → Fetch exercise data → Generate video signed URL
   ↓
   Display exercise with temporary video access

3. OPTIONAL: SAVE TO LIBRARY (if authenticated)
   ↓
   save-shared-exercise → Create reference in user_favorites table (reference-based system)
```

## Detailed Step-by-Step Flow

### Phase 1: Share Creation

#### 1. User Initiates Share
```typescript
// ShareButton component
const handleGenerateShareUrl = async () => {
  const shareData = {
    exercise_id: exerciseId,
    permission_level: shareType,        // 'view' | 'copy'
    shared_with_user_email: email,      // null for public
    expires_at: expiryDate,             // null for no expiry
  };
  // ... call create-exercise-share function
};
```

#### 2. Share Record Creation (`create-exercise-share`)
```typescript
// Database operations:
1. Validate exercise exists and user owns it
2. Generate cryptographically secure share token (32 bytes)
3. Create exercise_shares record:
   {
     id: UUID,
     exercise_id: exerciseId,
     owner_id: userId,
     share_token: secureRandomToken,
     permission_level: 'view' | 'copy',
     shared_with_user_id: null,         // Resolved from email
     shared_with_user_email: email,     // Optional
     expires_at: timestamp,             // Optional
     created_at: now,
     deleted: false
   }
4. Return shareable URL
```

#### 3. Share URL Format
```
https://app.repcue.com/share/abc123xyz789def456ghi

Components:
- Base URL: app domain
- Route: /share/{token}
- Token: path parameter (64-character hex string)
```

### Phase 2: Link Distribution

#### Current Implementation
- **Copy to Clipboard** - Primary sharing method
- **Simple Modal** - Basic share dialog with copy functionality

#### Security Features
- **Unique Tokens** - 64-character hex tokens for each share
- **Expiry Support** - Optional expiration dates (implementation in progress)
- **Revocation** - Shares can be marked as deleted

### Phase 3: Anonymous Viewing

#### 1. Share Link Access
```typescript
// StandaloneSharedExercise.tsx
useEffect(() => {
  const fetchSharedExercise = async () => {
    const shareToken = window.location.pathname.split('/share/')[1];
    const response = await fetch(
      `${supabaseFunctionBaseUrl}/functions/v1/get-shared-exercise?token=${shareToken}`
    );
    // Process response...
  };
}, []);
```

#### 2. Share Validation (`get-shared-exercise`)
```typescript
// Validation checks:
1. Token format validation (length, characters)
2. Share record lookup by token
3. Share not deleted/revoked
4. Share not expired (if expires_at set)
5. Exercise record exists
6. Video file availability (if applicable)
```

#### 3. Video Access for Anonymous Users
```typescript
// For exercises with custom videos:
1. Lookup video_files record by exercise_id
2. Verify file exists in Supabase Storage
3. Generate signed URL with 1-hour expiry:
   const { data: signedUrl } = await supabase.storage
     .from('videos')
     .createSignedUrl(videoFile.storage_path, 3600);
4. Return signed URL to client
```

#### 4. Public Exercise Display
```typescript
// Data returned to client:
{
  success: true,
  exercise: {
    id, name, description, category,
    muscle_groups, equipment_needed,
    exercise_type, difficulty_level,
    rep_duration_seconds, instructions,
    custom_video_url: signedUrl,      // Temporary signed URL
    // Note: Sensitive fields removed (owner_id, etc.)
  },
  shareInfo: {
    sharedBy: "User Display Name",    // From profiles table
    sharedAt: "2025-01-15T10:30:00Z",
    isPublic: true,                   // vs email-targeted
    permissionLevel: "view",          // vs "copy"
    expiresAt: null                   // vs timestamp
  }
}
```

### Phase 4: Authenticated Save (Optional)

**Note**: This functionality exists in the codebase but is not currently accessible through the UI.

#### Edge Function: `save-shared-exercise`
- Validates share token and user authentication
- Creates reference record in `user_favorites` table with `exercise_type: 'shared'`
- Links user to original exercise (no duplication)
- Returns success status and reference ID

#### Current Implementation: Reference-Based Sharing
- **No exercise duplication**: Shared exercises remain owned by original creator
- **Reference system**: Recipients get entries in `user_favorites` table
- **Sync integration**: `sync_v2` pulls both owned exercises AND shared references
- **Video access**: Uses `download-shared-video` edge function for permission-based access

## Database Schema Deep Dive

### `exercise_shares` Table
```sql
CREATE TABLE exercise_shares (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id           UUID REFERENCES exercises(id) ON DELETE CASCADE,
  owner_id              UUID REFERENCES profiles(id) ON DELETE CASCADE,
  share_token           TEXT UNIQUE,                    -- 64-character hex string
  permission_level      VARCHAR,                        -- 'view' | 'copy'
  shared_with_user_id   UUID REFERENCES profiles(id),   -- Target user (optional)
  expires_at            TIMESTAMPTZ,                    -- Expiry (optional)
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted               BOOLEAN DEFAULT false,
  version               BIGINT DEFAULT 1
);
```

**Note**: The actual schema differs from complex documentation - no email field, simpler structure, version field added.

### `user_favorites` Table (Reference-Based Sharing)
```sql
CREATE TABLE user_favorites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- Recipient user
  item_id               UUID,                                             -- Original exercise ID
  item_type             VARCHAR DEFAULT 'exercise',                      -- Type of shared item
  exercise_type         VARCHAR,                                          -- 'shared' for shared exercises
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted               BOOLEAN DEFAULT false,
  version               BIGINT DEFAULT 1
);
```

**Purpose**: Links recipients to original exercises without duplication. Recipients see shared exercises in their catalog while creators retain ownership.

### Row Level Security (RLS) Policies

#### Exercise Shares Table
```sql
-- Allows anonymous users to read valid share records
CREATE POLICY "Public read access for exercise shares" ON exercise_shares
  FOR SELECT TO anon, authenticated
  USING (share_token IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND deleted = false);

-- Users can manage their own shares
CREATE POLICY "Users can manage their exercise shares" ON exercise_shares
  FOR ALL TO public
  USING (owner_id = auth.uid());
```

#### Exercises Table
```sql
-- Allows anonymous access to exercises that have valid shares
CREATE POLICY "Public read access for shared exercises" ON exercises
  FOR SELECT TO anon, authenticated
  USING (id IN (
    SELECT exercise_id FROM exercise_shares
    WHERE share_token IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND deleted = false
  ));
```

#### Video Files Table
```sql
-- Users can view their own video files
CREATE POLICY "Users can view their own video files" ON video_files
  FOR SELECT TO public
  USING (auth.uid() = owner_id);

-- Shared exercise video access (reference-based system)
CREATE POLICY "Users can view video files for shared exercises" ON video_files
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM user_favorites uf
    WHERE uf.owner_id = auth.uid()
    AND uf.item_id = video_files.exercise_id
    AND uf.item_type = 'exercise'
    AND uf.exercise_type = 'shared'
    AND uf.deleted = false
  ));
```

#### Storage Policies
```sql
-- Users can only access their own video folders
CREATE POLICY "Users can download their own videos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'videos' AND auth.uid()::text = foldername(name)[1]);

-- No anonymous access to storage - requires signed URLs
```

## Key Implementation Details

### Permission Levels
- **'view'**: Viewing exercise details, instructions, video (current default)
- **'copy'**: Everything from 'view' + saving to library (planned feature)

### Token Security
- 64-character hex tokens generated using crypto.getRandomValues()
- Database uniqueness constraint
- 256 bits of entropy

### Video Sharing
- Original videos stored as `blob-pending-sync://` URLs
- Anonymous access uses 1-hour signed URLs from Supabase Storage
- **Shared exercise videos**: Use `download-shared-video` edge function for permission-based access
- Video recovery system marks missing files for re-sync

#### Video Access for Shared Exercises
The current implementation uses a dual-path approach for video resolution:

```typescript
// In resolveVideoUrl.ts and correctSyncService.ts
const isSharedExercise = currentUserId &&
  !storedVideoFile.storage_path.startsWith(currentUserId);

if (isSharedExercise) {
  // Use download-shared-video edge function
  const response = await fetch('/functions/v1/download-shared-video', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({
      exerciseId: exerciseId,
      originalExerciseId: pathParts[1],
      originalOwnerId: pathParts[0]
    })
  });
} else {
  // Direct storage access for own videos
  const { data } = await supabase.storage.from('videos').download(storagePath);
}
```

**Why this approach?**
- **Permission enforcement**: Edge function validates `user_favorites` access
- **RLS bypass**: Service role key allows access to creator's storage
- **Unified experience**: Both sync and video resolution use same logic

### RLS Policy Workarounds

#### Problem: Supabase RLS prevents anonymous users from accessing video files
**Solution**: Service Role Key Bypass in Edge Functions
- `get-shared-exercise` edge function uses `SUPABASE_SERVICE_ROLE_KEY`
- Service role bypasses all RLS policies
- Edge function validates share tokens before granting access
- Generates temporary signed URLs (1-hour expiry) for anonymous access

#### Problem: Storage bucket RLS restricts video access to owners only
**Solution**: Signed URL Generation
```typescript
// In get-shared-exercise edge function:
const { data: signedUrl } = await supabase.storage
  .from('videos')
  .createSignedUrl(videoFile.storage_path, 3600); // 1 hour
```
- Signed URLs bypass storage RLS policies
- Service role key required to generate signed URLs
- URLs expire automatically for security

### Data Storage Strategy Workarounds

#### Problem: JSON serialization of File/Blob objects for sync
**Solution**: File → ArrayBuffer → Byte Array conversion
```typescript
// In sync service when uploading to server:
const arrayBuffer = await file.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);
record.file_data = Array.from(uint8Array); // Convert to plain array for JSON
```

#### Problem: Database storage vs IndexedDB compatibility
**Solution**: Dual storage approach
- **Database**: `file_data` column as `bytea` type (stores byte arrays)
- **IndexedDB**: `file_data` stored as `File`/`Blob` objects for browser compatibility
- **Conversion**: Automatic conversion during sync operations

#### Problem: Postgres bytea size limits and performance
**Solution**: Hybrid storage model
- Small videos: Stored directly in `video_files.file_data` (bytea)
- Large videos: Stored in Supabase Storage, referenced by `storage_path`
- Client downloads from storage and caches in IndexedDB for offline access

#### Problem: Cross-browser blob URL compatibility
**Solution**: ArrayBuffer reconstruction for Firefox
```typescript
// In resolveVideoUrl for Firefox compatibility:
if (storedVideoFile.file_data instanceof File) {
  const arrayBuffer = await storedVideoFile.file_data.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: storedVideoFile.mime_type });
  blobUrl = URL.createObjectURL(blob);
}
```

## Video Corruption Investigation & Resolution

### Problem Discovery
During the implementation of exercise sharing with video support, a critical bug was discovered where shared exercise videos would appear corrupted and unplayable after being saved to a user's library. The symptoms included:

- Videos showing `MEDIA_ERR_SRC_NOT_SUPPORTED` errors
- File sizes being inflated (e.g., 587,468 bytes becoming 1,073,272 bytes)
- Videos working perfectly when originally uploaded, but failing after sharing
- Issue persisting across different browsers, ruling out session conflicts

### Investigation Timeline

#### Phase 1: Session Conflict Theory (Incorrect)
Initial investigation focused on authentication session conflicts when users clicked magic links while logged in as different users. This was ruled out by:
- Testing with separate browsers for isolation
- Confirming the issue persisted with proper session separation
- Identifying that the root cause was technical, not authentication-related

#### Phase 2: Data Corruption Discovery
Through detailed logging analysis, the investigation revealed:
- Original video file: 587,468 bytes (BearCrawl_720x576.mp4)
- Downloaded video file: 1,073,272 bytes (almost double size)
- Edge function returning HTTP 200 status with correct Content-Type headers
- Binary data being converted to string unexpectedly

#### Phase 3: Root Cause Identification
The bug was traced to the video download process in `apps/frontend/src/App.tsx`:

```typescript
// PROBLEMATIC CODE - supabase.functions.invoke() converts binary to string
const downloadResponse = await supabase.functions.invoke('download-shared-video', {...});
const videoBlob = downloadResponse.data; // This was a STRING, not a Blob!
```

**Root Cause**: `supabase.functions.invoke()` was incorrectly parsing binary video data as UTF-8 text, causing data corruption when the raw bytes were converted to string format.

### Solution Implementation

#### The Fix: Direct Fetch Approach
Replaced `supabase.functions.invoke()` with native `fetch()` API to properly handle binary responses:

```typescript
// CORRECTED CODE - Direct fetch preserves binary data
const functionsUrl = `${supabaseUrl}/functions/v1/download-shared-video`;
const downloadResponse = await fetch(functionsUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey
  },
  body: JSON.stringify({...})
});

const videoBlob = await downloadResponse.blob(); // Properly extracts binary data
```

#### Why This Works
1. **Native Blob Handling**: `fetch().blob()` correctly handles binary response bodies
2. **No Text Conversion**: Bypasses Supabase client's automatic response parsing
3. **Preserves File Integrity**: Maintains exact byte-for-byte video data
4. **Edge Function Unchanged**: No changes needed to the working edge function

### Key Lessons Learned

#### 1. Library Limitations Can Cause Data Corruption
- High-level SDK methods may not handle all data types correctly
- Binary data requires special consideration in web APIs
- When debugging corruption, test with lowest-level APIs first

#### 2. File Size is a Critical Diagnostic Tool
- Unexpected file size changes immediately indicate data corruption
- Byte-level comparison reveals parsing/encoding issues
- Size inflation often suggests text conversion of binary data

#### 3. Comprehensive Logging is Essential
- Detailed logging at each step revealed the exact failure point
- Logging both expected and actual values exposed the discrepancy
- Response type inspection (`typeof response.data`) was crucial

#### 4. Edge Function vs Client-Side Debugging
- When file corruption occurs, test both ends of the data pipeline
- Edge functions returning correct data doesn't guarantee client reception
- Client-side data processing can introduce bugs independent of server logic

#### 5. Browser Isolation Doesn't Solve Data Processing Bugs
- Authentication and session issues are separate from data corruption
- Cross-browser testing helps eliminate browser-specific bugs
- But data processing issues require examining the actual data pipeline

### Prevention Strategies

#### 1. Always Use Type-Appropriate APIs
```typescript
// For binary data
const response = await fetch(url);
const blob = await response.blob();

// For JSON data
const response = await supabase.functions.invoke(name, {...});
const data = response.data;
```

#### 2. Implement Size Validation
```typescript
logger.log('🎥 [App] Received video blob from edge function:', {
  blobSize: videoBlob.size,
  blobType: videoBlob.type,
  expectedSize: videoFileRecord.file_size,
  expectedType: videoFileRecord.mime_type
});

// Validate expected vs actual size
if (Math.abs(videoBlob.size - videoFileRecord.file_size) > 1000) {
  throw new Error(`File size mismatch: expected ${videoFileRecord.file_size}, got ${videoBlob.size}`);
}
```

#### 3. Add Binary Data Type Guards
```typescript
// Validate that we got a proper Blob
if (!(videoBlob instanceof Blob)) {
  throw new Error(`Expected Blob from edge function, got ${typeof videoBlob}`);
}
```

#### 4. Test File Integrity End-to-End
- Create test cases that verify file byte integrity through the entire sharing pipeline
- Include both small and large video files in tests
- Test multiple video formats and codecs

### Technical Documentation

#### Modified Files
- `apps/frontend/src/App.tsx` - Replaced `supabase.functions.invoke()` with direct `fetch()` for video downloads

#### Edge Functions (Unchanged)
- `download-shared-video` - Already correctly returning binary video data with proper headers

#### Verification Methods
- File size comparison (expected vs received)
- MIME type validation
- Video playback functionality testing
- Cross-browser compatibility verification

### Resolution Status
The video corruption issue has been resolved in production:
- ✅ Direct `fetch()` API used instead of `supabase.functions.invoke()`
- ✅ Binary video data preserved without corruption
- ✅ File size integrity maintained
- ✅ Successful video loading and playback across all sharing scenarios
- ✅ No remaining `MEDIA_ERR_SRC_NOT_SUPPORTED` errors

## Current Status & Architecture Changes

### Implemented Features
- Basic share creation and link generation
- Anonymous viewing of shared exercises with video support
- Token-based security with expiration support
- Video recovery system for missing files
- Edge function architecture for scalability
- **Reference-based sharing system** (no exercise duplication)
- **Dual-path video access** (direct storage vs edge function)
- **Enhanced sync system** for shared exercise handling
- **Fixed video corruption in shared exercise downloads**

### Key Architecture Changes
#### From Copy-Based to Reference-Based Sharing
- **Old system**: Duplicated exercises with `is_shared_copy` flags
- **New system**: References in `user_favorites` table, no duplication
- **Benefits**: Reduced storage, real-time updates from creators, simpler sync

#### Video Access Evolution
- **Anonymous users**: 1-hour signed URLs (unchanged)
- **Authenticated users**: Dual-path resolution based on ownership
- **Permission enforcement**: Edge function validates `user_favorites` access
- **Unified approach**: Both `resolveVideoUrl.ts` and `correctSyncService.ts` use same logic

#### Sync System Enhancements
- **Enhanced `sync_v2`**: Pulls both owned and shared exercises
- **Special functions**: `pullExercisesWithShared()` and `pullVideoFilesWithShared()`
- **Frontend integration**: `useSharedExercises` hook for UI detection

### Known Limitations
- Save to library functionality exists but not exposed in UI
- No advanced permission controls
- No share analytics or management
- No email-based sharing workflow

### Architecture Notes
- Uses standalone component for shared exercise viewing
- Separate routing for `/share/{token}` URLs
- Videos accessed via 1-hour signed URLs for anonymous users
- Robust error handling and recovery mechanisms
- **Direct fetch() API used for binary video downloads to prevent corruption**
- **Reference-based system maintains data integrity and creator ownership**