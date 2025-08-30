Playwright E2E (experimental)

Prereqs
- Install browsers: pnpm --filter @repcue/frontend pw:install
- Run dev server: pnpm --filter @repcue/frontend dev

Run tests
- pnpm --filter @repcue/frontend pw:test
- UI mode: pnpm --filter @repcue/frontend pw:ui

Notes
- Auth flows are stubbed; real cross-device sync requires test creds and environment secrets.
- This suite validates core UI flows and regressions discovered recently (exercise seeding, activity log labels).
