# RepCue: Workout System Featur### 🏠 Home Page### 🏠 Home Page ✅ COMPLETED

* Existing layout ### ➕ Create/Edit Workout Pages 🚧 IN PROGRESS

* Accessible via:

  * "Create Workout" on the Workouts page
  * "Edit" button on existing workouts
* Flow:

  1. Enter workout name and description
  2. Select **scheduled weekdays** for this workout
  3. Add **exercises**, one at a time
  4. For each added exercise:

     * Default values from the catalog are pre-filled
     * User can customize values (e.g. duration or sets × reps)t.
* A new section appears **above the existing content** to reflect the user's workout status:

  * If active workouts exist:

    * A two-line "Upcoming Workout" block is shown:

      * Line 1: `"Upcoming Workout"`
      * Line 2:

        * Left: weekday name (e.g. **Wednesday**) in large font, with date below (e.g. **Jul 2**)
        * Right: `"Start Now"` button
  * If **no active workouts exist**:

    * Show a call-to-action button labeled **"Add Workout"** that navigates to the Workouts page Existing layout remains intact.
* A new section appears **above the existing content** to reflect the user's workout status:

  * If active workouts exist:

    * A two-line "Upcoming Workout" block is shown:

      * Line 1: `"Upcoming Workout"`
      * Line 2:

        * Left: weekday name (e.g. **Wednesday**) in large font, with date below (e.g. **Jul 2**)
        * Right: `"Start Now"` button
  * If **no active workouts exist**:

    * Show a call-to-action button labeled **"Add Workout"** that navigates to the Workouts pagend Implementation Plan

## Overview

✅ **COMPLETED**: Extended the application to support **user-defined workout schedules** with embedded scheduling.

* A **workout** consists of one or more **exercises** and directly contains **scheduled days**.
* Each exercise is either:

  * **Repetition-based** (e.g. 3 sets × 12 reps), or
  * **Time-based** (e.g. 1 minute)
* The exercise type is defined by a fixed attribute in the **exercise catalog**.
* Each exercise also has a **recommended default** value from the catalog.
* When adding exercises to a workout, users may override the defaults with their own custom values (e.g. change 30s to 1m, or 3×12 to 4×10).
* **Architecture Change**: Eliminated separate Schedule entity - workouts now contain `scheduledDays: Weekday[]` directly.

## Impact on the Application

### 🧭 Navigation ✅ COMPLETED

* The bottom navigation bar now contains:

  1. **Home**
  2. **Workouts** (implemented - replaces previous Schedule concept)
  3. **Exercises**
  4. **Timer**
  5. **Log**
  6. A visually separated **⋮ icon** for overflow
* Tapping the **⋮ icon** reveals a **popover** containing a single `"Settings"` option.
* Tapping `"Settings"` opens the Settings page.

### 🏠 Home Page

* Existing layout remains intact.
* A new section will appear **above the existing content** to reflect the user's schedule status:

  * If a schedule exists:

    * A two-line “Upcoming Workout” block is shown:

      * Line 1: `"Upcoming Workout"`
      * Line 2:

        * Left: weekday name (e.g. **Wednesday**) in large font, with date below (e.g. **Jul 2**)
        * Right: `"Start Now"` button
  * If **no active workouts exist**:

    * Show a call-to-action button labeled **"Add Workout"** that navigates to the Workouts page

### 📅 Workouts Page ✅ PARTIALLY COMPLETED

* Accessible via the **Workouts tab in the navigation bar**.
* If no workouts exist:

  * Display a button: **"Create Workout"**
* If workouts exist:

  * Show a list of workouts with their scheduled days.
  * Each workout has **edit** and **delete** options.
* A **workout** contains:

  * A name and optional description
  * A sequence of one or more **exercises** with custom durations/reps
  * **scheduledDays**: Array of weekdays when this workout should be performed
  * **isActive**: Boolean to pause/resume without deletion
* This screen is intuitive, scrollable, and clearly editable.

### ➕ Create/Edit Workout Pages 🚧 IN PROGRESS

* Accessible via:

  * “Add Schedule” on the Home page or Schedule page
