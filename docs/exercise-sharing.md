# Exercise Sharing System

## Overview

The exercise sharing system allows users to share their custom exercises with others via secure, time-limited links. Recipients can view the shared exercise and optionally save it to their library. The system uses a **reference-based** approach where saving a shared exercise creates a reference to the original rather than a copy.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Share Flow](#share-flow)
4. [Save Flow](#save-flow)
5. [Video Handling](#video-handling)
6. [Authentication Integration](#authentication-integration)
7. [Edge Functions](#edge-functions)
8. [Frontend Components](#frontend-components)
9. [Key Services](#key-services)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Exercise Sharing Flow                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SHARING EXERCISE (Owner)                                                    │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐            │
│  │ ShareButton  │───▶│ share-exercise   │───▶│ exercise_shares │            │
│  │  Component   │    │ Edge Function    │    │     Table       │            │
│  └──────────────┘    └──────────────────┘    └─────────────────┘            │
│                              │                                               │
│                              ▼                                               │
│                       Share URL with Token                                   │
│                    https://app.repcue.me/share/{token}                      │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  VIEWING SHARED EXERCISE (Recipient)                                         │
│  ┌──────────────────────┐    ┌──────────────────────┐                       │
│  │ StandaloneShared     │───▶│ get-shared-exercise  │                       │
│  │ Exercise Component   │    │ Edge Function        │                       │
│  └──────────────────────┘    └──────────────────────┘                       │
│            │                                                                 │
│            ▼                                                                 │
│  ┌──────────────────────┐                                                   │
│  │ SharedExerciseVideo  │  (Displays exercise with video)                   │
│  └──────────────────────┘                                                   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SAVING TO LIBRARY (Recipient)                                               │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌────────────────┐ │
│  │ "Save to Library"    │───▶│ save-shared-exercise │───▶│ user_favorites │ │
│  │     Button           │    │ Edge Function        │    │    Table       │ │
│  └──────────────────────┘    └──────────────────────┘    └────────────────┘ │
│            │                                                                 │
│            ▼                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐                       │
│  │ download-shared-video│───▶│ User's IndexedDB     │                       │
│  │ Edge Function        │    │ (video_files table)  │                       │
│  └──────────────────────┘    └──────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Reference-Based Sharing**: When a user saves a shared exercise, they get a *reference* to the original exercise, not a copy. This means:
   - The original owner maintains control over the exercise
   - Updates to the original propagate to all references
   - Less storage duplication

2. **Public Endpoint for Viewing**: The shared exercise page is accessible without authentication to allow easy sharing via links.

3. **Authenticated Saving**: Saving a shared exercise requires authentication to properly attribute the reference.

4. **Video Transfer**: When saving, the video is downloaded from the original and re-uploaded to the recipient's storage for offline access.

---

## Database Schema

### `exercise_shares` Table

Stores share records with tokens for accessing shared exercises.

```sql
CREATE TABLE exercise_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exercise_id uuid,                                    -- Reference to exercises table
  owner_id uuid,                                       -- User who created the share
  shared_with_user_id uuid,                            -- Optional: specific recipient
  permission_level varchar(20) DEFAULT 'view',         -- 'view' or 'copy'
  share_token text,                                    -- Unique secure token
  expires_at timestamp with time zone DEFAULT (now() + '30 days'),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  version bigint DEFAULT 1,
  
  CONSTRAINT exercise_shares_pkey PRIMARY KEY (id)
);
```

**Key Fields:**
- `share_token`: Cryptographically secure token generated by `generate_share_token()` function
- `expires_at`: Share links expire after 30 days by default
- `permission_level`: Currently only 'view' is implemented

### `user_favorites` Table

Stores references to shared exercises saved by users.

```sql
CREATE TABLE user_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,                                       -- User who saved the reference
  item_id text NOT NULL,                               -- Exercise ID being referenced
  item_type varchar(20) DEFAULT 'exercise',            -- 'exercise' or 'workout'
  exercise_type varchar(20) DEFAULT 'builtin',         -- 'builtin', 'user', or 'shared'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  version integer DEFAULT 1,
  
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id)
);
```

**Key Fields:**
- `item_id`: References the original exercise's ID
- `exercise_type`: Set to `'shared'` for shared exercise references
- This table is synced to the client via the sync_v2 engine

### `generate_share_token()` Function

PostgreSQL function that generates cryptographically secure share tokens.

```sql
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  token text;
BEGIN
  -- Generate 32 random bytes and encode as base64
  token := encode(gen_random_bytes(32), 'base64');
  -- Replace URL-unsafe characters
  token := replace(token, '+', '-');
  token := replace(token, '/', '_');
  -- Remove padding
  token := rtrim(token, '=');
  RETURN token;
END;
$$;
```

---

## Share Flow

### 1. User Initiates Share

**Component**: [ShareButton.tsx](../apps/frontend/src/components/ShareButton.tsx)

When a user clicks the share button:

1. **Feature Flag Check**: Verifies `canShareExercises` is enabled
2. **Ownership Verification**: Confirms user owns the exercise
3. **Opens ShareDialog**: Modal for generating share link

### 2. Generate Share Link

**Component**: `ShareDialog` (within ShareButton.tsx)

```typescript
const handleGenerateShareUrl = async () => {
  // 1. Get authentication session
  const { data: { session } } = await supabase.auth.getSession();
  
  // 2. Pre-flight sync check - ensure exercise exists on server
  await syncService.sync(true);
  
  // 3. Call share-exercise edge function
  const response = await fetch(`${supabaseFunctionBaseUrl}/functions/v1/share-exercise`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      exerciseId: exerciseId,
      isPublic: true,
      recipientEmail: shareWithEmail || undefined
    }),
  });
  
  // 4. Receive share URL
  const data = await response.json();
  // data.shareUrl = "https://app.repcue.me/share/{token}"
};
```

### 3. Edge Function: `share-exercise`

**Location**: [supabase/functions/share-exercise/index.ts](../supabase/functions/share-exercise/index.ts)

**Workflow:**

1. **Validate JWT**: Extracts and validates user token
2. **Rate Limiting**: Max 10 shares per hour per user (in-memory for demo)
3. **Verify Ownership**: Confirms user owns the exercise
4. **Generate Token**: Calls `generate_share_token()` RPC
5. **Create Share Record**: Inserts into `exercise_shares` table
6. **Return Share URL**: Returns the complete share URL

**Request:**
```json
{
  "exerciseId": "uuid",
  "isPublic": true,
  "recipientEmail": "optional@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "shareUrl": "https://app.repcue.me/share/TOKEN",
  "shareToken": "TOKEN",
  "exerciseName": "Exercise Name"
}
```

---

## Save Flow

### 1. View Shared Exercise Page

**Component**: [StandaloneSharedExercise.tsx](../apps/frontend/src/StandaloneSharedExercise.tsx)

This is a standalone page that:
- Extracts share token from URL path (`/share/{token}`)
- Fetches exercise data via `get-shared-exercise` edge function
- Displays exercise details and video
- Shows "Save to My Library" button

### 2. User Clicks "Save to Library"

```typescript
const handleSaveExercise = () => {
  if (!shareToken) return;

  // Store the share token for the main app to process
  sessionStorage.setItem('pendingShareToken', shareToken);

  // Redirect to main app home page with parameter
  const mainAppUrl = new URL(window.location.origin);
  mainAppUrl.searchParams.set('saveSharedExercise', shareToken);

  // Force full page navigation to ensure main app initializes properly
  window.location.href = mainAppUrl.toString();
};
```

### 3. Main App Processes Save

**Location**: [App.tsx](../apps/frontend/src/App.tsx) (lines ~2230-2450)

The `handleSharedExerciseSave` effect:

1. **Check for Token**: Reads from URL params or sessionStorage
2. **Verify Authentication**: If not authenticated, triggers auth modal
3. **Call save-shared-exercise**: Creates the reference
4. **Download Video**: If exercise has video, downloads via `download-shared-video`
5. **Trigger Sync**: Syncs the new reference
6. **Refresh Exercise List**: Updates UI to show new exercise

### 4. Edge Function: `save-shared-exercise`

**Location**: [supabase/functions/save-shared-exercise/index.ts](../supabase/functions/save-shared-exercise/index.ts)

**Workflow:**

1. **Validate JWT**: Requires authenticated user
2. **Look Up Share**: Finds share record by token
3. **Validate Expiry**: Checks if share has expired
4. **Check Self-Save**: Prevents saving own exercise
5. **Check Existing**: Prevents duplicate saves
6. **Create Reference**: Inserts into `user_favorites` with `exercise_type: 'shared'`
7. **Increment copy_count**: Updates original exercise's popularity counter

**Request:**
```json
{
  "shareToken": "TOKEN",
  "catalogId": "optional-catalog-id"
}
```

**Response:**
```json
{
  "success": true,
  "exerciseId": "original-exercise-uuid",
  "exerciseName": "Exercise Name",
  "message": "Exercise successfully saved to your library",
  "hasVideo": true,
  "sharedFromExerciseId": "original-exercise-uuid",
  "sharedFromUserId": "owner-uuid",
  "isReference": true
}
```

---

## Video Handling

### Video in Shared Exercise Page

**Component**: [SharedExerciseVideo.tsx](../apps/frontend/src/components/SharedExerciseVideo.tsx)

Handles two scenarios:

1. **Built-in Exercises**: Uses thumbnail poster + lazy video loading
2. **Custom/User Videos**: Uses signed URL from edge function, generates thumbnail from first frame

**Features:**
- Fit/Fill toggle
- Fullscreen support
- Play/pause on click
- Auto-hide controls after 2 seconds during playback

### Video URL Resolution in `get-shared-exercise`

**Location**: [supabase/functions/get-shared-exercise/index.ts](../supabase/functions/get-shared-exercise/index.ts)

For exercises with `custom_video_url` that starts with `blob://`, `blob-pending-sync://`, or `blob-video://`:

1. **Query video_files Table**: Finds the storage path
2. **Verify File Exists**: Downloads file to check existence
3. **Generate Signed URL**: Creates 1-hour signed URL for anonymous access
4. **Recovery Mechanism**: If file missing, marks exercise as dirty for re-sync

### Video Download on Save

**Edge Function**: [download-shared-video/index.ts](../supabase/functions/download-shared-video/index.ts)

**Workflow:**

1. **Verify Access**: Checks user has `user_favorites` reference OR owns exercise
2. **Find Video Record**: Queries `video_files` table
3. **Download from Storage**: Uses service role to access `exercise-videos` bucket
4. **Return Blob**: Streams video file to client

**Client-side** (in App.tsx):
```typescript
// Download video
const downloadResponse = await fetch(`${supabaseUrl}/functions/v1/download-shared-video`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    exerciseId: originalExerciseId,
    originalExerciseId: originalExerciseId,
    originalOwnerId: result.sharedFromUserId
  })
});

// Save to IndexedDB
const videoBlob = await downloadResponse.blob();
await storageService.saveVideoFile(originalExerciseId, downloadedVideoFile);
```

---

## Authentication Integration

### Magic Link Flow with Share Token

When a user needs to authenticate to save a shared exercise:

**Location**: [authService.ts](../apps/frontend/src/services/authService.ts) (lines ~355-405)

```typescript
public async signInWithMagicLink(email: string) {
  // Check for pending shared exercise token
  const pendingShareToken = sessionStorage.getItem('pendingShareToken');

  // Build redirect URL
  let redirectUrl = `${this.getRedirectBase()}/auth/callback`;

  // Append share token to redirect URL
  if (pendingShareToken) {
    const url = new URL(redirectUrl);
    url.searchParams.set('saveSharedExercise', pendingShareToken);
    redirectUrl = url.toString();
  }

  // Send magic link with redirect URL
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
    }
  });
}
```

### Auth Callback Handling

**Location**: [AuthCallbackPage.tsx](../apps/frontend/src/pages/AuthCallbackPage.tsx)

After successful authentication:
```typescript
// Check for shared exercise token
const shareToken = searchParams.get('saveSharedExercise');
if (shareToken) {
  sessionStorage.setItem('pendingShareToken', shareToken);
}

// Redirect to home with parameter
if (shareToken) {
  navigate(`${Routes.HOME}?saveSharedExercise=${shareToken}`, { replace: true });
}
```

---

## Edge Functions

| Function | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `share-exercise` | POST | Yes | Generate share link |
| `get-shared-exercise` | GET | No | Fetch shared exercise data |
| `save-shared-exercise` | POST | Yes | Save reference to library |
| `download-shared-video` | POST | Yes | Download video for offline |

### Deployment

Edge functions are deployed via Supabase CLI or MCP tools:

```bash
# Development
mcp_supabase_deploy_edge_function(name, files)

# Production
mcp_supabase-prod_deploy_edge_function(name, files)
```

---

## Frontend Components

### ShareButton

**Location**: [ShareButton.tsx](../apps/frontend/src/components/ShareButton.tsx)

- Entry point for sharing
- Contains ShareDialog modal
- Handles share URL generation
- Clipboard copy functionality

### StandaloneSharedExercise

**Location**: [StandaloneSharedExercise.tsx](../apps/frontend/src/StandaloneSharedExercise.tsx)

- Standalone page (no app context required)
- Displays shared exercise details
- Shows exercise metadata, instructions, tags
- Includes SharedExerciseVideo component
- "Save to Library" button

### SharedExerciseVideo

**Location**: [SharedExerciseVideo.tsx](../apps/frontend/src/components/SharedExerciseVideo.tsx)

- Video player for shared exercise page
- Handles custom and built-in videos
- Fit/Fill toggle
- Fullscreen support
- Auto-hide controls

---

## Key Services

### StorageService

**Location**: [storageService.ts](../apps/frontend/src/services/storageService.ts)

Key methods for shared exercises:

```typescript
// Get all shared exercise references for a user
getSharedExerciseReferences(userId: string): Promise<UserFavorite[]>

// Fetch exercise data for shared references
getSharedExerciseData(exerciseIds: string[]): Promise<StoredExercise[]>

// Delete a shared exercise reference
deleteSharedExerciseReference(userId: string, exerciseId: string): Promise<boolean>

// Save video file to IndexedDB
saveVideoFile(exerciseId: string, file: File): Promise<void>
```

### useSharedExercises Hook

**Location**: [useSharedExercises.ts](../apps/frontend/src/hooks/useSharedExercises.ts)

```typescript
export function useSharedExercises() {
  // Returns shared exercise IDs for the current user
  const [sharedExerciseIds, setSharedExerciseIds] = useState<Set<string>>(new Set());

  // Check if an exercise is shared
  const isSharedExercise = (exerciseId: string): boolean => {
    return sharedExerciseIds.has(exerciseId);
  };

  return { sharedExerciseIds, isSharedExercise, loading };
}
```

Used by components to:
- Display "Shared" badge on exercises
- Handle video URL resolution differently for shared exercises
- Control edit/delete permissions

---

## Security Considerations

### Rate Limiting

`share-exercise` function implements rate limiting:
- 10 shares per hour per user
- In-memory store (would use Redis in production)

### Token Security

- Tokens generated using `gen_random_bytes(32)` - cryptographically secure
- URL-safe encoding (base64 with `-` and `_`)
- 30-day expiration by default

### Access Control

1. **Sharing**: Only exercise owner can share
2. **Viewing**: Anyone with token can view (public endpoint)
3. **Saving**: Authenticated users only
4. **Video Download**: Only users with saved reference OR original owner

### Video URL Security

- Signed URLs expire after 1 hour
- Blob URLs never exposed to clients
- Service role used for storage access

---

## Troubleshooting

### Common Issues

#### Share Link Not Working

1. **Token Expired**: Check `expires_at` in `exercise_shares` table
2. **Exercise Deleted**: Verify exercise exists and `deleted = false`
3. **Share Deleted**: Check `deleted` flag on share record

```sql
-- Check share status
SELECT es.*, e.name, e.deleted as exercise_deleted
FROM exercise_shares es
JOIN exercises e ON es.exercise_id = e.id
WHERE es.share_token = 'TOKEN';
```

#### Video Not Loading

1. **Signed URL Expired**: URLs valid for 1 hour only
2. **File Missing in Storage**: Check `video_files` table and storage bucket
3. **Recovery Triggered**: If `videoRecoveryTriggered: true`, owner needs to sync

```sql
-- Check video file status
SELECT vf.*, e.name
FROM video_files vf
JOIN exercises e ON vf.exercise_id = e.id
WHERE vf.exercise_id = 'EXERCISE_UUID';
```

#### Save Failing

1. **Already Saved**: Check `user_favorites` for existing reference
2. **Self-Save Blocked**: Cannot save own exercise
3. **Auth Issue**: Verify JWT is valid

```sql
-- Check existing favorites
SELECT * FROM user_favorites
WHERE owner_id = 'USER_UUID'
AND item_id = 'EXERCISE_UUID'
AND exercise_type = 'shared';
```

### Debug Logging

Enable debug logging in browser console:
```javascript
// In features.ts, set DEBUG: true
```

Key log prefixes:
- `🔗 [ShareButton]` - Share generation
- `[SharedExerciseVideo]` - Video loading
- `[init] Processing shared exercise save` - Save flow
- `🎥 [App] Video downloaded` - Video transfer

---

## Related Documentation

- [Sync System](sync-system.md) - How shared references sync
- [Video System](video-system.md) - Video upload/download details
- [Authentication](ios-pwa-magic-links.md) - Magic link auth flow

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-09-14 | 1.0 | Initial implementation |
| 2024-11-30 | 1.1 | Reference-based sharing (Phase 2) |
| 2024-12-01 | 1.2 | Video download on save, auto-hide controls |
