# Module 1.4 Integration Test Plan - AI Coach Settings & Integration

**Date**: October 13, 2025  
**Module**: 1.4 - Integration & Settings  
**Tester**: Manual integration testing  
**Duration**: 2-3 hours estimated

---

## Test Objectives

1. Verify settings persistence across page refreshes
2. Validate HomePage top insight display with conditional logic
3. Confirm CoachPage insight filtering by user preferences
4. Test all action handlers (5 actions)
5. Verify auto-refresh behavior
6. Validate master toggle disables all features
7. Ensure cross-component state synchronization

---

## Pre-Test Setup

### Environment Check
- [ ] Development server running (`pnpm dev`)
- [ ] Backend server running if needed (`pnpm dev:be`)
- [ ] Browser DevTools open (Console, Network, Application tabs)
- [ ] Clear IndexedDB before testing (optional for clean slate)

### Test Data Requirements
- [ ] At least 5 completed workouts in history (for analytics)
- [ ] User logged in (if auth required)
- [ ] Exercise videos available (if testing video insights)

---

## Test Cases

### TC1: Settings Persistence
**Objective**: Verify settings save correctly and persist across page refreshes

**Steps**:
1. Navigate to Settings page
2. Locate "AI Coach" section
3. Toggle `coach_enabled` OFF
4. Refresh the page (F5)
5. Navigate back to Settings
6. Verify `coach_enabled` is still OFF
7. Toggle `coach_enabled` ON
8. Toggle `coach_show_on_home` OFF
9. Refresh the page
10. Verify `coach_show_on_home` is still OFF

**Expected Results**:
- All settings persist after refresh
- IndexedDB `app_settings` table updates correctly
- No console errors

**Test Data**:
- Settings to test: All 9 coach settings

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC2: Master Toggle - Disable All
**Objective**: Verify master toggle disables all coach features

**Steps**:
1. Navigate to Settings
2. Ensure `coach_enabled` is ON
3. Navigate to HomePage
4. Verify coaching insight is visible
5. Navigate to CoachPage
6. Verify insights are displayed
7. Navigate back to Settings
8. Toggle `coach_enabled` OFF
9. Navigate to HomePage
10. Verify NO coaching insight is visible
11. Navigate to CoachPage
12. Verify empty state or message about coach being disabled

**Expected Results**:
- HomePage: No coaching insight card when disabled
- CoachPage: Empty state or disabled message
- Settings: Sub-settings grayed out or hidden when master toggle OFF
- No API calls to coaching service when disabled

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC3: Show on Home Toggle
**Objective**: Verify `coach_show_on_home` controls HomePage display

**Steps**:
1. Navigate to Settings
2. Ensure `coach_enabled` is ON
3. Ensure `coach_show_on_home` is ON
4. Navigate to HomePage
5. Verify coaching insight is visible
6. Navigate back to Settings
7. Toggle `coach_show_on_home` OFF
8. Navigate to HomePage
9. Verify NO coaching insight is visible
10. Navigate to CoachPage
11. Verify insights are still displayed (CoachPage not affected)

**Expected Results**:
- HomePage shows insight only when both `coach_enabled` AND `coach_show_on_home` are true
- CoachPage unaffected by `coach_show_on_home` setting
- No errors in console

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC4: Insight Type Filtering - Streak
**Objective**: Verify type-specific toggles filter insights correctly

**Steps**:
1. Navigate to Settings
2. Ensure `coach_enabled` is ON
3. Toggle `coach_show_streak` OFF
4. Navigate to CoachPage
5. Verify NO streak or milestone insights are displayed
6. Check if other insight types (progression, recovery, etc.) are still visible
7. Navigate to HomePage
8. If top insight was streak type, verify it's not displayed OR different type shown

**Expected Results**:
- Streak and milestone insights filtered out
- Other insight types still visible
- HomePage top insight updates accordingly
- Filter applies to both pages

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC5: Insight Type Filtering - All Types
**Objective**: Test filtering for all 5 insight type toggles