* Flow:

  1. Select **weekday**
  2. Add **exercises**, one at a time
  3. For each added exercise:

     * Default values from the catalog are pre-filled
     * User can customize values (e.g. duration or sets × reps)

### ⏱ Timer

* The existing **standalone timer** remains fully functional:

  * Launchable via:

    * Timer tab
    * “Start Timer” on Home
    * “Start Timer” in Exercise catalog
* With the introduction of workouts:

  * The Timer must now support **repetition-based exercises**.
  * If invoked as part of a scheduled workout:

    * Use the **existing timer circle** for set/rest timing
    * Add an **outer circle or progress indicator** to reflect **repetition progress** (e.g. 5 / 12 reps)
    * This outer progress appears **only for repetition-based exercises**, and only in **guided workout mode**, not standalone

### 📊 Log Page

* Logs will continue to show:

  * Standalone timers
  * New: **completed workouts**
* For each logged **workout**:

  * Provide a way to **expand/collapse** to view:

    * Exercises performed
    * Custom values (duration or reps)
    * **Completion percentage** per exercise (if incomplete)

### ⚙ Settings Page

* Introduce new configurable defaults tied to workouts:

  * Example: **default rest duration** between exercises
* All new defaults should:

  * Have **sensible pre-filled values**
  * Be editable by the user

## 📦 Data Model Changes ✅ COMPLETED

* ✅ Extended the **Exercise model**:

  * Added attribute: `exercise_type` (`time-based` or `repetition-based`)
* ✅ Added new models/entities:

  * **Workout** (list of ordered exercises, scheduled days, active status)
  * **WorkoutExercise** (specific instance of an exercise in a workout, with user-defined overrides)
  * **WorkoutSession** (session tracking for completed workouts)
* ✅ **Architecture Simplification**: Eliminated separate Schedule entity - workouts now contain `scheduledDays: Weekday[]` directly
* ✅ Logging model updates:

  * Log a WorkoutSession

    * With completion stats per exercise
    * Timestamp and actual values recorded

## Additional Considerations

* **Duplicate Prevention**: Prevent overlapping workout schedules for the same weekday (multiple workouts can be scheduled for the same day).
* **Edge Case Handling**: If a user taps "Start Now" but the workout is empty or misconfigured, show an alert.
* **User Guidance**:

  * First-time tooltips for Workouts tab
  * "No workouts? Create one now!" prompts
* **Animations**: Smooth transitions between exercises, countdowns, and rest periods enhance flow.
* **Dark Mode Compatibility**: Maintain visual consistency across modes.

---

# 🚧 Implementation Plan

## Phase 1: Workout Data Structure ✅ COMPLETED (2025-07-30)

* **T1.1**: ✅ Extend Exercise model with `exercise_type` - COMPLETED
* **T1.2**: ✅ Create `Workout` and `WorkoutExercise` models - COMPLETED
* **T1.3**: ✅ Integrate scheduling directly into Workout model with `scheduledDays` - COMPLETED (simplified from separate Schedule entity)
* **T1.4**: ✅ Add logic and data persistence for workouts - COMPLETED
* **T1.5**: ✅ Add unit tests for new models and relationships - COMPLETED

**Phase 1 Summary**: All backend data models, storage services, and type definitions implemented and tested. Simplified architecture by eliminating separate Schedule entity. 481 tests passing with zero compilation errors.

## Phase 2: Navigation and UI Integration ✅ COMPLETED (2025-07-31)

* **T2.1**: ✅ Update bottom nav to include "Workouts" tab - COMPLETED
* **T2.2**: ✅ Add ⋮ menu for "Settings" - COMPLETED  
* **T2.3**: ✅ Implement basic Workouts list page infrastructure - COMPLETED
* **T2.4**: ✅ Integrate "Upcoming Workout" logic into Home page - COMPLETED
* **T2.5**: ✅ Remove obsolete Schedule-related files and fix build errors - COMPLETED

**Phase 2 Summary**: Complete navigation restructure from Schedule to Workout system. Updated HomePage to use new workout-based upcoming workout logic. Cleaned up obsolete Schedule files. All 481 tests passing with zero compilation errors.

