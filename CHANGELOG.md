## Unreleased

## 2025-09-15

### Fixed
- **Exercise Sharing Video Download Bug**: Fixed critical issue where shared exercise videos weren't downloading to users' local storage
  - **Root Cause**: Video download logic was only in unused `SharedExercisePage.tsx`, but actual share links use `StandaloneSharedExercise.tsx` → `App.tsx` flow
  - **Architecture Fix**: Added video download logic to `App.tsx` pending share token processing to handle the actual user flow
  - **Sync Service Bug**: Fixed `updateExerciseVideoUrl()` setting `has_video: false` instead of `true` for exercises with custom videos
  - **Offline-First**: Videos are now properly downloaded from Supabase Storage to IndexedDB when saving shared exercises
  - **Storage Integration**: Video download uses proper storage path pattern and MIME type detection for compatibility
  - **Error Handling**: Video download failures don't block exercise saving operation
  - **Code Cleanup**: Removed unused `SharedExercisePage.tsx` component that was causing confusion about share routing

- **Exercise Sharing Feature Complete**: Successfully resolved all issues with shared exercise functionality
  - **Database Schema**: Added shared exercise tracking fields (`shared_from_exercise_id`, `shared_from_user_id`, `is_shared_copy`) to exercises table
  - **Frontend Display Logic**: Fixed shared exercises showing as "[Custom]" instead of "[Shared with me]" in user's library
  - **Badge Logic**: Updated `isSharedExercise()` and `isUserCreated()` functions to properly detect and categorize shared exercises
  - **Edge Function Updates**: Enhanced `save-shared-exercise` edge function (v8) to properly handle video URLs for shared exercises
  - **Video URL Scheme**: Implemented `shared-video://` URL protocol for handling videos in shared exercises
  - **Video Resolution**: Updated `resolveVideoUrl()` utility to handle shared video URLs and resolve them to playable blob URLs
  - **IndexedDB Schema**: Migrated to version 15 with proper shared exercise tracking fields
  - **Test Updates**: Fixed test cases to include proper shared exercise tracking fields for consistent behavior
  - **Build Issues**: Resolved TypeScript compilation errors and showSnackbar parameter formatting
  - **TypeScript Linter**: Fixed `@typescript-eslint/no-explicit-any` violations in syncService.ts by replacing unsafe type assertions with proper type extensions
  - **Production Deployment**: Deployed updated edge function to both development and production environments

### Fixed
- **Video Sync Discrepancy**: Fixed exercise video URL synchronization issue where successful video uploads weren't updating exercise records with correct file names
  - **Root Cause**: Video upload confirmations were being skipped during sync because they were flagged as "just pushed"
  - **Solution**: Enhanced sync logic to process video upload confirmations even when record was previously pushed
  - **Behavior**: Exercise `custom_video_url` now correctly updates to reflect the latest uploaded video file name
  - **Observability**: Added debug logging for video URL updates during sync process
  - **Server Sync**: Fixed exercise records are now marked as dirty to ensure server receives updated video URLs
- **Video Download Authentication**: Fixed video file downloads in sync to use authenticated Supabase client instead of public URLs
  - **Root Cause**: Video downloads were failing with 400 errors because they used public URLs on a private bucket
  - **Solution**: Updated `downloadVideoFileForOfflineAccess` to use `supabase.storage.from('videos').download()`
  - **Cross-Device**: Videos uploaded on one device will now properly download and display on other authenticated devices
  - **Offline Access**: Downloaded videos are stored in IndexedDB for offline viewing on all user devices
- **Share Link Video Access**: Fixed video playback for anonymous users accessing shared exercise links
  - **Root Cause**: Share links used wrong bucket (`exercise-videos` instead of `videos`) and failed public URL access
  - **Solution**: Updated `get-shared-exercise` Edge Function to use correct `videos` bucket and generate signed URLs
  - **Anonymous Access**: Share link recipients can now view videos without authentication using temporary signed URLs (1-hour expiry)
  - **Security**: Signed URLs provide time-limited access without exposing permanent public endpoints
- **SharedExercisePage App Context Dependencies**: Fixed shared exercise page to work independently without full app initialization
  - **Root Cause**: SharedExercisePage was using `useAuth()` which triggered IndexedDB initialization and sync services for anonymous users
  - **Solution**: Created lightweight `useMinimalAuth()` hook and standalone `StandaloneSnackbar` component
  - **Anonymous Experience**: Share link recipients now see clean page without navigation menu or app initialization logs
  - **Performance**: Eliminated unnecessary service initialization for public share routes improving load times
- **Edge Function JWT Authentication**: Fixed 401 errors on public share link access
  - **Root Cause**: `get-shared-exercise` Edge Function had JWT verification enabled blocking anonymous access
  - **Solution**: Added `verify_jwt = false` configuration and deployed with `--no-verify-jwt` flag
  - **Public Access**: Anonymous users can now access shared exercises without authentication tokens
- **Video Download Sync Error**: Fixed undefined reference error in video file download during sync operations
  - **Root Cause**: `downloadVideoFileForOfflineAccess` method tried to access `this.supabase` which was undefined
  - **Solution**: Added dynamic supabase import to avoid circular dependency issues
  - **Sync Reliability**: Video downloads now complete successfully during cross-device sync operations

### Added
- **Comprehensive Video System Documentation**: Created detailed technical documentation for video upload and sharing workflows
  - **Video Sync Documentation** (`docs/video-sync.md`): Complete video upload/sync flow with diagrams and component breakdowns
  - **Exercise Sharing Documentation** (`docs/exercise-sharing.md`): Complete sharing workflow from creation to anonymous access
  - **Cross-Tier Diagrams**: Visual flow charts showing data transformation through IndexedDB → Edge Function → Supabase Storage
  - **Component Mapping**: Detailed breakdown of which components handle video operations across frontend/backend
  - **Security Patterns**: Documentation of anonymous vs authenticated access patterns and permission levels
  - **Troubleshooting Guides**: Common issues, error patterns, and debugging approaches for video/sharing features
