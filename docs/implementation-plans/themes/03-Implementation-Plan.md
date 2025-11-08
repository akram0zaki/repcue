# Implementation Plan: Theme System
**Epic:** User Theme Customization
**Version:** 1.0
**Date:** 2025-10-26

---
## Development Rules

### 🧩 Development Rules for AI Coding Assistant

1. **Supabase Migrations & Functions**

   * All Supabase schema migrations and Edge Function changes **must be created and saved locally in the workspace** before deployment.
   * This ensures proper **version control and reproducibility**.

2. **Migration Tracking**

   * Record every Supabase change in a new file under `docs/migration-tracking/`.
   * Use the filename format: `supabase-changes_YYYYMMDD.md`.

3. **Styling Rules**

   * **No inline styles.**
   * Use **global or shared style definitions** only (e.g., Tailwind classes, shared CSS/TS files).

4. **Commit Policy**

   * **Do not auto-commit.**
   * Commit only when explicitly instructed.

5. **Progress Tracking**

   * Continuously **update the project plan** by marking completed tasks, modules, or phases as done.
   * This ensures sessions can resume without confusion or redundant work.
   * Do NOT create external files to track progress, always update the progress inline in this plan.

6. **Localization Workflow**

   * Always update and test the **`en` locale** first (it is the canonical source).
   * Only after `en` is verified, proceed with translations to other locales—either automated or manual.

7. **Development Workstation**

  * The development workstation is VSCode set up on a Windows 11 PC.
  * Use Powershell syntax for all terminal commands.
  * There are two MCP servers configured: `supabase` points to the dev supabase project ref xwzrsfkzqxdybjrkkkvh, and `supabase-prod` points to the prod supabase project ref zumzzuvfsuzvvymhpymk.

8. **Style Guide**

  * Make sure any screen changes adhere to the style guide docs\ui-ux\ui-specs.md

9. **Offline-First**

  * Implementation of any new feature must respect and comply with the offline-first architecture of the app.

## Phase 1: Foundation & Types ✅ COMPLETED

### Task 1.1: Create Theme Type Definitions ✅ DONE
**REQ:** REQ-001, REQ-009, REQ-010
**File:** `apps/frontend/src/types/theme.ts`
**Estimate:** 1 hour

1. ✅ Create new file `apps/frontend/src/types/theme.ts`
2. ✅ Define `ColorMode` type: `'light' | 'dark'`
3. ✅ Define `ThemePalette` interface with all color properties
4. ✅ Define `Theme` interface with id, name, description, light/dark palettes
5. ✅ Export all types

**Acceptance:**
- ✅ TypeScript compiles without errors
- ✅ All color properties documented with comments

---

### Task 1.2: Update AppSettings Type ✅ DONE
**REQ:** REQ-005, REQ-017
**File:** `apps/frontend/src/types/index.ts`
**Estimate:** 15 minutes

1. ✅ Add `theme_id?: string` to `AppSettings` interface (line ~370)
2. ✅ Keep existing `dark_mode` field (backward compatibility)

**Acceptance:**
- ✅ TypeScript compiles
- ✅ No breaking changes to existing code

---

### Task 1.3: Add Feature Configuration ✅ DONE
**REQ:** REQ-002
**File:** `apps/frontend/src/config/features.ts`
**Estimate:** 10 minutes

1. ✅ Add `export const DEFAULT_THEME_ID = 'default' as const;`
2. ✅ Add `export const THEME_CUSTOMIZATION_ENABLED = true;` (enabled for feature branch)

**Acceptance:**
- ✅ Constants exported and importable
- ✅ Feature enabled by default for development

---

### Task 1.4: Update Default Settings ✅ DONE
**REQ:** REQ-002
**File:** `apps/frontend/src/constants/index.ts`
**Estimate:** 5 minutes

1. ✅ Add `theme_id: 'default'` to `DEFAULT_APP_SETTINGS` (line ~25)

**Acceptance:**
- ✅ Default settings include theme_id

---

## Phase 2: Theme Library ✅ COMPLETED

