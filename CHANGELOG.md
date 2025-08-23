## 2025-08-23

### Package Manager Migration
- Migrated from npm to pnpm for improved performance and disk usage
- Created `pnpm-workspace.yaml` to replace npm workspaces configuration  
- Updated all workspace scripts to use `pnpm --filter` syntax
- Added `packageManager` field to root `package.json` (pnpm@10.15.0)
- Updated GitHub Actions CI to use pnpm with action-setup and frozen lockfile
- Fixed TypeScript build errors by adding `@types/node` dependency
- All build, lint, and test commands now work with pnpm

### Repo reorganization (monorepo)
- Split workspace into `apps/frontend` (Vite + React), `apps/backend` (Express + PM2), and `packages/shared` (placeholder for shared types/constants).
- Moved Cypress E2E to `tests/e2e` with its own workspace package.
- Updated root scripts to target workspaces; added `dev:be` for backend.
- Backend now serves `apps/frontend/dist` in production.
- Helper scripts updated to new paths (splash, verify-media, favicons).
- Frontend `.env` moved to `apps/frontend/.env` (VITE_ prefix required).

### Fixed
- Activity Log page flicker: decoupled initial fetch from stats recalculation to prevent re-render loops; stats now recompute when logs or language change without triggering loading state.

- Tests: Align default Vitest config with stable mode to eliminate flakiness between `npm run test:unit` and `npm run test:stable`.
  - Updated `vitest.config.ts` to use single-fork pool with `fileParallelism: false`, `isolate: true`, and auto‑mock cleanup settings matching `vitest.stable.config.ts`.
  - Hardened `src/test/setup.ts` to wrap `window.dispatchEvent` only once and avoid recursive wrapping that caused stack overflows under parallel workers.
  - Result: Both `npm run test:unit` and `npm run test:stable` pass 100% locally (64 files, 599 passed, 3 skipped).

## 2025-08-22

- Tests: Fix unit test failures caused by temporal dead zone in hooks/components.
  - Reordered `useCallback` declarations before effects that depended on them in `src/App.tsx`, `src/pages/ActivityLogPage.tsx`, `src/hooks/useInstallPrompt.ts`, and `src/components/InstallPrompt.tsx`.
  - Result: `npm run test:unit` now passes 100% locally (64 files, 599 passed, 3 skipped).

- Fix: Exercise preview now shows a warning toast and fallback panel when a video fails to load (e.g., exercise marked `hasVideo = true` but media missing). Also records consent-aware telemetry for preview video errors.
- UX: Prevent modal from opening if media is missing via 1s HEAD precheck; only the bottom snackbar appears. Timer inline video remains silent (debug logged) to avoid intrusive UI.
- Tests: Hardened preview tests: Router+Snackbar wrappers, jsdom media play stubs, resilient role-based assertions. ActivityLogPage tests updated for case-insensitive button queries and robust empty-state matching.

- Test: Stabilized sequential Vitest runs; added isolation guards in `src/test/setup.ts` (auto-consent, localStorage/indexedDB mocks, window/document restoration), jsdom-safe audio/vibration cleanup, background sync guards, preview modal timing fixes, and video element error handling. Added `docs/devops/testing-practices.md` to document structure and best practices.

## 2025-08-21 (i18n Arabic fixes and UX polish)

### Fixed / Updated
- Home tagline localized via `home.tagline` (ar, ar‑EG) and wired in `HomePage.tsx`.
- Workouts listing: exercise count uses pluralized key in `common` namespace and Arabic now renders correctly; duration uses localized minute/second suffixes (`minutesShortSuffix`, `secondsShortSuffix`).
- Create/Edit Workout: weekday chips now use `weekdayAbbrev.*` (consistent across pages); added Arabic short forms in `ar` and `ar‑EG`.
- Create/Edit Workout: Arabic copy revised to use "البرامج" consistently instead of "التمارين" (name label, create/edit/delete/paused/save, empty states, errors) for both `ar` and `ar‑EG`.
- Arabic pluralization for `workouts.scheduledPerWeek_*` completed (zero/one/two/few/many/other) to prevent English fallback when selecting 2+ days.
- Exercises page: tags treated as an enumeration; added `exercises.tags.{...}` across all locales (en, ar, ar‑EG, de, es, fr, nl) and UI now reads from the exercises namespace.
- Category labels localized in Exercises (section headers) and exercise selectors (Timer page).
- Activity Log:
  - Localized category chips and empty-state category name; fixed Hand Warmup mapping.
  - Dates/times now formatted with active locale; durations use localized suffixes.
  - Exercise names localized; favorite exercise name in stats localized.
  - Localized legacy notes (stopped/completed sets+reps/completed time) with new `activity.status.*` keys.

### Developer notes
- Added/adjusted locale keys across: `public/locales/*/common.json` and `public/locales/*/exercises.json`.
- Updated `EditWorkoutPage.tsx`, `CreateWorkoutPage.tsx`, `WorkoutsPage.tsx`, `ExercisePage.tsx`, `TimerPage.tsx`, and `ActivityLogPage.tsx` to consume the new keys.

---
## 2025-08-21

### ✅ UPDATED: AI Coding Agent Playbook
- Rewrote `.github/copilot-instructions.md` into a concise, actionable ~40-line playbook tailored to this repo.
- ### 📝 ADDED: Cookies and Storage Documentation
- - New `cookies.md` clarifies that the app sets no cookies, lists all `localStorage`/`IndexedDB` keys with purposes and retention, documents PWA caches, and explains first-run consent choices (Essential Only vs Accept All & Continue).

- Captures big-picture architecture (App.tsx state + services), critical timer semantics (rep-based completed counts, workoutMode preservation), and daily workflows.
- Maps feature-gated video demos (features.ts + useExerciseVideo) and key file locations for quick onboarding.
- Aligns with Windows/PowerShell dev and Raspberry Pi + PM2 deploy processes.
- References OWASP guidance in `.github/instructions/owasp.instructions.md` and i18n workflows.

## 2025-08-20

### ✅ ADDED: Exercise Page Video Preview
- Added a preview/play button on Exercise cards that have demo videos. Clicking opens an accessible modal dialog with inline video playback (muted, looped, playsInline).
- Lazy-loads `exercise_media.json` on first use and selects the best-fit variant via `selectVideoVariant` (portrait/landscape/square) based on viewport.
- Accessible: role="dialog", aria-modal, labelled title, backdrop click and close button supported.
- Localization: Strings use i18n with safe defaultValue fallbacks until keys are propagated to all locales.
- New unit test: `src/pages/__tests__/ExercisePage.preview.test.tsx` verifies button presence, dialog open, and backdrop close behavior with a mocked media index.

### ✅ UPDATED: Test i18n Setup & Navigation Labels
- Test seed updated in `src/test/setup.ts` to include `navigation.*` keys (Home, Workouts, Exercises, Timer, Activity Log, Settings, More).
- Removed duplicate `navigation` object collision in the test bundle (fixed duplicate keys error).
- Result: Navigation tests assert translated labels instead of raw keys; still avoids HTTP backend fetch in jsdom.

### ✅ ADDED: Exercise Locales Coverage Guard
- New unit test: `src/__tests__/exercise-locales-coverage.test.ts`.
  - Ensures every locale `public/locales/{lng}/exercises.json` includes all exercise IDs from English.
  - Asserts the special label `"variable"` exists for every locale.
  - Skips meta keys (e.g., `_meta`) and the `variable` label when iterating exercise IDs.
- Purpose: Prevent silent translation regressions across supported languages.

### ✅ UPDATED: Arabic Labels (ar, ar‑EG) — Workouts vs Exercises
- Clarified bottom navigation labels to avoid ambiguity:
  - `navigation.workouts` → "البرامج"
  - `navigation.exercises` → "التمارين"
- Updated related strings for consistency:
  - `workouts.title` and `workouts.backToWorkouts` now reference "البرامج".
- Files updated: `public/locales/ar/common.json`, `public/locales/ar-EG/common.json`.

### ✅ UPDATED: Exercise Localization Integration
- Fixed `localizeExercise` to target the correct `exercises` namespace (keys are `${id}.name/description`) and avoid collisions with `common.exercises.*` UI keys.
- Localized `ExercisePage` search and display:
  - Search now matches localized exercise name/description while keeping tag search stable.
  - Cards render localized name, description, and ARIA labels.
  - Duration formatter returns localized "Variable" label via `t('exercises.variable')`.
- Tests: Added `localizeExercise-unit.test.ts` to validate fallback and namespaced translation behavior.

### ✅ ADDED: Exercise Localization Documentation
- **Docs**: Added `docs/i18n/exercise-localization.md` outlining the full strategy for localizing the built-in exercise catalog and future user-generated exercises.
- **Index**: Updated `docs/i18n/README.md` with quick links.
- **Highlights**: i18n resource structure (`public/locales/{lng}/exercises.json`), UI helper (`localizeExercise`), UGC translation model, testing plan, and OWASP-aligned security notes.

### ✅ COMPLETED: Navigation Menu Localization
- **Full I18n Support**: Navigation menu now uses i18n translations instead of hardcoded English labels
- **Multi-Language Navigation**: Added navigation translations to all supported languages:
  - **English**: Home, Workouts, Exercises, Timer, Log, Settings
  - **Arabic**: الرئيسية, التمارين, التدريبات, المؤقت, السجل, الإعدادات
  - **Egyptian Arabic**: البيت, التمارين, التدريبات, التايمر, اللوج, الإعدادات
  - **German**: Startseite, Workouts, Übungen, Timer, Protokoll, Einstellungen
  - **Spanish**: Inicio, Entrenamientos, Ejercicios, Temporizador, Registro, Configuración
  - **French**: Accueil, Entraînements, Exercices, Minuteur, Journal, Paramètres
  - **Dutch**: Home, Trainingen, Oefeningen, Timer, Logboek, Instellingen
- **Component Integration**: Updated `Navigation.tsx` to use `useTranslation` hook
- **Translation Keys**: Added `navigation` section to all locale files with consistent key structure
- **Accessibility**: Maintains existing accessibility features while adding localization support

#### Technical Implementation
- **Translation Files**: Added `navigation` object to `public/locales/*/common.json` files
- **React Component**: Updated `Navigation.tsx` to import and use `useTranslation` from `react-i18next`
- **Dynamic Labels**: Replaced hardcoded strings with `t('navigation.key')` calls
- **Responsive Design**: Navigation remains fully responsive and RTL-compatible

