# Manual Testing Issues - August 25, 2025

**Date**: 2025-08-25  
**Testing Phase**: Phase 1.1 Manual Testing  
**Status**: In Progress  
**Priority**: High  

---

## 🚨 Critical Issues Found

### Issue #1: Date Calculation Error in Workout Scheduling
**Severity**: High  
**Component**: Home Screen Workout Panel  
**Status**: 🔴 Open  

**Description**: 
- Created workout for Tue and Fri
- Home screen shows "next exercise Tue 25-Aug" instead of correct "Tue 26-Aug"
- Date calculation appears to be off by 1 day

**Expected Behavior**: 
- Should show correct next workout date (Tue 26-Aug)

**Reproduction Steps**:
1. On Monday 25-Aug, create workout for Tuesday and Friday
2. Check Home screen workout panel
3. Observe incorrect date display

**Root Cause**: Likely date calculation issue in workout scheduling logic

---

### Issue #2: Exercise Videos Not Playing in Workout Mode
**Severity**: High  
**Component**: Workout Mode Video Playback  
**Status**: 🔴 Open  

**Description**:
- Created workout with Plank, Burpees, Finger Rolls
- Videos not displayed for Plank or Burpees in workout mode
- "Show Exercise Demo Videos" toggle was enabled
- Videos work in standalone mode initially
- After completing workout, videos stop working in standalone mode
- Thin green line appears on timer component (UI artifact)

**Expected Behavior**:
- Videos should play in workout mode when toggle enabled
- Videos should continue working in standalone mode after workout
- No UI artifacts on timer component

**Reproduction Steps**:
1. Create workout with exercises that have videos (Plank, Burpees)
2. Enable "Show Exercise Demo Videos" toggle
3. Start workout mode
4. Observe videos not playing
5. Complete workout
6. Try standalone exercise mode - videos broken

**Root Cause**: Workout mode video integration issue + possible state management problem

---

### Issue #3: Missing Arabic Translation
**Severity**: Medium  
**Component**: Internationalization (i18n)  
**Status**: 🔴 Open  

**Description**:
- "Cancel" label is not translated in Arabic locale files
- Missing translation key causing fallback to English

**Expected Behavior**:
- All UI text should be properly translated in Arabic

**Reproduction Steps**:
1. Switch app to Arabic locale
2. Look for "cancel" buttons/labels
3. Observe English text instead of Arabic

**Root Cause**: Missing translation key in Arabic locale files

---

### Issue #4: Passkey Sign-Up Failure
**Severity**: High  
**Component**: WebAuthn Authentication  
**Status**: 🔴 Open  

**Description**:
- Sign-up with biometrics fails with error "Failed to send a request to the Edge Function"
- Complete Phase 1.1 feature not working

**Expected Behavior**:
- Passkey sign-up should work smoothly with biometric authentication

**Reproduction Steps**:
1. Navigate to sign-up page
2. Enter email address
3. Click "Sign up with biometrics" button
4. Observe Edge Function error

**Root Cause**: Edge Function connectivity or configuration issue

---

### Issue #5: Console Logging Infinite Loop
**Severity**: Medium  
**Component**: App Initialization  
**Status**: 🔴 Open  

**Description**:
- Console continuously prints initialization messages in endless loop:
  - "🚀 Initializing app with consent granted"
  - "🚀 Initializing PWA capabilities..."
  - "🔧 Service worker not registered in development mode"
  - Settings loading messages

**Expected Behavior**:
- App should initialize once and stop logging repeatedly

**Reproduction Steps**:
1. Open app in any browser
2. Open developer console
3. Observe continuous logging loop

**Root Cause**: App initialization cycle issue, possibly related to consent/settings state management

---

### Issue #6: Cross-Browser Authentication Failure
**Severity**: High  
**Component**: Authentication System  
**Status**: 🔴 Open  

**Description**:
- Signed up on Firefox with email/password successfully
- Attempted sign-in on Edge with same credentials
- Received "Invalid login credentials" error despite correct credentials

**Expected Behavior**:
- Same credentials should work across all browsers

**Reproduction Steps**:
1. Sign up on Firefox with email/password
2. Open Edge browser
3. Try to sign in with same email/password
4. Observe authentication failure

**Root Cause**: Session/cookie sharing issue or Supabase client configuration

---

### Issue #7: Magic Link Authentication Issues
**Severity**: High  
**Component**: Magic Link + Data Migration  
**Status**: 🔴 Open  

**Description**:
- Signed in with magic link on Firefox
- Got migration success banner: "Welcome! Your Data is Safe Successfully migrated 27 records..."
- Simultaneously got red error toast: "Sync failed Sync endpoint error: Edge Function returned a non-2xx status code"
- Console showing endless loop messages
- Mixed success/failure state causing confusion

**Expected Behavior**:
- Clean magic link authentication
- Successful migration without sync errors
- No conflicting success/error messages

**Reproduction Steps**:
1. Use magic link authentication
2. Observe migration banner (success)
3. Observe sync error toast (failure)
4. Check console for logging issues

**Root Cause**: Sync service failure after successful migration + console logging loop

---

### Issue #8: Incomplete Migration Message Display
**Severity**: Low  
**Component**: Migration Success Banner  
**Status**: 🔴 Open  

**Description**:
- Migration message appears cut off: "Migrated: 26 exercis[...]"
- Text truncation issue in success banner

**Expected Behavior**:
- Complete migration message should be visible

**Root Cause**: CSS text truncation or container width issue

---

## 📊 Issue Summary

| Severity | Count | Components Affected |
|----------|-------|-------------------|
| High     | 5     | Workout Scheduling, Video Playback, WebAuthn, Cross-Browser Auth, Magic Link |
| Medium   | 2     | i18n, Console Logging |
| Low      | 1     | UI Text Display |
| **Total** | **8** | **7 different components** |

---

## 🎯 Priority Execution Plan

### Phase 1: Critical Infrastructure Fixes (Priority 1)
1. **Issue #4**: Fix Passkey Edge Function connectivity
2. **Issue #5**: Resolve console logging infinite loop  
3. **Issue #7**: Fix sync service failures after migration

### Phase 2: Core Functionality Fixes (Priority 2)
4. **Issue #1**: Fix workout date calculation
5. **Issue #2**: Resolve video playback in workout mode
6. **Issue #6**: Fix cross-browser authentication

### Phase 3: Polish and Localization (Priority 3)
7. **Issue #3**: Add missing Arabic translations
8. **Issue #8**: Fix migration message truncation

---

## 🔧 Estimated Fix Timeline

- **Critical fixes**: 2-3 hours
- **Core functionality**: 3-4 hours  
- **Polish items**: 1 hour
- **Total estimated**: 6-8 hours

---

## 📝 Testing Requirements

After fixes:
- [ ] Re-run all affected test cases from E2E test plan
- [ ] Cross-browser validation (Firefox, Edge, Chrome)
- [ ] Passkey authentication flow testing
- [ ] Workout mode video playback validation
- [ ] Arabic localization verification
- [ ] Migration and sync integration testing

---

**Next Steps**: Begin Phase 1 critical infrastructure fixes