## Phase 3: Create/Edit Workout Flow ✅ COMPLETED (2025-07-31)

* **T3.1**: ✅ Build "Create Workout" page UI (WorkoutsPage shows "Create Workout" button) - COMPLETED
* **T3.2**: ✅ Build "Edit Workout" page UI with workout details form - COMPLETED
* **T3.3**: ✅ Implement logic for adding exercises with catalog defaults - COMPLETED
* **T3.4**: ✅ Allow override of sets/reps or duration values per exercise - COMPLETED
* **T3.5**: ✅ Add workout scheduling (select weekdays) functionality - COMPLETED
* **T3.6**: ✅ Add validations (e.g., prevent conflicts, validate inputs) - COMPLETED
* **T3.7**: ✅ Add integration tests for workout creation and editing - COMPLETED

**Phase 3 Summary**: Complete workout creation and editing flow implemented. CreateWorkoutPage and EditWorkoutPage both feature comprehensive forms with exercise selection, customization (duration/sets/reps/rest time), weekday scheduling, validation, and data persistence. WorkoutsPage provides full CRUD operations. All 481 tests passing.

## Phase 4: Enhanced Timer Support ✅ COMPLETED (2025-08-01)

* **T4.1**: ✅ Detect launch context (standalone vs workout-guided) - COMPLETED
* **T4.2**: ✅ Show outer circle progress indicator for reps/sets in workout mode - COMPLETED
* **T4.3**: ✅ Auto-advance through workout flow with custom rest intervals - COMPLETED
* **T4.4**: ✅ Sync timer state with log and workout session data - COMPLETED  
* **T4.5**: ✅ Add unit and integration tests for new timer behavior - COMPLETED

**Phase 4 Summary**: Complete workout-guided timer functionality implemented. Timer now supports both standalone and workout modes with different UI elements and behaviors. In workout mode, the timer displays an outer progress ring for overall workout progress, rep/set progress indicators for repetition-based exercises, auto-advances through exercises with rest periods, and tracks workout session data. Added comprehensive test coverage with 13 new tests. All 494 tests passing.

## Phase 5: Log Enhancements

* **T5.1**: ✅ Update log schema to support WorkoutSessions (models already exist ✅)
* **T5.2**: ✅ Display workouts with expand/collapse detail view
* **T5.3**: Calculate and store completion percentages per exercise
* **T5.4**: Filter and group logs by type (standalone timer vs workout) and date
* **T5.5**: Add test coverage for log aggregation and display

## Phase 6: Settings Integration

* **T6.1**: Add settings form entries for new workout defaults
* **T6.2**: Apply user-defined rest durations between exercises
* **T6.3**: Persist and retrieve user preferences for workouts
* **T6.4**: Add tests for default-setting logic

## Phase 7: Final Testing and UX Polish

* **T7.1**: Perform accessibility checks for all new pages
* **T7.2**: Add visual transitions and animations
* **T7.3**: Test on different screen sizes and orientations
* **T7.4**: Update onboarding flow if needed
* **T7.5**: Add release notes and documentation

---

## 📊 Current Status Summary (2025-08-01)

### ✅ Completed
- **Data Models**: Complete workout system with embedded scheduling
- **Navigation**: Workouts tab implemented, Settings in overflow menu
- **Home Page**: Upcoming workout integration with new workout system
- **Infrastructure**: All storage services, type definitions, and tests
- **Architecture**: Simplified from Schedule + Workout to just Workout with `scheduledDays`
- **Workout CRUD**: Complete Create/Edit/Delete workout functionality with full UI
- **Enhanced Timer**: Complete workout-guided timer with progress indicators and auto-advance

### 🚧 In Progress
- **Phase 5**: Log Enhancements (next priority)

### 📋 Next Steps
1. **NEXT**: Update Activity Log to support WorkoutSessions (Phase 5)
2. Update Settings to include workout-specific defaults (Phase 6)
3. Final testing and UX polish (Phase 7)

### 🧪 Test Status
- **Total Tests**: 494 passing
- **Build Status**: ✅ All TypeScript compilation errors resolved
- **Coverage**: Complete coverage for data models, services, and workout timer functionality
