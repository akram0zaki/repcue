# Exercise Sharing Architecture

This document explains the complete exercise sharing system in RepCue, including share creation, link distribution, anonymous viewing, and authenticated saving.

## Overview

RepCue's exercise sharing system allows users to share their custom exercises with others through secure, time-limited links. The system supports both public sharing (anyone with the link) and private sharing (specific email addresses), with different permission levels.

## Components Involved

### Client-Side (Frontend)
- **ShareButton** (`src/components/ShareButton.tsx`) - Share link creation UI
- **SharedExercisePage** (`src/pages/SharedExercisePage.tsx`) - Public viewing interface
- **ExercisePage** (`src/pages/ExercisePage.tsx`) - Save shared exercise functionality

### Server-Side (Supabase)
- **create-exercise-share** Edge Function - Creates share records and tokens
- **get-shared-exercise** Edge Function - Retrieves shared exercises for viewing
- **save-shared-exercise** Edge Function - Saves shared exercises to user's library

### Database Tables
- **exercise_shares** - Share records and permissions
- **exercises** - Exercise data
- **video_files** - Associated video content
- **profiles** - User display names

## Complete Sharing Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXERCISE SHARING FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    OWNER     │  │   SHARE      │  │    SHARE     │  │  RECIPIENT   │  │   SAVE TO    │
│   CREATES    │  │  CREATION    │  │    LINK      │  │   VIEWS      │  │   LIBRARY    │
│    SHARE     │  │   PROCESS    │  │ DISTRIBUTION │  │   EXERCISE   │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │                 │                 │
        ▼                 │                 │                 │                 │
┌─────────────┐           │                 │                 │                 │
│ User clicks │           │                 │                 │                 │
│"Share" btn  │           │                 │                 │                 │
└─────────────┘           │                 │                 │                 │
        │                 │                 │                 │                 │
        ▼                 │                 │                 │                 │
┌─────────────┐           ▼                 │                 │                 │
│ Share modal │ ┌─────────────────────┐     │                 │                 │
│ opens with  │ │ ShareButton.tsx     │     │                 │                 │
│ options     │ │ handleGenerateShare │     │                 │                 │
└─────────────┘ │ Url()               │     │                 │                 │
        │       └─────────────────────┘     │                 │                 │
        ▼                 │                 │                 │                 │
