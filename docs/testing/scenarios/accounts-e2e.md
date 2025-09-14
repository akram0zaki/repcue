# RepCue Accounts Module: End-to-End Testing Plan

**Version**: 1.0  
**Date**: 2025-08-25  
**Testing Scope**: Phases 0-4 of the Accounts Module  
**Testing Type**: Manual End-to-End User Scenarios  

---

## 📋 Test Plan Overview

This document provides comprehensive end-to-end test scripts for validating all phases of the RepCue accounts module implementation. Each test includes prerequisites, step-by-step instructions, and expected results to ensure thorough coverage of user scenarios.

### Testing Phases Covered
- **Phase 0**: Local storage and offline-first architecture
- **Phase 1**: Authentication system with multiple sign-in methods
- **Phase 1.1**: Passkey/WebAuthn authentication (Primary)
- **Phase 2**: Cross-device sync functionality
- **Phase 3**: Anonymous data migration on sign-up
- **Phase 4**: Security, privacy, and enterprise features

---

## 🛠️ General Prerequisites

### Environment Setup
- **Browser Requirements**: Chrome 100+, Firefox 100+, Safari 14+, or Edge 100+
- **Device Requirements**: Desktop + Mobile device for cross-device testing
- **Network**: Stable internet connection (some tests require offline simulation)
- **Permissions**: Camera/biometric access for passkey testing

### Test Data Preparation
- **Clean Browser State**: Start each test session with cleared browser storage
- **Test Email Accounts**: Have 2-3 test email addresses available
- **Mobile Device**: Same email account configured on mobile device
- **Passkey-Compatible Device**: Device with biometric authentication (Face ID, Touch ID, Windows Hello)

### Supabase Configuration
- **Environment Variables**: Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured
- **Database**: All migrations applied (run `supabase migration up`)
- **Edge Functions**: Deployed (`supabase functions deploy`)

---

# Phase 0: Offline-First Architecture Tests

## Test 0.1: Anonymous User Offline Experience

### Prerequisites
- Clean browser with no RepCue data
- Network connectivity available initially, then disabled

### Test Steps
1. **Initial Load**
   - Navigate to RepCue application
   - Verify app loads without requiring authentication
   - Check that no sign-in prompts appear

2. **Create Local Data**
   - Navigate to Exercises page
   - Create 3 custom exercises with different details:
     - "Test Push-ups" (Strength, Arms category)  
     - "Test Squats" (Strength, Legs category)
     - "Test Plank" (Strength, Core category)
   - Add detailed instructions for each exercise

3. **Offline Functionality**
   - Disconnect from internet (disable WiFi/Ethernet)
   - Navigate through all main sections:
     - Home Dashboard
     - Exercises (verify custom exercises appear)
     - Timer page
     - Activity Log
     - Settings
   - Verify all functionality works without network

4. **Create Workout Data**
   - Create a new workout session with your custom exercises
   - Complete 2-3 exercise sets with different rep counts
   - Add session notes
   - Save the completed workout

5. **App Settings Configuration**  
   - Go to Settings page
   - Modify app preferences:
     - Change dark mode setting
     - Modify default rest time
     - Change language preference
   - Verify changes persist after app refresh

### Expected Results
- ✅ App functions completely without authentication
- ✅ All local data persists across browser refreshes
- ✅ No network errors or connection prompts when offline
- ✅ Custom exercises, workouts, and settings are saved locally
- ✅ IndexedDB storage shows data with null/empty `ownerId` fields

### Success Criteria
- All created data visible in browser DevTools > Application > IndexedDB > RepCueDB
- App remains fully functional without internet connection
- No authentication barriers for core fitness tracking features

---

## Test 0.2: Local Storage Persistence and Recovery

### Prerequisites  
- Browser with existing RepCue data from Test 0.1
- Multiple browser tabs/windows capability

### Test Steps
1. **Multi-Tab Persistence**
   - Open RepCue in 3 browser tabs
   - In Tab 1: Create new exercise "Tab1 Exercise"
   - In Tab 2: Create new workout session
   - In Tab 3: Modify app settings
   - Refresh all tabs and verify changes persist

2. **Browser Restart Testing**
   - Close all RepCue tabs and browser completely
   - Reopen browser and navigate to RepCue
   - Verify all previously created data still exists:
     - Custom exercises from Test 0.1
     - Completed workout sessions
     - Modified app settings

