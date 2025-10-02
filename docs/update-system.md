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
The main orchestrator that handles:
- Periodic version checking (every 4 hours, 30 minutes for force updates)
- Communication with the Supabase edge function
- User preference management
- Update state management
- Event emission for UI updates
- Service worker coordination

#### 2. ForceUpdateService (`src/services/forceUpdateService.ts`)
Specialized service for force updates that:
- Handles workout interruption gracefully
- Manages auto-force countdown timers
- Provides workout save/abandon options
- Ensures force updates bypass normal flow

#### 3. UpdateNotificationManager (`src/components/UpdateNotificationManager.tsx`)
React component that orchestrates all update UI:
- Integrates with `useUpdateNotifications` hook
- Manages banner visibility for critical/optional updates
- Handles force update modal display
- Provides changelog and error recovery modals

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
- Handles version comparison requests
- Manages the `app_versions` database table
- Respects privacy preferences (only detailed info with consent)
- Provides graceful degradation if database is unavailable
- Returns appropriate update policies and changelog information

##### Database Schema
The system uses an `app_versions` table with:
- `version_number`: Semantic version string
- `update_policy`: 'force' | 'critical' | 'optional'
- `is_active`: Boolean flag for the current release
- `changelog`: JSON object with categorized changes
- `release_date`: Timestamp for ordering

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
'update-available'           // New update detected
'update-started'             // Update process initiated
'update-progress'            // Progress updates (0-100)
'update-completed'           // Update successfully applied
'update-failed'              // Update failed with error
'update-blocked-workout-force' // Force update blocked by workout

// ForceUpdateService Events
'force-update-available'     // Force update detected
'force-update-completed'     // Force update applied
'force-update-failed'        // Force update failed
```

## Implementation Locations

### Frontend Components
```
apps/frontend/src/
├── services/
│   ├── updateService.ts           # Main update orchestration
│   ├── forceUpdateService.ts      # Force update handling
│   └── updateErrorHandler.ts     # Error recovery logic
├── components/
│   ├── UpdateNotificationManager.tsx  # Main UI orchestrator
│   ├── UpdateNotificationBanner.tsx   # Banner for critical/optional
│   ├── ForceUpdateModal.tsx           # Modal for force updates
│   ├── ChangelogModal.tsx             # Detailed changelog display
│   └── UpdateErrorRecoveryModal.tsx   # Error handling UI
├── hooks/
│   └── useUpdateNotifications.ts      # React hook for update state
└── utils/
    ├── serviceWorker.ts               # SW integration utilities
    └── updateErrorHandler.ts         # Error classification and recovery
```

### Backend Components
```
supabase/
├── functions/
│   └── check-version/
│       ├── index.ts                   # Version checking endpoint
│       └── __tests__/
│           └── index.test.ts          # Function tests
└── migrations/
    └── [version]_create_app_versions.sql  # Database schema
```

### Configuration and Build
```
apps/frontend/
├── vite.config.ts                     # PWA configuration
├── public/
│   ├── manifest.json                  # PWA manifest
│   └── sw-custom.js                   # Custom SW logic
└── scripts/
    └── version-management.mjs         # Version deployment scripts
```

## Developer Guide

### Adding a New Update

1. **Database Entry**: Add new version to `app_versions` table
   ```sql
   INSERT INTO app_versions (
     version_number,
     update_policy,
     is_active,
     changelog,
     release_date
   ) VALUES (
     '1.2.3',
     'critical',
     true,
     '{"new_features": ["Feature 1"], "bug_fixes": ["Fix 1"]}',
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
# Run update system tests
pnpm --filter @repcue/frontend test src/**/*update*

# Run E2E update tests
pnpm test:e2e tests/e2e/cypress/e2e/update-system.cy.ts

# Test edge function locally
pnpm supabase functions serve check-version
```

### Configuration

#### Update Intervals
```typescript
// In updateService.ts
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;      // 4 hours
const FORCE_UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;    // 30 minutes
```

#### Force Update Timing
```typescript
// In forceUpdateService.ts
const AUTO_FORCE_DELAY = 5 * 60 * 1000;                // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;                           // 3 retries
```

### Error Handling

The system implements comprehensive error handling:

1. **Network Errors**: Graceful degradation with retry logic
2. **Database Errors**: Fallback to service worker updates only
3. **Update Failures**: Recovery options with rollback capabilities
4. **Corruption Detection**: Version verification and recovery

### Privacy Considerations

The update system respects RepCue's privacy-first approach:

- **Consent-Based**: Detailed update info only provided with user consent
- **No Tracking**: No analytics or usage tracking in update checks
- **Local Storage**: Update preferences stored locally
- **Graceful Degradation**: Works without cloud features for privacy-focused users

### Workflow Integration

#### Active Workout Handling
The system carefully handles active workouts:

1. **Detection**: Monitors timer state through App.tsx integration
2. **Deferral**: Non-force updates wait for workout completion
3. **Interruption**: Force updates offer save/abandon options
4. **Recovery**: Workout state preserved during updates when possible

#### Multi-Tab Coordination
- Prevents concurrent updates across browser tabs
- Coordinates service worker updates between tabs
- Ensures version consistency across sessions

### Monitoring and Debugging

#### Logging
The system uses the RepCue logger utility:
```typescript
import logger from '../utils/logger';

// Debug messages (only when DEBUG=true)
logger.log('📦 Update available:', updateInfo);

// Always logged for monitoring
logger.error('❌ Update failed:', error);
```

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

1. **Database Setup**: Create `app_versions` table with RLS policies
2. **Edge Function Deployment**: Deploy the `check-version` function
3. **Client Integration**: Replace existing update logic with `UpdateNotificationManager`
4. **Testing**: Verify all update policies work as expected
5. **Gradual Rollout**: Use optional updates first, then critical, finally force

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
- Check network connectivity
- Verify edge function is deployed
- Check browser dev tools for console errors
- Verify `app_versions` table has active entry

**Force Updates Not Working**:
- Check `forceUpdateService` integration in App.tsx
- Verify event listeners are properly set up
- Check for React re-render loops

**Service Worker Issues**:
- Clear browser cache and service worker
- Check `sw-custom.js` for errors
- Verify manifest.json configuration

**Database Connection Issues**:
- Check Supabase environment variables
- Verify RLS policies allow public access to `app_versions`
- Test edge function directly

## Security Considerations

- **Input Validation**: All version strings validated with regex
- **SQL Injection Prevention**: Parameterized queries in edge function
- **CORS Configuration**: Appropriate CORS headers for edge function
- **RLS Policies**: Proper row-level security on database tables
- **Content Security Policy**: Update system respects CSP headers
- **Integrity Checking**: Version verification during updates