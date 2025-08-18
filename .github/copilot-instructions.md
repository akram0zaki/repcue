# RepCue - AI Coding Agent Instructions

## AI Agent Quickstart (TL;DR)
- Stack: React 19 + TypeScript + Vite + Tailwind; PWA with Express server for prod; Windows 11 + PowerShell for local dev; Raspberry Pi 5 + PM2 for deploy.
- Prime directive: UX first and WCAG 2.1 AA. Respect reduced motion; never regress timer feel or clarity during workouts.
- State model: Centralized in `src/App.tsx` (no Redux). Business logic lives in singleton services under `src/services/` (use `.getInstance()` pattern).
- Data flow: `App.tsx` → Services → IndexedDB (Dexie). All persistence is consent-aware via `ConsentService`.
- Timer semantics (critical):
  - Rep-based uses completed counts: `currentRep` = completed reps, `currentSet` is 0-indexed. Display shows completed values.
  - Preserve `workoutMode` during timer updates (never set to `undefined` mid-workout). Clear intervals before setting new ones.
  - Constants in `src/constants/index.ts` drive durations; rep time = `exercise.repDurationSeconds || BASE_REP_TIME`.
- Video demos (experimental):
  - Gated by `src/config/features.ts` (`VIDEO_DEMOS_ENABLED`) + user setting (Settings → Show Exercise Demo Videos) + reduced motion.
  - Test override: set `window.__VIDEO_DEMOS_DISABLED__ = true` before app mounts to force fail-closed behavior.
  - Media loader: `src/utils/loadExerciseMedia.ts`; variant selection: `src/utils/selectVideoVariant.ts`; hook: `src/hooks/useExerciseVideo.ts`.
  - UI integration in `src/pages/TimerPage.tsx` (circular in-ring video). E2E spec: `cypress/e2e/videoDemos.cy.ts`.
- Testing:
  - Unit/integration with Vitest (jsdom). Run `npm test -- --run` in PowerShell to avoid interactive mode.
  - Mocks in `src/test/setup.ts` (AudioContext, vibrate, etc.).
  - Cypress E2E config `cypress.config.mjs`; consent is typically seeded in tests to avoid onboarding flake.
- Build & deploy:
  - Dev: `npm run dev` (5173). Prod build: `npm run build` or `npm run build:prod` (Pi-optimized). Serve with Express/PM2 (`npm run pm2:start`).
  - PWA/Workbox tweaks in `vite.config.ts` (runtime caching for `/videos/**`, navigateFallback, manifest).
- Security & privacy:
  - Same-origin only for media; no third-party calls. Services return booleans/null (avoid throws). Respect consent; provide erase paths.
- Conventions:
  - Types: `src/types/index.ts` (+ `src/types/media.ts`). Constants: `src/constants/index.ts`.
  - Tests colocated under `src/**/__tests__` and `src/__tests__` for shared utilities.
  - Navigation has `data-testid` hooks (e.g., `nav-more`, `nav-settings`) used by E2E tests—prefer real UI paths over hidden test hooks.
- Common pitfalls to avoid:
  - Off‑by‑one in reps/sets; premature set increment; not triggering rest after final rep; clearing `workoutMode` mid-run; forgetting to clear intervals; ignoring reduced motion.
- Quick links: Timer logic in `src/pages/TimerPage.tsx` and `src/App.tsx`; feature flags in `src/config/features.ts`; media JSON in `public/exercise_media.json`.

### How to add a new exercise (example)
1) Add to `src/data/exercises.ts` with required fields from `Exercise` (see `src/types/index.ts`). For rep-based, prefer `repDurationSeconds` if it differs from `BASE_REP_TIME`.
2) If a demo video exists, set `hasVideo: true` and ensure an entry in `public/exercise_media.json` with the same `id` and at least one variant URL.
3) Tests: add/adjust a small unit test if logic depends on new fields; no schema migration needed (catalog is seed data).

Minimal shape:
```ts
{
  id: 'bicycle-crunches',
  name: 'Bicycle Crunches',
  description: 'Alternating elbow-to-knee core exercise',
  category: ExerciseCategory.CORE,
  exerciseType: ExerciseType.REPETITION_BASED,
  defaultSets: 2,
  defaultReps: 8,
  repDurationSeconds: 2,
  hasVideo: true,
  isFavorite: false,
  tags: ['core','abs']
}
```