3. **Data Integrity Check**
   - Open Browser DevTools > Application > Storage > IndexedDB
   - Navigate to RepCueDB database
   - Check each table for your test data:
     - `exercises` table: Verify custom exercises exist
     - `activityLogs` table: Verify workout history
     - `appSettings` table: Verify setting changes
   - Confirm all records have `ownerId` as `null` or empty

4. **Storage Quota Testing**
   - Create 20+ additional exercises with large instruction text
   - Complete 10+ workout sessions with detailed notes
   - Verify browser doesn't show storage quota warnings
   - Check app continues functioning with large local dataset

### Expected Results
- ✅ Data persists across browser restarts
- ✅ Multi-tab changes sync within same browser
- ✅ IndexedDB shows all data stored locally
- ✅ No data corruption or loss after extended use
- ✅ App handles large datasets gracefully

---

# Phase 1: Authentication System Tests

## Test 1.1: Magic Link Authentication Flow

### Prerequisites
- Clean browser session (clear all RepCue data)
- Test email account accessible
- Existing local data from Phase 0 tests (if testing migration)

### Test Steps
1. **Access Authentication**
   - Navigate to RepCue home page
   - Click "More" menu in navigation
   - Verify "Sign In" option appears
   - Click "Sign In" to open authentication modal

2. **Magic Link Sign-In**
   - In auth modal, click "Use magic link instead"
   - Enter test email address: `test@example.com`
   - Click "Send Magic Link" button
   - Verify success message appears

3. **Email Verification**
   - Check email inbox for magic link message
   - Verify email contains:
     - RepCue branding/sender
     - Clear "Sign In" or confirmation link
     - Professional email formatting
   - Click the magic link in email

4. **Authentication Success**
   - Verify browser returns to RepCue application
   - Check authentication state:
     - "More" menu shows "Profile" instead of "Sign In"
     - User profile displays email address
     - No authentication barriers remain

5. **Session Persistence**
   - Refresh browser page
   - Verify user remains signed in
   - Close and reopen browser
   - Verify session persists across browser restarts

### Expected Results
- ✅ Magic link email delivered within 2 minutes
- ✅ Link successfully authenticates user
- ✅ User profile shows correct email address
- ✅ Session persists across browser sessions
- ✅ No errors during authentication flow

### Success Criteria
- Authentication completes without user entering password
- Profile dropdown shows user information
- Browser localStorage contains valid Supabase session tokens

---

## Test 1.2: Email/Password Authentication

### Prerequisites
- Clean browser session or signed-out state
- Test email account for registration

### Test Steps
1. **Account Registration**
   - Open RepCue authentication modal
   - Click "Sign Up" tab
   - Fill out registration form:
     - Email: `test2@example.com`
     - Display Name: `Test User`
     - Password: `TestPassword123!`
     - Confirm Password: `TestPassword123!`
   - Click "Create Account" button

2. **Registration Confirmation**
   - Check for email confirmation message
   - Verify account creation success
   - If email confirmation required, click confirmation link
   - Return to RepCue application

3. **Sign-In Testing**
   - Sign out from current session
   - Open authentication modal
   - Use "Sign In" tab with email/password:
     - Email: `test2@example.com`  
     - Password: `TestPassword123!`
   - Click "Sign In" button

4. **Authentication Validation**
   - Verify successful sign-in
   - Check user profile shows correct information
   - Test password visibility toggle works
   - Verify form validation for invalid inputs

5. **Error Handling**
   - Test with incorrect password
   - Test with non-existent email
   - Test with malformed email addresses
   - Verify appropriate error messages display

### Expected Results
- ✅ Registration completes successfully
- ✅ Sign-in works with created credentials
- ✅ Form validation catches input errors
- ✅ Error messages are user-friendly and helpful
- ✅ Password field securely handles input

---

## Test 1.3: OAuth Authentication (Google)

### Prerequisites
- Google account for testing
- Clean browser session
- Stable internet connection

### Test Steps
1. **OAuth Initiation**
   - Open RepCue authentication modal
   - Locate "Continue with Google" button
   - Verify Google branding and styling
   - Click "Continue with Google"

2. **Google Authentication**
   - Verify redirect to Google OAuth page
   - Complete Google sign-in process:
     - Enter Google credentials if not already signed in
     - Grant permissions to RepCue application
   - Check OAuth permission screen shows:
     - RepCue application name
     - Requested permissions (email, profile)

