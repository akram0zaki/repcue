# Exercise Sharing Feature: Implementation Plan

**Version:** 1.1.0  
**Date:** 2025-09-14  
**Author:** GitHub Copilot  
**Status:** Ready for Implementation

## 1. Overview

This document outlines the implementation plan for a new feature that allows authenticated users to share their custom-created exercises with others. The plan covers database schema modifications, backend API development using Supabase Edge Functions, and frontend UI/UX implementation within the RepCue PWA.

The core requirements are:
-   **Authenticated Sharing**: Only logged-in users (User A) can share exercises they own.
-   **Public & Private Sharing**: Support for sharing via a public link or directly to an email address.
-   **Public View Page**: A recipient (User B) can view the shared exercise on a public page without needing to log in or give consent for data storage.
-   **Claiming/Saving**: User B can save the shared exercise to their own account, which requires sign-up or sign-in.
-   **"Shared with me"**: Saved exercises appear in User B's catalog under a "Shared with me" filter.
-   **Offline-First Exception**: The public view page is an exception to the offline-first principle to avoid triggering consent dialogs.

## 2. Analysis of Existing System

Based on comprehensive analysis of the current codebase:

-   **Database (Supabase)**: The `exercises` table stores **only user-created exercises** with `owner_id` linking to `auth.users(id)`. Built-in exercises are defined in `apps/frontend/src/data/exercises.ts` and populated into IndexedDB on the client, excluded from Supabase sync. Existing sharing infrastructure already exists via `exercise_shares` table with `shared_with_user_id` column.
-   **Database (IndexedDB)**: Dexie.js via `StorageService` with comprehensive sync metadata (`dirty`, `op`, `synced_at`) for offline-first operation.
-   **Authentication**: `AuthService` with Supabase Auth, magic links, OAuth, and passkey support.
-   **Data Sync**: `CorrectSyncService` (sync_v2) handles bidirectional sync with conflict resolution and pagination.
-   **UI**: Complete exercise management UI with `ExercisePage.tsx`, `CreateExercisePage.tsx`, `EditExercisePage.tsx`, and `ExerciseDetailPage.tsx`.
-   **Routing**: React Router with lazy loading and routes defined in `types/index.ts`. Current routes include exercise detail at `/exercises/:id`.

## 3. Proposed Design & Architecture

### 3.1. Database Schema Analysis

**IMPORTANT DISCOVERY**: The required tables already exist in the current schema:

**1. `exercise_shares` table** (already exists in migration `20250906-01-supabase-dev-migration.sql`):
```sql
CREATE TABLE IF NOT EXISTS exercise_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NULL,
    permission_level VARCHAR(20) DEFAULT 'view',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false,
    version BIGINT DEFAULT 1,
    UNIQUE(exercise_id, shared_with_user_id)
);
```

**2. `user_favorites` table** (already exists) can serve as `user_shared_exercises`:
```sql
CREATE TABLE IF NOT EXISTS user_favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL, -- Can be slug (builtin) or UUID (user-created)
    exercise_type VARCHAR(20) DEFAULT 'builtin', -- 'builtin' | 'user_created' | 'shared'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, exercise_id)
);
```

**Design Adjustments Needed**:
1. **Share Token System**: The existing `exercise_shares` table lacks a `share_token` column for public sharing. We need to add this.
2. **Public Sharing**: The current design uses `shared_with_user_id` for specific user sharing. NULL values can represent public shares.
3. **Saved Shared Exercises**: We can extend `user_favorites` to include `exercise_type = 'shared'` for saved shared exercises.

**Updated Schema Additions Required**:
```sql
-- Add share_token column to existing exercise_shares table
ALTER TABLE exercise_shares ADD COLUMN share_token TEXT UNIQUE;

-- Add index for share token lookups
CREATE INDEX idx_exercise_shares_token ON exercise_shares(share_token);
```

### 3.2. Backend API (Supabase Edge Functions)