- **Supabase Migration and Synchronization Instructions**: Comprehensive AI agent guidance to prevent environment drift issues
  - **New Instruction File**: Created `.github/instructions/supabase.instructions.md` with detailed migration and synchronization protocols
  - **Environment Management**: Clear guidelines for dual environment setup (dev: xwzrsfkzqxdybjrkkkvh, prod: zumzzuvfsuzvvymhpymk)
  - **Critical Workflow**: Step-by-step process for verifying environment parity before major changes
  - **Migration Tools**: MCP tool references for comparing schemas, functions, and applying updates
  - **Emergency Procedures**: Documentation for handling significant environment drift and schema recreation
  - **Best Practices**: Security considerations, rollback procedures, and continuous monitoring recommendations
  - **Updated Agent Instructions**: Enhanced all AI agent instruction files with Supabase synchronization requirements

## 2025-09-14

### Added
- **Exercise Sharing Feature**: Complete implementation of exercise sharing functionality allowing users to share their custom exercises with others
  - **Share Creation**: Users can generate shareable links for their custom exercises with optional email targeting
  - **Public Viewing**: Recipients can view shared exercises without authentication or consent requirements
  - **Save to Library**: Authenticated users can save shared exercises to their own library with one click
  - **Edge Functions**: Three new Supabase Edge Functions handle the sharing workflow:
    - `share-exercise`: Creates secure share tokens and public URLs
    - `get-shared-exercise`: Retrieves exercise data via share token (public endpoint)
    - `save-shared-exercise`: Copies shared exercises to user's library with proper ownership
  - **Database Schema**: Added `share_token` column to existing `exercise_shares` table for public link sharing
  - **Security**: Cryptographically secure share tokens with proper access controls and ownership validation
  - **Responsive UI**: Mobile-optimized sharing modal and public viewing page with clear call-to-action buttons
  - **Environment-Aware**: Dynamic Supabase URL configuration supporting both development and production environments

### Fixed
- **TypeScript Build Errors**: Fixed Supabase URL access errors in sharing components
- **Sync Service JWT Token Issues**: Fixed "Invalid JWT" errors during sync operations by implementing fresh session token retrieval
  - Modified `correctSyncService.callEdge()` to get fresh auth tokens right before API calls
  - Prevents timing issues where cached tokens expire between sync start and actual API execution
  - Graceful fallback to cached token if fresh session retrieval fails
- **Public Share Route Consent Bypass**: Fixed blank page issue when accessing shared exercise links without consent
  - SharedExercisePage now renders without requiring user consent (exception to offline-first principle)
  - Prevents IndexedDB creation on public share routes to maintain privacy compliance
  - Added `isPublicShareRoute()` helper to detect `/share/*` routes and bypass consent checks
  - **Issue**: Direct access to protected `supabaseUrl` property caused TS2445 compilation errors
  - **Solution**: Created `supabaseFunctionBaseUrl` export in supabase config using environment variables
  - **Result**: Edge Function calls now work correctly across development and production environments

## 2025-09-14 (Earlier)

### Fixed
- **Unit test failures**: Fixed failing tests for storage service and sync service components
  - **Storage service tests**: Enhanced error handling in `safeDatabaseAccess()` to gracefully handle general IndexedDB errors in test environments
  - **Sync service tests**: Fixed fetch mock structures to include proper Response objects with status, headers, and methods
  - **Concurrency handling**: Fixed sync service to return same in-flight promise for concurrent calls instead of creating new resolved promises
  - **Test isolation**: Added proper database cleanup between tests to prevent cross-test contamination
- **TypeScript compilation error**: Fixed type comparison error in video file filtering logic
  - **Issue**: `vf.deleted` boolean type compared to number `1` causing TS2367 error
  - **Fix**: Simplified logic to use `!vf.deleted` which correctly handles both boolean and numeric representations
- **Missing favorite button on custom exercise cards**: Fixed layout issue where favorite button was not visible
  - **Issue**: Custom exercises with video, edit, and delete buttons caused the favorite button to be pushed off-screen
  - **Root cause**: Button container layout couldn't accommodate 4 action buttons (Play, Edit, Delete, Favorite) on mobile screens
  - **Fix**: Enhanced responsive layout with tighter spacing and smaller buttons on mobile while maintaining accessibility
    - Reduced button gaps from `gap-2` to `gap-1 sm:gap-2` for better mobile spacing
    - Made buttons smaller on mobile: `min-h-[36px]` vs `min-h-[44px]` on desktop
    - Added `flex-shrink-0` to button container to prevent layout collapse
    - Maintained WCAG-compliant touch targets and all accessibility features

## 2025-09-14 (Earlier)

### Fixed
- **Custom exercise video sync architecture**: Corrected offline-first video sync to maintain proper blob-pending-sync URLs
  - **Issue**: Previous fix broke offline-first architecture by converting blob-pending-sync URLs to storage URLs server-side
  - **Root cause**: Edge Function was incorrectly converting local `blob-pending-sync://` URLs to Supabase storage URLs during sync
  - **Problem**: This forced devices to fetch videos from network instead of local IndexedDB, breaking offline functionality
  - **Corrected architecture**:
    - **Device A**: Upload video → IndexedDB → Sync video_files table → Keep `blob-pending-sync://` URL for local playback
    - **Device B**: Receive video_files sync → Auto-download video to IndexedDB → Generate `blob-pending-sync://` URL
    - **Both devices**: All video playback uses IndexedDB blob URLs (fully offline-first)
  - **Enhanced sync service**: Added automatic video file download and exercise URL updates
    ```typescript
    // Client sync now handles video downloads automatically
    if (table === 'video_files' && row.storage_path && !row.file_data) {
      await this.downloadVideoFileForOfflineAccess(row);
      await this.updateExerciseVideoUrl(exerciseId, fileName);
    }
    ```
  - **Sharing capability**: Added `getShareableVideoUrl()` utility to convert blob-pending-sync URLs to storage URLs only when needed for external sharing
  - **Result**: Maintains true offline-first architecture while enabling future exercise sharing features

## 2025-09-13