3. **OAuth Callback Handling**
   - Verify automatic redirect back to RepCue
   - Check callback page shows:
     - Loading indicator
     - "Processing authentication..." message
     - Provider name (Google) in status

4. **Authentication Success**
   - Verify successful authentication completion
   - Check user profile contains:
     - Google email address
     - Display name from Google profile
     - Profile picture if available
   - Confirm no additional sign-in required

5. **OAuth Error Testing**
   - Sign out and retry OAuth process
   - Cancel Google authentication mid-flow
   - Verify callback page handles cancellation gracefully
   - Check error messages are user-friendly

### Expected Results
- ✅ Smooth redirect to Google OAuth
- ✅ Successful return with user information
- ✅ Profile populated with Google account data
- ✅ Enhanced callback page with provider-specific messaging
- ✅ Graceful error handling for cancelled flows

---

# Phase 1.1: Passkey Authentication Tests

## Test 1.1.1: Passkey Registration (Primary Method)

### Prerequisites
- Modern browser with WebAuthn support (Chrome 70+, Safari 14+, Firefox 60+)
- Device with biometric authentication (Touch ID, Face ID, Windows Hello, or hardware security key)
- Clean browser session
- Test email account

### Test Steps
1. **Passkey Support Detection**
   - Navigate to RepCue sign-up page
   - Verify passkey registration button appears prominently
   - Check button text shows:
     - "Sign up with biometrics" (if platform authenticator available)
     - "Sign up with passkey" (if only cross-device available)
   - Confirm button has attractive gradient styling and lock icon

2. **Passkey Registration Flow**
   - Enter test email: `passkey-test@example.com`
   - Click passkey registration button
   - Verify browser prompts for biometric authentication:
     - Touch ID prompt on macOS
     - Face ID prompt on iOS  
     - Windows Hello prompt on Windows
     - Security key prompt if using hardware key

3. **Biometric Authentication**
   - Complete biometric authentication process
   - Verify successful passkey creation
   - Check browser indicates secure credential stored
   - Confirm user is automatically signed in

4. **Registration Success Validation**
   - Verify user profile shows correct email
   - Check authentication persists across browser refresh
   - Confirm traditional password methods are bypassed
   - Verify no additional authentication steps required

5. **Cross-Device Registration**
   - On second device, attempt to sign up with same email
   - Verify system detects existing account
   - Test cross-device passkey authentication flow

### Expected Results
- ✅ Passkey option appears as primary authentication method
- ✅ Biometric authentication prompt works correctly
- ✅ Registration completes without password entry
- ✅ User immediately authenticated after passkey creation
- ✅ Cross-device functionality works for registered passkey

### Success Criteria
- Passkey registration succeeds with biometric authentication
- No password required for account creation
- Authentication state persists across sessions

---

## Test 1.1.2: Passkey Sign-In Authentication

### Prerequisites
- Existing passkey registered from Test 1.1.1
- Same device and browser used for registration
- Signed-out state

### Test Steps
1. **Passkey Sign-In Interface**
   - Navigate to RepCue sign-in page
   - Verify passkey sign-in button appears prominently at top
   - Check button styling and biometric messaging
   - Confirm optional email field shows helpful placeholder

2. **Fast Sign-In (No Email)**
   - Click passkey sign-in button without entering email
   - Verify browser prompts for biometric authentication
   - Complete biometric authentication
   - Confirm successful sign-in

3. **Email-Assisted Sign-In**
   - Sign out and return to sign-in page
   - Enter registered email address in optional field
   - Click passkey sign-in button
   - Verify faster authentication flow with email hint

4. **Cross-Device Sign-In**
   - On different device, navigate to RepCue sign-in
   - Enter same email address
   - Click passkey sign-in button
   - Complete cross-device authentication flow (QR code or phone prompt)

5. **Error Scenarios**
   - Test sign-in with unregistered email
   - Test canceling biometric prompt
   - Test with disabled biometric authentication
   - Verify appropriate error messages display

### Expected Results
- ✅ Passkey sign-in works without password
- ✅ Biometric authentication prompt appears correctly
- ✅ Cross-device authentication functions properly
- ✅ Error handling provides clear user guidance
- ✅ Sign-in completes faster than traditional methods