### How to add a new workout flow (example)
1) Compose a `Workout` object (see `src/types/index.ts`) and persist via `StorageService` (consent-aware). Use `WorkoutExercise.customSets/customReps/customRestTime` to override exercise defaults.
2) UI: list and manage workouts in `src/pages/WorkoutsPage.tsx` (create/edit flows under `CreateWorkoutPage.tsx` / `EditWorkoutPage.tsx`). Ensure ordering via `order` and compute `estimatedDuration`.
3) Timer integration: launching a workout sets `timerState.workoutMode` with the exercises sequence. The timer must preserve `workoutMode` across updates. Rest handling is driven by `defaultRestTime` or per-exercise `customRestTime`.
4) Tests: add an integration test ensuring workout exercises behave identically to standalone (rep advancement, rest triggers, completion logging).



RepCue is a privacy-first fitness tracking PWA for interval training, optimized for mobile devices and self-hosting on Raspberry Pi. Built with React 19, TypeScript, Vite, and Tailwind CSS.

**CORE OBJECTIVE: USER EXPERIENCE IS PARAMOUNT**
Every decision, feature, and code change must prioritize user experience and usability above all else. The application must be intuitive, responsive, and provide seamless interaction patterns that feel natural to users during their workouts.

**DEVELOPMENT ENVIRONMENT**: Windows 11 with PowerShell as primary shell. All terminal commands should use PowerShell syntax. Always run non-interactive commands with appropriate flags to avoid hanging processes.

## Architecture Overview

**Service-Oriented Design**: All business logic lives in singleton services (`src/services/`):
- `StorageService` - Dexie.js (IndexedDB) wrapper with consent-aware persistence
- `AudioService` - Web Audio API for beeps, vibrations, and accessibility announcements  
- `ConsentService` - GDPR-compliant consent management with granular permissions
- `SyncService` - Background sync and offline-first queue management
- `QueueService` - Persistent operation queue with retry logic

**State Management**: App-level React state in `App.tsx` with services for persistence. No external state management - intentionally simple for Pi deployment.

**Data Flow**: `App.tsx` → Services → IndexedDB. Services are singletons accessed via `.getInstance()` pattern.

## Key Development Patterns

### Service Singleton Pattern
```typescript
// All services follow this singleton pattern
export class MyService {
  private static instance: MyService;
  
  private constructor() {
    // Private constructor prevents direct instantiation
  }
  
  public static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }
}

// Export singleton instance for convenience
export const myService = MyService.getInstance();
```

### Consent-Aware Storage Pattern
```typescript
// All storage operations check consent first
const consentService = ConsentService.getInstance();
if (!consentService.hasConsent()) {
  return; // Gracefully degrade without storage
}
```

### Rep-Based Timer Logic (Critical Pattern)
Rep-based exercises use 0-indexed internal state with specific semantic rules. **CRITICAL**: Rep-based exercises must behave identically in standalone mode and within workout composite routines.

```typescript
// SEMANTIC CLARIFICATION from TimerPage.tsx:
// - currentRep: Number of COMPLETED reps (0 = no reps completed, 8 = all 8 reps completed)
// - currentSet: Current set index when exercising, completed sets when resting
// - Display: Shows completed counts (currentRep completed, currentSet+1 of totalSets)
// - Progress: Calculated as (currentRep / totalReps) * 100 for completion percentage

// Constants from src/constants/index.ts
const BASE_REP_TIME = 2; // Base seconds per rep
const REST_TIME_BETWEEN_SETS = 30; // Rest between sets

// CRITICAL BEHAVIOR CONSISTENCY:
// A rep-based exercise (e.g., Cat-Cow Stretch 2×8) must have identical:
// - Rep advancement timing and logic
// - Set completion detection
// - Rest period triggering
// - Progress calculations
// Whether running standalone OR as part of a workout composite routine
```

### TypeScript Interface Design
Core types in `src/types/index.ts`. Key interfaces:
- `Exercise` - Core workout data with `exerciseType: 'time-based' | 'repetition-based'`
- `WorkoutExercise` - Exercise within workout with custom overrides (customSets, customReps)
- `TimerState` - Complex timer state supporting both standalone and workout modes
- `AppSettings` - User preferences including `repSpeedFactor` and `preTimerCountdown`

### Timer State Architecture
```typescript
interface TimerState {
  // Basic timer state
  isRunning: boolean;
  currentTime: number;
  isCountdown: boolean;
  
  // Rep-based exercise state (standalone mode)
  currentSet?: number;      // 0-indexed, current set being worked on
  currentRep?: number;      // number of completed reps in current set
  totalSets?: number;
  totalReps?: number;
  isResting: boolean;       // true during 30s rest between sets
  
  // Workout mode (guided multi-exercise sessions)
  workoutMode?: {
    currentExerciseIndex: number;
    exercises: WorkoutExercise[];
    // ... rep/set tracking per exercise
  };
}
```

