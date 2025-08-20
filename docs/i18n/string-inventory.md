# String Inventory (Phase 1)
Last updated: 2025-08-17

Scope: Top-priority screens and shell components. This inventory lists visible user-facing strings that will be migrated to i18n keys starting in Phase 4. File paths are relative to `src/`.

Notes
- Proposed keys follow the convention in `key-styleguide.md`.
- Some constants (like app name/description) live in `src/constants/index.ts` and will be moved to translation files.
- This is a living document. Update as new UI strings are added or discovered.

---

## Home Page (`pages/HomePage.tsx`)
- App name: RepCue → app.name
- App description: Your personal exercise timer → app.description
- Upcoming Workout → home.upcomingWorkout.title
- Start Now → home.upcomingWorkout.startNow
- No Schedule Set → home.upcomingWorkout.empty.title
- Create a workout schedule to see your upcoming workouts here → home.upcomingWorkout.empty.subtitle
- Add Workout → home.upcomingWorkout.add
- Start Timer → home.quickStart.startTimer
- Browse Exercises → home.quickStart.browseExercises
- Favorite Exercises → home.favorites.title
- Start → common.start
- No favorite exercises yet. Mark some exercises as favorites to see them here! → home.favorites.empty
- Available Exercises → home.stats.availableExercises
- Weekday names (Mon..Sun) used for upcoming workout: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday → date.weekday.long.[mon..sun]
- Date formatting currently uses `toLocaleDateString('en-US', ...)` → will switch to Intl with active locale (Phase 6).

## Settings Page (`pages/SettingsPage.tsx`)
- Audio Settings → settings.audio.title
- Enable Sound → settings.audio.enableSound
- Beep Volume → settings.audio.beepVolume
- Low / Medium / High → common.low | common.medium | common.high
- Enable Vibration → settings.audio.enableVibration
- Timer Settings → settings.timer.title
- Pre-Timer Countdown → settings.timer.preCountdown
- Off → common.off
- s (suffix in 5s/10s) → common.secondsShortSuffix
- Countdown before the timer starts to help you get into position → settings.timer.preCountdown.help
- Beep Interval → settings.timer.beepInterval
- Every 15 seconds / Every 30 seconds / Every 45 seconds / Every 60 seconds → settings.timer.interval.option.15|30|45|60
- How often the timer beeps during intervals → settings.timer.beepInterval.help
- Appearance → settings.appearance.title
- Dark Mode → settings.appearance.darkMode
- Show Exercise Demo Videos → settings.appearance.showExerciseVideos
- Experimental: loop silent demo videos inside timer when available. → settings.appearance.showExerciseVideos.help
- Data → settings.data.title
- Auto Save → settings.data.autoSave
- Data Storage: Enabled/Disabled → settings.data.storageStatus (with interpolation or variants)
- Your workout data is stored locally on this device. → settings.data.storageStatus.enabledHelp
- Please accept data storage consent to enable export/clear features. → settings.data.storageStatus.disabledHelp
- Consent data will be migrated to latest version on next app load. → settings.data.migrationNotice
- Export Data → settings.data.export
- Download your workout data as a JSON file → settings.data.export.help
- Refresh Exercises → settings.data.refresh
- Force refresh exercises from server and reset all favorites → settings.data.refresh.help
- Clear All Data & Reset App → settings.data.clearAll
- Permanently delete all data, reset consent, and return to home screen → settings.data.clearAll.help
- Toast title/message/buttons for clear data confirmation → settings.data.clearToast.title|message|confirm|cancel

## Timer Page (`pages/TimerPage.tsx`)
- Rest Period → timer.rest.title
- Next: {exerciseName} • {category} → timer.rest.next
- Current Exercise • {category} → timer.exercise.current
- Take a break and prepare for the next exercise → timer.rest.helper
- Exercise / Choose / No exercise selected → timer.selector.label | timer.selector.choose | timer.selector.none
- Quick Select (Favorites:) → timer.quickSelect.title
- Duration → timer.duration.label
- Rep Duration → timer.rep.duration
- Set Progress → timer.rep.setProgress
- {x} of {y} sets completed → timer.rep.setProgress.summary
- Rep Progress → timer.rep.repProgress
- Get Ready! Timer starts in {count} seconds → timer.countdown.banner (plural)
- Get ready... → timer.countdown.caption
- Rep {n} → timer.rep.counter
- of {reps} in Set {set}/{sets} → timer.rep.ofInSet
- Start / Stop / Cancel / Reset → common.start | common.stop | common.cancel | common.reset
- Workout Controls / Exercise Controls → timer.controls.workout | timer.controls.exercise
- Next Rep ({n}/{total}) → timer.controls.nextRep
- Complete Exercise → timer.controls.completeExercise
- Exit Workout → timer.controls.exitWorkout
- Beep Interval → settings.timer.beepInterval (reuse)
- Wake Lock / On / Off / Not Supported → timer.info.wakeLock | common.on | common.off | common.notSupported
- Select Exercise / × → timer.selector.modalTitle | common.close
- Exercise {i}/{n} / Exercise {n}/{n} - Complete! → timer.workout.progress.current | timer.workout.progress.complete