---

## Test 1.1.3: Passkey Fallback to Traditional Methods

### Prerequisites
- Browser without WebAuthn support (or WebAuthn disabled)
- Clean session

### Test Steps
1. **Graceful Degradation**
   - Navigate to RepCue authentication pages
   - Verify passkey buttons do not appear when unsupported
   - Confirm traditional sign-in/sign-up forms display properly
   - Check no broken UI elements or error messages

2. **Feature Detection**
   - Test on older browser versions
   - Verify app detects WebAuthn capability correctly
   - Confirm fallback authentication methods work normally
   - Check no passkey-related errors in browser console

3. **Progressive Enhancement**
   - Access RepCue on supported browser
   - Verify passkey options appear and work
   - Switch to unsupported browser
   - Confirm same account accessible via traditional methods

### Expected Results
- ✅ Clean fallback to traditional authentication
- ✅ No broken UI when passkeys unsupported
- ✅ Same user accounts work across all browsers
- ✅ No console errors related to WebAuthn detection

---

# Phase 2: Cross-Device Sync Tests

## Test 2.1: Initial Sync Setup

### Prerequisites
- Authenticated user from Phase 1 tests
- Local data created in Phase 0 tests
- Second device available
- Stable network connection

### Test Steps
1. **First Device Sync**
   - Sign in to authenticated account
   - Navigate to Settings > Sync Status
   - Verify sync indicator shows "Syncing" or "Connected"
   - Check that local data begins uploading to server
   - Wait for initial sync completion

2. **Sync Status Monitoring**
   - Watch sync status banner for progress updates
   - Verify status changes from "Syncing" to "Synced"
   - Check timestamp shows recent sync completion
   - Confirm no error messages during sync process

3. **Server Data Verification**
   - Check Supabase dashboard (if accessible)
   - Verify user's data appears in database tables
   - Confirm records have correct `owner_id` values
   - Check `updated_at` timestamps are recent

4. **Second Device Setup**
   - On second device, navigate to RepCue
   - Sign in with same authentication credentials
   - Verify automatic sync initiation
   - Wait for data download to complete

5. **Cross-Device Data Validation**
   - Compare data between devices:
     - Custom exercises match exactly
     - Workout history identical
     - App settings synchronized
     - Activity logs consistent
   - Verify all timestamps and details preserved

### Expected Results
- ✅ Initial sync uploads all local data to server
- ✅ Sync status provides clear progress feedback
- ✅ Second device receives complete data set
- ✅ All data matches between devices exactly
- ✅ No data loss during sync process

---

## Test 2.2: Real-Time Sync Validation

### Prerequisites
- Two devices with same user signed in
- Both devices showing "Synced" status
- Network connectivity on both devices

### Test Steps
1. **Device A Changes**
   - On Device A, create new exercise "Sync Test Exercise"
   - Add detailed instructions and category
   - Save the exercise
   - Note the timestamp of creation

2. **Cross-Device Propagation**
   - On Device B, wait for sync indicator activity
   - Verify sync status shows brief "Syncing" state
   - Confirm "Sync Test Exercise" appears on Device B
   - Check all exercise details match exactly

3. **Bidirectional Sync Testing**
   - On Device B, create workout session
   - Use "Sync Test Exercise" in the workout
   - Complete workout with specific rep counts
   - Save workout session

4. **Return Sync Validation**
   - On Device A, wait for sync completion
   - Navigate to Activity Log
   - Verify workout session appears with correct details
   - Confirm exercise references remain intact

5. **Conflict-Free Operations**
   - Simultaneously on both devices:
     - Device A: Modify app settings (theme change)
     - Device B: Create different exercise
   - Wait for both syncs to complete
   - Verify both changes present on both devices
   - Confirm no data conflicts or overwrites

### Expected Results
- ✅ Changes sync between devices within 30 seconds
- ✅ All data details preserved exactly
- ✅ Bidirectional sync works smoothly
- ✅ No conflicts with simultaneous changes
- ✅ Sync status accurately reflects sync state

---

## Test 2.3: Offline-Online Sync Recovery

### Prerequisites
- User signed in on primary device
- Existing synced data baseline
- Ability to disable/enable network connection

