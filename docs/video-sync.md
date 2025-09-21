# Video Upload and Sync Architecture

This document explains the complete video upload and synchronization flow across RepCue's offline-first architecture.

## Overview

RepCue uses an **offline-first** approach for video management. Videos are immediately stored locally in IndexedDB and later synced to Supabase Storage when online. This ensures users can upload and view videos instantly, even without internet connectivity.

## Components Involved

### Client-Side (Frontend)
- **VideoUploadWidget** (`src/components/VideoUploadWidget.tsx`) - UI for video upload
- **StorageService** (`src/services/storageService.ts`) - Local IndexedDB management
- **CorrectSyncService** (`src/services/correctSyncService.ts`) - Bidirectional sync orchestration
- **SyncService** (`src/services/syncService.ts`) - Legacy interface wrapper

### Server-Side (Supabase)
- **sync_v2 Edge Function** - Handles video upload to cloud storage
- **Supabase Storage** - Cloud file storage (`videos` bucket)
- **Database Tables** - `video_files`, `exercises` tables

## Complete Video Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VIDEO UPLOAD & SYNC FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   USER       │    │   FRONTEND   │    │  SYNC EDGE   │    │  SUPABASE    │
│   ACTION     │    │  COMPONENTS  │    │  FUNCTION    │    │  STORAGE     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │                   │
        │                   │                   │                   │
        ▼                   │                   │                   │
┌─────────────┐             │                   │                   │
│ Select Video│             │                   │                   │
│ File (MP4)  │             │                   │                   │
└─────────────┘             │                   │                   │
        │                   │                   │                   │
        ▼                   │                   │                   │
        │                   ▼                   │                   │
        │        ┌─────────────────────┐        │                   │
        │        │ VideoUploadWidget   │        │                   │
        │        │ - File validation   │        │                   │
        │        │ - Progress tracking │        │                   │
        │        └─────────────────────┘        │                   │
        │                   │                   │                   │
        │                   ▼                   │                   │
        │        ┌─────────────────────┐        │                   │
        │        │ StorageService      │        │                   │
        │        │ .saveVideoFile()    │        │                   │
        │        └─────────────────────┘        │                   │
        │                   │                   │                   │
        │                   ▼                   │                   │
        │        ┌─────────────────────┐        │                   │
        │        │ IndexedDB Storage   │        │                   │
        │        │ - File as Blob      │        │                   │
        │        │ - upload_pending:   │        │                   │
        │        │   true              │        │                   │
        │        │ - Singleton pattern │        │                   │
        │        └─────────────────────┘        │                   │
        │                   │                   │                   │
        │                   ▼                   │                   │
        │        ┌─────────────────────┐        │                   │
        │        │ Exercise Update     │        │                   │
        │        │ custom_video_url:   │        │                   │
        │        │ "blob-pending-sync" │        │                   │
        │        └─────────────────────┘        │                   │
        │                   │                   │                   │
        │                   │                   │                   │
        ┌─────────────────  │  ─────────────────┐                   │
        │ USER SEES VIDEO IMMEDIATELY OFFLINE   │                   │
        └─────────────────  │  ─────────────────┘                   │
        │                   │                   │                   │
        │                   ▼                   │                   │
        │        ┌─────────────────────┐        │                   │
        │        │ CorrectSyncService  │        │                   │
        │        │ .sync()             │        │                   │
        │        └─────────────────────┘        │                   │
        │                   │                   │                   │
        │                   ▼                   │                   │
        │        ┌─────────────────────┐        │                   │
        │        │ File → ArrayBuffer  │        │                   │
        │        │ → Byte Array        │        │                   │
        │        └─────────────────────┘        │                   │
        │                   │                   │                   │
        │                   ▼                   │                   │
        │                   │                   ▼                   │
        │                   │        ┌─────────────────────┐        │
        │                   │        │ sync_v2 Function    │        │
        │                   │        │ - Video file upload │        │
        │                   │        │ - Singleton enforce │        │
        │                   │        │ - Storage path gen  │        │
        │                   │        └─────────────────────┘        │
        │                   │                   │                   │
        │                   │                   ▼                   │
        │                   │                   │                   ▼
        │                   │                   │        ┌─────────────────────┐
        │                   │                   │        │ Supabase Storage    │
        │                   │                   │        │ /videos/{userId}/   │
        │                   │                   │        │ {exerciseId}/       │
        │                   │                   │        │ {fileName}          │
        │                   │                   │        └─────────────────────┘
        │                   │                   │                   │
        │                   │                   ▼                   │
        │                   │        ┌─────────────────────┐        │
        │                   │        │ Database Update     │        │
        │                   │        │ upload_pending:     │        │
        │                   │        │ false               │        │
        │                   │        │ storage_path: set   │        │
        │                   │        └─────────────────────┘        │
        │                   │                   │                   │
        │                   ▼                   ▼                   │
        │        ┌─────────────────────┐        │                   │
        │        │ Sync Response       │        │                   │
        │        │ - Upload confirm    │        │                   │
        │        │ - New storage_path  │        │                   │
        │        └─────────────────────┘        │                   │
        │                   │                   │                   │
        │                   ▼                   │                   │
        │        ┌─────────────────────┐        │                   │
        │        │ Exercise URL Update │        │                   │
        │        │ custom_video_url:   │        │                   │
        │        │ "blob-pending-sync" │        │                   │
        │        │ (with new filename) │        │                   │
        │        └─────────────────────┘        │                   │
        │                   │                   │                   │
        │                   │                   │                   │
        ┌─────────────────  │  ─────────────────┐                   │
        │ VIDEO NOW AVAILABLE ACROSS ALL DEVICES│                   │
        └─────────────────  │  ─────────────────┘                   │