### Fixed
- **Custom exercise video playback**: Fixed blob-pending-sync URL resolution for video preview and timer display
  - **Issue**: Custom exercise videos stored as `blob-pending-sync://` URLs couldn't be played in preview modal or timer ring
  - **Root cause**: Video URLs were stored as temporary placeholders that needed resolution to actual blob URLs via IndexedDB
  - **Error**: `Fetch API cannot load blob-pending-sync://...` - URL scheme not supported for direct playback
  - **Solution**: Created comprehensive URL resolution system
    - Added `resolveVideoUrl()` utility to convert blob-pending-sync URLs to playable blob URLs
    - Enhanced `useExerciseVideo` hook with async URL resolution for custom exercises
    - Updated ExercisePage preview logic to resolve custom video URLs before display
    - Modified TimerPage prefetch system to handle custom video URL resolution
    - Implemented proper blob URL cleanup to prevent memory leaks
  - **Additional fix**: Skipped HEAD request preflight checks for blob URLs to prevent ERR_METHOD_NOT_SUPPORTED errors
  - **Bidirectional sync**: Implemented complete video sync system for cross-device availability
    - Videos upload from Device A → Supabase Storage during sync
    - Videos download to Device B → IndexedDB when accessing exercises
    - Added exercise enrichment with video URLs during data loading
    - Enhanced resolveVideoUrl() to download missing videos from cloud storage
    - Maintains offline-first architecture while enabling cross-device sync
  - **Result**: Custom exercise videos now work seamlessly across all devices and browsers, matching built-in exercise behavior
- **Video sync system**: Implemented complete offline-first video upload and sync functionality
  - **Root cause analysis**: Videos failed to sync due to multiple architectural issues
    1. **Missing sync table**: `video_files` table was not included in Edge Function `SYNC_TABLES` array
    2. **File serialization failure**: File objects cannot be JSON serialized, causing empty `{}` uploads
    3. **Missing storage bucket**: `videos` bucket didn't exist in Supabase Storage
    4. **Missing database schema**: `video_files` table didn't exist in production database
  - **Complete solution implemented**:
    - **Database migration**: Created `video_files` table with proper schema, indexes, and RLS policies
    - **Storage infrastructure**: Created `videos` bucket with user-folder security policies (`userId/exerciseId/fileName`)
    - **Client-side serialization**: Added `convertVideoFileForSync()` method to convert File objects to byte arrays
    - **Edge Function enhancement**: Updated sync handler to process byte arrays and upload to Storage
    - **Offline-first workflow**: Videos stored in IndexedDB → sync converts to byte array → Edge Function uploads to Storage
  - **Technical implementation**:
    ```typescript
    // Client: Convert File to JSON-serializable byte array
    const arrayBuffer = await file.arrayBuffer();
    converted.file_data = Array.from(new Uint8Array(arrayBuffer));
    
    // Server: Convert byte array back to binary and upload
    const uint8Array = new Uint8Array(record.file_data);
    await supabase.storage.from('videos').upload(path, uint8Array);
    ```
  - **Result**: Complete offline-first video functionality with cloud sync - videos work offline and sync automatically

### Enhanced
- **ExercisePage filter persistence**: Implemented localStorage-based filter state preservation
  - **Issue**: Filter settings (search, categories, sort) were lost when navigating away and returning
  - **Solution**: Auto-save filter state to localStorage with 'exercise-page-filters' key
  - **Features**: Restores search terms, selected categories, sort preferences, and filter types across sessions
  - **Error handling**: Graceful fallback to defaults if localStorage fails
  - **User experience**: Maintains context and reduces re-filtering effort

### Added
- **Comprehensive video sync infrastructure**:
  - Database table: `video_files` with complete metadata schema
  - Storage bucket: `videos` with secure user-folder organization
  - RLS security: Users can only access their own video files
  - Edge Function support: Full video file processing in sync_v2
  - Error handling: Graceful fallback for failed uploads and storage issues

## 2025-01-13

### Fixed
- **Video upload format compatibility**: Implemented singleton video per exercise and enhanced format validation
  - **Root cause**: Multiple video records per exercise caused query confusion, and unsupported video codecs triggered `DEMUXER_ERROR_NO_SUPPORTED_STREAMS` errors
  - **Singleton approach**: Modified `saveVideoFile` to delete existing videos before saving new ones, ensuring only one video per exercise
  - **Enhanced format validation**: Added specific browser-compatible format checking in both storage service and UI
    - Supported formats: MP4, WebM, OGG, AVI, MOV, QuickTime
    - Client-side validation prevents upload attempts with incompatible formats
    - Clear error messages guide users to use compatible formats
  - **Improved user experience**: Better error feedback with new `video.unsupportedFormat` translation key
  - **Result**: Eliminates video storage conflicts and prevents codec compatibility issues that caused failed video playback

### Enhanced
- **Video upload error handling**: Added comprehensive format validation and user-friendly error messages
- **Internationalization**: Added `video.unsupportedFormat` translation key to all locales
- **Debug logging**: Enhanced video upload logging to track singleton deletion and format validation processes

### Fixed
- **Timer state persistence bug**: Fixed critical issue where stale workout data persisted after workout completion
  - **Root cause**: `workoutMode` state remained active when users immediately selected standalone exercises after completing workouts
  - **Symptoms**: Timer displayed wrong exercise data (e.g., "burpees 2×8" when selecting "Bicycle Crunches")
  - **Solution**: Implemented double-safety state clearing mechanism
    - Primary: Clear `workoutMode` immediately on workout completion
    - Secondary: Force-clear stale `workoutMode` in exercise selection handler
    - Enhanced debug logging to track state transitions during workout completion
  - **Prevents**: Race conditions between workout completion and exercise selection that caused UI state corruption
- **Video demo state management**: Fixed video display issues after workout completion
  - **Issue**: Videos continued showing for completed workouts when `currentExerciseIndex >= total exercises`
  - **Fix**: Added bounds checking in `TimerPage.tsx` to prevent video display when workout is completed
  - **Enhanced**: Proper video state cleanup when transitioning from workout mode to standalone exercises
- **Debug logging cleanup**: Commented out verbose timer completion debug statements while preserving core functionality
  - Reduced console noise while maintaining essential debugging capabilities
  - Debug statements can be easily re-enabled for troubleshooting
