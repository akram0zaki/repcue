# RepCue — AI Coding Agent Playbook

RepCue is a privacy-first fitness tracking PWA for interval training. **UX first, WCAG 2.1 AA compliance, never regress timer feel.**

## Quick Reference
- **Stack**: React 19 + TypeScript + Vite + Tailwind | pnpm monorepo | Supabase backend
- **Package manager**: pnpm (use `pnpm` commands, not npm)
- **Dev**: `pnpm dev` (port 5173) | **Tests**: `pnpm test:ci` | **Build**: `pnpm build`
- **Host OS**: Development on Windows 11 (PowerShell) or macOS (zsh). Use appropriate terminal syntax for the detected environment.

## Architecture Essentials

### Data Flow
```
App.tsx (state) → Services (singleton .getInstance()) → IndexedDB (Dexie) ← ConsentService guard
```
- State lives in `apps/frontend/src/App.tsx` (no Redux/Zustand)
- Services return booleans/null, avoid throws
- Three exercise types: Built-in (local-only), User-created (synced), Shared (via user_favorites)

### Timer Logic (Critical)
- `currentRep` = completed reps (0-based); `currentSet` = 0-indexed
- **NEVER** set `timerState.workoutMode` to `undefined` mid-workout
- **ALWAYS** `clearInterval()` before creating new ones
- Duration: `repDurationSeconds || BASE_REP_TIME` × `settings.repSpeedFactor`
- **Example (2×8 workout)**: Start set=0, rep=0 → after 8th rep: rep=8 triggers rest → after rest: set=1, rep=0 → complete after final set
- **Common pitfalls**: off-by-one errors, premature set increment, forgetting rest trigger, not clearing intervals

### Supabase Dual Environments
- **Dev**: `repcue-dev` (xwzrsfkzqxdybjrkkkvh) via `mcp_supabase_*` tools
- **Prod**: `RepCue` (zumzzuvfsuzvvymhpymk) via `mcp_supabase-prod_*` tools
- **CRITICAL**: Verify environment sync before major changes—prod can lag behind dev

## Project Conventions

### File Locations
| What | Where |
|------|-------|
| Types | `src/types/index.ts`, `src/types/media.ts` |
| Constants | `src/constants/index.ts` |
| Services | `src/services/*.ts` (singleton pattern) |
| Tests | Colocated in `__tests__/` folders |
| i18n | `public/locales/{lang}/*.json` (8 languages, RTL support) |

### Logging (Mandatory)
```typescript
import logger from '../utils/logger';
logger.log('...');  // DEBUG=true only
logger.error('...'); // Always shown
```
**Never use `console.log()` directly.**

### Change Management
1. Write Supabase changes to workspace first, then apply via MCP tools
2. Track migrations in `docs/migration-tracking/supabase-changes_yyyyMMdd.md`
3. Update `CHANGELOG.md` after implementing features
4. Run `pnpm test:ci` before committing

## Essential Commands
```bash
pnpm dev              # Start frontend dev server
pnpm test:ci          # Run tests (CI mode, non-interactive)
pnpm lint             # ESLint with auto-fix
pnpm i18n:scan        # Check for missing translation keys
pnpm build:prod       # Production build
```

## Key Files Quick Map
- **Timer**: `src/App.tsx` (orchestration), `src/pages/TimerPage.tsx` (UI)
- **Exercises**: `src/data/exercises.ts` (built-in), `public/exercise_media.json` (video index)
- **Services**: `audioService`, `storageService`, `consentService`, `syncService`
- **Config**: `src/config/features.ts` (feature flags), `vite.config.ts`, `vitest.config.ts`

## Security & Privacy
- Same-origin media only, no third-party calls
- Consent-aware persistence (ConsentService gates all storage)
- See `.github/instructions/owasp.instructions.md` for security patterns
- GDPR compliant with data erasure support

## External Dependencies (Not in Repo)
- **Exercise videos**: Source videos stored externally; thumbnails generated via `scripts/generate-thumbnails.mjs` and committed to `public/thumbnails/`
- **Video index**: `public/exercise_media.json` maps exercise IDs to video/thumbnail paths
- **Environment variables**: `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN` for MCP tools; Supabase keys in `.env` files

## When in Doubt
- Check `CHANGELOG.md` for recent behavior changes
- Check `AGENTS.md` for comprehensive agent documentation
- Preserve UX consistency and accessibility compliance

