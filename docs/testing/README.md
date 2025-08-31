# Testing Guide

This guide explains how to set up, write, and run tests for RepCue across unit, integration, and end‑to‑end (E2E). It highlights state/auth/sync/storage considerations and stable run practices on Windows and CI.

## Overview

- Test runners
  - Unit/Integration: Vitest + React Testing Library (JSDOM)
  - E2E: Playwright (primary) and Cypress (legacy/a11y)
- Package manager: pnpm
- Folders
  - Unit/Integration: colocated under `apps/frontend/src/**/__tests__` or `*.test.ts(x)`
  - Playwright: `apps/frontend/tests/e2e/**/*.spec.ts`
  - Cypress: `tests/e2e/**/*` (config at `tests/e2e/cypress.config.mjs`)

## Quick start (local)

- Install dependencies (workspace root):
  ```powershell
  pnpm install
  ```
- Unit/Integration (watch mode):
  ```powershell
  pnpm -w --filter @repcue/frontend test
  ```
- Stable run (Windows/CI parity):
  ```powershell
  pnpm -w --filter @repcue/frontend test:stable
  ```
- Coverage:
  ```powershell
  pnpm -w --filter @repcue/frontend test:coverage
  ```
- Playwright (E2E):
  ```powershell
  pnpm -w --filter @repcue/frontend pw:install
  # In another terminal
  pnpm -w --filter @repcue/frontend dev
  pnpm -w --filter @repcue/frontend pw:test
  ```
- Cypress (legacy E2E and a11y):
  ```powershell
  pnpm -w --filter @repcue/frontend test:e2e
  pnpm -w --filter @repcue/frontend test:a11y
  ```

Notes
- To override Playwright server URL: set `PLAYWRIGHT_BASE_URL`.
- Prefer `test:stable` on Windows to reduce flakiness.

## When to write which test

- Unit tests
  - Pure functions or small components with minimal DOM.
  - Service methods with simple inputs/outputs (mock with `vi.spyOn`).
  - Narrow bug fixes with clear invariants.

- Integration tests (Vitest + RTL)
  - Pages/components plus routing/i18n/providers; services mocked.
  - Stateful flows: timer controls, workout creator, consent gating.
  - IndexedDB interactions via existing test setup mocks.

- E2E tests (Playwright)
  - Cross‑page flows, navigation, persistence.
  - Dual‑context sync, sign‑in/out, locale policy behavior.
  - Accessibility smoke; detailed a11y remains in Cypress + axe.

Rule of thumb: unit for logic, integration for UI behavior, E2E for end‑to‑end guarantees.

## Special considerations (state/auth/sync/storage)

- App state and services
  - State lives in `App.tsx`. Business logic in singleton services under `src/services/**` with `.getInstance()`.
  - Service methods return booleans/null; avoid throws. Assert return values and UI updates instead of exceptions.
  - Always clear intervals in timer tests; prefer real timers. If you must use fake timers (`vi.useFakeTimers()`), restore to real timers afterward.

- Consent and privacy
  - Unit/integration tests run with auto‑consent via `src/test/setup.ts`; no need to click the banner.
  - E2E selectors exist: `[data-testid="consent-accept-all"]` and `[data-testid="consent-accept-essential"]`.

- IndexedDB (Dexie)
  - JSDOM tests mock `indexedDB` in `src/test/setup.ts`. Don’t re‑mock unless you need custom behavior.
  - Schema is unified snake_case; legacy stores were dropped in Dexie v7. Use `StorageService.getInstance()` to open DB.
  - Cleanup runs after each test: `localStorage.clear()` and `indexedDB.deleteDatabase('RepCueDB')`.

- i18n
  - `src/test/setup.ts` preloads minimal English resources and disables async backend.
  - Prefer role/label queries over raw text to avoid coupling to translations.

- Auth and sync
  - Unit/Integration: stub Supabase client and Edge Function calls with `vi.spyOn`; do not hit network.
  - E2E: use test accounts via environment variables in CI, or route‑mock network calls with Playwright `page.route`. Never commit secrets.
  - Assert sync behavior: one 2xx sync after login; a 401 should trigger one refresh+retry; no third‑party calls.