- **Sync system re-enabled**: Fixed sync not working by re-enabling automatic sync triggers
  - **Root cause**: Automatic sync triggers were disabled in `App.tsx` due to "timeout issues" comments
  - **Re-enabled periodic sync**: Every 5 minutes when app is active
  - **Re-enabled foreground sync**: When app comes to foreground (tab/window focus)
  - **Manual sync available**: Settings page "Sync Now" button for immediate sync
  - **User data now syncs**: Workouts and activity logs with `dirty: 1` will sync to Supabase
- **Complete sync system overhaul**: Resolved all critical sync failures with systematic approach
  - **Undefined field filtering**: Added universal `filterUndefinedValues()` method to prevent 422 database errors
    - Applied to all sync payload types (app_settings, user_favorites, etc.)
    - Filters out `undefined` values like `owner_id: undefined`, `dirty: undefined` that caused sync failures
    - Implemented in both StorageService and CorrectSyncService as safety net
  - **Resilient sync architecture**: Changed from fail-fast to partial success handling
    - Edge function returns 207 Multi-Status for partial success instead of 422 failure
    - Client accepts both 200 (full success) and 207 (partial success) responses
    - Individual record failures no longer crash entire sync batch
    - Added comprehensive sync metadata with detailed success/error breakdown
  - **Schema consistency**: Fixed `user_favorites` table using `user_id` while server expected `owner_id`
    - Updated IndexedDB schema to version 12 with `owner_id` field migration
    - Fixed `UserFavorite` TypeScript interface and all database operations
    - Resolves "2 of 3 operations failed" errors from field name mismatches
- **Debug cleanup**: Removed verbose "ExerciseCard Debug - UUID exercise ownership check" console logging
- **Workout data sync failure**: Fixed critical issue preventing activity_logs and workout_sessions from syncing to Supabase
  - **Root cause**: Edge function field allowlists were missing key fields defined in TypeScript interfaces
    - `activity_logs` missing: `exercise_name`, `timestamp`, `is_workout`, `exercises`, `sets_count`, `reps_count`
    - `workout_sessions` missing: `workout_name`, `start_time`, `end_time`, `exercises`, `is_completed`, `total_duration`
  - **Symptoms**: Records marked as clean (dirty=0) in IndexedDB but never appeared in Supabase database
  - **Solution**: Updated sync_v2 edge function allowlists to include all required fields from TypeScript interfaces
  - **Result**: All workout data now syncs successfully from IndexedDB to Supabase cloud database
  - **Owner_id fix**: Resolved undefined owner_id issue by ensuring all `prepareUpsert()` calls include current user ID
  - **Anonymous-to-authenticated flow**: Verified proper ownership claiming when users sign in after creating anonymous data

### Enhanced  
- **Sync investigation documentation**: Added comprehensive troubleshooting guide at `docs/sync-investigation.md`
  - Root cause analysis methodology and correlation ID tracing
  - Prevention strategies for future sync issues

### Previous Unreleased Changes
- Frontend: Added exercise seeding diagnostics (`[seed] exercises.count before/after`) and a safe reseed + fallback path in `App.tsx` to prevent empty Exercises page after hard reloads. This also reduces perceived init stalls by avoiding endless empty loads.
- Frontend: Improved post‑init rehydrate with short retry/backoff when UI shows 0 exercises but IndexedDB has data, ensuring the Exercises page populates reliably even if the init watchdog forces early UI render.

### 2025-09-12 — Sync Field Naming Consistency and Database Schema Standardization

### Fixed
- **Database schema inconsistency**: Standardized all table column naming from mixed `user_id`/`owner_id` to consistent `owner_id` across all tables
  - Renamed columns in `sync_cursors`, `profiles`, `audit_logs`, `user_authenticators`, `webauthn_challenges`, `exercise_ratings`, `workout_ratings` 
  - Eliminates confusion between field naming conventions that was causing sync logic inconsistencies
  - All sync and non-sync tables now use consistent `owner_id` field naming for user ownership

- **Sync edge function field allowlist**: Fixed sync returning 200 status but records not being inserted into Supabase
  - Removed duplicate `scrubIncoming()` function definition that was overwriting the correct implementation
  - Added missing fields to `MUTABLE_FIELD_ALLOWLIST`: `interval_duration`, `sound_enabled`, `default_interval_duration`, and many schema fields
  - Enhanced field filtering with detailed logging to show which fields are processed vs filtered
  - Records now properly insert/update in database instead of silently failing due to field validation

- **CORS preflight handling**: Fixed sync edge function CORS errors preventing client requests
  - Enhanced CORS headers with `Access-Control-Allow-Methods` and `Access-Control-Max-Age`
  - Improved OPTIONS handler with explicit 200 status and proper CORS response
  - Added comprehensive request logging for better debugging visibility

### Enhanced
- **Sync debugging**: Added extensive logging throughout sync edge function for troubleshooting
  - Correlation IDs for tracing requests end-to-end
  - Detailed field processing logs showing incoming/outgoing field names
  - Database operation success/failure tracking with specific error messages
  - Environment variable validation and JWT token validation logging

### 2025-09-11 — Complete Sync and Storage Resolution

### Fixed
- **IndexedDB creation failure**: Fixed database creation failing with "index already exists" error
  - Removed duplicate `*owner_id` index declarations from database version 11 schema
  - `owner_id` fields were already indexed since version 6, duplicate indexes caused ConstraintError
  - Database now creates successfully after consent, allowing proper storage functionality
  - Fixed issue where app would fall back to memory storage instead of persistent IndexedDB

- **Anonymous data migration failure**: Fixed TypeError during login when claiming anonymous data
  - Fixed invalid key error in `claimOwnership()` function when using `null` values with Dexie
  - Use indexed queries for empty string `owner_id` values only
  - Add separate collection scan to handle `null` `owner_id` values properly
  - Anonymous exercises, settings, and preferences now properly claimed on authentication

### Verified Working
- ✅ IndexedDB creates successfully after consent
- ✅ Anonymous data migration works (30 records successfully claimed in test)
- ✅ Sync V2 architecture fully operational (9 pushed, 7 pulled in test)
- ✅ Settings persistence working (beep volume, theme, etc.)
- ✅ Custom exercise identification with proper visual distinction
- ✅ Complete login-to-sync flow operational

### 2025-09-11 — Custom Exercise Identification & Sync Debugging

