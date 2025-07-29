# RepCue: Workout Schedule Feature Specification and Implementation Plan

## Overview

Extend the application to support **user-defined workout schedules**.

* A **schedule** maps selected weekdays to **workouts**.
* A **workout** consists of one or more **exercises**.
* Each exercise is either:

  * **Repetition-based** (e.g. 3 sets × 12 reps), or
  * **Time-based** (e.g. 1 minute)
* The exercise type is defined by a fixed attribute in the **exercise catalog**.
* Each exercise also has a **recommended default** value from the catalog.
* When adding exercises to a workout, users may override the defaults with their own custom values (e.g. change 30s to 1m, or 3×12 to 4×10).

## Impact on the Application

### 🧭 Navigation

* The bottom navigation bar will now contain:

  1. **Home**
  2. **Schedule** (new)
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
  * If **no schedule exists**:

    * Show a call-to-action button labeled **"Add Workout"**

### 📅 Schedule Page

* Accessible via the **new tab in the navigation bar**.
* If no schedule exists:

  * Display a button: **"Add Schedule"**
* If a schedule exists:

  * Show a list of days with associated workouts.
  * Each listed workout has an **edit** option.
* A **schedule** is a mapping of one or more **weekdays** to **workouts**.
* A **workout** is a sequence of one or more **exercises**.
* This screen may become dense with information, so the UI should be:

  * Intuitive
  * Scrollable by day
  * Clear and easily editable

### ➕ Add Schedule Page

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

* Introduce new configurable defaults tied to schedules and workouts:

  * Example: **default rest duration** between exercises
* All new defaults should:

  * Have **sensible pre-filled values**
  * Be editable by the user

## 📦 Data Model Changes

* Extend the **Exercise model**:

  * Add attribute: `exercise_type` (`time-based` or `repetition-based`)
* Add new models/entities:

  * **Schedule** (weekday → workout mappings)
  * **Workout** (list of ordered exercises, optional labels)
  * **WorkoutExercise** (specific instance of an exercise in a workout, with user-defined overrides)
* Logging model updates:

  * Log a WorkoutSession

    * With completion stats per exercise
    * Timestamp and actual values recorded

## Additional Considerations

* **Duplicate Prevention**: Prevent creating two workouts for the same weekday.
* **Edge Case Handling**: If a user taps "Start Now" but the workout is empty or misconfigured, show an alert.
* **User Guidance**:

  * First-time tooltips for Schedule tab
  * "No schedule? Add one now!" prompts
* **Animations**: Smooth transitions between exercises, countdowns, and rest periods enhance flow.
* **Dark Mode Compatibility**: Maintain visual consistency across modes.

---

# 🚧 Implementation Plan

## Phase 1: Schedule & Workout Structure ✅ COMPLETED (2025-07-30)

* **T1.1**: ✅ Extend Exercise model with `exercise_type` - COMPLETED
* **T1.2**: ✅ Create `Workout` and `WorkoutExercise` models - COMPLETED
* **T1.3**: ✅ Create `Schedule` model linking days of the week to workouts - COMPLETED
* **T1.4**: ✅ Add logic and data persistence - COMPLETED
* **T1.5**: ✅ Add unit tests for new models and relationships - COMPLETED

**Phase 1 Summary**: All backend data models, storage services, and type definitions implemented and tested. 480 tests passing with zero compilation errors. Ready for Phase 2 UI integration.

## Phase 2: Navigation and UI Integration

* **T2.1**: Update bottom nav to include "Schedule" tab
* **T2.2**: Add ⋮ menu for "Settings"
* **T2.3**: Implement basic Schedule list page with Add/Edit logic
* **T2.4**: Integrate "Upcoming Workout" into Home page
* **T2.5**: Add tooltip guidance for first-time schedule users

## Phase 3: Add/Edit Schedule & Workout Flow

* **T3.1**: Build "Add Schedule" page UI
* **T3.2**: Build "Edit Workout" page UI per day
* **T3.3**: Implement logic for adding exercises with catalog defaults
* **T3.4**: Allow override of sets/reps or duration values
* **T3.5**: Add validations (e.g., prevent duplicate days)
* **T3.6**: Add integration tests for schedule creation

## Phase 4: Enhanced Timer Support

* **T4.1**: Detect launch context (standalone vs workout)
* **T4.2**: Show outer circle progress indicator for reps/sets
* **T4.3**: Auto-advance through workout flow with rest intervals
* **T4.4**: Sync timer state with log and workout data
* **T4.5**: Add unit and integration tests for new timer behavior

## Phase 5: Log Enhancements

* **T5.1**: Update log schema to support WorkoutSessions
* **T5.2**: Display workouts with expand/collapse detail
* **T5.3**: Calculate and store completion percentages
* **T5.4**: Filter and group logs by type and date
* **T5.5**: Add test coverage for log aggregation and display

## Phase 6: Settings Integration

* **T6.1**: Add settings form entries for new workout defaults
* **T6.2**: Apply user-defined rest durations
* **T6.3**: Persist and retrieve user preferences
* **T6.4**: Add tests for default-setting logic

## Phase 7: Final Testing and UX Polish

* **T7.1**: Perform accessibility checks for all new pages
* **T7.2**: Add visual transitions and animations
* **T7.3**: Test on different screen sizes and orientations
* **T7.4**: Update onboarding flow if needed
* **T7.5**: Add release notes and documentation