┌─────────────┐           ▼                 │                 │                 │
│ Select:     │ ┌─────────────────────┐     │                 │                 │
│ - Public    │ │ create-exercise-    │     │                 │                 │
│ - Private   │ │ share Edge Function │     │                 │                 │
│ - Email     │ │                     │     │                 │                 │
│ - Expires   │ └─────────────────────┘     │                 │                 │
└─────────────┘           │                 │                 │                 │
        │                 ▼                 │                 │                 │
        │       ┌─────────────────────┐     │                 │                 │
        │       │ Database Operations │     │                 │                 │
        │       │ 1. Create share     │     │                 │                 │
        │       │    record           │     │                 │                 │
        │       │ 2. Generate token   │     │                 │                 │
        │       │ 3. Set permissions  │     │                 │                 │
        │       │ 4. Set expiry       │     │                 │                 │
        │       └─────────────────────┘     │                 │                 │
        │                 │                 │                 │                 │
        │                 ▼                 │                 │                 │
        │       ┌─────────────────────┐     ▼                 │                 │
        │       │ Share URL Created   │ ┌─────────────┐       │                 │
        │       │ Format:             │ │ User copies │       │                 │
        │       │ /shared/exercise?   │ │ or shares   │       │                 │
        │       │ token=abc123xyz     │ │ link        │       │                 │
        │       └─────────────────────┘ └─────────────┘       │                 │
        │                 │                 │                 │                 │
        │                 │                 ▼                 │                 │
        │                 │       ┌─────────────────────┐     │                 │
        │                 │       │ Link Distribution   │     │                 │
        │                 │       │ - Copy to clipboard │     │                 │
        │                 │       │ - Email (optional)  │     │                 │
        │                 │       │ - Social media      │     │                 │
        │                 │       │ - QR code           │     │                 │
        │                 │       └─────────────────────┘     │                 │
        │                 │                 │                 │                 │
        │                 │                 ▼                 │                 │
        │                 │                 │                 ▼                 │
        │                 │                 │       ┌─────────────────────┐     │
        │                 │                 │       │ Recipient clicks    │     │
        │                 │                 │       │ share link          │     │
        │                 │                 │       └─────────────────────┘     │
        │                 │                 │                 │                 │
        │                 │                 │                 ▼                 │
        │                 │                 │       ┌─────────────────────┐     │
        │                 │                 │       │ SharedExercisePage  │     │
        │                 │                 │       │ loads               │     │
        │                 │                 │       └─────────────────────┘     │
        │                 │                 │                 │                 │
        │                 │                 │                 ▼                 │
        │                 │                 │       ┌─────────────────────┐     │
        │                 │                 │       │ get-shared-exercise │     │
        │                 │                 │       │ Edge Function       │     │
        │                 │                 │       └─────────────────────┘     │
        │                 │                 │                 │                 │
        │                 │                 │                 ▼                 │
        │                 │                 │       ┌─────────────────────┐     │
        │                 │                 │       │ Share Validation    │     │
        │                 │                 │       │ 1. Token exists?    │     │
        │                 │                 │       │ 2. Not expired?     │     │
        │                 │                 │       │ 3. Not deleted?     │     │
        │                 │                 │       │ 4. Exercise exists? │     │
        │                 │                 │       └─────────────────────┘     │
        │                 │                 │                 │                 │
        │                 │                 │                 ▼                 │
        │                 │                 │       ┌─────────────────────┐     │
        │                 │                 │       │ Video Processing    │     │
        │                 │                 │       │ 1. Find video file  │     │
        │                 │                 │       │ 2. Check storage    │     │
        │                 │                 │       │ 3. Generate signed  │     │
        │                 │                 │       │    URL (1hr expiry) │     │
        │                 │                 │       └─────────────────────┘     │
        │                 │                 │                 │                 │
        │                 │                 │                 ▼                 │
        │                 │                 │       ┌─────────────────────┐     │
        │                 │                 │       │ Exercise Display    │     │
        │                 │                 │       │ - Name & details    │     │
        │                 │                 │       │ - Instructions      │     │
        │                 │                 │       │ - Video player      │     │
        │                 │                 │       │ - Share info        │     │
        │                 │                 │       └─────────────────────┘     │
        │                 │                 │                 │                 │
        │                 │                 │                 ▼                 │
        │                 │                 │       ┌─────────────────────┐     │
        │                 │                 │       │ Optional: Save      │     │
        │                 │                 │       │ to Library          │     │
        │                 │                 │       │ (if authenticated)  │     │
        │                 │                 │       └─────────────────────┘     │
        │                 │                 │                 │                 │
        │                 │                 │                 ▼                 │
        │                 │                 │                 │                 ▼
        │                 │                 │                 │       ┌─────────────────────┐
        │                 │                 │                 │       │ save-shared-        │
        │                 │                 │                 │       │ exercise Function   │
        │                 │                 │                 │       │ 1. Duplicate data   │
        │                 │                 │                 │       │ 2. Set new owner    │
        │                 │                 │                 │       │ 3. Copy video ref   │
        │                 │                 │                 │       └─────────────────────┘
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
https://app.repcue.com/shared/exercise?token=abc123xyz789def456ghi