### Fixed
- **Custom exercise identification**: Fixed custom exercises not showing proper visual distinction (border, edit/delete buttons, "custom" tag)
  - Updated `isUserCreatedExercise()` logic to handle exercises created before proper ownership was set
  - For UUID exercises without `owner_id`, assume ownership by current authenticated user (handles legacy cases)
  - Added fallback logic in ExerciseCard component for backward compatibility
- **Sync service owner_id issues**: Fixed critical sync failures for user preferences and custom exercises
  - Fixed `ensureUserPreferences()` to set correct `owner_id` from current user instead of `null`
  - Fixed `updateUserPreferences()` to use proper `getCurrentUserId()` method instead of undefined `this.authService`
  - Added logic to backfill missing `owner_id` on existing user preferences records
  - Fixed IndexedDB schema by adding `*owner_id` indexes to all relevant tables (version 11 migration)
  - Restored indexed query strategy in `claimOwnership()` function for better performance

### Added
- **Enhanced debugging for sync issues**: Added comprehensive logging for sync troubleshooting
  - Added debug logs in `toggleExerciseFavorite()` to track user preferences updates
  - Added debug logs in `saveUserPreferences()` to monitor IndexedDB storage
  - Added debug logs in `collectDirtyBatch()` to track what records are being synced
  - All debug logs respect existing DEBUG feature flag and use proper logger utility

### 2025-09-11 — Sync V2 Initialization Fix

### Fixed
- **V2 sync initialization hanging**: Fixed app initialization timeout issues when `SYNC_ENGINE=v2` by resolving storage service deadlock
  - **Root cause**: Post-authentication sync was calling `StorageService.getInstance()` during `storageService.ready()`, creating a circular dependency deadlock
  - Added async `await this.storage.ready()` in `CorrectSyncService.initializeServices()` to wait for storage initialization
  - Implemented proper async/await pattern in sync service initialization to prevent race conditions
  - Added deferred service initialization in `V2CompatSyncService` to prevent blocking during startup
  - Added initialization guards to prevent database access before services are ready
  - Fixed `hasChangesToSync()` to skip checks when services aren't initialized yet
  - Implemented lazy singleton factory to prevent sync service instantiation during module import
  - Added comprehensive error handling and early returns in sync operations when services unavailable
  - Fixed all TypeScript build errors with proper null safety checks
  - App now loads properly and exercises page displays correctly with v2 sync enabled

### 2025-09-10 — Initialization Watchdog & Splash Reliability

### Fixed
- Prevented rare indefinite loading splash by adding an initialization watchdog in `App.tsx` that forces UI ready after 5s if init stalls, with a proper `finally` path that always calls `setIsLoading(false)`.

### Added
- Detailed `[init]` debug logs around exercise seeding, settings/prefs load, and overall init duration to aid triage without leaking sensitive data.

### Changed
- Sync routing: Updated `useNetworkSync` and `authService` to use the factory `syncService` export that honors `SYNC_ENGINE`, eliminating direct `SyncService.getInstance()` calls. This stops legacy `/functions/v1/sync` requests when v2 is enabled and ensures v2-only traffic by default.
- V2 compatibility: Added a lightweight `V2CompatSyncService` wrapper so existing hooks/components can keep using status/listener APIs while delegating to `CorrectSyncService` under the hood when `SYNC_ENGINE === 'v2'`.

### Fixed
- Logger compliance: Replaced `console.warn/error` in `useNetworkSync` with the centralized logger utility to meet project logging rules.

### Fixed
- **Sync v2 field mapping issues**: Fixed app_settings sync failures where beep volume changes showed "pushed=1" but weren't reaching database
  - Restored missing field mapping calls in `CorrectSyncService` for `app_settings` table
  - Updated `sync_v2` edge function with comprehensive `MUTABLE_FIELD_ALLOWLIST` including all required fields
  - Deployed edge function fixes to both development and production environments
  - Resolved TypeScript build errors from non-existent field mapping method calls
- **Build errors**: Fixed TypeScript compilation issues in `CorrectSyncService` by removing calls to non-existent field mapping methods and unused imports

### Added
- Updated Sync Implementation Plan (section T) with immediate execution focus tasks (edge function v2, pull logic, conflict resolution, advanced UI controls, test matrix).
- Advanced Sync controls (v2 only): Force Full Sync & Reset Sync State added to `SettingsPage` guarded by `SYNC_ENGINE === 'v2'`.
- Sync Engine v2 completion: `CorrectSyncService` + `sync_v2` Edge Function delivering per-table composite cursors, push batching (≤5), pull pagination (50/page, max 5 pages), light/full/priority modes, version-first conflict resolution with timestamp/id tiebreak, soft delete propagation & resurrection prevention, exponential backoff with jitter, priority push bypass, advanced Settings UI (Force Full Sync / Reset Sync State), structured correlation ID logging, and comprehensive test matrix coverage (batch splitting, backoff escalation/reset, conflict winner selection, soft delete propagation, multi-page & boundary pagination, cursor tie ordering, owner_id tamper prevention, priority push path, concurrency guard).  
  - Security hardening: table allow‑list, payload size cap (32KB), field scrubbing (`owner_id`, `updated_at`, `deleted`), enforced ownership, minimal response payload.
  - Documentation: `docs/sync.md` rewritten, README link added, implementation plan updated through Phase 9.

### Changed
- Refined implementation phases R4–R11 inside plan; marked current scaffold progress and new statuses.
- Default sync engine flag flipped to v2 (`SYNC_ENGINE` now defaults to 'v2'; set VITE_SYNC_ENGINE=legacy to rollback during monitoring window).

### Removed
- Outdated technical note about edge function v2 not existing (engine implemented and feature-flagged).

### Technical
- Sync v2 feature flag remains (`SYNC_ENGINE`); legacy service retained for rollback until Phase 10 validation completes.

## 2025-09-08 — Exercise Page UX Enhancement & Filter Improvements