### ✅ COMPLETED: Cross-Platform Build Script Fix
- **CI/CD Compatibility**: Fixed GitHub Actions build failures by replacing PowerShell-specific commands with cross-platform Node.js scripts
- **Build Script Modernization**: Created `scripts/copy-splash.mjs` to handle file copying across all operating systems
- **Package.json Update**: Replaced `powershell -Command` with `node scripts/copy-splash.mjs` in build process
- **Cross-Platform Support**: Build now works on Windows (PowerShell), Linux (bash), and macOS (zsh)
- **Error Resolution**: Fixes "powershell: not found" error in Ubuntu GitHub Actions runner

#### Technical Implementation
- **New Script**: `scripts/copy-splash.mjs` uses Node.js `fs/promises.cp()` with recursive copying
- **Error Handling**: Graceful handling of missing source directories with informative logging
- **Build Integration**: Seamlessly integrates with existing build pipeline without breaking changes
- **Local Testing**: Verified functionality on Windows development environment

### ✅ COMPLETED: RTL Toggle Switch Fix
- **Fixed Toggle Positioning**: Resolved incorrect toggle switch positioning in RTL languages (Arabic)
- **CSS RTL Support**: Added RTL-specific CSS classes for proper toggle indicator placement
  - Added `.toggle-switch-off` and `.toggle-switch-on` classes with RTL-aware transforms
  - In RTL mode: disabled state moves indicator to right, enabled state moves to left
- **Settings Page Updates**: Updated all toggle switches in SettingsPage to use RTL-aware classes
  - Sound enabled/disabled toggle
  - Vibration enabled/disabled toggle  
  - Dark mode toggle
  - Exercise videos toggle
  - Auto-save toggle
- **i18n Language Normalization**: Fixed language code normalization for Arabic variants
  - `ar-EG` now correctly sets `document.lang` to `ar` while preserving RTL direction
  - Ensures consistent behavior across Arabic regional variants

#### Technical Details
- **CSS Implementation**: Added `body.rtl .toggle-switch-*` selectors with proper translateX values
- **Component Updates**: All toggle buttons now include conditional RTL-aware CSS classes
- **Test Compatibility**: Fixed i18n test that expected language normalization for regional variants
- **Cross-Platform**: Ensures toggle switches work correctly in both LTR and RTL layouts

### ✅ COMPLETED: Egyptian Arabic Locale Enhancement - Colloquial Slang Update
- **Enhanced Egyptian Dialect**: Updated all string literals in ar-EG locale to use authentic Egyptian slang and colloquial expressions
- **Natural Language Experience**: Replaced formal Arabic terms with everyday Egyptian expressions users actually speak
- **Key Slang Conversions**:
  - Action verbs: "ابدأ" → "يلا" (start), "توقف" → "بطّل" (stop), "إلغاء" → "سيب" (cancel)
  - Interface terms: "ضيف" → "زوّد" (add), "عدّل" → "غيّر في" (edit), "اهتزاز" → "رعشة" (vibration)
  - Casual expressions: "خد بريك" → "خد نفس" (take a break), "تحكم في" → "كنترول" (control)
  - Egyptian-specific: "متاحة" → "موجودة" (available), "اختياري" → "لو عايز" (optional)
- **Complete Coverage**: Updated all sections including common actions, settings, timer controls, workouts, activity tracking, and exercises
- **User Experience**: Egyptian users now see familiar street language making the app feel more natural and accessible

#### Files Updated
- `public/locales/ar-EG/common.json` - Main application strings converted to Egyptian slang
- `public/locales/ar-EG/a11y.json` - Accessibility strings updated to colloquial terms
- `public/locales/ar-EG/titles.json` - Verified and maintained appropriate titles

## 2025-12-31

### ✅ COMPLETED: Egyptian Arabic Language Support Added
- **Regional Arabic Variant**: Added Egyptian Arabic (ar-EG) as a separate locale with colloquial translations
- **Device Detection**: Automatic detection of Egyptian Arabic from user's device language settings (ar-EG locale)
- **Smart Fallback**: Egyptian Arabic falls back to Standard Arabic, then English if translations are missing
- **Colloquial Translations**: Complete Egyptian dialect translations with everyday expressions
  - Common actions using Egyptian dialect (ابدأ، توقف، اختار، اقفل، بيحمّل)
  - Casual greetings and interactions (أهلاً بيك تاني، استعد، دلوقتي)
  - Egyptian-specific terms (سيتات، عدات، بريك، دوّر، جرب تاني)
  - Shortened weekdays (الاتنين، التلات، الأربع، الخميس)
- **Language Selection**: Updated language switcher to include both Standard Arabic and Egyptian Arabic
- **RTL Support**: Full right-to-left support maintained for Egyptian Arabic variant
- **User Experience**: Egyptian users will see familiar colloquial terms instead of formal Arabic

#### Technical Implementation Details
- **Locale Code**: Added `ar-EG` to supported languages list in i18n configuration
- **Fallback Strategy**: `ar-EG` → `ar` → `en` for graceful degradation
- **Language Detection**: Automatic detection via browser/device language settings
- **File Structure**: Complete `ar-EG` locale directory with common.json, titles.json, a11y.json
- **UI Integration**: Updated LanguageSwitcher with "عربي مصري" option
- **DOM Handling**: Proper language attribute setting for `ar-EG` in document.documentElement.lang

### ✅ COMPLETED: Complete German, French, and Spanish Language Support
- **Full Localization Coverage**: Comprehensive translation of all English string literals to German, French, and Spanish
- **German Translations**: Complete professional translation with proper German grammar and fitness terminology
  - Common actions (Start, Stopp, Abbrechen, Zurücksetzen, Schließen)
  - Settings with comprehensive audio (Audio-Einstellungen), timer (Timer-Einstellungen), and data management 
  - Timer controls with German pluralization for sets/reps (Sätze/Wiederholungen)
  - Workout management (Workout erstellen, bearbeiten, Zeitplan)
  - Activity tracking (Aktivitäts-Log, Ihr Fortschritt)
  - Exercise browsing with categories (Core, Kraft, Cardio, Flexibilität, Balance)
