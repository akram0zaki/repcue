# RepCue Update System

## Overview

The RepCue Update System is a comprehensive, database-driven PWA (Progressive Web App) update management system designed to provide seamless, intelligent updates while maintaining RepCue's core principles of privacy-first operation and offline functionality. The system intelligently handles different types of updates with varying levels of urgency and user interaction requirements.

## Purpose

The update system serves multiple critical functions:

- **Security**: Ensures users receive critical security patches promptly
- **User Experience**: Provides smooth, non-disruptive update experiences that respect active workouts
- **Privacy**: Respects user consent preferences and works without tracking
- **Reliability**: Implements robust error handling and recovery mechanisms
- **Flexibility**: Supports different update policies based on urgency and content

## Update Policies and User Experience

### Update Levels

The system supports three distinct update policies, each with different user experience patterns:

#### 1. Force Updates (`policy: 'force'`)
- **Purpose**: Critical security updates that cannot be postponed
- **User Experience**:
  - Blocks app usage until update is applied
  - Shows red-themed modal with security warning (🔒 icon)
  - Cannot be dismissed or postponed
  - Automatic countdown (5 minutes) before forced application
  - Handles active workouts by offering save/abandon options
- **When Used**: Security vulnerabilities, critical bugs that could cause data loss
- **Visual Style**: Red background, high urgency alert role

#### 2. Critical Updates (`policy: 'critical'`)
- **Purpose**: Important updates with security improvements and bug fixes
- **User Experience**:
  - Shows orange notification banner (⚠️ icon)
  - User can choose to update now or dismiss
  - Respects user preferences for automatic updates
  - Can be temporarily dismissed but will reappear
  - Medium urgency presentation
- **When Used**: Important security fixes, major bug fixes, compatibility updates
- **Visual Style**: Orange background, medium urgency status role

#### 3. Optional Updates (`policy: 'optional'`)
- **Purpose**: Feature updates and improvements
- **User Experience**:
  - Shows blue notification banner (🔄 icon)
  - User can easily dismiss or update
  - Respects user's update mode preferences
  - Low-key, non-intrusive presentation
- **When Used**: New features, UI improvements, performance enhancements
- **Visual Style**: Blue background, low urgency status role

### User Preferences

Users can configure their update experience through three modes:

- **Automatic**: System automatically applies critical and optional updates
- **Notify**: Shows notifications for all updates, user chooses when to apply
- **Manual**: Only force updates are applied automatically, others require explicit user action

## Technical Architecture

### Core Components

#### 1. UpdateService (`src/services/updateService.ts`)
The main orchestrator (singleton pattern) that handles:
- Periodic version checking (every 4 hours, 30 minutes for force updates)
- Communication with the Supabase `check-version` edge function
- User preference management via `storageService` and `AppSettings`
- Update state management with consent-aware persistence
- Event emission for UI updates
- Service worker coordination via `swEventEmitter`
- Multi-tab coordination via `BroadcastChannel`
- Debounced update checks to prevent excessive API calls
- Comprehensive error handling with retry logic

#### 2. ForceUpdateService (`src/services/forceUpdateService.ts`)
Specialized service (singleton pattern) for force updates that:
- Handles workout interruption gracefully with state preservation
- Manages auto-force countdown timers (5 minute default)
- Provides workout save/abandon options before update
- Implements retry logic with exponential backoff (max 3 retries)
- Ensures force updates proceed even in development mode

#### 3. UpdateNotificationManager (`src/components/UpdateNotificationManager.tsx`)
React component that orchestrates all update UI:
- Integrates with `useUpdateNotifications` hook for state management
- Manages banner visibility for critical/optional updates
- Handles force update modal display
- Provides changelog and error recovery modals
- Includes optional debug panel for development

#### 4. UI Components

##### UpdateNotificationBanner (`src/components/UpdateNotificationBanner.tsx`)
- Displays non-blocking notifications for critical/optional updates
- Adaptive styling based on update policy
- Supports dismissal and changelog viewing
- Includes connection warnings for metered networks