**Steps**:
For each toggle (`coach_show_streak`, `coach_show_muscle_balance`, `coach_show_progression`, `coach_show_recovery`, `coach_show_suggestions`):
1. Navigate to Settings
2. Toggle specific type OFF
3. Navigate to CoachPage
4. Verify corresponding insight types are NOT displayed
5. Toggle back ON
6. Verify insights reappear

**Expected Results**:
- Each toggle correctly filters its corresponding insight types
- Multiple toggles can be OFF simultaneously
- All toggles OFF = empty CoachPage (but not disabled message)
- Filtering logic matches mapping:
  - `coach_show_streak` → streak, milestone
  - `coach_show_muscle_balance` → muscle-balance
  - `coach_show_progression` → progression, personal-record
  - `coach_show_recovery` → recovery
  - `coach_show_suggestions` → suggestion, motivation

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC6: Auto-Refresh Settings
**Objective**: Verify auto-refresh respects user settings

**Steps**:
1. Navigate to Settings
2. Ensure `coach_enabled` is ON
3. Ensure `coach_auto_refresh` is OFF (default)
4. Navigate to CoachPage
5. Wait 5+ minutes
6. Verify insights do NOT auto-refresh (check Network tab for no API calls)
7. Navigate back to Settings
8. Toggle `coach_auto_refresh` ON
9. Navigate to CoachPage
10. Wait 5 minutes
11. Verify insights DO auto-refresh (check Network tab for API call at 5min mark)

**Expected Results**:
- Auto-refresh disabled by default (manual refresh only)
- When enabled, insights refresh every 5 minutes
- Refresh interval respects `coach_refresh_interval` setting
- No unnecessary API calls when disabled

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC7: Action Handler - Start Workout
**Objective**: Test "start-workout" action from coaching insight

**Steps**:
1. Navigate to HomePage (or CoachPage)
2. Locate coaching insight with "Start Workout" action button
3. Click the action button
4. Verify navigation to TimerPage
5. Verify timer is ready to start (not auto-started)

**Expected Results**:
- Navigates to `/timer` route
- TimerPage loads correctly
- No errors in console

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC8: Action Handler - Start Exercise
**Objective**: Test "start-exercise" action with exerciseId payload

**Steps**:
1. Navigate to HomePage (or CoachPage)
2. Locate coaching insight with "Start Exercise" action (should have specific exercise)
3. Click the action button
4. Verify navigation to TimerPage
5. Verify specific exercise is pre-selected/loaded
6. Check route state contains `exerciseId`

**Expected Results**:
- Navigates to `/timer` with state: `{ exerciseId: '<id>' }`
- TimerPage loads with correct exercise pre-selected
- Exercise details displayed correctly

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC9: Action Handler - Find Exercises
**Objective**: Test "find-exercises" action with muscleGroup payload

**Steps**:
1. Navigate to HomePage (or CoachPage)
2. Locate coaching insight with "Find Exercises" action (should suggest muscle group)
3. Click the action button
4. Verify navigation to ExercisesPage
5. Verify muscle group filter is pre-applied
6. Check route state contains `filterMuscleGroup`

**Expected Results**:
- Navigates to `/exercises` with state: `{ filterMuscleGroup: '<muscle>' }`
- ExercisesPage loads with filter applied
- Correct exercises displayed for muscle group

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC10: Action Handler - View Progress
**Objective**: Test "view-progress" action navigation

**Steps**:
1. Navigate to HomePage (or CoachPage)
2. Locate coaching insight with "View Progress" action
3. Click the action button
4. Verify navigation to ActivityLog page

**Expected Results**:
- Navigates to `/activity-log` route
- ActivityLog page loads correctly
- User's workout history displayed

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC11: Action Handler - View Coach
**Objective**: Test "view-coach" action navigation