Two new Edge Functions will be created, following the existing pattern of functions like `sync_v2`, `webauthn-authenticate`, etc.

**1. `share-exercise` Edge Function**:
-   **Path**: `/functions/v1/share-exercise`
-   **Method**: `POST`
-   **Authentication**: Required. Validates JWT and verifies exercise ownership.
-   **Input**: 
    ```typescript
    {
      exerciseId: string,
      isPublic?: boolean, // default true
      recipientEmail?: string // for email-specific shares
    }
    ```
-   **Logic**:
    1. Validate JWT and extract `user_id`
    2. Verify user owns the `exerciseId` via `exercises.owner_id = user_id`
    3. Generate unique `share_token` using `crypto.randomUUID()`
    4. Insert record into `exercise_shares` table
    5. Return share URL
-   **Output**:
    ```typescript
    {
      success: true,
      shareUrl: string,
      shareToken: string
    }
    ```
-   **Error Handling**: 
    - `401 Unauthorized`: Invalid/missing JWT
    - `403 Forbidden`: User doesn't own the exercise
    - `404 Not Found`: Exercise doesn't exist
    - `500 Internal Server Error`: Database/unexpected errors

**2. `get-shared-exercise` Edge Function**:
-   **Path**: `/functions/v1/get-shared-exercise`
-   **Method**: `GET`
-   **Authentication**: Not required (public endpoint)
-   **Input**: Query parameter `token=<share_token>`
-   **Logic**:
    1. Validate `share_token` parameter
    2. Look up share record in `exercise_shares` table
    3. If found, fetch full exercise details from `exercises` table
    4. Return exercise data with share metadata
-   **Output**:
    ```typescript
    {
      success: true,
      exercise: Exercise,
      shareInfo: {
        sharedBy: string, // sharer's display name
        sharedAt: string, // ISO timestamp
        isPublic: boolean
      }
    }
    ```
-   **Error Handling**:
    - `400 Bad Request`: Missing/invalid token parameter
    - `404 Not Found`: Share token not found or expired
    - `500 Internal Server Error`: Database/unexpected errors

**3. `save-shared-exercise` Edge Function**:
-   **Path**: `/functions/v1/save-shared-exercise`
-   **Method**: `POST`
-   **Authentication**: Required.
-   **Input**:
    ```typescript
    {
      shareToken: string
    }
    ```
-   **Logic**:
    1. Validate JWT and extract `user_id`
    2. Look up share record and exercise details
    3. Create copy of exercise with new UUID and `owner_id = user_id`
    4. Add entry to `user_favorites` with `exercise_type = 'shared'`
    5. Return success confirmation
-   **Output**:
    ```typescript
    {
      success: true,
      exerciseId: string // ID of the copied exercise
    }
    ```

### 3.3. Frontend Implementation

**1. Share UI Integration**:
-   **Location**: Add to existing `ExerciseCard.tsx` component (in `apps/frontend/src/components/`)
-   **UI Element**: Share icon button for user-owned exercises (similar to existing edit/delete buttons)
-   **Modal**: `ShareExerciseModal.tsx` component with options:
    1. "Get shareable link" - generates public share URL
    2. "Share with email" - input field for email-specific sharing
-   **Integration**: Modal calls `share-exercise` Edge Function and displays shareable URL for copying

**2. Public Share Page**:
-   **New Route**: `/share/:shareToken` (add to `Routes` in `types/index.ts`)
-   **Component**: `SharedExercisePage.tsx` (new page component)
-   **Behavior**:
    - Calls `get-shared-exercise` Edge Function on page load
    - Displays exercise details in read-only format (no consent banners)
    - Shows "Save to My Library" button for authenticated users
    - Redirects to auth flow with return state for unauthenticated users
-   **Design**: Minimal UI focused on exercise details and clear call-to-action

**3. Exercise Catalog Integration**:
-   **Filter Enhancement**: Update `ExercisePage.tsx` to include "Shared with me" toggle
-   **Data Source**: Query `user_favorites` table for `exercise_type = 'shared'` entries
-   **Display**: Show shared exercises alongside built-in and user-created with appropriate badges