### Test Steps
1. **Offline Data Creation**
   - Disable internet connection on device
   - Create 5 new exercises with detailed information
   - Complete 2 workout sessions using new exercises
   - Modify app settings (rest time, notifications)
   - Verify all changes saved locally

2. **Offline Indicator Validation**
   - Check sync status shows "Offline" or "Disconnected"
   - Verify app continues functioning normally
   - Confirm no error messages for network issues
   - Check local data saves without problems

3. **Network Reconnection**
   - Re-enable internet connection
   - Watch sync status indicator
   - Verify automatic sync initiation
   - Monitor sync progress for all offline changes

4. **Sync Completion Verification**
   - Wait for sync status to show "Synced"
   - Check all offline-created data uploaded
   - Verify no data loss or corruption
   - Confirm sync timestamps accurate

5. **Second Device Validation**
   - On second device, trigger sync refresh
   - Verify all offline-created data appears
   - Check data integrity and completeness
   - Confirm sync works from offline-to-online

### Expected Results
- ✅ App works fully while offline
- ✅ Clear offline status indication
- ✅ Automatic sync resume when online
- ✅ All offline data successfully synced
- ✅ No data loss during offline period

---

# Phase 3: Anonymous Data Migration Tests

## Test 3.1: First-Time Sign-Up Migration

### Prerequisites
- Clean browser with substantial anonymous data:
  - 10+ custom exercises
  - 5+ completed workout sessions
  - Modified app settings and preferences
  - Activity logs with various exercises
- No existing RepCue account

### Test Steps
1. **Anonymous Data Baseline**
   - Document existing local data before sign-up:
     - Count exercises in Exercise library
     - Note completed workouts in Activity Log
     - Record current app settings
   - Take screenshots of data for reference

2. **First-Time Sign-Up**
   - Navigate to authentication modal
   - Choose sign-up method (email, passkey, or OAuth)
   - Complete registration process:
     - Email: `migration-test@example.com`
     - Complete authentication flow
   - Wait for authentication completion

3. **Migration Process Observation**
   - Watch for automatic migration indicators
   - Check for sync status changes
   - Look for any migration feedback messages
   - Note any loading or processing states

4. **Migration Success Banner**
   - Verify migration success banner appears
   - Check banner displays:
     - Welcome message
     - Total records migrated count
     - Breakdown by data type (exercises, workouts, etc.)
     - Professional styling and messaging
   - Confirm banner auto-dismisses after 8 seconds

5. **Data Integrity Validation**
   - Compare post-migration data to baseline:
     - All custom exercises preserved
     - Workout history completely intact
     - App settings maintained exactly
     - Activity logs transferred correctly
   - Verify no data loss or corruption

6. **Ownership Transfer Verification**
   - Check browser DevTools > IndexedDB
   - Verify all records now have proper `ownerId`
   - Confirm anonymous records (null ownerId) cleared
   - Check data marked for server sync

### Expected Results
- ✅ Professional migration success banner appears
- ✅ Banner shows exact count of migrated records  
- ✅ All anonymous data preserved completely
- ✅ Data ownership transferred to authenticated user
- ✅ Sync process initiated automatically after migration

### Success Criteria
- Zero data loss during migration process
- Clear user feedback about migration success
- All local data accessible under new authenticated account
- Migration banner shows specific data type breakdown

---

## Test 3.2: Multi-Language Migration Experience

### Prerequisites
- Browser set to Spanish language preference
- Anonymous data created while app in Spanish
- Clean authentication state

### Test Steps
1. **Spanish Language Migration**
   - Ensure RepCue displays in Spanish
   - Sign up for new account in Spanish interface
   - Complete authentication process
   - Observe migration banner in Spanish

2. **Translation Validation**
   - Verify migration banner shows Spanish text:
     - "¡Bienvenido! Tus Datos Están Seguros"
     - Spanish data type names (ejercicios, entrenamientos, etc.)
     - Proper Spanish grammar and formatting
   - Check dismiss button shows "Descartar"

3. **Language Consistency**
   - Verify all migration-related text uses Spanish
   - Check error messages (if any) in Spanish
   - Confirm data type labels properly translated
   - Validate number formatting follows locale

4. **English Language Fallback**
   - Switch browser to English mid-process
   - Refresh application
   - Verify graceful language switching
   - Check migration history in new language

### Expected Results
- ✅ Migration banner displays in correct language
- ✅ All migration text properly translated
- ✅ Data type names localized correctly
- ✅ Language switching handled gracefully