### Testing Mock Patterns
All browser APIs are mocked in `src/test/setup.ts`:
```typescript
// Web Audio API mocking
global.AudioContext = class MockAudioContext {
  createOscillator() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
  createGain() { return { connect: vi.fn(), gain: { value: 0 } }; }
}

// Vibration API mocking
Object.defineProperty(navigator, 'vibrate', { value: vi.fn() });
```

## Development Workflow

### Essential Commands
```powershell
npm run dev          # Development server (port 5173)
npm test             # Vitest unit tests with coverage (use -- --run for non-interactive)
npm run build        # Full build with splash generation
npm run build:prod   # Production-optimized build (Pi deployment)
npm run build:serve  # Production build + Express server (port 3001)
npm run pm2:start    # Deploy with PM2 process manager
npm run lint         # ESLint validation
npm run test:ui      # Interactive test interface with coverage
npm run test:a11y    # Accessibility testing with axe-core
npm run generate-splash  # Generate PWA splash screens

# PowerShell-specific commands for Windows development:
# Copy splash assets: powershell -Command "Copy-Item -Recurse -Force public/splash dist/"
# Always use npm test -- --run to avoid interactive mode hanging
```

### Testing Strategy
- **Comprehensive Coverage**: >556 tests passing with >90% coverage requirement
- **Service Testing**: Every service has dedicated `__tests__/` subdirectory
- **Mock Architecture**: Browser APIs comprehensively mocked in `src/test/setup.ts`
- **Edge Case Testing**: Dedicated test files for complex scenarios (e.g., `TimerPage.rep-edge-cases.test.tsx`)
- **Rep Logic Testing**: Critical timer logic has specific test coverage for completion edge cases
- **Accessibility Testing**: E2e tests with axe-core for WCAG compliance
- **UI Behavior Verification**: Components must behave exactly as expected - test actual user interactions
- **Edge Case Priority**: Always consider boundary conditions, error states, and unusual user flows
- **Windows Testing**: Use `npm test -- --run` to avoid interactive mode in PowerShell environments

### Pi-Specific Optimizations
- **Memory Management**: PM2 config with 512MB memory limits (`ecosystem.config.cjs`)
- **Performance**: Compression middleware, lazy-loaded components, 1-day static asset caching
- **Production Server**: Express with security headers optimized for Cloudflare tunnel
- **Process Management**: PM2 with health checks and daily restart scheduling
- **Build Optimization**: `build:prod` excludes test compilation for faster Pi builds

## Component Architecture

### Route Structure & Lazy Loading
```
src/pages/
├── HomePage.tsx        # Exercise grid with category filtering + upcoming workouts
├── TimerPage.tsx       # Complex timer with pre-countdown, rep logic, wake lock, audio
├── ExercisePage.tsx    # Exercise details and CRUD operations
├── WorkoutsPage.tsx    # Workout management and scheduling (replaces SchedulePage)
├── CreateWorkoutPage.tsx  # Workout creation with exercise selection
├── EditWorkoutPage.tsx    # Workout modification interface
├── ActivityLogPage.tsx # Workout history with export functionality
└── SettingsPage.tsx    # App preferences with granular controls
```

### Timer State Management
Complex timer implementation in `App.tsx` with multiple modes:
```typescript
interface TimerState {
  isRunning: boolean;
  currentTime: number;
  isCountdown: boolean;    // Pre-timer countdown phase
  countdownTime: number;   // Countdown seconds remaining
  isResting: boolean;      // Rest period between sets
  restTimeRemaining?: number;
  // Standalone exercise tracking
  currentSet?: number;     // 0-indexed set position
  currentRep?: number;     // completed reps count
  // Workout mode for guided sessions
  workoutMode?: { /* complex workout state */ };
}
```

### Browser API Integration
- **Wake Lock API**: Prevents screen sleep during workouts (`useWakeLock` hook)
- **Web Audio API**: Custom beep generation with volume control and accessibility
- **Vibration API**: Haptic feedback patterns for different timer events
- **IndexedDB**: Primary storage via Dexie.js with consent management
- **Service Worker**: PWA capabilities with Vite PWA plugin

## PWA & Deployment Architecture