### Task 2.1: Create Default Theme ✅ DONE
**REQ:** REQ-001, REQ-002, REQ-011, REQ-018
**File:** `apps/frontend/src/data/themes.ts`
**Estimate:** 2 hours

1. ✅ Create new file
2. ✅ Define `defaultTheme` object with:
   - id: 'default'
   - name: 'themes.default.name'
   - description: 'themes.default.description'
   - isDefault: true
   - previewColors: ['#0096C7', '#0077A5', '#52B788']
   - light palette (copy from current tokens.css :root)
   - dark palette (copy from current tokens.css .dark)
   - contrastRatios: {light: {textOnBackground: 13.5, primaryOnBackground: 4.8}, dark: {...}}

**Acceptance:**
- ✅ Default theme matches current color palette exactly
- ✅ Contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI)

---

### Task 2.2: Create Additional Themes ✅ DONE
**REQ:** REQ-001, REQ-011, REQ-020
**File:** `apps/frontend/src/data/themes.ts`
**Estimate:** 4 hours

1. ✅ Create `energeticTheme` (orange/amber palette)
2. ✅ Create `professionalTheme` (blue palette)
3. ✅ Create `calmTheme` (violet/purple palette)
4. ✅ For each theme:
   - Define complete light palette
   - Define complete dark palette
   - Calculate and verify contrast ratios
   - Add preview colors

**Acceptance:**
- ✅ 4 total themes defined
- ✅ All themes pass WCAG AA contrast checks
- ✅ Each theme has unique visual personality

---

### Task 2.3: Create Theme Library Array ✅ DONE
**REQ:** REQ-001
**File:** `apps/frontend/src/data/themes.ts`
**Estimate:** 30 minutes

1. ✅ Export `THEME_LIBRARY` array with all 4 themes
2. ✅ Create `getDefaultTheme()` function
3. ✅ Create `getAllThemes()` function
4. ✅ Create `getThemeById(id: string)` function with fallback

**Acceptance:**
- ✅ All utility functions work correctly
- ✅ Invalid theme IDs fall back to default

---

## Phase 3: Theme Service ✅ COMPLETED

### Task 3.1: Create ThemeService Class ✅ DONE
**REQ:** REQ-004, REQ-009
**File:** `apps/frontend/src/services/themeService.ts`
**Estimate:** 3 hours

1. ✅ Create singleton service class
2. ✅ Implement `getInstance()` method
3. ✅ Implement `getAllThemes()` - returns THEME_LIBRARY
4. ✅ Implement `getThemeById(id)` - with fallback
5. ✅ Implement `applyTheme(theme, mode)` - injects CSS variables to :root
6. ✅ Implement `validateTheme(theme)` - checks contrast ratios

**Key Logic for applyTheme:**
```typescript
const palette = mode === 'dark' ? theme.dark : theme.light;
const root = document.documentElement;
root.style.setProperty('--color-primary', palette.primary);
// ... repeat for all ~40 CSS variables
```

**Acceptance:**
- ✅ CSS variables update when applyTheme called
- ✅ No inline styles on components (REQ-008)
- ✅ Validation enforces WCAG standards

---

## Phase 4: Theme Context ✅ COMPLETED

### Task 4.1: Create ThemeContext ✅
**REQ:** REQ-004
**File:** `apps/frontend/src/contexts/ThemeContext.tsx`
**Estimate:** 2 hours

1. Define `ThemeContextValue` interface
2. Create React Context
3. Create `useTheme()` hook with error handling
4. Create `ThemeProvider` component:
   - State: currentThemeId
   - Load theme from AppSettings on mount
   - Apply theme via ThemeService when theme/mode changes
   - Provide setTheme function that saves to StorageService

**Acceptance:**
- Context provides theme state globally
- Theme persists across page reloads
- Changes save to IndexedDB

---

### Task 4.2: Integrate ThemeProvider in App ✅
**REQ:** REQ-004
**File:** `apps/frontend/src/App.tsx`
**Estimate:** 30 minutes