##### ForceUpdateModal (`src/components/ForceUpdateModal.tsx`)
- Full-screen blocking modal for force updates
- Workout interruption handling
- Progress tracking during updates
- Error recovery options with retry logic
- Accessibility compliant with proper focus management

#### 5. Backend Integration

##### Supabase Edge Function (`supabase/functions/check-version/index.ts`)
- Handles version comparison requests via POST method
- Queries the `app_versions` database table for the latest active version
- Validates semantic version format (x.y.z)
- Respects privacy preferences (detailed changelog only with consent or for force updates)
- Provides graceful degradation if database is unavailable (returns `update_available: false`)
- Returns appropriate update policies and changelog information
- CORS-enabled for cross-origin requests

There's also a `get-status` endpoint (GET) for lightweight version info retrieval.

##### Database Schema
The system uses an `app_versions` table with:
- `id`: UUID primary key
- `version_number`: Semantic version string (e.g., '1.2.3')
- `build_number`: Build identifier string
- `update_policy`: 'force' | 'critical' | 'optional'
- `is_active`: Boolean flag for the current release
- `changelog`: JSON object with categorized changes (`new_features`, `improvements`, `bug_fixes`, `security_updates`)
- `release_date`: Timestamp for ordering
- `reviewer`: Reviewer/approver name
- `git_commit_hash`: Optional Git commit reference
- `metadata`: Optional JSON for additional data
- `created_at`, `updated_at`: Timestamps

### Service Worker Integration

The system integrates with the browser's service worker API:
- Detects when new service worker versions are available
- Coordinates between SW updates and database-driven updates
- Handles multiple tabs coordination to prevent conflicts
- Manages cache invalidation during updates

### Event System

The update system uses a comprehensive event-driven architecture:

```typescript
// Main UpdateService Events
'update-available'              // New update detected
'no-update-available'           // Version check found no updates
'update-started'                // Update process initiated
'update-progress'               // Progress updates (0-100)
'update-completed'              // Update successfully applied
'update-failed'                 // Update failed with error
'update-error-detailed'         // Detailed error with recovery options
'update-blocked-workout-force'  // Force update blocked by active workout
'update-deferred-workout'       // Update deferred until workout completes
'update-blocked-metered'        // Update blocked due to metered connection
'update-requires-confirmation'  // Update needs user confirmation
'preferences-loaded'            // User preferences loaded
'preferences-changed'           // User preferences updated
'controller-changed'            // Service worker controller changed
'other-tab-updating'            // Another browser tab is updating
'other-tab-updated'             // Another tab completed update
'recovery-action-completed'     // Error recovery action succeeded
'recovery-action-failed'        // Error recovery action failed

// ForceUpdateService Events
'force-update-available'        // Force update detected with auto-countdown
'force-update-started'          // Force update application started
'force-update-progress'         // Force update progress
'force-update-completed'        // Force update applied successfully
'force-update-failed'           // Force update failed with retry info
'force-update-acknowledged'     // User acknowledged force update
'force-update-retry-scheduled'  // Retry scheduled with backoff
'force-reload-initiated'        // Last-resort page reload
'workout-state-saved'           // Workout state saved before update
```

## Implementation Locations

### Frontend Components
```
apps/frontend/src/
├── services/
│   ├── updateService.ts              # Main update orchestration (singleton)
│   └── forceUpdateService.ts         # Force update handling (singleton)
├── components/
│   ├── UpdateNotificationManager.tsx # Main UI orchestrator
│   ├── UpdateNotificationBanner.tsx  # Banner for critical/optional
│   ├── ForceUpdateModal.tsx          # Modal for force updates
│   ├── ChangelogModal.tsx            # Detailed changelog display
│   └── UpdateErrorRecoveryModal.tsx  # Error handling UI
├── hooks/
│   └── useUpdateNotifications.ts     # React hook for update state
├── utils/
│   ├── serviceWorker.ts              # SW integration utilities
│   └── updateErrorHandler.ts         # Error classification and recovery
└── types/
    └── index.ts                       # UpdateInfo, UpdateState, UpdateError types
```