### Vite PWA Configuration
```typescript
// vite.config.ts - PWA manifest and service worker
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    navigateFallback: '/index.html'
  }
})
```

### Raspberry Pi Deployment
- **Production Server**: Express.js with compression and security headers
- **PM2 Process Management**: Single instance with 512MB memory limit
- **Nginx Configuration**: Reverse proxy with asset caching
- **Cloudflare Tunnel**: Secure external access without port forwarding

### Build System
- **Development**: Hot reload with Vite dev server
- **Production**: TypeScript compilation + Vite build + splash screen generation
- **Testing**: Vitest with jsdom environment and comprehensive mocking

## Data Architecture

### Exercise Data Structure
- **Seeded Data**: 20 exercises across 6 categories in `src/data/exercises.ts`
- **Categories**: Core, Cardio, Strength, Flexibility, Balance, Hand-Warmup
- **Exercise Types**: `'time-based'` (duration) vs `'repetition-based'` (sets/reps)
- **Tags**: Multi-tag system for filtering and organization
- **Persistence**: IndexedDB storage with import/export functionality

### Workout System Architecture
```typescript
// Workout replaces the old Schedule system
interface Workout {
  id: string;
  name: string;
  exercises: WorkoutExercise[]; // Ordered sequence
  scheduledDays: Weekday[];     // Direct scheduling
  isActive: boolean;            // Pause/resume capability
}

// Exercise customization within workouts
interface WorkoutExercise {
  exerciseId: string;
  order: number;
  customSets?: number;    // Override exercise defaults
  customReps?: number;
  customRestTime?: number;
}
```

**WORKOUT COMPOSITE PATTERN**: A workout is a composite routine made up of smaller routines (exercises). Each exercise within a workout must behave identically to its standalone counterpart. This includes:
- Rep advancement timing and progression
- Set completion detection and transitions
- Rest period triggering and duration
- Progress calculations and display logic
- Audio cues and haptic feedback patterns

### Consent-Aware Persistence
```typescript
// Storage operations respect user consent
if (consentService.hasConsent()) {
  await storageService.saveExercise(exercise);
} else {
  // Graceful degradation - app functions without persistence
}
```

## Project-Specific Conventions

### File Organization Patterns
- **Service Tests**: `src/services/__tests__/serviceName.test.ts`
- **Component Tests**: `src/components/__tests__/ComponentName.test.tsx`
- **Specialized Tests**: Separate files for complex features (countdown, offline, etc.)
- **Type Definitions**: Centralized in `src/types/index.ts`
- **Constants**: App-wide constants in `src/constants/index.ts`

### Error Handling Philosophy
- **Graceful Degradation**: App functions without browser API support
- **Consent Respect**: Features degrade gracefully without storage consent
- **No Throwing**: Service methods return booleans/nulls rather than throwing exceptions
- **Logging**: Console warnings for unsupported features, errors for failures

### Accessibility Implementation
- **WCAG 2.1 AA Compliance**: Verified through automated and manual testing
- **Screen Reader Support**: `AudioService.announceText()` creates aria-live announcements
- **Focus Management**: Proper tab order and visible focus indicators
- **High Contrast**: Support for various lighting conditions and vision needs

## Critical Development Workflows

### Rep-Based Exercise State Management (Critical Pattern)
The most complex part of RepCue is rep-based exercise timing. **Critical bugs often occur here**:

```typescript
// CRITICAL: Workout mode must be preserved during timer execution
// Bad: workoutMode: undefined (clears all workout context)
// Good: workoutMode: prev.workoutMode || undefined (preserves for workouts)

// In App.tsx startActualTimer():
setTimerState(prev => ({
  ...prev,
  workoutMode: prev.workoutMode || undefined, // PRESERVE workout context
  // other timer state...
}));
```

**Common Workflow**: When user reports "workout stops after 1 rep", check `workoutMode` preservation in timer state updates.

### PowerShell Development Commands
```powershell
# Non-interactive testing (critical for CI/automated workflows)
npm test -- --run

# Build with splash screen copying (Windows-specific)
npm run build  # Includes PowerShell copy command

# PM2 deployment for Pi
npm run build:prod; pm2 start ecosystem.config.cjs
```

## Advanced Integration Patterns

### Rep Logic Debugging (Critical for Timer Issues)
When debugging rep-based timer problems, check these key state transitions and common error scenarios:

```typescript
// Expected progression for 2 sets × 8 reps:
// Initial: currentSet=0, currentRep=0 → Display: Set 1/2, Rep 0/8
// After rep 1: currentSet=0, currentRep=1 → Display: Set 1/2, Rep 1/8
// After rep 8: currentSet=0, currentRep=8 → Display: Set 1/2, Rep 8/8 → START REST
// During rest: isResting=true → Set progress includes completed set
// After rest: currentSet=1, currentRep=0 → Display: Set 2/2, Rep 0/8

// COMMON ERROR SCENARIOS ENCOUNTERED:
// 1. Progress bar skipping from 87.5% to 100% (off-by-one in rep advancement)
// 2. Set progress showing 100% before exercise completion (premature set increment)
// 3. Rest period not triggering after final rep of set (missing isResting transition)
// 4. Exercise completing after 7 reps instead of 8 (< vs <= in completion logic)
// 5. currentRep advancing before rep timer completes (timing race condition)
// 6. Rest timer not resetting properly between sets (clearInterval safety)
// 7. Workout mode state being cleared during timer execution (workoutMode preservation)

// Critical checks for rep-based exercise bugs:
// - Exercise completion: currentRep >= totalReps (not totalReps-1)
// - Set completion: triggers when currentRep reaches totalReps for current set
// - Rest triggering: isResting=true when set completes but exercise continues
// - Progress calculation: (currentRep / totalReps) must handle edge case of completion
// - Timer intervals: Always clearInterval before setting new intervals
// - Workout mode preservation: startActualTimer() must preserve workoutMode state during workout execution
```

### Audio Service Architecture
Multi-layered audio system in `AudioService`:
```typescript
// Different sound patterns for different events
playIntervalBeep(volume)     // Single beep for intervals
playStartSound()             // Two-tone start sequence
playStopSound()              // Three-tone finish sequence
announceText(text)           // Screen reader announcements
```

### Wake Lock Management
Screen management during workouts:
```typescript
// Prevent screen sleep during active workouts
const { requestWakeLock, releaseWakeLock, isActive } = useWakeLock();
// Automatically handles visibility changes and errors
```

### Storage Service Patterns
Dexie.js integration with consent management:
```typescript
// All storage methods are consent-aware
async saveExercise(exercise: Exercise): Promise<void>
async getExercises(): Promise<Exercise[]>
async exportAllData(): Promise<ExportData>
// Handles consent, errors, and timestamp conversion automatically
```

## Security & Privacy Implementation

### GDPR Compliance
- **Granular Consent**: Separate permissions for cookies, analytics, marketing
- **Data Minimization**: Only essential data stored locally
- **Right to Erasure**: Complete data clearing functionality
- **Consent Versioning**: Handles consent updates and migrations

### Security Headers (server.js)
```javascript
// Production security configuration
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Critical Files for Understanding

### Core Architecture
- `src/App.tsx` - Central state management, routing, and timer orchestration
- `src/services/storageService.ts` - Data persistence patterns with Dexie.js
- `src/services/audioService.ts` - Web Audio API integration and accessibility
- `src/services/consentService.ts` - GDPR compliance and consent management

### Testing & Build
- `src/test/setup.ts` - Comprehensive browser API mocking for tests
- `server.js` - Production Express server with Pi optimizations
- `ecosystem.config.cjs` - PM2 process management for Raspberry Pi deployment
- `vitest.config.ts` - Test configuration with coverage reporting
- `vite.config.ts` - Build configuration with PWA optimizations

### TypeScript & Configuration
- `src/types/index.ts` - Complete type definitions for the application
- `src/constants/index.ts` - App-wide constants and default configurations
- `package.json` - Build scripts optimized for Pi deployment

## Integration Testing & Debugging

### Timer Bug Investigation Workflow
1. **Identify Exercise Type**: Check if issue is with time-based or rep-based exercises
2. **Check State Preservation**: Verify `workoutMode` isn't being cleared during timer execution
3. **Verify Rep Logic**: Check currentRep/currentSet advancement logic in completion handlers
4. **Test Both Modes**: Ensure identical behavior in standalone vs workout modes

### Common Error Patterns to Watch For
- **workoutMode clearing**: Always preserve workout context during timer updates
- **Off-by-one errors**: Rep counts use 0-based indexing but display 1-based
- **Interval cleanup**: Always `clearInterval()` before setting new intervals
- **Race conditions**: Rep advancement timing vs display updates

This architecture enables a highly maintainable, accessible, and privacy-respecting fitness tracking application optimized for self-hosted deployment on resource-constrained devices.
