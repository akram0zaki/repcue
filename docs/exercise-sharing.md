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
   save-shared-exercise → Duplicate exercise with new owner
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
- Creates duplicate exercise with new owner
- Sets up video file references for the new owner
- Returns success status and new exercise ID

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
-- No direct anonymous access - uses service role bypass
CREATE POLICY "Users can view their own video files" ON video_files
  FOR SELECT TO public
  USING (auth.uid() = owner_id);

-- Shared exercise video access (for saved copies)
CREATE POLICY "Users can view video files for shared exercises" ON video_files
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM exercises e
    WHERE e.owner_id = auth.uid()
    AND e.is_shared_copy = true
    AND e.shared_from_exercise_id = video_files.exercise_id
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
- Video recovery system marks missing files for re-sync

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

## Current Status

### Implemented Features
- Basic share creation and link generation
- Anonymous viewing of shared exercises with video support
- Token-based security with expiration support
- Video recovery system for missing files
- Edge function architecture for scalability

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