### Backend Components
```
supabase/
├── functions/
│   ├── check-version/
│   │   └── index.ts                   # Version checking endpoint (POST)
│   └── get-status/
│       └── index.ts                   # Lightweight status endpoint (GET)
└── migrations/
    └── [timestamp]_create_app_versions.sql  # Database schema
```

### Configuration and Build
```
apps/frontend/
├── vite.config.ts                     # PWA + VitePWA configuration
├── public/
│   └── manifest.json                  # PWA manifest (auto-generated)
├── scripts/
│   └── version-management.mjs         # Version deployment scripts
scripts/
└── insert-new-version-template.sql    # SQL template for new versions
```

## Developer Guide

### Adding a New Update

1. **Database Entry**: Add new version to `app_versions` table (see `scripts/insert-new-version-template.sql` for full template)
   ```sql
   INSERT INTO app_versions (
     version_number,
     build_number,
     update_policy,
     is_active,
     reviewer,
     changelog,
     release_date
   ) VALUES (
     '1.2.3',
     '123',
     'critical',
     true,
     'developer-name',
     '{"new_features": ["Feature 1"], "bug_fixes": ["Fix 1"], "security_updates": [], "improvements": []}',
     NOW()
   );
   ```

2. **Deactivate Previous Version**:
   ```sql
   UPDATE app_versions SET is_active = false WHERE version_number != '1.2.3';
   ```

3. **Deploy Application**: The update system will automatically detect the new version

### Testing Updates

The system includes comprehensive testing:

```bash
# Run update service unit tests
pnpm --filter @repcue/frontend test src/services/__tests__/updateService.test.ts

# Run all update-related tests
pnpm --filter @repcue/frontend test --grep "update"

# Test edge function locally
cd supabase && supabase functions serve check-version

# Or using pnpm from root
pnpm supabase functions serve check-version
```

### Configuration

#### Update Intervals (updateService.ts)
```typescript
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;      // 4 hours
const FORCE_UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;    // 30 minutes
```

Note: Minimum check interval is enforced (5 min for force, 30 min for others) to prevent excessive API calls.

#### Force Update Timing (forceUpdateService.ts)
```typescript
private static readonly AUTO_FORCE_DELAY = 5 * 60 * 1000;    // 5 minutes auto-force countdown
private static readonly MAX_RETRY_ATTEMPTS = 3;               // 3 retries
private static readonly RETRY_DELAY_BASE = 10000;             // 10 seconds base for exponential backoff
```

### Error Handling

The system implements comprehensive error handling:

1. **Network Errors**: Graceful degradation with retry logic
2. **Database Errors**: Fallback to service worker updates only
3. **Update Failures**: Recovery options with rollback capabilities
4. **Corruption Detection**: Version verification and recovery

### Privacy Considerations

The update system respects RepCue's privacy-first approach:

- **Consent-Based**: Detailed update info (changelog, etc.) only provided with user consent; basic update notifications work without consent
- **No Tracking**: No analytics or usage tracking in update checks; only version comparison
- **Local Storage**: Update preferences stored in `AppSettings` via IndexedDB (consent-aware), with fallback to `sessionStorage` without consent
- **Graceful Degradation**: Works without cloud features for privacy-focused users; service worker updates still function
- **Version Storage**: Current app version stored in IndexedDB `app_settings` table, updated on successful update application

### Workflow Integration

#### Active Workout Handling
The system carefully handles active workouts:

1. **Detection**: Monitors timer state through `setTimerStateRef()` integration in App.tsx
2. **Deferral**: Non-force updates wait for workout completion (`shouldDeferUpdateForWorkout()`)
3. **Interruption**: Force updates offer save/abandon options with workout state capture
4. **Recovery**: Workout state preserved to localStorage before update, recoverable via `loadAndClearWorkoutRecovery()`

#### Multi-Tab Coordination
- Uses `BroadcastChannel` API to communicate between browser tabs
- Prevents concurrent updates across browser tabs
- Coordinates service worker updates between tabs via `swEventEmitter`
- Ensures version consistency across sessions
- Broadcasts update status: 'update-starting', 'update-completed', 'update-failed'

