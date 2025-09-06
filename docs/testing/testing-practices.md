## RepCue Testing Practices

This document explains how tests are structured in the RepCue workspace, best practices to follow, and when to run which test commands. It also captures isolation rules we rely on to keep sequential test runs stable.

### Test Runner and Configurations

- Framework: Vitest + @testing-library/react (unit/integration) and Cypress (E2E).
- Environments:
  - Unit/Integration: JSDOM via Vitest.
  - E2E: Cypress (see cypress/ for specs).
- Commands:
  - Fast unit run (parallel): `npm run test -- --run`
  - Stable sequential run (single worker, deterministic): `npm run test:stable`
  - Lint: `npm run lint`
  - Type-check: `npx tsc --noEmit`

### When to Run What

- During local development:
  - Frequent small changes: run parallel unit tests (`npm test -- --run`).
  - Before committing or when debugging state-leak flakes: run the stable suite (`npm run test:stable`).
  - Before PR: run lint + type-check.
- Before release or CI gate: run the stable suite to catch order-dependent issues.

### Test Layout and Conventions

- Co-located tests under `src/**/__tests__` (React, hooks, services, utils) and `src/__tests__` for cross-cutting unit tests.
- Test names reflect user-facing behavior: Timer, ExercisePage preview, Workout flow, i18n, video demos, etc.
- Avoid internal implementation assertions; prefer behavior via DOM queries (`getByRole`, `getByText`, etc.).
- Prefer `screen.findBy*` with await when UI mounts asynchronously.

### Isolation and State Management

- Global setup in `src/test/setup.ts` ensures:
  - JSDOM-safe mocks for `localStorage`, `indexedDB`, AudioContext, and Vibration.
  - Auto-consent for storage during tests to avoid consent UI blocking.
  - Real timers by default; cleaned up after each test along with React trees.
  - Guard rails: restore `window` and `document` between tests to prevent cross-test leakage.
- Services are singletons; tests that depend on them should mock via `vi.mock` or factory-style spies. Never rely on persisted singleton state between tests.
- Background sync and service worker APIs are guarded for jsdom.

### Video Demo Tests (feature-gated)

- Feature: gated by a global flag plus user setting and reduced-motion.
- Utilities: `loadExerciseMedia`, `selectVideoVariant`, and hook `useExerciseVideo`.
- UI: `TimerPage` insets the video inside the progress ring. Tests should stub `HTMLVideoElement` and use `result.current.videoRef.current = new MockVideo()` before enabling playback to ensure listeners are attached.
- Preview flow on `ExercisePage`:
  - Dialog opens immediately; media index resolves; HEAD preflight (in tests) determines availability.
  - On element error or preflight fail, a toast is shown and the dialog closes.

### i18n Tests

- i18next uses the language detector and in-memory resources for tests in setup.
- `applyDir` safely toggles `<html dir>` and `lang`. Tests can assert localStorage `i18nextLng` persistence.

### Timer and Workout Tests

- Timer semantics:
  - Rep-based uses completed counts; display shows completed values.
  - Clear intervals before creating new ones to avoid duplicate updates.
  - Preserve `timerState.workoutMode` during updates; never set to undefined mid-workout.
- Rep-based progress:
  - Smooth inner ring for rep timing; outer ring for set/rep completion.
  - Rest periods show previous exercise completed and next exercise prepped.

### Network and Offline Tests

- Use `useOfflineStatus` to derive `isOnline`, `isOffline`, and `hasBeenOffline`.
- Tests simulate `offline` and `online` via `window.dispatchEvent(new Event('offline'|'online'))`. Toggle `navigator.onLine` first, then dispatch.

### Common Testing Pitfalls and Fixes

- Consent banner blocking: tests auto-consent via setup and a `__AUTO_CONSENT__` flag.
- JS DOM limitations:
  - AudioContext and Vibration APIs are mocked.
  - Service worker background sync guarded and no-ops in tests.
  - DOM removal operations wrapped in try/catch if element may have been detached.
- IndexedDB: Dexie is mocked to memory in tests; service methods should catch and log errors but continue.

### Authoring New Tests

- Use `render` and `screen` from Testing Library; avoid querying by implementation details.
- Prefer `findBy*` and `waitFor` for async UI.
- For hooks, use `renderHook` and `act` to simulate state transitions.
- For service singletons, mock the module at import time using `vi.mock` to avoid real side-effects.

### CI Stability Guidelines

- Keep tests order-independent; never rely on previous test state.
- Use the stable config to catch subtle leaks: `isolate: true`, `restoreMocks`, `clearMocks`, `mockReset`.
- Avoid network. Any `fetch` in tests should be stubbed or allowed to fall back to in-memory results.