```

## Detailed Step-by-Step Flow

### Phase 1: Local Upload (Immediate)

#### 1. User Selects Video File
- User clicks upload button in `VideoUploadWidget`
- File validation occurs (MP4, WebM, OGG supported)
- Progress bar starts (simulated for UX)

#### 2. Local Storage (`StorageService.saveVideoFile()`)
```typescript
// Key operations:
1. Delete existing video files for exercise (singleton pattern)
2. Generate unique video file ID
3. Store File object directly in IndexedDB as Blob
4. Mark as upload_pending: true
5. Return blob-pending-sync:// URL
```

#### 3. Exercise Record Update
```typescript
// Exercise gets updated with:
{
  custom_video_url: "blob-pending-sync://exerciseId/fileName.mp4",
  has_video: false, // Custom video, not built-in
  dirty: 1,         // Mark for sync
  op: "upsert"      // Operation type
}
```

#### 4. Immediate Local Playback
- Video displays instantly using blob URL created from IndexedDB
- User can watch video offline immediately
- No network required for this phase

### Phase 2: Cloud Sync (When Online)

#### 5. Sync Trigger
- App comes to foreground OR
- User manually syncs OR
- Periodic sync timer

#### 6. Data Preparation (`CorrectSyncService`)
```typescript
// For each dirty video file:
1. Read File object from IndexedDB
2. Convert File → ArrayBuffer → Uint8Array (byte array)
3. Prepare sync payload with file_data as byte array
4. Include metadata: file_name, file_size, mime_type, etc.
```

#### 7. Server Upload (`sync_v2` Edge Function)
```typescript
// Server operations:
1. Receive byte array from client
2. Convert back to Uint8Array for storage upload
3. Enforce singleton pattern (delete old videos)
4. Generate storage path: userId/exerciseId/fileName
5. Upload to Supabase Storage using authenticated client
6. Update database record:
   - upload_pending: false
   - storage_path: "userId/exerciseId/fileName"
   - file_data: null (removed after upload)
```

#### 8. Sync Response Processing
```typescript
// Client receives updated video record:
1. Process upload confirmation (even if "just pushed")
2. Update exercise's custom_video_url with correct filename
3. Mark exercise as dirty for server sync
4. Store updated video record locally
```

### Phase 3: Cross-Device Access

#### 9. Other Devices Sync
When user logs in on another device:
```typescript
1. Full sync pulls exercise + video file records
2. downloadVideoFileForOfflineAccess() triggered
3. Dual-path video download:
   - Own videos: Direct Supabase Storage download
   - Shared videos: download-shared-video edge function
4. Store in local IndexedDB
5. Video available offline on new device
```

#### 10. Shared Exercise Video Handling
For shared exercises, special video access logic is used:
```typescript
// Detection in downloadVideoFileForOfflineAccess()
const isSharedExercise = !storagePath.startsWith(user.id);

if (isSharedExercise) {
  // Use edge function for permission-based access
  const response = await fetch('/functions/v1/download-shared-video', {
    method: 'POST',
    body: JSON.stringify({
      exerciseId: videoFileRow.exercise_id,
      originalExerciseId: pathParts[1],
      originalOwnerId: pathParts[0]
    })
  });
}
```

## Data Transformations

### File Data Journey
```
User File (File object)
    ↓
IndexedDB (Blob storage)
    ↓
Sync Client (ArrayBuffer → Uint8Array → byte array)
    ↓
Network Transfer (JSON with byte array)
    ↓
Edge Function (byte array → Uint8Array)
    ↓
Supabase Storage (binary file)
    ↓
Download Response (Blob)
    ↓
IndexedDB (File object recreation)
    ↓