**4. Data Flow**:
```
Share Creation:
User A (authenticated) → ShareExerciseModal → share-exercise Edge Function → database → shareable URL

Viewing Shared Exercise:
Anyone with link → SharedExercisePage → get-shared-exercise Edge Function → exercise details display

Saving Shared Exercise:
User B (authenticated) → "Save" button → save-shared-exercise Edge Function → exercise copied to User B's library → sync to IndexedDB
```

### 3.4. Security Considerations

**1. Exercise Data Protection**:
-   **Share Tokens**: Cryptographically secure random tokens using Supabase's `gen_random_uuid()`
-   **Expiration**: Configurable expiration (default 30 days) with automated cleanup via scheduled Edge Function
-   **Rate Limiting**: Implement rate limits on sharing endpoints to prevent abuse (max 10 shares per user per hour)
-   **Validation**: Email format validation and sanitization for email-based shares using DOMPurify

**2. Content Moderation**:
-   **Privacy-First**: Manual moderation by administrators (no automatic scanning to respect user privacy)
-   **Reporting**: Future feature to enable users to report inappropriate shared content
-   **Access Control**: Only exercise data exposed via shares, never personal user information

**3. User Privacy**:
-   **Data Isolation**: Share tokens only expose specific exercise data, no user profiles or personal information
-   **Anonymized Sharing**: Owner identity limited to display name only in share metadata
-   **No Tracking**: Share views not tracked to maintain recipient privacy

### 3.5. Error Handling Strategy

To ensure robustness and provide clear feedback, a consistent error handling strategy will be implemented.