**Steps**:
1. Navigate to HomePage
2. Locate top coaching insight card
3. Click "View All Insights" or similar action
4. Verify navigation to CoachPage

**Expected Results**:
- Navigates to `/coach` route
- CoachPage loads with all insights
- No errors

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC12: Dismiss Functionality
**Objective**: Test insight dismiss behavior

**Steps**:
1. Navigate to HomePage (or CoachPage)
2. Locate coaching insight card
3. Click dismiss/close button (if available)
4. Verify insight is removed from view
5. Check if dismissed insight persists (doesn't reappear on refresh)

**Expected Results**:
- Insight removed from UI immediately
- Dismissal logged (check console for logger output)
- Dismissed insight may or may not persist depending on implementation
- No errors

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC13: Cross-Component State Sync
**Objective**: Verify settings changes reflect across all components

**Steps**:
1. Open two browser tabs to the app
2. Tab 1: Navigate to Settings
3. Tab 2: Navigate to HomePage
4. Tab 1: Toggle `coach_show_on_home` OFF
5. Tab 2: Refresh page
6. Tab 2: Verify coaching insight is NOT visible
7. Tab 1: Toggle back ON
8. Tab 2: Refresh page
9. Tab 2: Verify coaching insight IS visible

**Expected Results**:
- Settings sync across tabs (via IndexedDB)
- All pages respect latest settings after refresh
- No stale state issues

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC14: Loading States
**Objective**: Verify proper loading indicators

**Steps**:
1. Open Network tab, throttle to "Slow 3G"
2. Navigate to HomePage
3. Verify loading indicator shown while fetching top insight
4. Navigate to CoachPage
5. Verify loading indicators for insights list
6. Verify no flash of empty state before data loads

**Expected Results**:
- Loading states displayed during fetch
- Graceful loading experience
- No UI flicker

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

### TC15: Error Handling
**Objective**: Test error scenarios gracefully

**Steps**:
1. Simulate network failure (go offline)
2. Navigate to CoachPage
3. Verify error message displayed (not blank page)
4. Go back online
5. Refresh page
6. Verify insights load correctly

**Expected Results**:
- Error states displayed with helpful messages
- No app crashes
- Recovery works when connection restored

**Status**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Notes**:
```
_________________________________________________________________
```

---

## Browser/Device Testing

### Desktop Browsers
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if Mac available)

### Mobile Browsers (Responsive Mode)
- [ ] Chrome DevTools responsive mode (iPhone, Android)
- [ ] Touch interaction testing
- [ ] Small screen layout verification

### Accessibility
- [ ] Keyboard navigation (Tab through settings)
- [ ] Screen reader labels (inspect ARIA attributes)
- [ ] Color contrast (settings toggles)

---

## Performance Checks

- [ ] No excessive re-renders (React DevTools Profiler)
- [ ] No memory leaks (check after 10+ page navigations)
- [ ] IndexedDB operations complete quickly (<100ms)
- [ ] No blocking API calls on page load

---

## Post-Test Checklist

- [ ] All test cases executed
- [ ] Pass/Fail status recorded for each
- [ ] Issues documented with reproduction steps
- [ ] Console errors captured (if any)
- [ ] Screenshots of failures (if applicable)

---

## Summary

**Total Test Cases**: 15  
**Passed**: ___  
**Failed**: ___  
**Blocked**: ___  

**Critical Issues Found**:
```
_________________________________________________________________
```

**Non-Critical Issues**:
```
_________________________________________________________________
```

**Recommendations**:
```
_________________________________________________________________
```

**Sign-off**: [ ] Module 1.4 Integration Testing COMPLETE

---

## Next Steps After Testing

1. **If All Pass**: Mark Module 1.4 complete, move to Module 1.5
2. **If Failures**: Fix critical bugs, re-test affected cases
3. **If Blocked**: Document blockers, determine workarounds
4. Update CHANGELOG.md with Module 1.4 completion notes