Video Player (blob URL)
```

### URL Evolution
```
1. Initial:     blob-pending-sync://exerciseId/oldFile.mp4
2. After sync:  blob-pending-sync://exerciseId/newFile.mp4
3. For sharing: https://supabase.co/storage/.../signedUrl (temporary)
```

## Database Schema

### `video_files` Table
```sql
id              UUID PRIMARY KEY
exercise_id     UUID REFERENCES exercises(id)
owner_id        UUID REFERENCES profiles(id)
file_name       TEXT                    -- Original filename
file_size       INTEGER                 -- Size in bytes
mime_type       TEXT                    -- video/mp4, etc.
upload_pending  BOOLEAN DEFAULT true    -- Sync status
storage_path    TEXT                    -- Path in Supabase Storage
file_data       BYTEA                   -- Local storage only (null after upload)
created_at      TIMESTAMP
updated_at      TIMESTAMP
deleted         BOOLEAN DEFAULT false
version         INTEGER DEFAULT 1
dirty           INTEGER DEFAULT 1       -- Sync flag
```

### `exercises` Table (Video-Related Fields)
```sql
custom_video_url  TEXT    -- blob-pending-sync:// format
has_video         BOOLEAN -- Built-in video flag (false for custom)
```

## Singleton Pattern

### Why Singleton?
- One video per exercise maximum
- Prevents storage bloat
- Simplifies UI/UX (single video player)

### How It's Enforced
```typescript
// Client-side (StorageService):
1. Delete existing video files for exercise before saving new one

// Server-side (sync_v2):
1. enforceVideoFileSingleton() deletes conflicting files
2. Cleans up both database records and storage files
3. Prioritizes newest upload
```

## Error Handling

### Upload Failures
```typescript
// If storage upload fails:
1. Reset video_files record:
   - upload_pending: true (retry next sync)
   - storage_path: null (clear failed path)
2. Keep local file intact
3. User sees video locally, retry on next sync
```

### Network Issues
```typescript
// If sync fails entirely:
1. Video remains local-only
2. upload_pending stays true
3. Automatic retry on next sync
4. User experience unaffected (offline-first)
```

### Cross-Device Download Failures
```typescript
// If video download fails on new device:
1. User sees exercise without video
2. Sync retry will attempt download again
3. Fall back to share link recovery if needed
```

## Key Design Decisions

### 1. Offline-First Architecture
- **Benefit**: Immediate video availability
- **Trade-off**: Complex sync logic
- **Alternative Considered**: Direct upload (rejected for poor UX)

### 2. File as Blob in IndexedDB
- **Benefit**: Native File object support, efficient storage
- **Trade-off**: Browser compatibility considerations
- **Alternative Considered**: Base64 strings (rejected for size)

### 3. Byte Array Network Transfer
- **Benefit**: Direct binary transfer to Edge Function
- **Trade-off**: Large payload sizes
- **Alternative Considered**: Multipart upload (added complexity)

### 4. Singleton Pattern
- **Benefit**: Simple UX, prevents bloat
- **Trade-off**: Users can't have multiple videos per exercise
- **Alternative Considered**: Multiple videos (added UI complexity)

### 5. blob-pending-sync:// URLs
- **Benefit**: Clear indication of sync status
- **Trade-off**: Custom URL scheme handling required
- **Alternative Considered**: Database flags (less explicit)

## Debugging & Observability

### Key Log Messages
```typescript
// Upload phase:
"🎥 [VideoUpload] Starting offline-first upload process"
"💾 [VideoFile] Video file saved to IndexedDB successfully"

// Sync phase:
"[sync:v2] Converting File object to ArrayBuffer for sync"
"[sync:v2] processing video upload confirmation"
"[sync:v2] updating exercise video URL for updated video"

// Download phase:
"[sync:v2] Downloading video file for offline access"
"🎥 [VideoDisplay] Successfully restored blob URL from stored file"
```

### Correlation IDs
Every sync operation includes a correlation ID for cross-tier tracing:
```typescript
const correlationId = crypto.randomUUID();
// Flows through: client → edge function → database → back to client
```

## Performance Considerations

### File Size Limits
- **Client**: IndexedDB storage quota (browser-dependent)
- **Network**: Edge Function timeout (10 minutes max)
- **Storage**: Supabase Storage limits

### Optimization Strategies
- **Compression**: Consider client-side video compression
- **Chunking**: For very large files, implement chunked upload
- **Cleanup**: Regular cleanup of old/deleted video files

## Security

### Access Control
- **Upload**: User can only upload videos for their own exercises
- **Download**: User can only download their own videos (authenticated)
- **Sharing**: Temporary signed URLs for anonymous access

### Data Validation
- **File Types**: Strict MIME type checking
- **File Size**: Reasonable limits to prevent abuse
- **Content**: No server-side scanning (client responsibility)