-   **Backend (Edge Functions)**:
    -   Functions will use standard HTTP status codes to indicate the outcome of a request:
        -   `200 OK` / `201 Created`: Successful operation.
        -   `400 Bad Request`: Invalid input from the client (e.g., missing `exerciseId`).
        -   `401 Unauthorized`: User is not authenticated.
        -   `403 Forbidden`: User is authenticated but not authorized to perform the action (e.g., trying to share an exercise they don't own).
        -   `404 Not Found`: The requested resource (e.g., exercise or share token) does not exist.
        -   `500 Internal Server Error`: An unexpected error occurred on the server.
    -   Error responses will return a JSON body with a consistent format: `{ "error": "A descriptive error message." }`.

-   **Frontend (React Client)**:
    -   Client-side services calling the backend will be wrapped in `try...catch` blocks.
    -   On failure, the HTTP status code and error message from the backend will be used to display an appropriate notification (e.g., a toast message) to the user.
    -   The logger utility will be used to log detailed error information for debugging purposes, respecting the `DEBUG` flag.


## 4. Implementation Plan

### Phase 1: Backend Infrastructure & Security (Week 1)

-   [ ] **Task 1.1**: Add `share_token` column to existing `exercise_shares` table via new Supabase migration
-   [ ] **Task 1.2**: Create `share-exercise` Edge Function with:
    - JWT authentication validation
    - Exercise ownership verification  
    - Secure token generation using `gen_random_uuid()`
    - Rate limiting implementation (10 shares/user/hour)
    - Email validation and sanitization
-   [ ] **Task 1.3**: Create `get-shared-exercise` Edge Function with:
    - Share token validation and expiration checks
    - Exercise data retrieval with privacy controls
    - Error handling for invalid/expired tokens
-   [ ] **Task 1.4**: Create `save-shared-exercise` Edge Function leveraging existing sync patterns:
    - User authentication validation
    - Exercise duplication logic to user's library
    - Integration with existing `user_favorites` table structure
-   [ ] **Task 1.5**: Apply migration to development environment and test all Edge Functions

### Phase 2: Frontend Sharing Components (Week 2)

-   [ ] **Task 2.1**: Create `ShareExerciseModal.tsx` component with:
    - Public link generation option
    - Email sharing input field with validation
    - Success/error state handling with proper loading indicators
    - Copy-to-clipboard functionality for generated URLs
-   [ ] **Task 2.2**: Add share button integration to existing `ExerciseCard.tsx`:
    - Display share icon only for user-owned exercises
    - Modal trigger with proper accessibility attributes
    - Integration with authentication state checking
-   [ ] **Task 2.3**: Implement client-side sharing service calls:
    - API integration with error boundary patterns
    - Loading state management during share creation
    - Success feedback and URL display

### Phase 3: Public Share Viewing (Week 3)

-   [ ] **Task 3.1**: Add `/share/:shareToken` route to `App.tsx` routing configuration
-   [ ] **Task 3.2**: Create `SharedExercisePage.tsx` component with:
    - Minimal UI focused on exercise details (no consent banners)
    - Read-only exercise information display
    - Clear "Save to My Library" call-to-action button
    - Responsive design for mobile and desktop viewing
-   [ ] **Task 3.3**: Implement authentication flow integration:
    - Session storage for share token during auth flow
    - Post-authentication return to save action
    - Clear messaging about authentication requirements
-   [ ] **Task 3.4**: Add shared exercise saving functionality:
    - Integration with existing sync service patterns
    - Success feedback and redirection to user's library
    - Error handling for duplicate exercises

### Phase 4: Exercise Catalog Integration (Week 4)

-   [ ] **Task 4.1**: Update `ExercisePage.tsx` filters to include "Shared with me" option
-   [ ] **Task 4.2**: Implement shared exercise filtering using existing `user_favorites` table:
    - Query for `exercise_type = 'shared'` entries
    - Display shared exercises with appropriate visual badges
    - Maintain existing performance optimizations
-   [ ] **Task 4.3**: Add visual indicators for shared exercises:
    - Shared badge or icon in exercise cards
    - Source attribution (shared by display name)
    - Clear distinction from built-in and user-created exercises

### Phase 5: Testing, Security & Internationalization (Week 5)

-   [ ] **Task 5.1**: Comprehensive testing suite:
    - Unit tests for all new components and Edge Functions
    - Integration tests for sharing workflow end-to-end
    - Security testing for share tokens, access control, and rate limiting
    - Accessibility audit ensuring WCAG 2.1 AA compliance
-   [ ] **Task 5.2**: End-to-end workflow testing:
    - User A shares exercise and gets shareable link
    - User B views shared exercise without authentication
    - User B authenticates and saves exercise to library
    - User B finds exercise in "Shared with me" filter
-   [ ] **Task 5.3**: Internationalization implementation:
    - Add translation keys for all new UI strings (8 languages)
    - Run `pnpm i18n:scan` to verify completeness
    - Test UI layout with different language text lengths
-   [ ] **Task 5.4**: Performance optimization and monitoring:
    - Load testing for Edge Functions under concurrent access
    - Caching strategies for frequently accessed shared exercises
    - Error monitoring and alerting setup
    - Final security review and penetration testing

## 5. Open Questions & Design Decisions

-   **Share Token Uniqueness**: The `share-exercise` function must ensure the generated token is unique. A simple loop with a check against the database on creation should suffice given the low probability of collision with `gen_random_uuid()`.
-   **Claiming a Share**: When User B signs in after clicking a share link, we will use session storage to temporarily hold the `shareToken`. After login, the app will check for this token and finalize the "save" process. This is a clean way to pass state through the authentication flow.
-   **Video Access**: The public video URL (`custom_video_url`) on the `exercises` table must be accessible without authentication. This is already the case as Supabase Storage URLs can be made public. We need to ensure RLS on the `storage.objects` table allows public reads for the video bucket.
-   **Email notifications**: The current plan does not include sending an email to `recipient_email`. It only records the intent. A separate feature could be added later to trigger an email via a Supabase hook on the `exercise_shares` table. For now, User A would be responsible for sending the generated link to the recipient. This simplifies the initial implementation.