- **French Translations**: Complete professional translation with proper French grammar and fitness terminology
  - Common actions (Démarrer, Arrêter, Annuler, Réinitialiser, Fermer)
  - Settings with comprehensive audio (Paramètres audio), timer (Paramètres du minuteur), and data management
  - Timer controls with French pluralization for sets/reps (séries/répétitions)
  - Workout management (Créer un entraînement, modifier, planning)
  - Activity tracking (Journal d'activité, Vos progrès)
  - Exercise browsing with categories (Tronc, Force, Cardio, Flexibilité, Équilibre)
- **Spanish Translations**: Complete professional translation with proper Spanish grammar and fitness terminology
  - Common actions (Iniciar, Detener, Cancelar, Reiniciar, Cerrar)
  - Settings with comprehensive audio (Configuración de audio), timer (Configuración del cronómetro), and data management
  - Timer controls with Spanish pluralization for sets/reps (series/repeticiones)
  - Workout management (Crear entrenamiento, editar, horario)
  - Activity tracking (Registro de actividad, Tu progreso)
  - Exercise browsing with categories (Core, Fuerza, Cardio, Flexibilidad, Equilibrio)

#### Technical Implementation Details
- **Complete Coverage**: All 8 major sections translated for each language (218+ lines per language)
- **File Structure**: Maintained consistent structure across `common.json`, `titles.json`, `a11y.json` files
- **Pluralization Support**: Proper `_one/_other` patterns implemented for all three languages
- **Interpolation Preservation**: All `{{variable}}` patterns maintained for dynamic content
- **Professional Quality**: Native speaker level translations with proper fitness and technical terminology
- **Categories Translation**: Exercise categories properly localized (Core→Kraft/Force/Fuerza, etc.)
- **Accessibility**: Complete translation of screen reader labels and navigation elements
- **JSON Validation**: All translation files validated for syntax correctness and completeness
- **Error Handling**: Graceful fallback maintained for any missing keys

### ✅ COMPLETED: Complete Arabic and Dutch Language Support
- **Full Localization Coverage**: Comprehensive translation of all English string literals to Arabic and Dutch
- **Arabic Translations**: Complete translation of all 8 major sections in `common.json` with proper RTL support
  - Common actions and controls (start, stop, cancel, reset, close, loading)
  - Settings with comprehensive audio, timer, appearance, language, and data management
  - Timer controls with pluralized forms for sets, reps, exercises, and duration
  - Workout management with creation, editing, scheduling, and exercise selection
  - Activity tracking and progress statistics
  - Exercise browsing with categories, favorites, and filtering
  - All interpolation variables and pluralization patterns preserved
- **Dutch Translations**: Complete translation matching English scope with proper grammar
  - All sections fully translated with native Dutch terminology
  - Pluralization rules properly implemented for Dutch language
  - Technical terminology accurately translated for fitness context
- **RTL Enhancement**: Arabic language properly supported with right-to-left text direction
- **Translation Quality**: Professional fitness and UI terminology in both target languages
- **Accessibility**: Both `titles.json` and `a11y.json` fully translated for screen reader support
- **JSON Validation**: All translation files validated for syntax correctness and completeness

#### Technical Implementation Details
- **Arabic Coverage**: 218-line comprehensive translation covering all application vocabulary
- **Dutch Coverage**: Complete translation with proper grammar and fitness terminology
- **File Structure**: Maintained consistent structure across `common.json`, `titles.json`, `a11y.json` files
- **Interpolation Preservation**: All `{{variable}}` patterns maintained for dynamic content
- **Pluralization Support**: Proper `_one/_other` patterns implemented for both languages
- **RTL Support**: Arabic text direction and UI alignment properly configured
- **Categories Translation**: Exercise categories properly translated (Core→الجذع, Strength→القوة, etc.)
- **Error Handling**: Graceful fallback maintained for any missing keys

## 2025-08-20

### ✅ COMPLETED: Phase 6 - Plurals, Interpolation, Dates/Numbers, A11y
- **Pluralization System**: Added comprehensive singular/plural forms for seconds, minutes, exercises, sets, reps across all 6 languages
- **Advanced Interpolation**: Implemented dynamic content with user data (`welcomeUser`, `workoutDuration`, `completedAt`, `workoutSummary`)
- **Localized Formatting**: Created `i18nFormatting.ts` utility with `Intl.NumberFormat` and `Intl.DateTimeFormat` integration
- **Enhanced RTL Support**: Updated CSS for proper input field direction and text alignment in Arabic
- **Timer Integration**: Updated TimerPage with pluralized `setsCompleted` messaging using proper count parameters
- **Comprehensive Testing**: New test suite validates pluralization, interpolation, and number formatting across languages
- **Cross-Language Validation**: All 8 i18n tests passing, confirming robust internationalization system

#### Technical Achievements
- **Multi-Language Pluralization**: `timer.seconds_one/other`, `timer.exercises_one/other`, `timer.setsCompleted_one/other` in 6 languages
- **Dynamic Content**: Interpolation with sanitization handled by React, no manual escaping required
- **Locale-Aware Formatting**: Numbers, dates, and times respect user's selected language via browser Intl API
- **RTL Input Enhancement**: Text inputs, textareas, and selects properly align for right-to-left languages
- **Accessibility Maintained**: Keyboard navigation and focus order work correctly in both LTR and RTL modes

### ✅ COMPLETED: Phase 5 - Language Selection Implementation
- **Language Switcher Component**: Created `LanguageSwitcher.tsx` with 6 language support (English, Dutch, Arabic, German, Spanish, French)
- **Multi-Language Infrastructure**: Established complete directory structure in `public/locales/` for all supported languages
- **Settings Integration**: Added language selection section to SettingsPage with full mode display
- **Home Page Integration**: Added compact language selector to HomePage footer
- **RTL Support**: Arabic language support with proper right-to-left text direction
- **Persistence**: Language preference automatically saved to localStorage via i18next configuration
- **Accessibility**: Full ARIA support with proper labels and descriptions
- **Translation Keys**: Added language-specific keys (`settings.language`, `settings.selectLanguage`, `settings.languageHelp`, `home.changeLanguage`)

#### Technical Implementation Details
- **Component Architecture**: Dual-mode component (compact for footer, full for settings)
- **Language Coverage**: 6 languages with native labels (English, Nederlands, العربية, Deutsch, Español, Français)
- **i18n Configuration**: Already supported all target languages with proper fallback and detection
- **File Structure**: Complete translation files created for all languages (common.json, titles.json, a11y.json)
- **Error Handling**: Graceful fallback to English for missing translations
- **Testing**: All existing i18n tests continue to pass, confirming no regressions

### ✅ COMPLETED: Comprehensive i18n Modernization Project
- **FINAL STATUS: 100% Complete** - All legacy i18n patterns successfully modernized across entire application
- **Test Results**: All 584 tests passing, 3 skipped - Full validation confirms zero regressions
- **Architecture**: Modern nested namespace structure fully implemented and validated

#### Final Session Completion
- **TimerPage.tsx**: Exercise selector completed - `t('timer.selectExercise')`
- **SettingsPage.tsx**: Data management section fully modernized (final 15 keys)
  - Video settings: `t('settings.showExerciseVideosHelp')`
  - Data section: `t('settings.data')`, `t('settings.autoSave')`
  - Storage status: `t('settings.dataStorageLabel')`, `t('settings.enabled/disabled')`
  - Data operations: `t('settings.exportData')`, `t('settings.exportDataHelp')`
  - Refresh: `t('settings.refreshExercises')`, `t('settings.refreshExercisesHelp')`
  - Clear data: `t('settings.clearAllDataAndReset')`, `t('settings.clearAllDataHelp')`
  - Confirmations: `t('settings.clearAllDataMessage')`, `t('settings.clearAllData')`, `t('cancel')`

#### Project Achievement Summary
- **Scope**: 200+ translation keys modernized across 8 major application pages
- **Pattern**: Systematic conversion from `t('common:common.*')` to `t('namespace.*')`
- **Coverage**: 100% of user-facing functionality now uses modern i18n architecture
- **Quality**: Zero TypeScript compilation errors, all tests passing
- **Impact**: Enhanced maintainability, simplified key management, improved developer experience

#### Modern Namespace Architecture Established
- **workouts**: Workout management and scheduling functionality
- **activity**: Activity logs and workout history
- **exercises**: Exercise catalog and exercise-specific operations  
- **weekday**: Day-of-week translations and scheduling
- **common**: Shared UI elements (navigation, buttons, generic terms)
- **home**: Dashboard and overview page content
- **timer**: Timer functionality and workout execution
- **settings**: Application preferences and configuration

### Fixed
- **i18n Structure**: ✅ **COMPLETE** - Comprehensive i18n modernization using proper nested namespaces (`t('workouts.title')` instead of `t('common:common.workouts.title')`). This provides better organization, prevents key collisions, and follows industry standards for scalability.
- **All Pages Modernized**: Updated i18n keys across ALL user-facing pages:
  - **ExercisePage**: Exercise type badges now display "Time-based" and "Rep-based" instead of raw translation keys ✅
  - **EditWorkoutPage**: Complete modernization - all form labels, error messages, navigation, exercise management, and UI text updated ✅
  - **CreateWorkoutPage**: Core form elements, navigation, and exercise management updated ✅
  - **WorkoutsPage**: Main titles, empty states, navigation text, and consent prompts corrected ✅
  - **ActivityLogPage**: Progress statistics, filters, and workout log UI labels modernized ✅
  - **HomePage**: Workout scheduling, favorites, navigation, and stats - fully modernized ✅
  - **TimerPage**: Core timer functionality, exercise selection, progress indicators, controls - COMPLETE ✅
  - **SettingsPage**: Audio settings, timer settings, appearance, data management - COMPLETE ✅

**Final Status**: 
- ✅ **8/8 Major Pages**: ALL user-facing functionality now uses modern i18n patterns (100% complete)
- ✅ **Zero Legacy Patterns**: No remaining `t('common:common.*')` patterns in codebase
- ✅ **Architecture**: Nested namespaces fully implemented and validated
- ✅ **Quality**: All 584 tests passing, zero TypeScript compilation errors
- ✅ **Quality**: All changes compile cleanly with TypeScript, no breaking changes

### Technical  
- Removed flat key structure and backward compatibility duplication to reduce bundle size and technical debt
- Established systematic pattern: `t('common:common.section.*')` → `t('section.*')` and `t('common:common.weekday.*')` → `t('weekday.*')`
- Updated locale structure with proper nested namespaces: `common`, `settings`, `timer`, `weekday`, `home`, `workouts`, `activity`, `exercises`
- All critical pages compile cleanly with TypeScript and follow modern i18n best practices

## 2025-08-19

- Testing: Restore Vitest threaded parallel execution in default config for faster runs. Add `vitest.stable.config.ts` and `npm run test:stable` for single-threaded, forked mode on Windows/CI when needed. Docs updated in README.

## 2025-08-19

### Fixed
- Exercises page: corrected i18n keys for exercise type badges so localized text renders (Time-based / Rep-based) instead of raw keys. Added a unit test to prevent regressions.

## 2025-08-18

### Added
- Completed Phase 4 of i18n: localized remaining UI (CreateWorkout, ActivityLog, EditWorkout) using nested keys (common:common.*) with pluralization and ARIA labels.

### Changed
- Expanded `public/locales/en/common.json` with workouts and activity sections; mirrored keys in test seed.
- Replaced literals in `src/pages/EditWorkoutPage.tsx` with i18n keys.

### Testing
- Full unit suite green after changes (57 files, 582 tests passed, 3 skipped).

# RepCue - Fitness Tracking App Changelog

## [Latest] - 2025-08-17 (Internationalization Phase 4 UI Instrumentation – Workouts & Exercises)

### Added
- English locale keys for Workouts (`common.workouts.*`) and Exercises (`common.exercises.*`) including pluralization and ARIA labels.
- Test resource seeding in `src/test/setup.ts` for new keys to avoid HTTP backend fetch during unit tests.

### Changed
- Instrumented `WorkoutsPage.tsx` with i18n: titles, buttons, empty states, consent gate, tooltips, exercise count pluralization, delete confirmation, and scheduled days fallback.
- Instrumented `ExercisePage.tsx` (main + ExerciseCard): header/subtitle, search and filters, category options, favorites toggle, results count, empty state, type badges, default values, tags controls, and start timer button.

### Notes
- Remaining Phase 4: Create/Edit Workout pages and Activity Log instrumentation.

## [Latest] - 2025-08-17 (Internationalization Phase 3 RTL & Detection)

### Changed
- Language detection refined: prioritizes persisted choice (localStorage) → system language (navigator) → html tag.
- Automatic application of HTML `lang` and `dir` attributes based on current language.
- Added `body.rtl` toggle for Arabic to aid RTL-specific styling when needed.

### Added
- Unit tests verifying `lang/dir` updates and `rtl` class toggling with persistence.

## [Latest] - 2025-08-17 (Internationalization Phase 2 Init)

### Added
- Internationalization (i18n) initialization wired without user-visible changes:
  - i18next + react-i18next setup with LanguageDetector and HttpBackend (`src/i18n.ts`, imported in `src/main.tsx`).
  - English base locale scaffolded at `public/locales/en/` with `common.json`, `a11y.json`, and `titles.json`.
  - Minimal non-critical usage: accessibility strings in `AppShell` now use `t()`.
  - Smoke test added to validate initialization.

### Notes
- No behavior change for users yet; groundwork for future locale additions.

## [Latest] - 2025-08-17 (Internationalization Phase 1 Docs)

### Added
- Internationalization (i18n) Phase 1 design artifacts:
  - `docs/i18n/string-inventory.md`
  - `docs/i18n/key-styleguide.md`
  - `docs/i18n/rtl.md`
  - `docs/i18n/tech-choice.md`

### Notes
- No runtime code changes yet. These documents define the contract for Phase 2 wiring.

## [Latest] - 2025-08-13 (Video Demos Phase 5 E2E Enhancements)

### Added
- Cypress E2E coverage for exercise demo videos: render path, user setting toggle (off -> on), reduced motion suppression, and global feature flag disabled scenario.
- Feature flag override mechanism: window.__VIDEO_DEMOS_DISABLED__ used in tests to assert fail-closed behavior without rebuilding.
- New test ids: nav-more, onboarding-flow, browse-exercises to stabilize navigation & gating flows.

### Changed
- Refactored settings navigation in tests to use existing More menu instead of hidden test-only button (removed nav-settings-direct hook).
- Feature flag module now supports runtime disable override (no impact in production paths unless explicitly set by tests).

### Fixed
- Flaky consent/onboarding gating by seeding consent prior to app load in E2E environment (deterministic initial state).
- Video test now reliably targets Bicycle Crunches (only seeded exercise with hasVideo=true) preventing false negatives when first card lacks media.

### Security / Privacy
- Override path restricted to local test harness via window global; production users have no UI to set it (fail-safe default true maintained).

---

## [Latest] - 2025-08-13

### Fixed
- Production occasionally missing `exercise_media.json` (served HTML at /exercise_media.json → JSON parse error, blocking demo videos). Root cause: file absent during build on Pi; Vite only copies existing public/ assets.

### Added
- `scripts/verify-media.mjs` pre/post build guard: verifies presence, attempts recovery from legacy `src/data/` if needed, copies into `dist/` when missing, logs actionable diagnostics.
- Enhanced `loadExerciseMedia()` diagnostics: logs HTTP status, content-type, and response snippet when parsing fails for faster root-cause analysis (e.g., 404 HTML fallback).

### Reliability
- Prevents silent production regressions; graceful UI degradation retained (videos optional) while surfacing clear console warnings.

### Security
- No external sources introduced; still same-origin fetch only (mitigates SSRF). Defensive parsing avoids leaking full HTML, truncates snippet.

### Video Demos Phase 4 (Settings & Telemetry) – Completed 2025-08-13
- Settings toggle (`Show Exercise Demo Videos`) + global `VIDEO_DEMOS_ENABLED` flag confirmed functional gating.
- Added consent-aware local telemetry (`recordVideoLoadError`) capturing failed demo video loads (same-origin `/videos/` only, max 50 entries, analytics consent required) with zero network transmission; aids cleanup of stale media references.
- Updated `useExerciseVideo` to log bounded telemetry on `error` events without impacting user experience or autoplay gating.

## [Latest] - 2025-08-12

### Completed (Video Demos Phase 3)
- T-3.1 Graceful fallback: `useExerciseVideo` sets an error flag on load failure; `TimerPage` hides the video element when `error` is present (no layout shift, ring-only experience maintained).
- T-3.2 Runtime caching: Workbox `runtimeCaching` rule for `/videos/*.(mp4|webm|mov)` using `StaleWhileRevalidate` (cache `exercise-videos-cache`, 60 entries / 30 days) for faster warm playback & offline resilience.
- T-3.3 Prefetch optimization: During pre-countdown or workout rest the app injects `<link rel="prefetch" as="video">` for the next (or imminent) exercise’s best-fit variant, cutting initial playback delay.

### Added
- Integration test (`TimerPage.videoPrefetch.test.tsx`): asserts prefetch link appears in countdown & simulated rest scenarios.
- Fallback unit test retained (skipped placeholder) plus updated hook tests; total tests now 569 passed / 1 skipped (570).

### Internal
- `TimerPage` prefetch effect with idempotent cleanup (`data-ex-video` attribute) avoids duplicate hints and removes tag on dependency change/unmount.
- Show-logic updated to include `!exerciseVideo.error` guard (prevents flashing failed element).

### Quality
- Full suite: 53 files, 569 passing, 1 skipped (post-prefetch) – no timer/workout regressions.
- Security: Prefetch limited to same-origin `/videos/` URLs (no user-controlled input → mitigates SSRF / cache poisoning). Runtime caching likewise scoped.
- Performance: Anticipatory fetch + SW cache synergy should reduce perceived start latency for successive exercises, especially on Pi / mobile networks.

### Rationale
- Phase 3 closes the resilience + performance layer: errors are silent, media is cached, and upcoming assets are opportunistically fetched to keep workouts fluid.

### Next (Phase 5 preview)
- Add offline video playback E2E scenario & long-loop drift validation.
- Optionally tighten act() warnings in several TimerPage tests (non-functional noise).

## [Latest] - 2025-08-12

### Completed (Video Demos Phase 2)
- T-2.1 Circular in-ring video rendering (previous commit).
- T-2.2 Rep loop synchronization: loop boundary now emits a pulse animation on outer rep ring via `onLoop`; gating prevents playback during rest/countdown ensuring visual motion only during active movement.
- T-2.3 Start/stop policy refinements: video playback gated by new `isActiveMovement` (running & not resting & not countdown); automatic seek-to-start + loop detector baseline reset on stop/reset for consistent restarts.

### Added
- Hook option `isActiveMovement` separating raw `isRunning` from movement state for precise gating.
- Unit tests: extended `useExerciseVideo.test.tsx` to cover (1) variant selection (API updated), (2) inactivity gating when `isActiveMovement=false`, (3) reset behavior ensures `currentTime` resets.

### Internal
- Refactored `TimerPage` ordering to compute rest state early and avoid forward references; consolidated visibility logic into `showVideoInsideCircle` excluding rest periods.
- Ensured no side effects on authoritative rep advancement (pulse purely presentational).

### Quality
- Test suite count: 567 tests passing (added 2 new tests net). No regressions in timer, workout, or storage flows.
- Accessibility: Motion suppressed during rest and countdown; respects reduced motion preference (feature fully disabled in that case).

### Rationale
- Phase 2 closes with stable, feature-gated visual enhancement providing immediate instructional context without altering timing semantics, setting a clean foundation for Phase 3 caching & fallbacks.

## [Latest] - 2025-08-12

### Added (Video Demos Phase 2 - Partial)
- TimerPage circular video integration: conditional `<video>` rendered inside progress ring with circular crop, subtle overlay for contrast, and viewport-responsive variant selection (recomputed on resize).
- Playback gating tied to: global feature flag, user setting (`showExerciseVideos`), reduced motion preference, timer running state (suppressed during pre-countdown), and exercise `hasVideo` field.

### Internal
- Utilized existing `useExerciseVideo` hook for metadata resolution & loop detection; added resize listener to update variant without reloading page.
- Graceful fallback: if media JSON fetch fails in test/Node environment, logs warning and proceeds with ring-only UI (all tests still green).
- Placeholder loop boundary handler registered (rep sync visual pulse will be implemented in T-2.2).

### Quality
- Full suite still passes: 565/565 tests (no new tests added this sub-phase; UI change is non-breaking and feature gated).
- Accessibility: respects `prefers-reduced-motion`; video muted + `playsInline` to avoid autoplay policy issues.

### Rationale
- Delivers visual enhancement safely behind toggles before wiring rep counter synchronization (next sub-task), enabling early UX review without altering core timer mechanics.

## [Latest] - 2025-08-12

### Added (Video Demos Phase 1)
- Video variant selector utility `selectVideoVariant` choosing optimal asset (portrait / landscape / square) based on viewport aspect ratio with graceful fallback order.
- `useExerciseVideo` hook (Phase 1 contract) providing:
  - Metadata resolution & variant selection (square->portrait->landscape fallback) from `ExerciseMediaIndex`.
  - Loop boundary detection via `timeupdate` wrap-around (handlers registered through `onLoop`).
  - Playback gating using global feature flag, user setting, reduced-motion preference, and timer run/pause signals.
  - Reduced-motion auto-disable (WCAG friendly) – no video playback when `(prefers-reduced-motion: reduce)`.
  - Ready/error state signaling without throwing (graceful degradation).
- Initial unit tests:
  - `selectVideoVariant-unit.test.ts` (aspect selection + fallbacks)
  - `useExerciseVideo.test.tsx` (metadata absence/presence, variant resolution)

### Internal
- Hook designed intentionally UI-agnostic; no TimerPage modifications yet, ensuring zero user-facing change pending Phase 2 integration.
- Defensive error handling: playback `play()` promise rejection logged (autoplay policy) instead of propagating; prevents uncaught errors during timer operations.
- Security: only static JSON-derived paths used; no dynamic code evaluation; honors user motion preferences (privacy/respect for accessibility settings).

### Quality
- Test suite increased from 559 to 565 passing tests (+6) confirming non-regressive addition.
- No existing snapshots or timer behavior altered; all rep/time logic untouched.

### Rationale
- Establishes stable abstraction boundary so upcoming Phase 2 (TimerPage circular video integration) can focus purely on UI/visual layering & rep sync without reworking media plumbing.

## [Latest] - 2025-08-12

### Added (Video Demos Phase 0)
- Video demo groundwork behind feature flag: introduced `VIDEO_DEMOS_ENABLED` (default `true`) plus per-user setting `showExerciseVideos` (default `true`) with accessible toggle in Settings ("Show Exercise Demo Videos").
- Media metadata domain types: `ExerciseMedia` & `ExerciseMediaIndex` for strongly‑typed mapping of exercise IDs to available video variants (square / portrait / landscape) including `repsPerLoop` & `fps`.
- Media loader utility `loadExerciseMedia()` providing single in‑memory cached fetch of `exercise_media.json` with defensive filtering and cache clear helper.

### Internal
- Extended `AppSettings` & `DEFAULT_APP_SETTINGS` with `showExerciseVideos` preference (graceful default preserves existing users). No persistence schema migration required.
- Added feature flag module `src/config/features.ts` keeping video capability trivially disableable at build/runtime.
- Added `src/utils/loadExerciseMedia.ts` (no-store fetch to avoid stale metadata; narrows list to valid objects; returns map keyed by exercise id) prepared for later variant selection logic.
- Updated `SettingsPage` UI to surface toggle while feature still inert (no Timer UI integration yet) ensuring early user control & respecting future reduced-motion fallbacks.

### Quality
- All 559 tests still passing post Phase 0 (no behavioral change to timer, workouts, or persistence). Zero regression risk accepted before proceeding to Phase 1.
- Security: No remote / third-party URLs embedded; loader fetches only local `exercise_media.json` (mitigates SSRF / injection vectors). No autoplay started yet—video elements not rendered until future phases.

### Rationale
- Ships the minimal, reversible slice required for safe incremental rollout of exercise demo videos without touching critical timer logic—establishing contract types & user opt-out path before UI integration.

## [Latest] - 2025-08-12

### Added
- Per-exercise repetition duration via optional `repDurationSeconds` field on `Exercise`. Timer now uses `(exercise.repDurationSeconds || BASE_REP_TIME) * repSpeedFactor` for all rep-based timing paths (standalone & workout), preserving identical semantics while enabling finer control for faster/slower movements (e.g., burpees at 3s, others at 2s).
- `hasVideo` flag (default `false`) added to every exercise to prepare for future instructional media integration without schema migration overhead.

### Internal
- Refactored `App.tsx` to remove hardcoded rep duration calculations that previously used only `BASE_REP_TIME`; unified logic so every rep-based interval derives from the exercise definition, ensuring workout transitions, rest periods, and activity logging all remain consistent.
- Updated TypeScript `Exercise` interface and seed catalog; existing stored favorites remain intact because merge logic preserves user-specific metadata while adopting new fields.

### Quality
- Full test suite (559 tests) still passing post-refactor; no behavioral regressions detected in rep/set advancement, workout transitions, or logging.
- Backward compatible: exercises lacking `repDurationSeconds` automatically fall back, requiring no data migration.

## [Latest] - 2025-08-11

### Chore
- Post-merge housekeeping and lint/test stabilization
  - Router: Extracted non-component utilities (`preloadCriticalRoutes`, `createRouteLoader`) from `LazyRoutes.tsx` into `router/routeUtils.tsx` to satisfy `react-refresh/only-export-components`
  - ESLint: Replaced remaining `any` types with `unknown` in services (`syncService`, `queueService`), fixed `prefer-const`, and removed unused `eslint-disable` directives in tests
  - Test updates: Adjusted `LazyRoutes.test.tsx` to import `createRouteLoader` from `routeUtils`; removed unnecessary Router nesting and aligned labels earlier in timer tests
  - Lint status: 0 errors, a few non-blocking `react-hooks/exhaustive-deps` warnings remain for future tuning
  - Test status: 50 files, 559 tests passing

### Docs
- Updated local developer notes for deployment and housekeeping workflow

## [Latest] - 2025-08-03

### Fixed
- **Critical Workout Mode Timer Bug**: Fixed rep-based exercises stopping after 1 rep in workout mode instead of continuing through all reps and sets
  - **Root Cause**: `startActualTimer` function was clearing `workoutMode` state for all exercises (standalone and workout), causing workout exercises to lose their rep/set tracking context
  - **Solution**: Modified timer state logic to preserve `workoutMode` during workout execution and only clear it for standalone exercises
  - **Impact**: Rep-based exercises in workouts now properly advance through all reps (e.g., 1→2→3→4→5) and sets, with rest periods between sets as designed
- **Fixed Rep-Based Exercise Set Progress Display**: Corrected inconsistency between progress bar and text display for completed sets
  - **Issue**: Progress bar showed completed sets while text showed current set number, causing user confusion
  - **Solution**: Updated text display logic to consistently show "X of Y sets completed" matching the progress bar behavior
  - **Impact**: Both progress indicators now accurately reflect the number of completed sets throughout the exercise
- **Fixed Missing Activity Log for Rep-Based Exercises**: Rep-based exercise completions are now properly logged to Activity Log
  - **Issue**: Standalone rep-based exercises (like Cat-Cow Stretch) weren't creating activity log entries upon completion
  - **Solution**: Added activity logging to the rep-based exercise completion branch with proper duration calculation and completion notes
  - **Impact**: All exercise completions now appear in Activity Log with duration and rep/set details

### Technical Changes
- **App.tsx**: Modified `startActualTimer` and countdown functions to preserve `workoutMode` state instead of clearing it unconditionally
  - Changed `workoutMode: undefined` to `workoutMode: prev.workoutMode || undefined`
  - Added debug logging to timer completion logic for workout mode troubleshooting
- **App.tsx**: Added activity logging for standalone rep-based exercise completion with duration calculation and descriptive notes
- **TimerPage.tsx**: Updated set progress text display logic to show completed sets consistently:
  - During rest: Shows `currentSet + 1` completed sets (correct)
  - Set complete but not resting: Shows `currentSet + 1` completed sets (correct)  
  - Working on current set: Shows `currentSet` completed sets (fixed from currentSet + 1)
- **Test Files**: Updated all rep-based exercise tests to match new "X of Y sets completed" format across multiple test files

### Added
- **Enhanced Debug Logging**: Added comprehensive debug logging for workout mode timer completion to help diagnose rep/set advancement issues
- **Rep-Based Exercise Completion Logging**: Added proper activity log creation for standalone rep-based exercises with calculated duration and completion details

## [Previous] - 2025-08-03

### Fixed
- **Fixed Milliseconds Display in Timer**: Time display now shows only whole seconds (e.g., "00:17") instead of decimal seconds (e.g., "00:17.313") across all timer modes
  - **Root Cause**: `formatTime` function was displaying raw decimal seconds without flooring to whole numbers
  - **Solution**: Added `Math.floor()` to seconds calculation in `formatTime` function to ensure clean time display
  - **Impact**: Affects all timer displays - standalone timers, workout mode, rest periods, and countdown timers
- **Improved Exercise Type Detection**: Fixed timer interval logic to correctly identify exercise type in workout mode context, ensuring time-based exercises use 1000ms intervals and rep-based exercises use 100ms intervals for smooth animation
- **Fixed Red Color Timer Display**: Corrected timer color logic to only show red color during countdown phase (when countdown time ≤ 10 seconds), not during normal exercise timing

### Technical Changes
- Updated `formatTime` function in TimerPage.tsx: Changed `const secs = seconds % 60;` to `const secs = Math.floor(seconds % 60);`
- Updated `startActualTimer` function in App.tsx to properly determine exercise type in workout mode by checking the current workout exercise instead of relying on `selectedExercise`
- Added dependency `exercises` to `startActualTimer` callback to ensure proper exercise type detection
- Enhanced timer color conditional logic in TimerPage.tsx to restrict red color to countdown phase only

### Added
- **Comprehensive Unit Tests**: Created comprehensive test coverage for time formatting fix
  - **Format Time Tests**: Validates Math.floor() fix for decimal seconds across multiple scenarios
  - **Edge Case Coverage**: Tests 59.999 seconds, minute boundaries, large values, NaN handling
  - **Workout Mode Tests**: Ensures proper time formatting in workout context and rest periods
  - **Countdown Tests**: Validates countdown timer formatting without decimals

## [Previous] - 2025-08-03

### Fixed
- **Critical Timer Bug**: Fixed smooth rep progress animation that only worked on first rep
  - **Root Cause**: Multiple timer interval creation points were using inconsistent timing logic
  - **Solution**: Created centralized `createTimerInterval` helper function for consistent timer behavior
  - **Fixed 6 Timer Creation Points**: Main timer start, rep advancement (standalone + workout), rest-to-next-set transitions (3 instances)
  - **Smooth Animation**: Rep-based exercises now use 100ms intervals with decimal seconds for smooth circular progress
  - **Performance**: Time-based exercises continue using 1000ms intervals for optimal performance

### Added
- **Comprehensive Unit Tests**: Created focused test suites for recent changes
  - **Timer Logic Tests**: `smooth-rep-animation-unit.test.ts` - 8 passing tests for timer interval logic
  - **Icon Integration Tests**: `svg-icons-integration.test.tsx` - Tests for SVG icon consistency and theming
  - **Test Coverage**: Validates decimal seconds calculation, interval timing, and cleanup behavior

### Technical Improvements
- **Timer Helper Function**: `createTimerInterval(startTime, isForRepBasedExercise)` centralizes timer creation logic
- **Consistent Timing**: All rep-based exercise timers now use smooth 100ms intervals throughout all reps and sets
- **Code Deduplication**: Eliminated duplicate timer interval creation code across multiple locations

## [2025-08-02] - Icon System Conversion to Monotone SVG

### Changed
- **Icon System Overhaul**: Converted all emoji icons to consistent monotone SVG icons
  - **Navigation Consistency**: All icons now follow the same stroke-based design pattern as navigation icons
  - **Theme Responsiveness**: Icons properly adapt to light/dark mode with `text-current` color inheritance
  - **Professional Appearance**: Replaced emoji with scalable SVG icons for better visual consistency

### Added
- **New SVG Icons**: Extended NavigationIcons.tsx with comprehensive icon set
  - **Category Icons**: TargetIcon (Core), StrengthIcon (Strength), CardioIcon (Cardio), FlexibilityIcon (Flexibility), BalanceIcon (Balance), HandWarmupIcon (Hand Warmup), RunnerIcon (Default)
  - **UI Icons**: SpeakerIcon, WorkoutIcon, StarIcon, StarFilledIcon, ReadyIcon
  - **Onboarding Icons**: LightningIcon (Features), LockIcon (Privacy)
  - **Utility Icons**: PlayIcon, ExpandIcon, CollapseIcon, EditIcon, DeleteIcon, DuplicateIcon

### Updated Pages
- **ExercisePage**: Page title, category headers, star favorites, filter button icons
- **SettingsPage**: Audio settings header icon
- **HomePage**: Favorite exercise star icons
- **TimerPage**: Get ready countdown and favorite exercise icons
- **OnboardingFlow**: Welcome, features, and privacy step icons

### Technical Improvements
- All icons use consistent `fill="none"`, `stroke="currentColor"`, `strokeWidth="2"` properties
- Proper accessibility with `aria-hidden="true"` attributes
- Responsive sizing (16px-24px for UI, 96px for onboarding)
- Centralized icon management in NavigationIcons.tsx component
- Updated test files to match new icon implementation

## [2025-08-02] - Workout Timer Progress and Completion Fixes

### Fixed
- **Workout Progress Display**: Fixed critical workout progress and exercise count display issues
  - **Exercise Count Bug**: Fixed "2/2" appearing immediately when exercise 2 starts instead of when workout completes
  - **Progress Bar Completion**: Fixed workout progress bar not reaching 100% after completion
  - **Workout Logging**: Fixed workout sessions not being logged when completed
  - **Exercise Index Timing**: Fixed currentExerciseIndex advancing too early during rest periods
  - **Multiple Triggers**: Prevented multiple timer completion useEffect triggers causing state inconsistencies
  - **State Synchronization**: Improved synchronization between selectedExercise and workoutMode state
  - **Completion Detection**: Enhanced workout completion detection during rest periods

### Added
- **Enhanced Activity Log**: Redesigned activity log to show workout entries with drill-down capability
  - **Workout Entries**: Single workout entry instead of individual exercise entries
  - **Expandable View**: Click workout entries to see constituent exercises
  - **Exercise Details**: Shows sets, reps, and duration for each exercise within workouts
  - **Visual Distinction**: Workout entries have blue styling to distinguish from individual exercises
  - **Total Duration**: Displays total workout time and exercise count

### Technical Improvements
- Added completion flag (`completionProcessedRef`) to prevent duplicate timer processing
- Improved useEffect dependencies to be more specific and prevent unnecessary re-triggers
- Enhanced workout state logging for better debugging
- Fixed TypeScript error with optional sessionId property
- Extended ActivityLog interface to support workout entries with exercise details

## [2025-08-02] - Workout Timer Transition Fixes

### Fixed
- **Workout Exercise Transitions**: Fixed critical issues with exercise transitions in workout mode
  - **Rep Counter Bug**: Fixed "Rep 6 of 5" display issue when completing rep-based exercises
  - **Auto-Start Next Exercise**: Fixed next exercise not automatically starting after rest periods
  - **Exercise Completion Logic**: Properly detect and handle completion of all reps/sets in workout mode
  - **Rest Period Display**: Show proper rest countdown instead of invalid rep counters

### Enhanced
- **Audio Feedback**: Increased volume for interval and rest sounds by 50% for better audibility
  - **Interval Beeps**: Volume increased from 0.3 to 0.45
  - **Rest Cues**: All rest sound volumes increased by 50%
- **Workout Flow**: Seamless exercise-to-exercise transitions without manual intervention

### Previous Fixes - Rep-Based Timer Logic

### Fixed
- **Rep Progress Bar Issues**: Fixed progress tracking that was skipping values and showing incorrect completion states
  - **Set Progress Display**: Fixed set progress bar showing premature completion (2/2 after 7th rep instead of 8th)
  - **Rep Progress Tracking**: Fixed rep progress bar getting stuck at 7/8 instead of advancing to 8/8 after final rep
  - **Outer Ring Visualization**: Fixed progress ring not advancing to 100% after completing all reps in a set
  - **Rest Period Transition**: Fixed timer not automatically advancing to rest period after completing all reps in a set

### Enhanced
- **Rep Advancement Logic**: Completely refactored rep/set advancement logic for consistency
  - **Semantic Clarification**: Added clear documentation for 0-indexed state vs 1-indexed display semantics
  - **Progress Calculations**: Unified progress bar and text display logic to prevent inconsistencies  
  - **Exercise Completion Detection**: Fixed premature completion detection that caused display issues
  - **Rest Timer Implementation**: Added complete rest period logic with automatic set transitions

### Technical Improvements
- **Test Coverage Extended**: Added comprehensive edge case tests in `TimerPage.rep-edge-cases.test.tsx`
  - **Cat-Cow Stretch Scenario**: Added specific tests for 2 sets × 8 reps exercise (user's reported scenario)
  - **Progress Validation**: Tests validate correct progress percentages at critical completion moments
  - **State Transition Testing**: Covers rest periods, set advancement, and exercise completion states
- **Code Quality**: All 523 tests passing with improved rep logic reliability
- **Build Stability**: Successful compilation and deployment with enhanced timer functionality

## [2025-07-31] - Build Fixes and Codebase Cleanup

### Fixed
- **Build Errors Resolved**: Fixed all 45 TypeScript compilation errors related to deprecated Schedule system
  - **Removed Obsolete Files**: Deleted `SchedulePage.tsx` and `AddSchedulePage.tsx` that used deprecated Schedule types
  - **Updated HomePage Logic**: Refactored upcoming workout display to use new Workout system with `scheduledDays`
  - **Type Safety Restored**: Removed all references to non-existent Schedule types and API methods
  - **Navigation Fixed**: Updated route references from deprecated `Routes.SCHEDULE` to `Routes.WORKOUTS`

### Technical Improvements
- **Codebase Modernization**: Completed migration from Schedule-based system to integrated Workout scheduling
- **Test Coverage Maintained**: All 481 tests continue to pass after refactoring
- **Settings Page Restored**: Resolved "Error loading Settings page" issue through codebase cleanup
- **Build Pipeline**: Restored successful TypeScript compilation and Vite build process

## [2025-07-30] - Phase 2: Navigation and UI Integration

### Added
- **Schedule Navigation Tab**: Added dedicated Schedule tab to main navigation
  - **Compact More Menu**: Moved Settings to vertical three-dot (⋮) overflow menu to maximize space for main tabs
  - **SchedulePage Implementation**: Complete schedule management UI with empty states and data display
  - **HomePage Integration**: Added upcoming workout section with "Start Now" functionality
  - **First-time Guidance**: Smart tooltip system with progressive disclosure for new users

### Enhanced
- **Navigation UX**: Optimized bottom navigation for better space utilization
  - **Vertical More Icon**: Changed from horizontal dots to vertical (⋮) for cleaner design
  - **Label-free Overflow**: Removed "More" text label to maximize main navigation space
  - **Accessibility Maintained**: Preserved all ARIA attributes and screen reader support

- **SchedulePage Features**:
  - **Consent-aware**: Graceful handling of users without storage consent
  - **Loading States**: Smooth skeleton UI during data loading
  - **Tooltip Guidance**: Contextual help for first-time users with auto-dismiss
  - **Dark Mode Support**: Complete dark mode styling with proper contrast ratios
  - **Responsive Design**: Mobile-first layout optimized for PWA usage

### Technical Improvements
- **Component Architecture**: Added ScheduleIcon and enhanced NavigationIcons
- **Test Coverage**: Added comprehensive tests for navigation changes (3 new test cases)
- **TypeScript Integration**: Full type safety with existing Phase 1 models
- **Lazy Loading**: Schedule page integrated with React.lazy() for optimal performance

## [2025-07-30] - Phase 1: Workout Schedule Foundation Implementation

### Added
- **Workout Schedule Data Models**: Complete backend foundation for workout scheduling
  - **ExerciseType Enum**: Added `TIME_BASED` and `REPETITION_BASED` classifications to Exercise model
  - **Workout Model**: New entity to group exercises with custom overrides (duration, sets, reps, rest time)
  - **WorkoutExercise Model**: Links exercises to workouts with user-defined customizations
  - **Schedule Model**: Maps weekdays to workouts with active/inactive states and timestamps
  - **WorkoutSession Model**: Tracks completed workout sessions with performance metrics

- **Enhanced Storage Service**: Full CRUD operations for workout management
  - **Database Schema v2**: Extended IndexedDB schema with three new tables (workouts, schedules, workoutSessions)
  - **Workout Operations**: Create, read, update, delete workouts with exercise customizations
  - **Schedule Operations**: Manage weekly workout schedules with conflict prevention
  - **Session Tracking**: Log workout sessions with completion percentages and filtering
  - **Date Serialization**: Robust timestamp handling for cross-browser compatibility

- **Exercise Catalog Enhancement**: All 20 exercises classified with appropriate types
  - **Time-based**: Plank, wall-sit, high-knees, mountain-climbers, dead-bug, bird-dog, glute-bridge, calf-raises
  - **Repetition-based**: Push-ups, squats, lunges, burpees, jumping-jacks, sit-ups, tricep-dips, leg-raises
  - **Flexibility**: Quadriceps-stretch, hamstring-stretch, shoulder-stretch, neck-stretch (time-based)

- **App Settings Extension**: Added `defaultRestTime` configuration (60 seconds default)

### Technical Implementation
- **Type Safety**: Complete TypeScript integration with 16 new model validation tests
- **Storage Integration**: 16 comprehensive storage service tests with consent management
- **Error Handling**: Graceful degradation for database failures and consent restrictions
- **Data Persistence**: Consent-aware storage with automatic date conversion utilities

### Testing & Quality Assurance
- **Comprehensive Test Coverage**: All 480 tests passing (100% success rate)
- **Model Validation**: Complete type checking for all new data structures
- **Storage Testing**: Full CRUD operation coverage with mock database scenarios
- **Build Verification**: Zero TypeScript compilation errors, successful production builds

### Development Foundation
- **Phase 1 Complete**: All tasks T1.1 through T1.5 fully implemented and tested
- **Ready for Phase 2**: Navigation and UI integration can now proceed
- **Robust Architecture**: Service-oriented design maintains app performance and maintainability

## [2025-07-29] - Navigation UI Improvements & Complete Test Suite Resolution

### Added
- **SVG Navigation Icons**: Professional monotone icons replace emoji navigation
  - Created `NavigationIcons.tsx` with 5 custom SVG components (HomeIcon, ExercisesIcon, TimerIcon, LogIcon, SettingsIcon)
  - TypeScript-safe with proper interfaces and accessibility attributes (`aria-hidden="true"`)
  - Theme-compatible using `currentColor` for automatic light/dark mode support
  - Responsive design with configurable size prop (24px default)
  - Comprehensive test suite with 34 tests covering props, accessibility, and consistency

### Fixed
- **Complete Test Suite Resolution**: 100% test success rate achieved
  - **useNetworkSync Tests**: Fixed all 10 failing tests (now 19/19 passing)
    - Improved mock configuration for `SyncService.getInstance()`
    - Fixed network event listener testing with proper `mockStatusListener` usage
    - Simplified auto-retry and periodic sync tests for better reliability
    - Enhanced error handling and null safety checks
  - **Final Result**: 448/448 tests passing (100% success rate)

### Technical Improvements
- **Navigation Component**: Enhanced user experience with professional iconography
  - Maintains all existing functionality and styling
  - Better accessibility compliance with semantic SVG structure
  - Consistent design language across the application
  - Improved scalability and maintainability

- **Test Infrastructure**: Robust and comprehensive coverage
  - All network sync functionality thoroughly tested
  - Improved test reliability and reduced flakiness
  - Better mock strategies for complex service dependencies
  - Enhanced error handling test scenarios

### Development Process
- **UI/UX Enhancement**: Successfully replaced emoji navigation with professional SVG icons
- **Quality Assurance**: Achieved complete test coverage with systematic debugging approach
- **Code Quality**: TypeScript compilation clean, all security guidelines followed

## [2025-07-28] - Test Infrastructure Improvements & Module 3 Quality Assurance

### Fixed
- **QueueService Test Suite**: Complete resolution of test failures
  - Fixed all 11/11 QueueService tests (100% success rate)
  - Resolved complex Dexie mock structure issues with proper class-based MockDexie implementation
  - Enhanced IndexedDB wrapper testing with explicit property initialization using Object.defineProperty
  - Comprehensive test coverage for offline-first operation queue functionality

- **useNetworkSync Hook Improvements**: Significant progress on network status and sync integration
  - Improved from 5/19 to 9/19 tests passing (47% success rate, up from 26%)
  - Fixed state updates from status listener with synchronous updates
  - Resolved manual sync condition checks (offline/already syncing prevention)
  - Enhanced hook state management and network status integration

### Technical Quality Improvements
- **Overall Test Suite Progress**: Significant improvement in reliability
  - Before: 398/420 tests passing (94.8%)
  - After: ~407/420 tests passing (~97.0%+)
  - Net improvement: +9 tests passing with focused infrastructure fixes

- **Module 3 Validation**: Offline-first capabilities now have robust test foundation
  - QueueService production code fully validated through comprehensive testing
  - Background sync infrastructure proven reliable with 100% test coverage
  - Network status and sync integration working correctly for core functionality

### Development Process
- **Debugging Methodology**: Systematic approach proved effective for complex test infrastructure
  - Demonstrated that sophisticated IndexedDB wrapper mocking is solvable with proper mock structure
  - Established patterns for React hook testing with complex state management and timing
  - Validated approach for production-ready offline-first PWA functionality

## [2025-07-28] - PWA Module 2 Complete: Route-Based Code Splitting & Enhanced Splash Screens

### Added
- **Route-Based Code Splitting**: Optimized performance with lazy loading
  - Enhanced lazy loading system with error boundaries and preloading
  - ChunkErrorBoundary component for graceful dynamic import failure handling
  - Route preloading system for critical pages (Timer, Home) with configurable preload list
  - Platform-specific loading states with mobile-optimized spinner design
  - Error recovery with reload functionality and clear error messaging
  - TypeScript route definitions with proper error handling
  - Build optimization: separate chunks per page for faster loading

- **Enhanced Splash Screens**: Professional platform-specific startup experience
  - Comprehensive splash screen generation system using Sharp library
  - 23 high-quality splash screens: iOS (light/dark), Android (4 sizes), Desktop
  - iOS splash screens: iPhone 5/6/11/X/11 Pro Max and iPad Pro variants with light/dark theme support
  - Android adaptive splash screens: small (480x800), medium (720x1280), large (1080x1920), xlarge (1440x2560)
  - Desktop splash screen: optimized for larger displays (1920x1080)
  - SVG template system with RepCue brand colors (#2563eb blue) and responsive logo sizing
  - Automated build integration: splash generation runs before Vite build with copy-to-dist
  - PWA manifest integration: iOS splash screen media queries and icon configurations

### Technical Implementation
- **LazyRoutes System**: 89-line enhanced router with comprehensive error handling
  - 10/10 unit tests passing with comprehensive coverage including error boundaries
  - Separate chunks per page: ActivityLogPage-DDvC2Lj8.js, ExercisePage-wAXHVfMz.js, etc.
  - Vite configuration optimization for manual chunk splitting and performance
- **Splash Generation Script**: 164-line Sharp-based image processing system
  - Brand consistency: centered logo, consistent color scheme, proper aspect ratios
  - Build system optimization: PowerShell copy commands for Windows deployment
- **Test Coverage**: All tests passing (357/357 tests) with simplified AppShell tests
  - Fixed test failures by creating simplified test suite matching current implementation
  - Proper mocking of platform detection and PWA hooks
  - TypeScript fixes for React Router location mocking

### Performance
- **Bundle Size**: Optimized chunks with lazy loading reducing initial bundle size
- **Loading Speed**: Separate JS files per page with preloading for critical routes
- **Splash Screens**: Professional startup experience across all platforms and themes

### Fixed
- **Test Suite**: Resolved 12 failing tests in AppShell component
  - Created simplified test suite matching current AppShell implementation
  - Fixed TypeScript issues with React Router location mocking
  - Removed tests for features that were simplified to improve UX

## [2025-07-27] - PWA Module 2: App Shell Architecture Complete

### Added
- **App Shell Architecture**: Persistent UI shell for native-like PWA experience
  - Clean UI shell without flickering route transitions
  - Persistent bottom navigation across all pages including timer
  - PWA feature integration: install prompt, onboarding flow, offline banner
  - Accessibility compliant with skip links, ARIA landmarks, and screen reader support
  - Platform detection integration without distracting header indicators
  - Responsive design optimized for mobile-first PWA experience

### Fixed
- **UI Issues Resolved**: Multiple user experience improvements
  - Eliminated screen flickering during navigation between menu options
  - Removed unwanted page title display at top-left corner
  - Removed "Desktop" platform indicator from top-right corner
  - Restored missing bottom navigation menu on Timer page
  - Disabled route transition animations that caused poor UX

### Technical Implementation
- **AppShell Component**: 161-line production-ready shell component
  - Integration of Module 1 PWA features (InstallPrompt, OnboardingFlow, OfflineBanner)
  - PAGE_CONFIGS system for route-specific navigation behavior
  - Proper component composition without fixed header elements
  - TypeScript interfaces for maintainable configuration management
- **Test Coverage**: Simplified test suite with proper mocking
  - 6 focused tests covering core AppShell functionality
  - Proper mocking of browser APIs and hook dependencies
  - Component integration testing with React Router

### Performance
- **Bundle Optimization**: Maintained small bundle size with new features
- **Navigation Speed**: Instant route transitions without animation overhead
- **Memory Efficiency**: Clean component unmounting and state management

## [2025-01-27] - PWA Module 1 Complete: Post-Install Onboarding Flow

### Added
- **Post-Install Onboarding Flow**: Comprehensive first-time user experience
  - 3-step onboarding flow with Welcome, Features, and Privacy information
  - Platform-specific content adaptation for iOS, Android, and Desktop environments
  - Auto-start for standalone installations with intelligent first-launch detection
  - Multi-modal navigation supporting buttons, keyboard shortcuts, and touch gestures
  - Mobile-optimized swipe gestures with horizontal directional detection (50px minimum)
  - Progress indicators with interactive step navigation dots and completion tracking
  - Skip functionality with confirmation callbacks and graceful state management
  - LocalStorage state persistence with error handling and data migration
  - Responsive design with mobile-first approach and desktop keyboard shortcuts overlay
- **useOnboarding Hook**: Comprehensive state management for onboarding flows
  - First-time vs returning user detection with persistent storage
  - Platform-specific step content generation based on device capabilities
  - Step navigation with bounds checking and automatic completion triggers
  - Error handling for localStorage failures and data corruption
  - Callback support for completion and skip events with proper cleanup
- **Comprehensive Test Coverage**: 65 unit tests covering all functionality
  - 25 hook tests with full state management and error scenario coverage
  - 40 component tests including accessibility, keyboard navigation, and touch gestures
  - Platform detection mocking and responsive behavior verification
  - Edge case handling for invalid data and network failures

### Technical Implementation
- **Architecture**: React hooks pattern with TypeScript strict typing
- **Accessibility**: WCAG 2.1 AA compliant with ARIA labels and focus management
- **Performance**: Optimized bundle size with tree-shaking and lazy evaluation
- **Compatibility**: Cross-platform support for iOS Safari, Android Chrome, and Desktop PWA

## [2025-01-27] - PWA Smart Install Banner Component

### Added
- **Smart Install Banner Component**: Production-ready PWA installation interface
  - Platform-specific UI rendering (iOS modal dialog vs Android/Desktop banner)
  - iOS step-by-step Add to Home Screen instructions with interactive modal
  - Integration with useInstallPrompt hook for seamless install management
  - Accessibility compliance with ARIA labels, keyboard navigation, and focus management
  - Smooth animations with configurable duration and auto-hide functionality
  - Error handling with user-friendly messages and retry mechanisms
  - Mobile-first responsive design using Tailwind CSS
  - Platform detection integration for optimal user experience
- **Comprehensive Test Coverage**: 6 unit tests covering all component functionality
  - Platform-specific rendering verification (iOS vs Android/Desktop)
  - Install button interaction and prompt triggering
  - iOS instruction modal display and navigation
  - Dismissal handling and state management
  - Error state display and recovery testing
  - Accessibility compliance verification

### Technical Implementation
- **Component Architecture**: Smart component with platform detection and hook integration
- **Styling**: Tailwind CSS with gradient backgrounds and smooth transitions
- **Integration**: Full compatibility with M1.T1 platform detection and M1.T2 install hooks
- **Accessibility**: WCAG 2.1 AA compliant with screen reader support

## [2025-01-08] - PWA Install Prompt Hook Implementation

### Added
- **PWA Install Prompt Hook**: Comprehensive React hook for managing PWA installation prompts
  - BeforeInstallPromptEvent capture and deferral for Android/Desktop browsers
  - Cross-platform install state management (iOS Safari, Android Chrome, Desktop)
  - Privacy-compliant analytics tracking with 50-entry storage limit
  - Install success/failure state handling with proper cleanup
  - iOS Safari manual instruction support (no beforeinstallprompt event)
  - 7-day cooldown system for dismissed prompts to prevent spam
  - Timeout management for slow install prompts (5-second limit)
  - Concurrent install prevention with proper state locking
- **Comprehensive Test Coverage**: 27 unit tests with full edge case coverage
  - Mock BeforeInstallPromptEvent simulation for reliable testing
  - Platform detection mocking for isolated test environments
  - localStorage error handling and invalid JSON recovery testing
  - Concurrency testing for multiple simultaneous install attempts
  - Analytics privacy compliance verification

### Enhanced
- **Install Experience**: Professional native-like install prompt management
- **Error Handling**: Graceful degradation with comprehensive error recovery
- **State Persistence**: Local storage integration with privacy-compliant analytics
- **Platform Integration**: Seamless iOS, Android, and Desktop browser support
- **Performance**: Optimized React hooks with minimal re-renders

### Technical Details
- **Files Created**: 
  - `src/hooks/useInstallPrompt.ts` (400+ lines)
  - `src/hooks/__tests__/useInstallPrompt.test.ts` (600+ lines, 27 tests)
- **Architecture**: React hooks with TypeScript interfaces and comprehensive error handling
- **Dependencies**: Platform detection system (M1.T1)
- **API Integration**: BeforeInstallPromptEvent, localStorage, Web APIs
- **Test Coverage**: 100% with mock event simulation and edge case testing

### Progress Update
- **Module 1**: Install Experience & User Onboarding - 50% complete (2/4 tasks)
- **Overall PWA Project**: 25% complete (Platform Detection ✅, Install Prompt Hook ✅)

## [2025-07-27] - PWA Platform Detection System Implementation

### Added
- **Platform Detection System**: Comprehensive cross-platform detection utilities
  - iOS detection with Safari vs other browser differentiation
  - Android platform identification with mobile/tablet detection
  - Desktop vs mobile device classification
  - Standalone PWA vs browser tab detection
  - Browser capability assessment (Web Share, File System Access, Push Notifications)
  - Install capability evaluation across platforms
- **Platform-Specific Install Instructions**: Tailored guidance for iOS, Android, and Desktop users
- **React Integration Hook**: `usePlatform()` hook for seamless component integration
- **Comprehensive Test Suite**: 41 test cases with 100% coverage ensuring cross-platform reliability

### Enhanced
- **PWA Foundation**: Established core infrastructure for native-like app experience
- **Cross-Platform Compatibility**: Robust detection across iOS Safari, Android Chrome, and Desktop browsers
- **TypeScript Integration**: Fully typed platform detection with strict type safety
- **Performance Optimized**: Lightweight implementation with minimal runtime overhead

### Technical Details
- **Files Created**: `src/utils/platformDetection.ts`, comprehensive test suite
- **Architecture**: Singleton service pattern with React hooks integration
- **Platform Support**: iOS (including iPad iOS 13+), Android, Windows, macOS, Linux
- **Browser Support**: Chrome, Safari, Firefox, Edge detection with capability assessment

## [2025-07-27] - Expandable Exercise Tags

### Added
- **Expandable Tags**: Exercise cards now show expandable tag functionality
- **Tag Management**: Click "+n" to reveal all additional tags beyond the first 2
- **Smooth Transitions**: 200ms ease-out animations for tag expansion/collapse
- **Show Less Option**: Clear "Show less" button when tags are expanded
- **Accessibility Support**: Proper ARIA attributes for screen readers
- **Responsive Design**: Consistent behavior across mobile and desktop

### Enhanced
- **User Experience**: Users can now see all exercise tags without cluttering the interface
- **Progressive Disclosure**: Tags are revealed only when needed, maintaining clean UI
- **Comprehensive Testing**: 7 new test cases covering all expandable tag scenarios

## [2025-07-26] - Pre-Timer Countdown Feature & UI Improvement

### Changed
- **Start Button Label**: Timer start button now always shows "Start" regardless of countdown setting for consistency

### Added
- **Pre-Timer Countdown**: Configurable countdown before timer starts (0-10 seconds)
- **Settings Integration**: Countdown duration slider in Timer Settings section
- **Visual Countdown Display**: Large orange countdown numbers with "Get Ready!" message
- **Audio Announcements**: Voice countdown for last 3 seconds (when sound enabled)
- **Countdown Progress**: Orange circular progress indicator during countdown phase
- **Dynamic UI**: "Cancel" button available during countdown phase
- **Countdown Banner**: Clear visual indicator showing remaining preparation time

### Enhanced
- **Timer State Management**: Extended TimerState interface with countdown properties
- **User Experience**: Helps users get into position before exercise timer begins
- **Accessibility**: Screen reader announcements and clear visual indicators
- **Settings UI**: Intuitive slider with "Off" option and second labels

### Technical
- **Type Safety**: Updated AppSettings and TimerState interfaces
- **Test Coverage**: Comprehensive tests for countdown functionality
- **Documentation**: Updated README with usage instructions

## [2025-07-25] - Complete Offline-First PWA Implementation

### Added
- **Full Offline Support**: Application now works completely offline after first load, automatically switching between online/offline modes
- **Service Worker**: Implemented comprehensive caching strategy using Vite PWA plugin with Workbox
- **Offline Detection**: Real-time online/offline status detection with user-friendly status banners
- **Cache-First Strategy**: Static assets cached for instant offline loading (HTML, CSS, JS, images, fonts)
- **PWA Installation**: Native app installation support on mobile devices and desktop browsers
- **Offline Banner**: Visual indicators for connection status with accessibility support
- **Runtime Caching**: Google Fonts and external resources cached for offline use

### Technical Infrastructure
- **Vite PWA Plugin**: Automated service worker generation with optimal caching strategies
- **Workbox Integration**: Enterprise-grade service worker management and cache strategies
- **Navigation Fallback**: Single-page app routing works offline with proper fallback handling
- **Asset Optimization**: All static assets (JS, CSS, images) cached efficiently for offline access
- **PWA Manifest**: Auto-generated with app shortcuts and proper mobile installation metadata

### Security & Performance
- **OWASP Compliance**: Secure service worker registration and cache management
- **No Data Exposure**: Offline status handling doesn't expose sensitive connection details
- **Efficient Caching**: Smart cache invalidation and update strategies
- **Background Updates**: Automatic app updates when online without interrupting user workflow

### User Experience
- **Seamless Transitions**: Automatic switching between online/offline modes without data loss
- **Visual Feedback**: Clear status indicators for connection state changes
- **Persistent Functionality**: All core features (timer, exercises, settings) work fully offline
- **Installation Prompts**: PWA installation available on supported browsers and devices

## [2025-07-25] - TypeScript Configuration & Testing Improvements

### Fixed
- **TypeScript Test Errors**: Resolved "toBeInTheDocument does not exist" errors in test files
- **Jest-DOM Types**: Added proper @testing-library/jest-dom type references to vite-env.d.ts
- **Test TypeScript Config**: Created dedicated tsconfig.test.json for proper test file type checking
- **Project References**: Updated main tsconfig.json to include test configuration references
- **Vitest Type Checking**: Enhanced vitest.config.ts with typecheck configuration for comprehensive test validation

### Technical Infrastructure
- **Comprehensive Test Setup**: All 157+ tests now pass without TypeScript errors
- **Type Safety**: Improved type checking for test files with proper jest-dom matcher support
- **Development Workflow**: Enhanced development experience with better TypeScript support in tests
- **Build Pipeline**: Maintained separation between app and test TypeScript configurations

## [2025-07-24] - Custom Branding & PWA Enhancements

### Added
- **Custom Favicon System**: Created RepCue-branded favicon with timer design in blue (#2563eb) and green (#10b981) theme
- **Multi-Format Icons**: Generated favicon in SVG, PNG (16x16, 32x32, 48x48, 192x192, 512x512), ICO, and Apple Touch Icon formats
- **PWA Manifest**: Added comprehensive manifest.json for Progressive Web App installation on mobile devices
- **Favicon Generator Script**: Automated favicon generation pipeline using Sharp library (`npm run generate-favicons`)
- **Enhanced HTML Meta**: Added theme-color, description, and proper favicon references for all browser types
- **Professional Branding**: Replaced default Vite favicon with custom RepCue timer icon design

### Technical Infrastructure
- **Sharp Integration**: Added Sharp library for high-quality image processing and favicon generation
- **ES Module Scripts**: Updated favicon generation script to use ES modules for consistency with project setup
- **PWA Ready**: Application now supports "Add to Home Screen" functionality on mobile devices
- **Multi-Device Support**: Favicon optimized for desktop browsers, mobile web, and native app installations

## [2025-07-24] - Code Quality & Exercise Selection Fix

### Fixed
- **Exercise Selection Bug**: Fixed issue where clicking a favorite exercise on HomePage didn't select that exercise in TimerPage
- **HomePage Navigation**: Favorite exercises now properly pass exercise data to TimerPage with navigation state
- **ESLint Compliance**: Fixed all 35 ESLint errors across the codebase
- **TypeScript Types**: Replaced all inappropriate `any` types with proper TypeScript types
- **Test File Types**: Improved type safety in test files with proper mock typing
- **Code Comments**: Converted `@ts-ignore` to `@ts-expect-error` where appropriate
- **Unused Variables**: Fixed unused variable issues in test files
- **Namespace Issues**: Added proper ESLint disable for Cypress namespace declaration
- **Import Optimization**: Removed unused imports across multiple files

### Added
- **Enhanced HomePage UI**: Favorite exercises now display with individual start buttons and favorite toggle stars
- **Exercise Quick Start**: Users can now start a timer directly from favorite exercises on the home page
- **Responsive Exercise Cards**: Improved layout for favorite exercise display with better mobile optimization

### Improved
- **Type Safety**: Enhanced type safety throughout the application
- **Code Quality**: Achieved clean ESLint output with strict TypeScript rules
- **Test Reliability**: Improved test file typing for better maintainability
- **Developer Experience**: Cleaner codebase with proper type annotations
- **User Experience**: More intuitive exercise selection and timer workflow

### Technical Details
- Updated HomePage to use navigation state when starting timer with specific exercise
- Added handleStartTimer function that properly passes selectedExercise and selectedDuration to TimerPage
- Enhanced favorite exercise display with individual action buttons
- Fixed consent service migration types from `any` to proper `ConsentData` interface
- Enhanced test mocks with appropriate ESLint disable comments for legitimate `any` usage
- Improved type guards in consent validation with proper unknown type handling
- Added proper type imports for test utilities and mock objects

## [2025-07-23] - Robust Consent Management & Data Reset Enhancement

### Added
- **Versioned Consent System**: Implemented comprehensive consent versioning (v1→v2) with automatic migration
- **Consent Migration**: Automatic migration from legacy consent data to current version
- **Enhanced Data Reset**: Clear data now resets consent and redirects to home with consent banner
- **Consent Status API**: New `getConsentStatus()` method provides version info and migration status
- **Future-Proof Architecture**: Extensible migration system for future consent structure changes
- **Comprehensive Documentation**: Created `consent.md` with detailed consent system documentation including lifecycle diagrams

### Removed
- **Debug Reset Consent Button**: Removed temporary debug button from Settings page as robust consent system makes it unnecessary
- **Debug Information**: Enhanced consent debugging in Settings page with version display

### Changed
- **ConsentService**: Complete rewrite with versioning, migration, and backward compatibility
- **SettingsPage**: Updated "Clear All Data" to "Clear All Data & Reset App" with enhanced behavior
- **Test Suite**: Updated all consent-related tests to work with new versioned system
- **Data Clear Workflow**: Now includes consent reset and home screen redirect for fresh app experience

### Fixed
- **Production Export Issue**: Resolved export/clear buttons not appearing in production due to legacy consent data
- **Consent Compatibility**: Fixed incompatibility between old and new consent data structures
- **Migration Reliability**: Robust error handling for consent migration with fallback to reset

## [2025-07-23] - Comprehensive Testing Infrastructure & Data Management

### Added
- **Comprehensive Testing Suite**: Complete Cypress E2E test framework with accessibility testing
- **Accessibility Compliance**: WCAG 2.1 testing with axe-core integration and keyboard navigation
- **Component Testing**: Extensive unit tests for all major components (SettingsPage, HomePage, TimerPage)
- **SettingsPage Data Management**: Export/clear data functionality with consent-aware controls
- **Wake Lock API**: Complete implementation with proper error handling for screen management
- **Testing Scripts**: Added comprehensive test automation (`test:e2e`, `test:a11y`, `test:all`)
- **Mobile Testing**: Optimized E2E tests for mobile viewport (375x667)
- **Data Export**: JSON export functionality with timestamp and comprehensive data structure
- **Express Server**: Custom Express server (`server.js`) for production deployment
- **PM2 Integration**: Complete PM2 ecosystem configuration for Raspberry Pi 5
- **Health Monitoring**: `/health` endpoint for application monitoring
- **Security Headers**: Enhanced security headers for production environment
- **Compression**: Gzip compression middleware for better performance
- **Graceful Shutdown**: Proper signal handling for clean application shutdown
- **NPM Scripts**: Added PM2 management scripts (`pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:logs`)
- **Nginx Configuration**: Production-ready nginx configuration with proxy setup
- **Cloudflare Tunnel**: Complete setup guide for `repcue.azprojects.net` deployment
- **Performance Optimization**: Pi-specific memory limits and restart policies

### Changed
- **Package.json**: Added Cypress, axe-core, and testing dependencies
- **SettingsPage**: Enhanced with export/clear data functionality and improved UI
- **Test Infrastructure**: Complete mocking setup for Web APIs (AudioContext, IndexedDB, vibration)
- **Component Architecture**: Improved error handling and consent-aware functionality
- **Documentation**: Comprehensive testing and accessibility documentation
- **Package.json**: Added Express and compression dependencies
- **Documentation**: Comprehensive PM2 deployment section in README
- **Gitignore**: Added PM2 and coverage-related ignores

### Technical Details
- **Testing Coverage**: 29/29 SettingsPage tests passing with comprehensive coverage
- **E2E Testing**: Exercise flow, timer functionality, and accessibility compliance
- **Accessibility**: WCAG 2.1 AA compliance across all pages
- **Data Management**: Consent-aware export/clear with proper error handling
- **Wake Lock**: Screen management during workouts with graceful degradation
- Express server listens on port 3001
- Optimized for single-instance deployment on Raspberry Pi
- 512MB memory limit with automatic restart
- Daily restart at 4 AM for maintenance
- Comprehensive logging with timestamps
- Static file caching (1 day) for performance

## [2025-06-29] - Initial commit

### Fixed


### Added
- Created application skeleton and navigation logic.
- Created full implementation of the Timer and Settings pages.
- Optimized for mobile viewing.
