# Implementation Plan: Theme System
**Epic:** User Theme Customization
**Version:** 1.0
**Date:** 2025-10-26

---

## Phase 1: Foundation & Types

### Task 1.1: Create Theme Type Definitions
**REQ:** REQ-001, REQ-009, REQ-010
**File:** `apps/frontend/src/types/theme.ts`
**Estimate:** 1 hour

1. Create new file `apps/frontend/src/types/theme.ts`
2. Define `ColorMode` type: `'light' | 'dark'`
3. Define `ThemePalette` interface with all color properties
4. Define `Theme` interface with id, name, description, light/dark palettes
5. Export all types

**Acceptance:**
- TypeScript compiles without errors
- All color properties documented with comments

---

### Task 1.2: Update AppSettings Type
**REQ:** REQ-005, REQ-017
**File:** `apps/frontend/src/types/index.ts`
**Estimate:** 15 minutes

1. Add `theme_id?: string` to `AppSettings` interface (line ~370)
2. Keep existing `dark_mode` field (backward compatibility)

**Acceptance:**
- TypeScript compiles
- No breaking changes to existing code

---

### Task 1.3: Add Feature Configuration
**REQ:** REQ-002
**File:** `apps/frontend/src/config/features.ts`
**Estimate:** 10 minutes

1. Add `export const DEFAULT_THEME_ID = 'default' as const;`
2. Add `export const THEME_CUSTOMIZATION_ENABLED = true;`

**Acceptance:**
- Constants exported and importable

---

### Task 1.4: Update Default Settings
**REQ:** REQ-002
**File:** `apps/frontend/src/constants/index.ts`
**Estimate:** 5 minutes

1. Add `theme_id: 'default'` to `DEFAULT_APP_SETTINGS` (line ~25)

**Acceptance:**
- Default settings include theme_id

---

## Phase 2: Theme Library

### Task 2.1: Create Default Theme
**REQ:** REQ-001, REQ-002, REQ-011, REQ-018
**File:** `apps/frontend/src/data/themes.ts`
**Estimate:** 2 hours

1. Create new file
2. Define `defaultTheme` object with:
   - id: 'default'
   - name: 'themes.default.name'
   - description: 'themes.default.description'
   - isDefault: true
   - previewColors: ['#0096C7', '#0077A5', '#52B788']
   - light palette (copy from current tokens.css :root)
   - dark palette (copy from current tokens.css .dark)
   - contrastRatios: {light: {textOnBackground: 13.5, primaryOnBackground: 4.8}, dark: {...}}

**Acceptance:**
- Default theme matches current color palette exactly
- Contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI)

---

### Task 2.2: Create Additional Themes
**REQ:** REQ-001, REQ-011, REQ-020
**File:** `apps/frontend/src/data/themes.ts`
**Estimate:** 4 hours

1. Create `energeticTheme` (orange/amber palette)
2. Create `professionalTheme` (blue palette)
3. Create `calmTheme` (violet/purple palette)
4. For each theme:
   - Define complete light palette
   - Define complete dark palette
   - Calculate and verify contrast ratios
   - Add preview colors

**Acceptance:**
- 4 total themes defined
- All themes pass WCAG AA contrast checks
- Each theme has unique visual personality

---

### Task 2.3: Create Theme Library Array
**REQ:** REQ-001
**File:** `apps/frontend/src/data/themes.ts`
**Estimate:** 30 minutes

1. Export `THEME_LIBRARY` array with all 4 themes
2. Create `getDefaultTheme()` function
3. Create `getAllThemes()` function
4. Create `getThemeById(id: string)` function with fallback

**Acceptance:**
- All utility functions work correctly
- Invalid theme IDs fall back to default

---

## Phase 3: Theme Service

### Task 3.1: Create ThemeService Class
**REQ:** REQ-004, REQ-009
**File:** `apps/frontend/src/services/themeService.ts`
**Estimate:** 3 hours

1. Create singleton service class
2. Implement `getInstance()` method
3. Implement `getAllThemes()` - returns THEME_LIBRARY
4. Implement `getThemeById(id)` - with fallback
5. Implement `applyTheme(theme, mode)` - injects CSS variables to :root
6. Implement `validateTheme(theme)` - checks contrast ratios

**Key Logic for applyTheme:**
```typescript
const palette = mode === 'dark' ? theme.dark : theme.light;
const root = document.documentElement;
root.style.setProperty('--color-primary', palette.primary);
// ... repeat for all ~40 CSS variables
```

**Acceptance:**
- CSS variables update when applyTheme called
- No inline styles on components (REQ-008)
- Validation enforces WCAG standards

---

## Phase 4: Theme Context

### Task 4.1: Create ThemeContext
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

### Task 4.2: Integrate ThemeProvider in App
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

## Phase 5: Database & Storage

### Task 5.1: Create Supabase Migration
**REQ:** REQ-005, REQ-017
**File:** `supabase/migrations/20251026-01-add-theme-preference.sql`
**Estimate:** 30 minutes

1. Create migration file
2. Add `theme_id text DEFAULT 'default'` to app_settings table
3. Add column comment
4. Create index (optional)

**Acceptance:**
- Migration runs successfully on dev Supabase
- Column appears in schema

---

### Task 5.2: Update IndexedDB Schema
**REQ:** REQ-006
**File:** `apps/frontend/src/services/storageService.ts`
**Estimate:** 1 hour

1. Add version 23 to RepCueDatabase
2. Add `theme_id` to app_settings index definition
3. Add upgrade function to set default theme for existing records

**Acceptance:**
- Migration runs on app load
- Existing users get theme_id = 'default'
- No data loss

---

### Task 5.3: Update Sync Field Mapping
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

## Phase 6: UI Components

### Task 6.1: Create ThemeSelector Component
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

### Task 6.2: Integrate into SettingsPage
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

## Phase 7: Styling Updates

### Task 7.1: Update tokens.css
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

### Task 8.2: Translate to Other Languages
**REQ:** REQ-020
**Files:** `apps/frontend/public/locales/{ar,ar-EG,de,es,fr,fy,nl}/`
**Estimate:** 2 hours

1. Copy English structure to all 7 languages
2. Translate theme names and descriptions
3. Run `pnpm i18n:scan` to verify

**Acceptance:**
- All languages have theme translations
- No missing keys

---

## Phase 9: Testing

### Task 9.1: Unit Tests - ThemeService
**File:** `apps/frontend/src/services/__tests__/themeService.test.ts`
**Estimate:** 2 hours

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

1. Apply Supabase migration to dev environment
2. Test on dev deployment
3. Verify sync works

---

### Task 10.4: Deploy to Production
**Estimate:** 1 hour

1. Apply Supabase migration to prod environment
2. Deploy frontend
3. Monitor for errors
4. Verify sync success rate

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