- feat: Enhanced ExercisePage with visual distinction between built-in and user-created exercises
- feat: Added comprehensive filter and sort options for better exercise discovery
- feat: Implemented Custom badge and blue borders for user-created exercises
- i18n: Added translations for all new UI elements across 8 languages

  🎨 **Visual Enhancement Features**:
  - ✅ **Custom Badge**: User-created exercises display "Custom" badge next to title
  - ✅ **Border Styling**: User-created exercises have distinctive blue borders vs gray for built-in
  - ✅ **Built-in Preservation**: Original exercise cards maintain their current appearance
  - ✅ **Mobile Optimized**: Responsive design works seamlessly on all device sizes
  - ✅ **Accessibility**: Proper ARIA labels and contrast ratios maintained

  🔍 **Advanced Filtering & Sorting**:
  - ✅ **Filter Toggle Buttons**: "All" | "Built-in" | "Custom" exercise type filters
  - ✅ **Sort Options**: "Name" | "Type" | "Recently Added" dropdown with intelligent sorting
  - ✅ **Enhanced Search**: Cross-type search works across both built-in and user-created exercises
  - ✅ **Clear All Filters**: One-click reset for all filters and sort options
  - ✅ **State Management**: Efficient useMemo-based filtering with proper dependency tracking

  🌍 **Internationalization Support**:
  - ✅ **English**: Base translations for all new UI elements
  - ✅ **Spanish**: Complete translations for filter and sort options
  - ✅ **French**: Proper French translations with correct grammar
  - ✅ **German**: German translations with appropriate technical terms
  - ✅ **Dutch**: Dutch translations for all new functionality
  - ✅ **Arabic**: RTL-compatible Arabic translations (Standard + Egyptian dialect)
  - ✅ **Frisian**: Complete Frisian translations for all new features

  🛠️ **Technical Improvements**:
  - ✅ **Helper Functions**: `isUserCreatedExercise()` for consistent exercise type detection
  - ✅ **Sort Logic**: Intelligent multi-level sorting (by type, then name; by date, then name)
  - ✅ **Performance**: Optimized filtering with proper memoization and dependency arrays
  - ✅ **Type Safety**: Full TypeScript support with proper type definitions
  - ✅ **Code Quality**: ESLint compliant with proper error handling

  📊 **Quality Assurance**:
  - ✅ **Unit Tests**: All existing ExercisePage tests pass with new features
  - ✅ **Build Success**: TypeScript compilation successful without errors
  - ✅ **UX Testing**: Maintains excellent mobile-first user experience
  - ✅ **Backward Compatibility**: No breaking changes to existing functionality

## 2025-09-08 — Debug Statement Cleanup and Logger Improvements

- refactor: Cleaned up excessive debug statements in storageService and syncService
- feat: Updated logger utility to always show warning messages in production

  🧹 **Debug Statement Cleanup**:
  - ✅ **StorageService**: Removed ~15 excessive debug statements while preserving essential error logging
  - ✅ **SyncService**: Removed ~25 verbose debug statements including detailed request/response logging
  - ✅ **Production Ready**: Eliminated emoji decorations and verbose success messages from routine operations
  - ✅ **Security**: Removed detailed request body logging that could expose sensitive data
  - ✅ **Performance**: Reduced console output overhead during normal operations
  - ✅ **Preserved Critical Paths**: Kept all error logging and warnings for production debugging

  🚨 **Logger Enhancement**:
  - ✅ **Warning Messages**: `logger.warn()` now always outputs regardless of DEBUG flag value
  - ✅ **Production Visibility**: Important warnings (network issues, token refresh failures, sync conflicts) always visible
  - ✅ **Industry Standard**: Follows best practice of always logging errors and warnings, while keeping debug output controlled by feature flags

  📊 **Quality Assurance**:
  - ✅ **TypeScript**: No compilation errors
  - ✅ **ESLint**: Fixed unused variables and empty blocks
  - ✅ **Functional Tests**: Services maintain all core functionality
  - ✅ **Error Handling**: All error paths preserved with proper logging

## 2025-09-07 — Logger Utility Implementation and Console Cleanup

- feat: Implemented centralized logger utility with DEBUG flag control
- refactor: Replaced direct console.log() usage with logger utility across codebase
- docs: Updated AI instruction files with logger usage guidelines

  🛠️ **Logger Utility Features**:
  - ✅ **DEBUG-Controlled Logging**: `logger.log()`, `logger.info()`, `logger.debug()`, `logger.warn()` respect DEBUG feature flag
  - ✅ **Production Safety**: `logger.error()` always outputs regardless of DEBUG flag for error tracking
  - ✅ **Type Safety**: Full TypeScript support with proper argument typing
  - ✅ **Feature Flag Integration**: Controlled by `DEBUG` constant in `src/config/features.ts`
  - ✅ **Usage Pattern**: Simple import `import logger from '../utils/logger';` and use

  🔄 **Console Usage Migration**:
  - ✅ **App.tsx**: Replaced 43+ console calls with logger utility
  - ✅ **ExercisePage.tsx**: Migrated 6 console calls to logger
  - ✅ **EditExercisePage.tsx**: Converted all console usage to logger
  - ✅ **Major Files**: Updated core application files with logger imports
  - ✅ **Test Coverage**: Added comprehensive tests for logger functionality

  📚 **Documentation Updates**:
  - ✅ **AGENTS.md**: Added logger usage guidelines and migration patterns
  - ✅ **CLAUDE.md**: Added debug logging instructions with feature flag info
  - ✅ **Cursor Rules**: Updated workspace rules to prohibit direct console usage
  - ✅ **GitHub Instructions**: Updated Copilot and project instructions with logger requirements
  - ✅ **AI Agent Guidelines**: Comprehensive documentation for consistent logger usage across development tools

## 2025-09-07 — Exercise Form Enhancements and Critical Sync Fixes