---

## Test 3.3: Migration Edge Cases and Error Handling

### Prerequisites
- Multiple test scenarios with different data states
- Ability to simulate various error conditions

### Test Steps
1. **Empty Anonymous Data Migration**
   - Start with clean browser (no anonymous data)
   - Sign up for new account
   - Verify no migration banner appears
   - Confirm graceful handling of empty migration

2. **Partial Data Migration**
   - Create anonymous data in some tables only:
     - Exercises: 3 items
     - App Settings: Modified
     - Activity Logs: Empty
     - Workouts: Empty
   - Sign up and verify selective migration
   - Check banner shows only migrated data types

3. **Large Dataset Migration**
   - Create substantial anonymous dataset:
     - 50+ exercises with long descriptions
     - 20+ workout sessions with detailed logs
     - Multiple preference modifications
   - Complete sign-up process
   - Monitor migration performance and completion

4. **Migration Conflict Resolution**
   - Sign in to existing account with server data
   - Have conflicting local anonymous data
   - Verify conflict resolution during migration
   - Check that most recent data wins

5. **Migration Error Recovery**
   - Simulate network interruption during migration
   - Verify graceful error handling
   - Check recovery process when network restored
   - Ensure no partial or corrupted data state

### Expected Results
- ✅ Empty migrations handled gracefully
- ✅ Selective migration works correctly
- ✅ Large datasets migrate without issues
- ✅ Conflicts resolved using timestamp logic
- ✅ Network errors handled with retry logic

---

# Phase 4: Security and Privacy Tests

## Test 4.1: Data Export Functionality

### Prerequisites
- Authenticated user with substantial data
- Various data types in user account
- Stable network connection

### Test Steps
1. **Access Data Export**
   - Navigate to Settings > Account > Data Export
   - Verify export option clearly visible
   - Check appropriate privacy warnings displayed
   - Click "Export My Data" button

2. **Export Process Validation**
   - Verify processing indicator appears
   - Check estimated time displayed (if applicable)
   - Monitor export progress feedback
   - Wait for export completion notification

3. **Export File Analysis**
   - Download exported data file
   - Verify file format is JSON
   - Check file naming includes timestamp
   - Validate file size appropriate for data volume

4. **Export Content Verification**
   - Open exported JSON file
   - Verify all data types included:
     - User profile information
     - Custom exercises with full details
     - Workout history and activity logs
     - App settings and preferences
     - Workout sessions and performance data
   - Check no sensitive authentication data included

5. **Data Completeness Check**
   - Compare exported data to app interface
   - Verify all visible data included in export
   - Check timestamps preserved accurately
   - Confirm data formatting is readable

### Expected Results
- ✅ Export process completes successfully
- ✅ Downloaded file contains all user data
- ✅ Data format is structured and complete
- ✅ No authentication tokens or passwords included
- ✅ Timestamps and metadata preserved correctly

---

## Test 4.2: Account Deletion Process

### Prerequisites
- Test user account with data (use separate test account)
- Understanding that this will permanently delete account
- Alternative authentication method for testing

### Test Steps
1. **Account Deletion Access**
   - Navigate to Settings > Account > Delete Account
   - Verify deletion option clearly marked as destructive
   - Check appropriate warnings and disclaimers
   - Read deletion policy information

2. **Deletion Confirmation Process**
   - Click "Delete My Account" button
   - Verify multiple confirmation steps required
   - Check final confirmation requires typing account email
   - Confirm deletion is scheduled, not immediate

3. **Grace Period Validation**
   - Verify account marked for deletion
   - Check 30-day grace period messaging
   - Confirm continued access during grace period
   - Test data remains accessible during grace period

4. **Recovery Process Testing**
   - During grace period, sign in normally
   - Verify account recovery option presented
   - Cancel account deletion
   - Confirm full account restoration

5. **Final Deletion Validation** (Use test account)
   - Reschedule account for deletion
   - Wait for grace period expiration (or simulate)
   - Verify account cannot be accessed post-deletion
   - Check all associated data removed

### Expected Results
- ✅ Multiple confirmation steps prevent accidental deletion
- ✅ Grace period allows account recovery
- ✅ Clear messaging about deletion timeline
- ✅ Complete data removal after grace period
- ✅ No residual data accessible post-deletion

