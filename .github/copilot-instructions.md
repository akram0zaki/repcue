# RepCue — AI Coding Agent Playbook

RepCue is a privacy-first fitness tracking PWA for interval training, optimized for mobile devices and self-hosting on Raspberry Pi with future plans to host it on Amazon EC2.

- Stack: React 19 + TypeScript + Vite + Tailwind. PWA served by Express in prod. Dev on Windows 11 (PowerShell); deploy to Raspberry Pi 5 with PM2.
- Prime directive: UX first and WCAG 2.1 AA. Never regress timer feel/clarity. Respect reduced motion.

## Architecture you must know
- State lives in `src/App.tsx` (no Redux). All business logic in singleton services under `src/services/**` with `.getInstance()` pattern.
- Data flow: `App.tsx → Services → IndexedDB (Dexie)` guarded by `ConsentService`. Services return booleans/null; avoid throws.
- Timer semantics (critical):
  - Rep-based uses completed counts. `currentRep` = completed reps; `currentSet` is 0-indexed. Display shows completed values.
  - Preserve `timerState.workoutMode` on all updates; never set it to `undefined` mid‑workout. Always `clearInterval` before creating new ones.
  - Durations: `repDurationSeconds || BASE_REP_TIME` from `src/constants/index.ts`; apply `settings.repSpeedFactor`.
- Video demos (feature-gated): flag in `src/config/features.ts` + user setting + reduced‑motion. Loader: `src/utils/loadExerciseMedia.ts`; variant: `src/utils/selectVideoVariant.ts`; hook: `src/hooks/useExerciseVideo.ts`; UI in `src/pages/TimerPage.tsx`.

## Project conventions
- Types in `src/types/index.ts` (+ `src/types/media.ts`). Constants in `src/constants/index.ts`.
- Tests colocated under `src/**/__tests__` and `src/__tests__`. Browser APIs mocked in `src/test/setup.ts`.
- Navigation test hooks like `data-testid="nav-more"`, `nav-settings` exist—prefer real UI flows where possible.
- Security/privacy: same‑origin media only. No third‑party calls. Consent‑aware persistence and erase paths. Follow `.github/instructions/owasp.instructions.md`.

## Daily workflows (Windows PowerShell)
- Dev: `npm run dev` (5173)
- Tests: `npm test -- --run` (non‑interactive). Stable Windows mode: `npm run test:stable`.
- Lint/typecheck: `npm run lint` and `npx tsc --noEmit` when needed.
- Build: `npm run build` (includes splash copy). Prod/Pi: `npm run build:prod`; serve `npm run build:serve` or `npm start` (Express).
- Deploy (Pi): `npm run build:prod; pm2 start ecosystem.config.cjs`.

## What to check when touching timer logic
- Rep progression for a 2×8 example:
  - Start: set=0, rep=0 → display Set 1/2, Rep 0/8
  - After 8th rep: rep=8 → trigger rest (isResting=true)
  - After rest: set=1, rep=0 → continue; complete after final set
- Common pitfalls: off‑by‑one on reps/sets; premature set increment; forgetting rest trigger; not clearing intervals; clearing `workoutMode`.
- Workout parity: standalone and workout paths must behave identically for rep advancement, rest, and completion.

## Where things live (quick map)
- Timer orchestration: `src/App.tsx`, UI in `src/pages/TimerPage.tsx`.
- Services: `audioService.ts`, `storageService.ts`, `consentService.ts`, `syncService.ts`, `queueService.ts`.
- PWA/build: `vite.config.ts`, `vitest.config.ts`, `server.js`, `ecosystem.config.cjs`, `public/manifest.json`.
- Media index: `public/exercise_media.json`; videos under `public/videos/**`.

## Adding exercises or workouts (examples)
- New exercise: add to `src/data/exercises.ts` with required `Exercise` fields; include `repDurationSeconds` if custom; set `hasVideo` when media exists and add entry to `public/exercise_media.json`.
- New workout: compose `Workout` with `WorkoutExercise.customSets/customReps/customRestTime`; persist via `StorageService`; launching a workout sets `timerState.workoutMode`.

## Testing focus areas
- Rep logic edge cases: `src/pages/__tests__/TimerPage.rep-edge-cases.test.tsx` and related tests.
- Video demos E2E: `cypress/e2e/videoDemos.cy.ts` (gating, reduced motion, toggle, override via `window.__VIDEO_DEMOS_DISABLED__`).
- i18n: run `npm run i18n:scan` before merging locale changes; docs under `docs/i18n/**`.

## Security & privacy defaults
- Never hardcode secrets; use env vars in server paths. HTTPS for network calls. Parameterize any DB queries (Dexie used). Sanitize any HTML via DOMPurify before `dangerouslySetInnerHTML` (rare; prefer text).

## When in doubt
- Check CHANGELOG.md for recent behavior changes (timer, workouts, i18n). Keep UX consistent and accessibility compliant.