1. Import ThemeProvider
2. Wrap app content with `<ThemeProvider>` (near top of component tree)
3. Remove old dark mode CSS class logic (moved to ThemeService)

**Acceptance:**
- App still works
- Dark mode toggle still functions
- No visual regressions

---

## Phase 5: Database & Storage ✅ COMPLETED

### Task 5.1: Create Supabase Migration ✅
**REQ:** REQ-005, REQ-017
**File:** `supabase/migrations/20251027-01-add-theme-preference.sql`
**Estimate:** 45 minutes

1. Create migration file
2. Add `theme_id text DEFAULT 'default'` to app_settings table
3. Add column comment
4. Create index (optional)
5. **Create change tracking document:** `docs/migration-tracking/supabase-changes_20251027.md`
   - Document migration details, reason, affected tables
   - Document rollback procedure
   - Note: Production deployment to be done separately after full verification

**Acceptance:**
- Migration runs successfully on dev Supabase
- Column appears in schema
- Change tracking document created and committed

---

### Task 5.2: Update IndexedDB Schema ✅
**REQ:** REQ-005
**File:** `apps/frontend/src/services/storageService.ts`
**Estimate:** 1 hour

1. Check current IndexedDB version number in storageService.ts
2. Create new version (likely v23 or higher)
3. Add `theme_id` to app_settings index definition
4. Add upgrade function to set default theme for existing records

**Acceptance:**
- Migration runs on app load
- Existing users get theme_id = 'default'
- No data loss
- Version number incremented correctly

---

### Task 5.3: Update Sync Field Mapping ✅
**REQ:** REQ-005
**File:** `apps/frontend/src/services/storageService.ts`
**Estimate:** 30 minutes

1. Add `theme_id` to `convertAppSettingsForSync()` (line ~3570)
2. Add `theme_id` with fallback to `convertAppSettingsFromSync()` (line ~3600)

**Acceptance:**
- Theme syncs to Supabase
- Theme syncs back from Supabase
- Field mapping bidirectional

---

### Task 5.4: Fix Supabase Edge Function Allowlist ✅ CRITICAL FIX
**REQ:** REQ-005
**File:** `supabase/functions/sync_v2/index.ts`
**Estimate:** 1 hour
**Completed:** January 2, 2025

**Issue Discovered:**
The `sync_v2` edge function had 22 missing fields in the `app_settings` MUTABLE_FIELD_ALLOWLIST, causing critical settings to be filtered out during sync operations. This was the **root cause** of theme reversion and other setting persistence issues.

**Missing Fields Identified:**
1. Theme System: `theme_id`
2. Exercise Preferences: `last_selected_exercise_id`
3. Timer Preferences: `ring_timer`
4. Update System: `update_mode`, `allow_auto_updates`, `update_on_metered`
5. AI Coach (10 fields): `coach_enabled`, `coach_show_on_home`, `coach_auto_refresh`, `coach_refresh_interval`, `coach_show_streak`, `coach_show_muscle_balance`, `coach_show_progression`, `coach_show_recovery`, `coach_show_suggestions`, `coach_intro_seen`, `coach_ai_insights_enabled`, `coach_persona`
6. Gamification (2 fields): `coach_post_workout_survey_enabled`, `celebration_sounds_enabled`

**Changes Made:**
1. ✅ Updated `MUTABLE_FIELD_ALLOWLIST` for `app_settings` (lines 74-82)
2. ✅ Added all 22 missing fields to the allowlist
3. ✅ Created migration tracking document: `docs/migration-tracking/supabase-changes_20250102.md`
4. ✅ Deployed to development environment (Version 56, November 3, 2025)
5. ⏳ Ready for testing in development
6. ⏳ Ready for deployment to production (after dev verification)

**Deployment Commands:**
```powershell
# Development (repcue-dev: xwzrsfkzqxdybjrkkkvh)
supabase functions deploy sync_v2 --project-ref xwzrsfkzqxdybjrkkkvh

# Production (RepCue: zumzzuvfsuzvvymhpymk) - After dev testing
supabase functions deploy sync_v2 --project-ref zumzzuvfsuzvvymhpymk
```