### Monitoring and Debugging

#### Logging
The system uses the RepCue logger utility (`src/utils/logger.ts`):
```typescript
import logger from '../utils/logger';

// Debug messages (only when DEBUG=true in features.ts)
logger.log('📦 Update available:', updateInfo);
logger.debug('Version check context:', { version, consent });

// Info messages (always logged when DEBUG=true)
logger.info('🚀 Starting update:', version);

// Warning messages (always logged when DEBUG=true)
logger.warn('⚠️ Metered connection detected');

// Always logged for monitoring (regardless of DEBUG flag)
logger.error('❌ Update failed:', error);
```

Note: Use `logger.*` methods instead of `console.*` to respect the DEBUG feature flag.

#### Console Messages
Key console messages to monitor:
- `📦 Update available: X.X.X → Y.Y.Y (policy)`
- `🚨 Force update available`
- `✅ Update completed`
- `❌ Update failed`

#### Events for External Monitoring
The system emits events that can be monitored:
```typescript
updateService.on('update-failed', (error) => {
  // Custom error tracking/reporting
});
```

### Performance Considerations

- **Debounced Checking**: Prevents excessive version checks
- **Lazy Loading**: Update UI components loaded on demand
- **Incremental Updates**: Only downloads changed assets
- **Background Processing**: Updates don't block main thread

## Migration from Previous Systems

If migrating from a simpler update system:

1. **Database Setup**: Create `app_versions` table with RLS policies (see migrations folder)
2. **Edge Function Deployment**: Deploy the `check-version` and `get-status` functions
3. **Version Initialization**: Set initial version in IndexedDB via `storageService.updateAppVersion()`
4. **Client Integration**: Add `UpdateNotificationManager` to your app root
5. **Timer Integration**: Call `updateService.setTimerStateRef()` and `forceUpdateService.setTimerStateRef()` from timer state
6. **Testing**: Verify all update policies work (use `scripts/insert-new-version-template.sql`)
7. **Gradual Rollout**: Use optional updates first, then critical, finally force

## Best Practices

1. **Update Policies**: Use force updates sparingly, only for critical security issues
2. **Testing**: Always test updates in development environment first
3. **Rollback Plan**: Maintain ability to mark previous version as active
4. **User Communication**: Provide clear changelog information
5. **Timing**: Schedule major updates during low-usage periods
6. **Monitoring**: Monitor update success rates and user feedback

## Troubleshooting

### Common Issues

**Updates Not Appearing**:
- Check network connectivity (`navigator.onLine`)
- Verify edge function is deployed (`supabase functions list`)
- Check browser dev tools for console errors
- Verify `app_versions` table has an active entry (`is_active = true`)
- Ensure version format is semantic (x.y.z)
- Check minimum interval hasn't been reached (30 min for normal, 5 min for force)

**Force Updates Not Working**:
- Verify `forceUpdateService` has `timerStateRef` set via `setTimerStateRef()` in App.tsx
- Check that the update policy is 'force' in database
- Check for event listener issues in console
- Ensure `isForceUpdateActive` state is being set

**Version Not Updating After Reload**:
- Version is stored in IndexedDB `app_settings.app_version`
- Use `updateService.debugVersionInfo()` in console to check state
- Verify `storageService.updateAppVersion()` succeeded before reload

**Service Worker Issues**:
- Clear browser cache and service worker: Settings → Application → Clear storage
- Check for `swEventEmitter` registration in console
- Verify VitePWA configuration in `vite.config.ts`
- Test in incognito mode to rule out cache issues

**Database Connection Issues**:
- Check Supabase environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Verify RLS policies allow public SELECT on `app_versions`
- Test edge function directly with curl or Postman
- Check Supabase dashboard for function logs

## Security Considerations

- **Input Validation**: All version strings validated with regex
- **SQL Injection Prevention**: Parameterized queries in edge function
- **CORS Configuration**: Appropriate CORS headers for edge function
- **RLS Policies**: Proper row-level security on database tables
- **Content Security Policy**: Update system respects CSP headers
- **Integrity Checking**: Version verification during updates