- Accessibility and motion
  - Respect reduced‑motion preferences. Wait for deterministic roles/testids, not arbitrary timeouts.

## Project test setup (what’s already mocked)

Applied by `vitest.config.ts` and `vitest.stable.config.ts` via `apps/frontend/src/test/setup.ts`:
- JSDOM + RTL with `@testing-library/jest-dom` matchers.
- Mocks: `localStorage`, `indexedDB`, Web Audio, Vibration, minimal `fetch` for `/exercise_media.json`.
- Auto‑consent flags and in‑memory i18n resources.
- Robust cleanup and global restoration between tests.
- Timer/event helpers and safe `HTMLButtonElement.click` patch.

Guidance: extend with `vi.spyOn` instead of duplicating base mocks; keep tests isolated and reset modules as needed.

## Writing tests (patterns/recipes)

- Colocation and naming
  - Prefer `ComponentName.test.tsx` next to components or inside `__tests__`.
  - Name tests by behavior, not implementation details.

### React Testing Library tips

- Render with providers only when necessary; otherwise render in isolation and mock services.
- Query by role/label/placeholder; use `findBy*` for async UI.
- Avoid asserting internal state; assert visible behavior and service calls.

### Service mocking

- `vi.spyOn(ServiceClass.prototype, 'method')` for instance methods, or stub the singleton from `getInstance()`.
- Return booleans/null per service contract; only throw when testing error boundaries.

### Timer logic

- Follow semantics in `.github/copilot-instructions.md` (rep/set progression, rest triggers, interval cleanup).
- Add tests for off‑by‑one edges and interval cleanup.

### Storage seeding

- Some pages seed exercises on first load; assert that the picker lists exercises after load.

### Auth/sync

- Unit/Integration: mock `supabase.auth` and `/sync` fetch; assert a single sync call on login and 401 refresh behavior.
- E2E: use a test account or a test‑only bypass; assert network with `page.route`.

## Running tests (commands)

Root wrappers
- Unit/Integration:
  ```powershell
  pnpm test
  pnpm test:stable
  pnpm test:ci
  ```
- E2E (Playwright):
  ```powershell
  pnpm -w --filter @repcue/frontend pw:install
  pnpm -w --filter @repcue/frontend dev
  pnpm -w --filter @repcue/frontend pw:test
  ```
- E2E (Cypress):
  ```powershell
  pnpm -w --filter @repcue/frontend test:e2e
  ```

Inside `apps/frontend` you can run the same scripts without the workspace filter.

## CI notes

- Use `test:ci` for unit/integration and `pw:test` for Playwright; run `pw:install` to provision browsers.
- Start a server before Playwright:
  - `vite preview` and set `PLAYWRIGHT_BASE_URL` to the preview URL, or
  - run `vite dev` in background and use the default baseURL.
- Upload `apps/frontend/playwright-report` as an artifact on failure.

## Flake‑resistant tests

- Prefer `test:stable` locally when diagnosing.
- Avoid arbitrary timeouts; wait for roles/testids.
- Keep tests small and independent; reset modules and mocks between tests.

## Security and privacy in tests

- Never hardcode secrets; use environment variables or CI secrets.
- Default to HTTPS in docs/examples; unit/integration should stub network calls.
- No third‑party network calls in tests; media must be same‑origin.

## Troubleshooting

- Vitest exits with code 1: try `test:stable`; check type errors in Problems panel.
- Playwright can’t connect: ensure dev/preview server is up; verify `PLAYWRIGHT_BASE_URL`.
- Missing selectors: confirm data‑testids in `Navigation` and `ConsentBanner` components.

## Appendix: useful scripts

- Root wrappers map to `@repcue/frontend` scripts: `test`, `test:stable`, `test:ci`, `test:e2e`, `test:a11y`, `i18n:scan`.
- Frontend adds: `pw:install`, `pw:test`, `pw:ui`, and `test:all` (unit + Cypress E2E).