---

## Test 4.3: Security Audit Logging

### Prerequisites
- Administrator access to Supabase dashboard (if available)
- User account with recent activity
- Understanding of privacy implications

### Test Steps
1. **Login Activity Logging**
   - Sign in from multiple devices/locations
   - Check if login events are logged appropriately
   - Verify IP address logging (if enabled)
   - Confirm user agent string captured

2. **Data Access Logging** 
   - Perform various data operations:
     - Create new exercises
     - Export data
     - Modify account settings
     - Access sensitive features
   - Check appropriate logging occurs

3. **Security Event Detection**
   - Attempt suspicious activities (if safe):
     - Multiple failed login attempts
     - Rapid data access patterns
     - Unusual device/location access
   - Verify security events logged appropriately

4. **Audit Log Review**
   - Review audit logs (if accessible)
   - Verify log entries contain:
     - Timestamp of activities
     - User identification
     - Action performed
     - Success/failure status
   - Check no sensitive data in logs

### Expected Results
- ✅ User activities logged appropriately
- ✅ Security events detected and recorded
- ✅ Logs contain sufficient detail for audit
- ✅ No sensitive user data in audit logs
- ✅ Logging doesn't impact app performance

---

## Test 4.4: Privacy Controls and GDPR Compliance

### Prerequisites
- EU-based testing (or VPN to EU location)
- Fresh user account for privacy testing
- Understanding of GDPR requirements

### Test Steps
1. **Consent Management**
   - Access RepCue from EU location
   - Verify appropriate privacy notices displayed
   - Check cookie consent mechanisms
   - Confirm data processing consent options

2. **Data Minimization Validation**
   - Review data collected during sign-up
   - Verify only necessary data requested
   - Check optional vs. required data fields
   - Confirm no excessive data collection

3. **User Rights Implementation**
   - Test data portability (export functionality)
   - Verify right to deletion (account deletion)
   - Check data correction capabilities
   - Test access to personal data

4. **Privacy Settings Control**
   - Navigate to Privacy Settings
   - Verify granular privacy controls available
   - Test data sharing preference options
   - Check analytics opt-out mechanisms

5. **Data Retention Policies**
   - Review data retention policy information
   - Verify automatic data cleanup processes
   - Check retention period compliance
   - Confirm lawful basis for data processing

### Expected Results
- ✅ Clear privacy notices and consent mechanisms
- ✅ Minimal data collection practices
- ✅ Full user rights implementation
- ✅ Granular privacy control options  
- ✅ GDPR-compliant data handling procedures

---

# Cross-Phase Integration Tests

## Test INT.1: End-to-End User Journey

### Prerequisites
- Clean environment (no previous RepCue data)
- Mobile device for cross-device testing
- Passkey-capable device

### Test Steps
1. **Anonymous Usage (Phase 0)**
   - Use RepCue anonymously for 1 week
   - Create comprehensive fitness data:
     - 15+ custom exercises
     - 10+ workout sessions
     - Detailed activity logs
     - Customized app settings

2. **Authentication with Migration (Phase 1.1 + 3)**
   - Sign up using passkey authentication
   - Verify seamless data migration
   - Confirm migration success banner
   - Check all anonymous data preserved

3. **Cross-Device Sync (Phase 2)**
   - Sign in on mobile device
   - Verify data synchronization
   - Create new data on mobile
   - Confirm sync back to desktop

4. **Security Features (Phase 4)**
   - Export complete data set
   - Test privacy controls
   - Review audit logs
   - Configure security settings

5. **Long-Term Usage Validation**
   - Continue using for several days
   - Monitor sync reliability
   - Test offline/online transitions
   - Verify data consistency maintained

### Expected Results
- ✅ Seamless transition from anonymous to authenticated
- ✅ Zero data loss throughout journey
- ✅ Consistent experience across all devices
- ✅ All security and privacy features functional
- ✅ Long-term reliability and performance

---

## Test INT.2: Stress Testing and Edge Cases

### Prerequisites
- High-performance device for stress testing
- Ability to simulate poor network conditions
- Multiple test accounts available

### Test Steps
1. **Large Dataset Handling**
   - Create 100+ exercises with detailed instructions
   - Generate 50+ workout sessions with comprehensive logs
   - Test app performance with large data sets
   - Verify sync handles large volumes