- feat: Comprehensive exercise form improvements with decimal durations, video features, and working sync system

  🎨 **Exercise Form UX Improvements**:
  - ✅ **Auto-capture Array Inputs**: Added automatic data capture when tabbing away from equipment, muscle groups, and tags fields
  - ✅ **Comma-separated Input**: Support for comma-separated values in array fields (e.g., "dumbbells, yoga mat")
  - ✅ **Form Stability**: Fixed form reset issue when switching browser tabs during editing
  - ✅ **Decimal Durations**: Added support for decimal values in Duration and Rep Duration fields (e.g., 2.5 seconds)
  - ✅ **Feature-gated Video Section**: Video upload section now properly hidden when feature flag is disabled
  - ✅ **Video Removal**: Fixed video removal functionality to properly clear video data on save
  - ✅ **Duplicate Header Fix**: Removed duplicate "Exercise Video" header from video upload widget
  - ✅ **useEffect Warning Fix**: Resolved React useEffect dependency array size warning

  🗄️ **Database Schema Updates**:
  - ✅ **Decimal Duration Support**: Migrated `default_duration` and `rep_duration_seconds` from integer to numeric(10,2)
  - ✅ **Video Storage**: Created `exercise-videos` Supabase storage bucket with proper permissions
  - ✅ **Feature Flags**: Enabled `custom_video_upload` feature flag for video upload functionality

  🔄 **Critical Sync System Fixes**:
  - ✅ **Sync Edge Function**: Fixed missing client upsert processing logic in sync edge function
  - ✅ **IndexedDB → Database**: Client changes now properly sync from IndexedDB to Supabase database
  - ✅ **Real-time Sync**: Exercise updates (including decimal durations) now sync within minutes
  - ✅ **Multi-environment**: Fixed sync functionality deployed to both development and production

  🛠️ **Technical Improvements**:
  - ✅ **Form Processing**: Changed `parseInt()` to `parseFloat()` for duration fields to preserve decimals
  - ✅ **Input Validation**: Updated form inputs with `step="0.1"` and `min="0.1"` for decimal support
  - ✅ **Error Handling**: Enhanced sync error handling and logging for better debugging
  - ✅ **Feature Flag Integration**: Added proper feature flag checking in ExerciseForm component

  🔧 **Technical Implementation**:
  - Modified `ExerciseForm.tsx` to use ConfirmationModal instead of browser alerts
  - Fixed sync-processor.ts deduplication logic in Supabase Edge Function
  - Cleaned legacy built-in exercise data from production database
  - Added proper modal state management with cancelModalOpen and clearFormModalOpen

## 2025-09-07 — Build and Code Quality Fixes

- fix: Resolved TypeScript build errors and ESLint violations for improved code quality and maintainability
  
  🔧 **Build Fixes**:
  - ✅ **StorageService Types**: Added 'seed' operation type to SyncMetadata for built-in exercise seeding
  - ✅ **Filter Types**: Fixed boolean return type in exercise ID filter expressions
  - ✅ **TypeScript Compliance**: All build errors resolved, project compiles successfully

  🧹 **Code Quality Improvements**:
  - ✅ **Type Safety**: Replaced `any` types with proper TypeScript interfaces in App.tsx
  - ✅ **Server Data Types**: Created proper `ServerExerciseData` and `ServerWorkoutData` interfaces for Supabase responses in CommunityPage.tsx
  - ✅ **Interface Cleanup**: Removed empty interfaces in CommunityPage.tsx and ExerciseDetailPage.tsx
  - ✅ **Import Organization**: Added proper SyncService type import in App.tsx
  - ✅ **Lint Compliance**: All ESLint errors fixed, codebase passes strict linting rules

  🏗️ **Technical Details**:
  - Modified `src/types/index.ts` to extend SyncMetadata.op type with 'seed' value
  - Enhanced StorageService filter boolean conversion with proper type checking  
  - Improved type safety for Supabase database response handling
  - Maintained backward compatibility while strengthening type definitions

## 2025-09-07 — Complete Profile System Implementation

- feat: Implemented comprehensive user profile system with connections functionality - Added full-featured Profile pages accessible from Settings, supporting user details display, social connections management, and privacy controls.

  👤 **Profile Features**:
  - ✅ **Profile Display**: User avatar, name, email, bio, and member since information
  - ✅ **Statistics Dashboard**: Total workouts, current streak, exercises/workouts created
  - ✅ **Connections System**: View connections count and navigate to individual profiles
  - ✅ **Privacy Controls**: Configurable profile visibility (public/connections/private)
  - ✅ **Multi-user Support**: View other users' profiles via `/profile/:userId` routes
  - ✅ **Mobile-First Design**: Responsive UI optimized for mobile devices

  🔗 **Social Features**:
  - ✅ **Connection Requests**: Send, accept, and reject connection requests
  - ✅ **Bidirectional Connections**: Automatic reciprocal connection creation
  - ✅ **Connection Management**: Remove connections and block functionality
  - ✅ **Profile Search**: Search users by display name or bio content
  - ✅ **Privacy-Aware**: Respect user privacy settings for profile visibility

  🏗️ **Technical Implementation**:
  - ✅ **Data Models**: Complete TypeScript types for UserProfile, Connection, ConnectionRequest
  - ✅ **ProfileService**: Singleton service with full CRUD operations and relationship management
  - ✅ **IndexedDB Integration**: Offline-first storage with sync service compatibility
  - ✅ **Route Integration**: Added `/profile` and `/profile/:userId` routes to React Router
  - ✅ **Settings Integration**: Profile button in Settings navigates to Profile page

  🌐 **Internationalization**:
  - ✅ **Complete i18n**: Profile translations added to all 8 supported locales
  - ✅ **Language Coverage**: English, French, German, Spanish, Dutch, Arabic, Arabic-Egyptian, Frisian
  - ✅ **Pluralization Support**: Proper plural forms for connection counts
  - ✅ **Contextual Translations**: Different text for own profile vs others' profiles

  🧪 **Quality Assurance**:
  - ✅ **Unit Tests**: Comprehensive test suites for ProfilePage component and ProfileService
  - ✅ **Error Handling**: Graceful handling of missing profiles and network errors
  - ✅ **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels
  - ✅ **Loading States**: Proper loading indicators and user feedback
  - ✅ **Authentication Flow**: Sign-in prompts for unauthenticated users

## 2025-09-06 — Translation Fixes and Internationalization Improvements