## Workouts Page (`pages/WorkoutsPage.tsx`)
- My Workouts → workouts.title
- Create Workout → workouts.create
- Not scheduled → workouts.schedule.none
- Day short names: Mon/Tue/Wed/Thu/Fri/Sat/Sun → date.weekday.short.[mon..sun]
- Loading skeletons (no copy needed)
- Data Storage Required → workouts.noConsent.title
- You need to enable data storage to create and manage workouts. → workouts.noConsent.message
- Go to Settings → workouts.noConsent.goToSettings
- No workouts yet → workouts.empty.title
- Create your first workout to get started with your fitness routine. → workouts.empty.message
- Create Your First Workout → workouts.empty.cta
- Paused → workouts.status.paused
- Start → common.start
- Start workout / Workout is paused (title tooltips) → workouts.action.start.title.active|paused
- Edit workout → workouts.action.edit.title
- Delete workout → workouts.action.delete.title
- {n} exercise(s) → workouts.card.exerciseCount
- ~{duration} → workouts.card.estimatedDuration
- Delete confirmation text/buttons → workouts.deleteConfirm.message|confirm|cancel

## Exercise Page (`pages/ExercisePage.tsx`)
- Exercises → exercises.title
- Browse and select exercises for your workout → exercises.subtitle
- Search exercises... (placeholder) → exercises.search.placeholder
- All Categories / Core / Strength / Cardio / Flexibility / Balance / Hand Warmup → exercises.filters.category.*
- Favorites Only → exercises.filters.favoritesOnly
- Showing {filtered} of {total} exercises → exercises.resultsCount
- No exercises found → exercises.empty.title
- Try adjusting your search terms or filters → exercises.empty.message
- Clear Filters → exercises.empty.clearFilters
- Time-based / Rep-based badges → exercises.badge.timeBased | exercises.badge.repBased
- Default: {duration} | Default: {sets}×{reps} → exercises.default.duration | exercises.default.setsReps
- Favorite toggle tooltip/aria → exercises.favorite.addTitle | exercises.favorite.removeTitle | exercises.favorite.aria
- Show less / +{n} / Show {n} more tag(s) → common.showLess | exercises.tags.moreCount | exercises.tags.moreAria
- Start Timer → common.startTimer

## App Shell (`components/AppShell.tsx`)
- Document titles: RepCue - Exercise Timer, Exercises, Exercise Details, Timer, Activity Log, Settings → titles.*
- Skip to main content → a11y.skipToMain
- Main content (aria-label) → a11y.mainRegion

## Consent Banner (`components/ConsentBanner.tsx`)
- Your Privacy Matters → consent.title
- RepCue needs your permission to store exercise data on your device to provide the best experience. → consent.description
- Learn more about how we protect your privacy → consent.learnMore
- What data do we store? → consent.details.data.title
- • Your exercise preferences and favorites → consent.details.data.items.preferences
- • Activity logs with exercise duration and timestamps → consent.details.data.items.logs
- • App settings (sound, vibration, intervals) → consent.details.data.items.settings
- • No personal information or biometric data → consent.details.data.items.noPii
- Your data stays private → consent.details.privacy.title
- • All data is stored locally on your device → consent.details.privacy.items.localOnly
- • Nothing is sent to external servers without your permission → consent.details.privacy.items.noExternal
- • You can export or delete your data at any time → consent.details.privacy.items.control
- • Full GDPR compliance with your rights → consent.details.privacy.items.gdpr
- Show less → common.showLess
- Accept All & Continue → consent.acceptAll
- Essential Only → consent.acceptEssential
- You can change your preferences later in Settings. Essential cookies are required for the app to function. → consent.footerNote

---

Future considerations
- Some labels derive from enums (e.g., `ExerciseCategory`, `Weekday`). We’ll provide localized labels via i18n keys rather than rendering raw enum values.
- Units and pluralization will be handled via i18next plurals (Phase 6).