**Acceptance:**
- ✅ All AppSettings interface fields included in allowlist
- ✅ Migration tracking document created
- ✅ Deployed to development environment (Version 56)
- ⏳ Theme sync verified in development
- ⏳ Deployed to production environment
- ⏳ Production sync verified

**Impact:**
- Fixes theme reversion across devices
- Enables AI Coach settings sync
- Enables update preferences sync
- Enables gamification state sync
- Complete user experience synchronization

---

## Phase 6: UI Components ✅ COMPLETED

### Task 6.1: Create ThemeSelector Component ✅
**REQ:** REQ-003, REQ-019
**File:** `apps/frontend/src/components/ThemeSelector.tsx`
**Estimate:** 3 hours

1. Create functional component
2. Use `useTheme()` hook
3. Render grid of theme cards (1 column mobile, 2 desktop)
4. Each card shows:
   - Color preview swatches (3-5 colors)
   - Theme name (i18n)
   - Theme description (i18n)
   - Active indicator
5. Handle theme selection with `setTheme()`
6. Ensure 44px touch targets
7. Add ARIA labels

**Acceptance:**
- Works at 320px width
- Theme applies on tap
- Visual feedback on selection
- Accessible via keyboard

---

### Task 6.2: Integrate into SettingsPage ✅
**REQ:** REQ-003, REQ-012
**File:** `apps/frontend/src/pages/SettingsPage.tsx`
**Estimate:** 30 minutes

1. Import ThemeSelector
2. Add new section after dark mode toggle
3. Wrap with feature flag check
4. Keep dark mode toggle separate

**Acceptance:**
- ThemeSelector appears in settings
- Dark mode toggle still works independently
- Feature flag hides/shows component

---

## Phase 7: Styling Updates ✅ COMPLETED

### Task 7.1: Verify tokens.css ✅
**REQ:** REQ-009, REQ-010
**File:** `apps/frontend/src/styles/tokens.css`
**Estimate:** 2 hours

1. Add comment explaining CSS vars are injected dynamically
2. Keep existing variable declarations as fallbacks
3. Remove `.dark` selector overrides (handled by theme system)
4. Add transition effect (300ms, respects prefers-reduced-motion)
5. Verify all semantic classes use CSS variables

**Acceptance:**
- No hardcoded colors in component styles
- Transitions smooth
- Reduced motion respected

---

## Phase 8: Internationalization

### Task 8.1: Add English Translations
**REQ:** REQ-020
**Files:** `apps/frontend/public/locales/en/settings.json`, `themes.json`
**Estimate:** 30 minutes

1. Add theme section to settings.json
2. Create new themes.json with all theme names/descriptions
3. Keys: themes.{themeId}.{name|description}

**Acceptance:**
- All strings in i18n files
- No hardcoded English in components

---

### Task 8.2: Add Arabic Translations
**REQ:** REQ-020
**Files:** `apps/frontend/public/locales/ar/settings.json`, `themes.json`
**Estimate:** 45 minutes

1. Add theme section to ar/settings.json
2. Create ar/themes.json with Arabic translations
3. Ensure RTL compatibility of theme names

**Acceptance:**
- Arabic translations complete
- RTL text displays correctly

---

### Task 8.3: Add Placeholder Translations for Remaining Languages
**REQ:** REQ-020
**Files:** `apps/frontend/public/locales/{ar-EG,de,es,fr,fy,nl}/`
**Estimate:** 30 minutes

1. Copy English structure to remaining 6 languages
2. Use English text as placeholders (to be translated later)
3. Run `pnpm i18n:scan` to verify no missing keys

**Acceptance:**
- All languages have theme keys (with placeholder English text)
- No missing key warnings
- i18n scan passes

---

## Phase 9: Testing (All-in-one, Unit Tests First)

**Strategy:** Implement all tests in single PR, starting with unit tests, then integration, then E2E.

### Task 9.1: Unit Tests - ThemeService
**File:** `apps/frontend/src/services/__tests__/themeService.test.ts`
**Estimate:** 2 hours
**Priority:** HIGH (implement first)

