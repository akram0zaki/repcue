# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# RepCue — AI Coding Agent Playbook

RepCue is a privacy-first fitness tracking PWA for interval training, optimized for mobile devices and self-hosting on Raspberry Pi with future plans to host it on Amazon EC2.

- Stack: React 19 + TypeScript + Vite + Tailwind. PWA served by Express in prod. Dev on Windows 11 (PowerShell); deploy to Raspberry Pi 5 with PM2.
- Prime directive: UX first and WCAG 2.1 AA. Never regress timer feel/clarity. Respect reduced motion.

## Monorepo Architecture
This is a pnpm workspace monorepo with the following structure:
- `apps/frontend/` - React + Vite + Tailwind (main UI)
- `apps/backend/` - Express server (serves frontend in production)
- `packages/shared/` - Shared types/constants
- `tests/e2e/` - Cypress end-to-end tests
- Root package.json contains workspace scripts

## Architecture you must know
- State lives in `apps/frontend/src/App.tsx` (no Redux). All business logic in singleton services under `src/services/**` with `.getInstance()` pattern.
- Data flow: `App.tsx → Services → IndexedDB (Dexie)` guarded by `ConsentService`. Services return booleans/null; avoid throws.
- Timer semantics (critical):
  - Rep-based uses completed counts. `currentRep` = completed reps; `currentSet` is 0-indexed. Display shows completed values.
  - Preserve `timerState.workoutMode` on all updates; never set it to `undefined` mid‑workout. Always `clearInterval` before creating new ones.
  - Durations: `repDurationSeconds || BASE_REP_TIME` from `src/constants/index.ts`; apply `settings.repSpeedFactor`.
- Video demos (feature-gated): flag in `src/config/features.ts` + user setting + reduced‑motion. Loader: `src/utils/loadExerciseMedia.ts`; variant: `src/utils/selectVideoVariant.ts`; hook: `src/hooks/useExerciseVideo.ts`; UI in `src/pages/TimerPage.tsx`.

## Project conventions
- Types in `apps/frontend/src/types/index.ts` (+ `src/types/media.ts`). Constants in `apps/frontend/src/constants/index.ts`.
- Tests colocated under `apps/frontend/src/**/__tests__` and `apps/frontend/src/__tests__`. Browser APIs mocked in `apps/frontend/src/test/setup.ts`.
- Navigation test hooks like `data-testid="nav-more"`, `nav-settings` exist—prefer real UI flows where possible.
- Security/privacy: same‑origin media only. No third‑party calls. Consent‑aware persistence and erase paths. Follow `.github/instructions/owasp.instructions.md`.

## Essential Commands (Windows PowerShell)
- Dev: `pnpm dev` (frontend on port 5173)
- Backend dev: `pnpm dev:be` (Express on port 3001, optional)
- Tests: `pnpm test` (Vitest). Stable Windows mode: `pnpm test:stable`.
- Single test: `pnpm --filter @repcue/frontend vitest run path/to/test.tsx`
- Lint/typecheck: `pnpm lint` and `npx tsc --noEmit` from apps/frontend when needed.
- Build: `pnpm build` (includes splash copy). Production: `pnpm build:prod`.
- Deploy (Pi): `pnpm build:prod; pnpm pm2:start`.
- i18n: `pnpm i18n:scan` to check translation keys before committing locale changes.

## What to check when touching timer logic
- Rep progression for a 2×8 example:
  - Start: set=0, rep=0 → display Set 1/2, Rep 0/8
  - After 8th rep: rep=8 → trigger rest (isResting=true)
  - After rest: set=1, rep=0 → continue; complete after final set
- Common pitfalls: off‑by‑one on reps/sets; premature set increment; forgetting rest trigger; not clearing intervals; clearing `workoutMode`.
- Workout parity: standalone and workout paths must behave identically for rep advancement, rest, and completion.

## Where things live (quick map)
- Timer orchestration: `apps/frontend/src/App.tsx`, UI in `apps/frontend/src/pages/TimerPage.tsx`.
- Services: `apps/frontend/src/services/` - `audioService.ts`, `storageService.ts`, `consentService.ts`, `syncService.ts`, `queueService.ts`.
- PWA/build: `apps/frontend/vite.config.ts`, `apps/frontend/vitest.config.ts`, `apps/backend/server.js`, `apps/backend/ecosystem.config.cjs`, `apps/frontend/public/manifest.json`.
- Media index: `apps/frontend/public/exercise_media.json`; videos under `apps/frontend/public/videos/**`.

## Adding exercises or workouts (examples)
- New exercise: add to `apps/frontend/src/data/exercises.ts` with required `Exercise` fields; include `repDurationSeconds` if custom; set `hasVideo` when media exists and add entry to `apps/frontend/public/exercise_media.json`.
- New workout: compose `Workout` with `WorkoutExercise.customSets/customReps/customRestTime`; persist via `StorageService`; launching a workout sets `timerState.workoutMode`.

## Testing focus areas
- Rep logic edge cases: `apps/frontend/src/pages/__tests__/TimerPage.rep-edge-cases.test.tsx` and related tests.
- Video demos E2E: `tests/e2e/cypress/e2e/videoDemos.cy.ts` (gating, reduced motion, toggle, override via `window.__VIDEO_DEMOS_DISABLED__`).
- i18n: run `pnpm i18n:scan` before merging locale changes; docs under `docs/i18n/**`.

## Security & privacy defaults
- Never hardcode secrets; use env vars in server paths. HTTPS for network calls. Parameterize any DB queries (Dexie used). Sanitize any HTML via DOMPurify before `dangerouslySetInnerHTML` (rare; prefer text).
- Environment variables:
  - `SUPABASE_DB_PASSWORD` - Database password
  - `SUPABASE_ACCESS_TOKEN` - Personal access token

## Development Environment
- Windows 11 with PowerShell
- pnpm package manager (required)
- Deploy target: Raspberry Pi 5 with nginx + cloudflare tunnel
- MCP server available for Supabase operations

## When in doubt
- Check CHANGELOG.md for recent behavior changes (timer, workouts, i18n). Keep UX consistent and accessibility compliant.
- After implementing features, always write unit tests and run `pnpm test` and `pnpm i18n:scan`
- Update CHANGELOG.md with date-stamped entries for changes
- Multi-lingual project: ensure all locale files are updated when adding/changing UI text