2. **Network Resilience Testing**
   - Test with slow internet connections (3G simulation)
   - Simulate intermittent network connectivity
   - Test sync recovery after connection loss
   - Verify offline functionality remains intact

3. **Concurrent User Testing**
   - Sign in same account on multiple devices
   - Perform simultaneous operations
   - Test conflict resolution mechanisms
   - Verify data consistency maintained

4. **Browser Compatibility**
   - Test across different browsers:
     - Chrome (latest and 6 months old)
     - Firefox (latest and 6 months old)
     - Safari (latest available)
     - Edge (latest)
   - Verify consistent functionality
   - Check for browser-specific issues

5. **Mobile Responsiveness**
   - Test on various mobile devices
   - Verify touch interfaces work correctly
   - Check responsive design adaptation
   - Test mobile-specific features (if any)

### Expected Results
- ✅ App handles large datasets efficiently
- ✅ Network issues handled gracefully
- ✅ Concurrent operations work correctly
- ✅ Cross-browser compatibility maintained
- ✅ Mobile experience equals desktop quality

---

# 🚀 Test Execution Guidelines

## Pre-Test Setup Checklist
- [ ] Backup any important data before testing
- [ ] Ensure Supabase environment properly configured
- [ ] Have test email accounts ready and accessible
- [ ] Clear browser storage before starting test cycles
- [ ] Document system/browser versions for testing
- [ ] Prepare devices for cross-device testing

## During Testing
- [ ] Document any unexpected behaviors or errors
- [ ] Take screenshots of success/failure states
- [ ] Note performance characteristics and timing
- [ ] Record any browser console errors or warnings
- [ ] Monitor network activity during sync operations

## Post-Test Analysis
- [ ] Compare results against expected outcomes
- [ ] Document any deviations or issues found
- [ ] Rate overall user experience quality
- [ ] Note any accessibility or usability concerns
- [ ] Provide recommendations for improvements

## Test Result Documentation
- [ ] Create test execution report
- [ ] Include screenshots of key functionality
- [ ] Document browser/device compatibility results
- [ ] Note any configuration issues encountered
- [ ] Provide overall quality assessment

---

# 📊 Success Criteria Summary

## Phase 0 Success Metrics
- **Offline Functionality**: 100% core features work offline
- **Data Persistence**: Zero data loss across browser sessions
- **Performance**: App loads within 3 seconds on standard connections

## Phase 1/1.1 Success Metrics  
- **Authentication Success Rate**: >95% for all auth methods
- **Passkey Adoption**: Passkey appears as primary option
- **Session Persistence**: Sessions survive browser restarts

## Phase 2 Success Metrics
- **Sync Reliability**: >99% successful sync operations
- **Cross-Device Consistency**: 100% data matching between devices
- **Sync Performance**: Initial sync completes within 2 minutes

## Phase 3 Success Metrics
- **Migration Success**: 100% data preserved during sign-up
- **User Feedback**: Migration banner shows accurate statistics
- **Multi-Language**: Migration works in all supported languages

## Phase 4 Success Metrics
- **Security Controls**: All privacy features functional
- **Data Export**: Complete data export within 5 minutes
- **GDPR Compliance**: All user rights exercisable

---

# 🛠️ Troubleshooting Common Issues

## Authentication Problems
- **Passkey Not Available**: Check browser WebAuthn support and device biometric settings
- **Magic Link Not Received**: Check spam folder and email configuration
- **OAuth Redirect Issues**: Verify callback URL configuration in OAuth provider settings

## Sync Issues
- **Slow Sync Performance**: Check network connection and server status
- **Data Conflicts**: Verify conflict resolution logic in browser console logs
- **Cross-Device Problems**: Ensure same account used on all devices

## Migration Problems
- **Missing Migration Banner**: Check for anonymous data and authentication success
- **Incomplete Migration**: Verify all data types have anonymous records
- **Migration Failures**: Check browser console for specific error messages

## General Troubleshooting
- **App Won't Load**: Clear browser cache and storage, check network connection
- **Performance Issues**: Check browser DevTools for memory or network bottlenecks
- **UI Problems**: Verify browser zoom level and responsive design breakpoints

---

**Test Plan Version**: 1.0  
**Last Updated**: 2025-08-25  
**Next Review**: After each phase deployment or quarterly  
**Contact**: Development Team for test execution support