Tests:
- getAllThemes returns 4+ themes
- getThemeById returns correct theme
- getThemeById falls back to default
- applyTheme injects all CSS variables
- validateTheme enforces WCAG ratios

---

### Task 9.2: Unit Tests - ThemeContext
**File:** `apps/frontend/src/contexts/__tests__/ThemeContext.test.tsx`
**Estimate:** 2 hours
**Priority:** HIGH (implement first)

Tests:
- Provider loads theme from settings
- setTheme updates context
- setTheme saves to storage
- Theme applies on mount

---

### Task 9.3: Integration Tests - Storage
**File:** `apps/frontend/src/services/__tests__/storageService.theme.test.ts`
**Estimate:** 2 hours

Tests:
- theme_id persists to IndexedDB
- theme_id marks record dirty
- Field mapping works both ways
- Migration sets default for existing records

---

### Task 9.4: Integration Tests - Sync
**File:** `apps/frontend/src/services/__tests__/syncService.theme.test.ts`
**Estimate:** 2 hours

Tests:
- Theme syncs to Supabase
- Theme syncs from Supabase
- Conflict resolution works
- Offline changes queue correctly

---

### Task 9.5: E2E Tests
**File:** `apps/frontend/cypress/e2e/themeCustomization.cy.ts`
**Estimate:** 3 hours

Tests:
- Theme selector displays all themes
- Theme applies immediately
- Theme persists across navigation
- Theme syncs when authenticated
- Works in dark mode
- Respects reduced motion
- Works on mobile viewport

---

### Task 9.6: Accessibility Testing
**Manual testing**
**Estimate:** 2 hours

1. Run axe-core on each theme
2. Verify contrast ratios
3. Test keyboard navigation
4. Test screen reader announcements
5. Test focus indicators

---

## Phase 10: Documentation & Deployment

### Task 10.1: Update README
**File:** `README.md`
**Estimate:** 30 minutes

1. Add theme customization to features list
2. Document feature flag

---

### Task 10.2: Update CHANGELOG
**File:** `CHANGELOG.md`
**Estimate:** 15 minutes

1. Add new entry with today's date
2. List: Theme customization feature with 4 preset themes

---

### Task 10.3: Deploy to Development
**Estimate:** 1 hour

1. Apply Supabase migration to dev environment using MCP tools
2. Test on dev deployment
3. Verify sync works
4. Document in change tracking file

**Note:** Production deployment will be done in a separate task after full feature verification and explicit user approval.

---

### Task 10.4: Deploy to Production (SEPARATE PHASE)
**Estimate:** 1 hour
**When:** After user explicitly requests production deployment

1. Apply Supabase migration to prod environment using mcp_supabase-prod_* tools
2. Deploy frontend to production
3. Monitor for errors
4. Verify sync success rate
5. Update change tracking document with production deployment date

---

## Summary

**Total Phases:** 10
**Total Tasks:** 32
**Estimated Time:** 40-45 hours

**Critical Path:**
1. Phase 1: Foundation (2.5h)
2. Phase 2: Theme Library (6.5h)
3. Phase 3: Theme Service (3h)
4. Phase 4: Theme Context (2.5h)
5. Phase 6: UI Components (3.5h)
6. Phase 5: Database (2h)
7. Phase 7: Styling (2h)
8. Phase 8: i18n (2.5h)
9. Phase 9: Testing (13h)
10. Phase 10: Deploy (2.5h)

**Dependencies:**
- Phase 1 must complete before all others
- Phase 2-4 can run in parallel after Phase 1
- Phase 5 independent (can run anytime)
- Phase 6 depends on Phase 4
- Phase 7 can run anytime
- Phase 8 can run anytime
- Phase 9 depends on Phases 1-8 complete
- Phase 10 last

**Rollback Plan:**
- Set `THEME_CUSTOMIZATION_ENABLED = false` to hide feature
- Database rollback: `ALTER TABLE app_settings DROP COLUMN theme_id`