Components:
- Base URL: app domain
- Route: /shared/exercise
- Query param: token={32-byte-hex-string}
```

### Phase 2: Link Distribution

#### Share Options Available
1. **Copy to Clipboard** - Direct URL copy
2. **Email Sharing** - Optional email field for targeted sharing
3. **QR Code** - Generate QR code for mobile sharing
4. **Social Media** - Pre-formatted share text

#### Security Features
- **Token Rotation** - New token generated for each share
- **Expiry Control** - User-configurable expiration dates
- **Revocation** - Owner can delete/disable shares
- **Email Targeting** - Restrict access to specific email addresses

### Phase 3: Anonymous Viewing

#### 1. Share Link Access
```typescript
// SharedExercisePage.tsx
useEffect(() => {
  const fetchSharedExercise = async () => {
    const token = getTokenFromURL();
    const response = await fetch(
      `${supabaseFunctionBaseUrl}/get-shared-exercise?token=${token}`
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

#### 1. Save Button (If User Logged In)
```typescript
// SharedExercisePage.tsx
const handleSaveExercise = async () => {
  if (!user) {
    // Redirect to login
    router.push('/auth?redirect=' + encodeURIComponent(window.location.href));
    return;
  }

  await saveSharedExercise(token);
};
```

#### 2. Exercise Duplication (`save-shared-exercise`)
```typescript
// Save process:
1. Authenticate user
2. Validate share permissions ('copy' level required)
3. Check user doesn't already own this exercise
4. Create new exercise record:
   {
     ...originalExercise,
     id: newUUID,                    // New ID
     owner_id: savingUserId,         // New owner
     custom_video_url: null,         // Reset video reference
     created_at: now,
     updated_at: now,
     version: 1                      // Reset version
   }
5. If original has video, create video reference for new owner
6. Return success with new exercise ID
```

#### 3. Video Handling for Saved Exercises
```typescript
// Video reference creation (not duplication):
1. Find original video file record
2. Create new video_files record:
   {
     id: newUUID,
     exercise_id: newExerciseId,
     owner_id: savingUserId,
     file_name: original.file_name,
     storage_path: original.storage_path,  // Same file!
     upload_pending: false,
     // Note: file_data stays null (reference only)
   }
3. Update new exercise:
   custom_video_url: "blob-pending-sync://newExerciseId/fileName"
```

## Database Schema Deep Dive

### `exercise_shares` Table
```sql
CREATE TABLE exercise_shares (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id           UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  owner_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  share_token           TEXT NOT NULL UNIQUE,           -- 32-byte hex string
  permission_level      TEXT NOT NULL DEFAULT 'view',   -- 'view' | 'copy'
  shared_with_user_id   UUID REFERENCES profiles(id),   -- Target user (optional)
  shared_with_user_email TEXT,                          -- Target email (optional)
  expires_at            TIMESTAMPTZ,                    -- Expiry (optional)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted               BOOLEAN NOT NULL DEFAULT false,

  -- Indexes for performance
  INDEX idx_exercise_shares_token (share_token),
  INDEX idx_exercise_shares_owner (owner_id),
  INDEX idx_exercise_shares_exercise (exercise_id),
  INDEX idx_exercise_shares_expires (expires_at) WHERE expires_at IS NOT NULL
);
```

### Row Level Security (RLS) Policies
```sql
-- Users can only create shares for their own exercises
CREATE POLICY exercise_shares_insert_own ON exercise_shares
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Users can only view/update their own shares
CREATE POLICY exercise_shares_select_own ON exercise_shares
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

-- Edge functions need full access for public viewing
-- (Service role key bypasses RLS)
```

## Permission Levels

### 'view' Permission
- **Allows**: Viewing exercise details, instructions, video
- **Restricts**: Cannot save to personal library
- **Use Case**: Sharing for reference/inspiration only

### 'copy' Permission
- **Allows**: Everything from 'view' + saving to library
- **Creates**: Complete duplicate under new ownership
- **Use Case**: Sharing templates for others to customize

## Share Token Security

### Token Generation
```typescript
// Cryptographically secure random token:
const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
const shareToken = Array.from(tokenBytes)
  .map(byte => byte.toString(16).padStart(2, '0'))
  .join('');
// Result: 64-character hex string (256 bits entropy)
```

### Token Properties
- **Uniqueness**: Enforced by database constraint
- **Unpredictability**: Cryptographically secure random
- **Length**: 64 characters (256 bits)
- **Character Set**: Hexadecimal (0-9, a-f)
- **Collision Resistance**: 2^256 possible values

## Video Sharing Architecture

### Video Access Patterns

#### 1. Owner Access (Authenticated)
```typescript
// Full ownership access:
- Read from IndexedDB (offline)
- Direct Supabase Storage download (authenticated)
- Full CRUD operations
```

#### 2. Anonymous Share Access
```typescript
// Temporary signed URL access:
- 1-hour expiry window
- Read-only access
- No authentication required
- Automatic URL rotation
```

#### 3. Saved Exercise Access (New Owner)
```typescript
// Reference-based access:
- Video file record points to same storage file
- New owner can download via authenticated client
- Independent of original owner's access
```

### Video URL Lifecycle in Sharing
```
1. Original owner: blob-pending-sync://originalId/video.mp4
2. Share creation: No video URL change
3. Anonymous access: https://supabase.co/.../signedUrl?expires=...
4. Save to library: blob-pending-sync://newId/video.mp4
5. New owner sync: Download and store locally
```

## Error Handling & Edge Cases

### Share Creation Failures
```typescript
// Common failure scenarios:
1. Exercise not found → 404 error
2. User doesn't own exercise → 403 error
3. Invalid email format → 400 error
4. Database constraint violation → 500 error
```

### Share Access Failures
```typescript
// Anonymous viewing failures:
1. Invalid token format → 400 "Invalid share token format"
2. Token not found → 404 "Share token not found or has expired"
3. Share expired → 404 "Share token has expired"
4. Exercise deleted → 404 "Exercise not found"
5. Video missing → Shows exercise without video, triggers recovery
```

### Video Recovery System
```typescript
// When shared video is missing:
1. Mark video_files as upload_pending: true
2. Mark exercise as dirty for re-sync
3. Update sync cursor to trigger owner's next sync
4. Owner's next sync re-uploads video
5. Subsequent share access succeeds
```

### Save Failures
```typescript
// Authenticated save failures:
1. User not logged in → Redirect to auth
2. Insufficient permissions → 403 "Permission denied"
3. Already owns exercise → 409 "Exercise already in library"
4. Duplicate name conflict → Auto-rename with suffix
```

## Analytics & Monitoring

### Share Creation Metrics
- Share creation rate per user
- Permission level distribution (view vs copy)
- Expiry setting patterns
- Email vs public share ratio

### Share Access Metrics
- Share link click-through rates
- Geographic distribution of access
- Device/browser patterns
- Video play rates

### Conversion Metrics
- Share view → save conversion rate
- Share view → user registration rate
- Video engagement in shared exercises

## Security Considerations

### Attack Vectors & Mitigations

#### 1. Token Brute Force
- **Risk**: Attacker tries to guess share tokens
- **Mitigation**: 256-bit entropy makes brute force infeasible
- **Additional**: Rate limiting on Edge Functions

#### 2. Token Leakage
- **Risk**: Share URLs accidentally exposed in logs/referrers
- **Mitigation**: Expiry dates, revocation capability
- **Additional**: HTTPS-only, no-referrer policies

#### 3. Video Access Abuse
- **Risk**: Anonymous users downloading large video files
- **Mitigation**: 1-hour signed URL expiry, reasonable file size limits
- **Additional**: CDN caching, bandwidth monitoring

#### 4. Spam Sharing
- **Risk**: Users creating excessive shares
- **Mitigation**: Rate limiting per user
- **Additional**: Share count monitoring, abuse detection

#### 5. Data Privacy
- **Risk**: Sensitive exercise data in shares
- **Mitigation**: Remove owner-identifying fields in public responses
- **Additional**: User education about sharing implications

## Performance Optimizations

### Database Optimizations
- **Indexes**: On share_token, owner_id, exercise_id, expires_at
- **Partitioning**: Consider partitioning by creation date for large datasets
- **Cleanup**: Regular deletion of expired/old shares

### Edge Function Optimizations
- **Caching**: Cache exercise data with reasonable TTL
- **Connection Pooling**: Reuse database connections
- **Response Compression**: Gzip responses for better performance

### Video Delivery Optimizations
- **CDN**: Use Supabase CDN for video delivery
- **Compression**: Encourage video compression before upload
- **Streaming**: Consider HLS/DASH for large videos

## Future Enhancements

### Planned Features
1. **Workout Sharing** - Extend system to support workout sharing
2. **Share Analytics** - Detailed analytics for share creators
3. **Collaboration** - Allow multiple users to edit shared content
4. **Version Control** - Track changes to shared exercises

### Scaling Considerations
1. **Sharding**: Database sharding by owner_id for very large scale
2. **CDN Integration**: Direct CDN serving for static content
3. **Background Processing**: Queue-based video processing
4. **Multi-Region**: Geographic distribution for global users