- fix: Fixed beep interval dropdown and export rate limit missing translations - Resolved hardcoded English text appearing in all locales for SettingsPage beep interval dropdown options and DataExportButton rate limit message.

  🌐 **Internationalization Fixes**:
  - ✅ **Beep Interval Dropdown**: Added translation keys for "Every 15/30/45/60 seconds" options in all 8 supported locales
  - ✅ **Export Rate Limit**: Added missing `exportRateLimit` translation key to all locales for "You can request up to 3 exports per day" message
  - ✅ **Language Coverage**: Updated English, French, German, Spanish, Dutch, Arabic, Arabic-Egyptian, and Frisian translations
  - ✅ **UI Consistency**: Replaced hardcoded strings in SettingsPage.tsx with proper translation function calls
  - ✅ **User Experience**: Non-English users now see properly localized text instead of English fallbacks

## 2025-09-06 — User-Created Exercise Platform Fixes and Infrastructure Improvements

- fix: Resolved critical issues with Edit Exercise page functionality - Fixed equipment, muscle groups, and tags not being saved during exercise creation and editing due to form logic sending `undefined` instead of actual arrays.

  🔧 **Exercise Form Fixes**:
  - ✅ **Array Field Handling**: Fixed form submission logic to properly send array values instead of `undefined`
  - ✅ **Offline-First Architecture**: Converted Create/Edit pages from direct Supabase calls to proper IndexedDB → sync pattern
  - ✅ **Immediate UI Updates**: Added custom event system for real-time exercise list updates after create/edit operations
  - ✅ **Data Integrity**: Fixed caching issues where changes weren't reflected immediately in the UI
  - ✅ **Ownership Validation**: Enhanced user authorization checks for exercise editing

- fix: Cleaned up database orphaned records and display issues - Resolved visibility problems with exercises showing wrong owner_id and duration display bugs.

  🗄️ **Database Cleanup**:
  - ✅ **Orphaned Records**: Removed exercises with null owner_id that weren't marked as public
  - ✅ **Duration Display**: Fixed time-based exercises showing "exercises.variable" instead of actual duration
  - ✅ **Missing Migrations**: Applied duration_minutes column migration to production database
  - ✅ **Default Values**: Set proper default duration of 30 seconds for exercises missing duration data

- feat: Enhanced PWA offline-first architecture compliance - Ensured all user-created content operations follow proper offline-first patterns for better reliability and performance.

  📱 **PWA Architecture**:
  - ✅ **Storage Service Integration**: All exercise operations now use `storageService.saveExercise()` pattern
  - ✅ **Sync Queue**: Changes are properly queued for background synchronization with server
  - ✅ **Event-Driven Updates**: Implemented custom event system for component communication
  - ✅ **Local Data Priority**: UI always shows latest local data while sync happens in background

## 2025-09-06 — Form Persistence, Database Fixes, Security Planning, and Accessibility Testing

- feat: Complete accessibility testing infrastructure and WCAG 2.1 AA compliance - Fixed all accessibility test dependencies, resolved consent screen blocking issue, and achieved 100% test success rate (14/14 tests passing).

  ♿ **Accessibility Testing**:
  - ✅ **Test Infrastructure**: Fixed missing dependencies, Cypress configuration, and TypeScript setup
  - ✅ **Consent Bypass**: Implemented localStorage consent bypass to prevent test blocking
  - ✅ **Loading Screen H1 Elements**: Added proper semantic headings for screen readers
  - ✅ **WCAG Compliance**: All pages now pass color contrast, keyboard navigation, and ARIA label tests
  - ✅ **Test Robustness**: Improved page loading waits and axe-core integration
  - ✅ **Form Accessibility**: Enhanced form labeling validation and error handling

## 2025-09-06 — Form Persistence, Database Fixes, and Security Planning

- fix: Resolved form state reset issue on browser tab/window changes - Implemented comprehensive localStorage-based form persistence that maintains user input across browser visibility changes and accidental navigation.

  🛠️ **Form Persistence System**:
  - ✅ **Auto-save Functionality**: Form data automatically saves to localStorage on field changes
  - ✅ **State Restoration**: Form state restores when returning to page or after tab switches
  - ✅ **Draft Management**: Clear draft and keep draft options with user confirmation dialogs
  - ✅ **Integrity Preservation**: Only persists forms with meaningful content to avoid empty drafts

- fix: Resolved PostgreSQL array literal error during exercise creation - Fixed database type incompatibility between TypeScript arrays and Supabase JSON fields.

  🔧 **Database Type Safety**:
  - ✅ **Type Helper Functions**: Created `prepareExerciseForInsert()` for safe database operations
  - ✅ **Array Serialization**: Proper JSON serialization for PostgreSQL JSONB fields
  - ✅ **TypeScript Compatibility**: Fixed workspace TypeScript errors with Supabase insert operations
  - ✅ **Authentication Integration**: Proper owner_id assignment for user-created exercises

- fix: Fixed exercise display filtering to show user-created exercises - Modified App.tsx logic to properly separate built-in and user-created exercises in display.

- feat: Comprehensive security hardening plan - Created detailed OWASP implementation plan for application security improvements.

  🔒 **Security Planning**:
  - ✅ **OWASP Top 10 Coverage**: Complete plan addressing all major web security vulnerabilities
  - ✅ **4-Phase Implementation**: Structured 8-week rollout plan with clear milestones
  - ✅ **Technical Specifications**: Detailed tasks for authentication, authorization, data protection, and infrastructure security

- feat: Enhanced internationalization support - Added new translation keys and resolved missing i18n entries across all 8 supported languages.

  🌍 **Translation Updates**:
  - ✅ **Form Draft Keys**: Added confirmClearForm, keepDraft, clearDraft translations
  - ✅ **Video Upload Keys**: Added videoUploadAfterSave translations
  - ✅ **Duration Keys**: Added durationSeconds translations to exercises namespace
  - ✅ **Multi-language Support**: Complete translations for English, French, German, Spanish, Dutch, Arabic, Arabic-Egyptian, and Frisian
  - ✅ **JSON Validation**: Fixed duplicate object key errors in translation files

- fix: Environment configuration and development workflow improvements - Corrected Supabase project references and enhanced development tooling.

  ⚙️ **Development Workflow**:
  - ✅ **Environment Files**: Proper .env configuration for development and production
  - ✅ **Debugging Features**: Conditional debug logging controlled by feature flags
  - ✅ **Database Migrations**: Multiple schema fixes and RLS policy improvements
  - ✅ **Type Generation**: Enhanced database type definitions and helpers

