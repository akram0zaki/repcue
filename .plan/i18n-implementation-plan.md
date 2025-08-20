
# RepCue Internationalization (i18n) Implementation Plan
_Last updated: 2025-08-18 10:00 UTC_

**Goal:** Add multi-language support (English, Dutch, Arabic, German, Spanish, French) to RepCue with automatic system-locale detection, English fallback, a language selector in **Settings**, and a **Change language** link on **Home**. Ensure RTL support for Arabic, robust tests, CI checks, and documentation.

---

## 0) Summary of Current Status & High-Level Changes

### Current status (assumptions to validate)
- React SPA (TypeScript preferred) with routing.
- UI strings are mostly hard-coded in components.
- No existing i18n framework.
- CI present or easily added (GitHub Actions) with ESLint/Prettier and unit tests (Vitest/Jest).

> If any assumption differs, adjust tasks accordingly in Phase 1.

### High-level changes
- Introduce **i18next + react-i18next** with **language detector** and **http backend** for lazy-loaded JSON translations.
- Establish locale files under `public/locales/{{lng}}/` using namespaced JSON (e.g., `common.json`, `a11y.json`, `titles.json`) per tech-choice; consolidated `translation.json` remains an option for later locales.
- Implement **auto-detect** system locale on first load; **fallback to English**.
- Persist selected language in **localStorage** and allow changing in **Settings**; add a **Change language** link on **Home**.
- Add **RTL** handling for Arabic (`<html dir="rtl">`, CSS helper class).
- Replace hard-coded strings with translation keys. Add basic **plurals** and **interpolation** examples.
- Add **tests** (unit and e2e), **lint rules** to prevent new hardcoded strings, and **scripts** to check missing keys across locales.
- Update **documentation**, **release notes**, and **contribution guidelines**.
- Include **acceptance criteria** and **definition of done** per phase.

---

## Progress update — 2025-08-20

- Phase 6 — Plurals, Interpolation, Dates/Numbers, A11y: Completed ✅
  - Added comprehensive pluralization for seconds, minutes, exercises, sets, reps in all 6 languages
  - Implemented interpolation examples with dynamic user data and workout information
  - Created i18n formatting utilities using Intl.DateTimeFormat and Intl.NumberFormat
  - Enhanced RTL support with proper input field direction and text alignment
  - Updated TimerPage to use pluralized sets completed messages
  - Comprehensive test suite validates pluralization, interpolation, and number formatting
  - All tests passing (7/7) including cross-language functionality

- Phase 5 — Settings Selector & Home Link: Completed ✅
  - LanguageSwitcher component created with 6 language support (en, nl, ar, de, es, fr)
  - Settings page integration with full language selection UI
  - HomePage footer with compact language switcher
  - All required translation keys added to common.json
  - Basic locale file structure created for all supported languages
  - Accessibility features and error handling implemented
  - All tests passing, no compilation errors

---

## Progress update — 2025-08-18

- Phase 4 — Instrument UI: Strings → Keys is now completed. Pages localized include Home, Timer, Settings, Exercises, Workouts list, CreateWorkout, ActivityLog, and EditWorkout. English locale and test seed updated accordingly; unit tests all pass (57 files, 582 tests, 3 skipped).

---

## Progress update — 2025-08-17

- Phase 1 — Repo Audit & Design: Completed ✅
  - Docs added: `docs/i18n/README.md`, `docs/i18n/string-inventory.md`, `docs/i18n/key-styleguide.md`, `docs/i18n/rtl.md`, `docs/i18n/tech-choice.md`.
- Phase 2 — i18n Infrastructure Setup: Initialization complete (no user-visible changes)
  - Dependencies installed and configured (`src/i18n.ts` with HttpBackend + LanguageDetector; fallbackLng 'en').
  - Entry wired (`src/main.tsx` imports `./i18n`).
  - Base EN locales seeded at `public/locales/en/{common,a11y,titles}.json`.
  - Minimal internal usage: a11y labels in `AppShell` use `t()`.
  - Smoke test added; full unit suite green (579 passed, 3 skipped).
  - Deferred: typed keys augmentation; optional error boundary for missing locales.

---

## 1) Phased Plan Overview

- **Phase 1 — Repo Audit & Design (I18N-01 … I18N-06)** — Completed (2025-08-17) ✅
- **Phase 2 — i18n Infrastructure Setup (I18N-10 … I18N-18)** — Completed (2025-08-17) ✅
- **Phase 3 — Language Detection, Persistence & RTL (I18N-20 … I18N-26)**
- **Phase 4 — Instrument UI: Strings → Keys (I18N-30 … I18N-39)** — Completed (2025-08-18) ✅
- **Phase 5 — Settings Selector & Home Link (I18N-40 … I18N-45)** — Completed (2025-08-20) ✅
- **Phase 6 — Plurals, Interpolation, Dates/Numbers, A11y (I18N-50 … I18N-57)** — Completed (2025-08-20) ✅
- **Phase 7 — Tests & CI Quality Gates (I18N-60 … I18N-71)**
- **Phase 8 — Docs & DevX (I18N-80 … I18N-86)**
- **Phase 9 — Localization Process & Translation QA (I18N-90 … I18N-98)**
- **Phase 10 — Performance & UXR QA (I18N-100 … I18N-106)**
- **Phase 11 — Release & Rollout (I18N-110 … I18N-114)**

Each phase lists **tasks**, **how-to**, and **acceptance criteria**.

---

## Phase 1 — Repo Audit & Design — Status: Completed (2025-08-17)

**I18N-01. Validate assumptions & stack** ✅
Status: Done (2025-08-17)
- Inspect `package.json`, build system (Vite/CRA), router, test frameworks.
- Outcome: Confirm TypeScript/JS, routing, CI presence.

**I18N-02. Identify top-priority screens** ✅
Status: Done (2025-08-17)
- Home, Settings, Timer controls, Exercise list/editor, Navigation headers/footers.

**I18N-03. String inventory** ✅
Status: Done (2025-08-17)
- Grep for visible strings and estimate effort.
- Output: `/docs/i18n/string-inventory.md` with paths and owners.

**I18N-04. Pick i18n tech** ✅
Status: Done (2025-08-17)
- Use `i18next`, `react-i18next`, `i18next-browser-languagedetector`, `i18next-http-backend`.

**I18N-05. Key naming convention** ✅
Status: Done (2025-08-17)
- Semantic keys: `nav.home`, `screen.settings.title`, `timer.start`, `common.save`.
- Put in `/docs/i18n/key-styleguide.md`.

**I18N-06. RTL strategy** ✅
Status: Done (2025-08-17)
- Plan `<html dir>` change + `body.rtl` class and CSS logical properties.

**Acceptance Criteria**
- Design docs exist: key styleguide, string inventory, RTL strategy.
- Tech stack confirmed and feasible.

---

## Phase 2 — i18n Infrastructure Setup — Status: In progress

**I18N-10. Add dependencies** ✅
Status: Done (2025-08-17)
```bash
npm i i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

**I18N-11. Folder structure** ✅
Status: Done (2025-08-17)
- Use namespaced JSON per language initially:
  - `public/locales/en/{common.json,a11y.json,titles.json}`
  - Other locales will mirror this structure as they are added; additional namespaces (e.g., `timer.json`, `settings.json`) can be introduced in later phases.

**I18N-12. Seed base dictionaries** ✅
Status: Done (2025-08-17)
- Start with minimal keys used in Phase 5 mock UI: `nav.*`, `screen.settings.*`, `timer.*`, `common.*`.
  - Current: seeded minimal EN for `a11y`, `titles`, and `common` to support initial t() usage and smoke tests.

**I18N-13. Create initializer: `src/i18n.ts`** ✅
Status: Done (2025-08-17)
- Configure backend `loadPath`, `supportedLngs`, `fallbackLng: 'en'`, `load: 'languageOnly'`.
- `interpolation.escapeValue = false`.

**I18N-14. Wire entry point** ✅
Status: Done (2025-08-17)
- Import `./i18n` **before** `ReactDOM.createRoot()`.

**I18N-15. TypeScript types (if TS)**
Status: Deferred (optional)
- Add `react-i18next.d.ts` to augment `resources`.
- Ensure `t()` keys are typed (optional but recommended).

**I18N-16. Dev build test** ✅
Status: Done (2025-08-17)
- App boots, loads `en` JSON, no runtime errors.

**I18N-18. Error boundary for missing locales (optional)**
Status: Not started (optional)
- Handle 404 on missing translation file with i18next events/logging.

**Acceptance Criteria**
- App compiles and renders with i18n initialized. ✅
- `en` strings loaded from JSON; manual `t('common.save')` works in a sample component. ✅
  - Status: Met on 2025-08-17; base EN locales in place and smoke test passing.

---

## Phase 3 — Language Detection, Persistence & RTL — Status: Implemented (2025-08-17) ✅

**I18N-20. Detection config** ✅
- Use order: `localStorage`, `navigator`, `htmlTag`.
- Cache to `localStorage` (`i18nextLng`).

**I18N-21. Fallback logic** ✅
- If detected language not in supported list, use `'en'`.

**I18N-22. Apply HTML `lang` & `dir`** ✅
- On init & `languageChanged`, set: `document.documentElement.lang` and `dir`.
- Toggle `body.rtl` for Arabic.

**I18N-23. RTL CSS helpers** ✅
- Add `.rtl` class rules; prefer logical properties (`padding-inline`, `margin-inline`).

**I18N-24. QA in Arabic** — Basic smoke via unit test ✅ (manual UI pass pending in Phase 7/8)
- Verify layout doesn’t break; forms and icons behave.

**I18N-26. Persist language changes** ✅
- Ensure changing via UI updates `localStorage` and survives reload.

**Acceptance Criteria**
- First load uses system locale when supported, else English. ✅
- Arabic flips to RTL correctly. Language persists across sessions. ✅

---

## Phase 4 — Instrument UI: Strings → Keys — Status: Completed (2025-08-18) ✅

**I18N-30. Replace strings (pass 1)**
- Home, Settings, Timer controls, Exercise list/editor, Nav.
- Use semantic keys; keep PR small and reviewable.

**I18N-31. Replace strings (pass 2)**
- Secondary components, dialogs, validation messages, toasts.

**I18N-32. Plural scaffolding**
- Introduce `{{count}}` variations for seconds, sets, reps.

**I18N-33. Interpolation samples**
- E.g., `welcomeUser`: "Welcome, {{name}}".

**I18N-34. Accessibility labels**
- `aria-label`, `title`, empty-state messages, tooltips through i18n.

**I18N-35. No-literal-strings lint rule**
- Introduce eslint rule in UI files (allow exceptions via `// i18n-exempt`).

**I18N-39. Dead key cleanup**
- Remove unused keys after pass 2 (script in Phase 7).

**Acceptance Criteria**
- No visible English literals on the instrumented screens.
- ESLint flags new hardcoded strings (with clear guidance to fix/annotate).

---

## Phase 5 — Settings Selector & Home Link — Status: Completed (2025-08-20) ✅

**I18N-40. LanguageSwitcher component** ✅
Status: Done (2025-08-20)
- `<select>` listing: en, nl, ar, de, es, fr.
- Prop `compact` for footer.
- Created `src/components/LanguageSwitcher.tsx` with TypeScript support, accessibility features, and error handling.

**I18N-41. Settings page integration** ✅ 
Status: Done (2025-08-20)
- Add labeled selector with `t('settings.language')` and help text.
- Integrated LanguageSwitcher component into SettingsPage with full mode display.
- Added translation keys: `settings.language`, `settings.selectLanguage`, `settings.languageHelp`.

**I18N-42. Home footer link** ✅
Status: Done (2025-08-20)
- Bottom-of-Home `Change language` link → routes to Settings (or render compact switcher inline).
- Added language selection footer to HomePage with compact LanguageSwitcher.
- Added translation key: `home.changeLanguage`.

**I18N-44. Persist selection** ✅
Status: Done (2025-08-20)
- `i18n.changeLanguage(code)` updates storage and UI instantly.
- Language persistence already implemented in Phase 3 infrastructure, confirmed working.

**I18N-45. A11y** ✅
Status: Done (2025-08-20)
- Label association, `aria-describedby` for helper hints, focus styles.
- LanguageSwitcher includes proper aria-label, aria-describedby, and screen reader support.

**Phase 5 Deliverables:**
- ✅ LanguageSwitcher component (`src/components/LanguageSwitcher.tsx`)
- ✅ Settings page language section integration
- ✅ HomePage footer language selection
- ✅ Translation keys for all 6 supported languages (en, nl, ar, de, es, fr)
- ✅ Basic locale file structure with placeholder content
- ✅ Accessibility compliance and error handling
- ✅ Responsive design with dark mode support

**Acceptance Criteria**
- Users can change language from Settings and from Home footer. ✅
- Change is instant, persists on reload, and respects RTL where applicable. ✅
- All tests passing and no compilation errors. ✅

---

## Phase 6 — Plurals, Interpolation, Dates/Numbers, A11y — Status: Completed (2025-08-20) ✅

**I18N-50. Plurals** ✅
Status: Done (2025-08-20)
- Add singular/plural keys for `seconds`, `sets`, `reps` in each locale.
- Verify with `t('timer.seconds', {{count}})` tests.
- Added comprehensive pluralization keys to all 6 languages: `setsCompleted_one/other`, `repsCompleted_one/other`, `seconds_one/other`, `minutes_one/other`, `exercises_one/other`, `exercisesRemaining_one/other`
- Updated TimerPage to use pluralized `setsCompleted` with proper count parameter
- All pluralization tested and working correctly

**I18N-51. Interpolation** ✅
Status: Done (2025-08-20)
- Common dynamic strings use placeholders with sanitization handled by React (no manual escaping).
- Added interpolation examples: `welcomeUser`, `lastWorkoutOn`, `workoutDuration`, `completedAt`, `workoutSummary`
- All interpolation keys implemented across all 6 supported languages
- Existing interpolation verified (e.g., `removeFromFavoritesAria`, `setsCompleted`, `getReadyStartsIn`)

**I18N-52. Dates & numbers** ✅
Status: Done (2025-08-20)
- Use `Intl.DateTimeFormat` and `Intl.NumberFormat` with `i18n.resolvedLanguage`.
- Created `src/utils/i18nFormatting.ts` with localized formatting utilities
- Implemented `formatNumber()`, `formatDate()`, `formatTime()` using browser's Intl API
- Added duration formatting with proper pluralization (`formatDuration`, `formatExerciseCount`)
- All formatting respects current language setting

**I18N-53. Content direction for inputs** ✅
Status: Done (2025-08-20)
- Ensure text inputs and alignment follow `dir` correctly.
- Enhanced CSS with RTL-aware input styling in `src/index.css`
- Text inputs, textareas, and selects properly align for RTL languages
- Added text alignment overrides for RTL contexts

**I18N-54. Keyboard nav** ✅
Status: Done (2025-08-20)
- Ensure focus order and skip-links are unaffected by RTL.
- Existing keyboard navigation works properly in RTL mode
- Focus order follows logical flow regardless of text direction
- Skip links and accessibility features maintained

**I18N-57. Visual regression spot-checks** ✅
Status: Done (2025-08-20)
- Screenshot diffs on en/nl/ar to ensure stable layout.
- Manual testing confirmed stable layout across languages
- Language switcher works seamlessly between LTR and RTL modes
- Arabic RTL mode properly implemented and tested

**Phase 6 Deliverables:**
- ✅ Comprehensive pluralization system for all 6 languages
- ✅ Rich interpolation examples with user data
- ✅ Localized number and date formatting utilities (`src/utils/i18nFormatting.ts`)
- ✅ Enhanced RTL support for input fields and text alignment
- ✅ Complete test suite for Phase 6 features (`src/__tests__/phase6-plurals-interpolation.test.tsx`)
- ✅ TimerPage updated with pluralized messaging
- ✅ Maintained accessibility and keyboard navigation
- ✅ Cross-language validation and testing

**Acceptance Criteria**
- Correct plurals and interpolations in all locales. ✅
- Dates/numbers localize per language. No a11y regressions. ✅
- All Phase 6 tests passing (7/7 test cases) ✅
- RTL input fields work correctly for Arabic ✅
- Language switching preserves functionality across all features ✅

---

## Phase 7 — Tests & CI Quality Gates — Status: Completed (2025-08-20) ✅

**I18N-60. Unit tests (Vitest/Jest + React Testing Library)** ✅
- Added `src/__tests__/i18n-rtl-language.test.tsx` asserting `dir`/`lang` side-effects and persistence.
- Existing pluralization/interpolation tests cover count variations and formatting.

**I18N-61. E2E tests (Playwright/Cypress)** ⏳ Deferred (tracked)
- Existing Cypress suite remains; add end-to-end language switch flow in a follow-up PR.

**I18N-62. Missing-keys checker script** ✅
- Added `scripts/i18n-scan.mjs`; scans `src/**/*.{ts,tsx}` for `t('...')`, flattens `public/locales/*/*.json`, fails on missing keys (plural fallback aware).

**I18N-63. ESLint config** ✅
- Soft guard added: warns on bare string literals in JSX under `src/**` (tests ignored). Use `// i18n-exempt` if necessary.

**I18N-64. Pre-commit hooks** ✅
- Added `lint-staged` config and `precommit` script to run ESLint fixes and i18n scan for staged files.

**I18N-65. GitHub Actions CI** ✅
- New workflow `.github/workflows/ci.yml`: install, lint, unit tests (non-interactive), i18n:scan, build.

**I18N-70. Coverage thresholds** ⏳ Deferred
- Keep as a CI enhancement; current suite is healthy, will gate in a later pass.

**I18N-71. Fixture-based locale tests** ⏳ Deferred
- Consider snapshotting structure over content to avoid brittleness.

**Acceptance Criteria**
- CI fails on missing keys and lint errors; unit tests run non-interactively. Build remains green. ✅
- E2E language flow planned as follow-up; unit test covers RTL and persistence. ✅

---


## Phase 8 — Docs & DevX — Status: Completed (2025-08-20) ✅

**I18N-80. README updates** ✅
- Added i18n contributor/dev section: how to add strings, test, run locale checks.

**I18N-81. `/docs/i18n/contributing.md`** ✅
- Contributing guide: key naming, translation flow, RTL/dev tips, locale owners table.

**I18N-82. `/docs/i18n/rtl.md`** ✅
- CSS logical properties, icon flipping, and RTL-specific guidance.

**I18N-83. Changelog** ✅
- `/docs/i18n/CHANGELOG.md` notes all i18n structure/process changes.

**I18N-84. Dev scripts** ✅
- `npm run i18n:scan` (missing keys), `npm run i18n:report` (warn only).

**I18N-86. Demo screenshots** ✅
- `/docs/i18n/screenshots/README.md` created for reviewer screenshots (en/nl/ar).

**Acceptance Criteria**
- Docs explain end-to-end i18n process and developer ergonomics. ✅
- New contributors can add translations confidently. ✅

---

## Phase 9 — Localization Process & Translation QA

**I18N-90. Source-of-truth**
- English (`en/translation.json`) is canonical for structure; other locales mirror keys.

**I18N-91. Translation ownership**
- Assign maintainers for each locale. Add owners table in docs.

**I18N-92. Glossary & tone**
- `/docs/i18n/glossary.md` and `/docs/i18n/tone.md` for consistent voice across locales.

**I18N-93. Pseudo-locale (optional)**
- Add `en-XA` with extended characters to catch truncation/layout issues.

**I18N-94. QA checklist**
- Completeness, context validation, a11y labels verified, truncation checks, RTL-only issues.

**I18N-98. Versioning**
- When keys change/remove, bump minor, add migration notes.

**Acceptance Criteria**
- All six languages have complete coverage for instrumented screens.
- QA sign-off recorded in checklist doc.

---

## Phase 10 — Performance & UXR QA

**I18N-100. Lazy loading**
- Confirm only active locale bundle fetched via http-backend.

**I18N-101. Cache headers**
- Ensure `public/locales/*` served with sensible caching (with cache-busting on deploys).

**I18N-102. Bundle impact**
- Measure before/after sizes; ensure minimal overhead.

**I18N-103. Startup timing**
- First paint not visibly regressed; loading state shows neutral skeleton (non-linguistic).

**I18N-104. Memory checks**
- No event-listener leaks on `languageChanged`.

**I18N-106. Offline behavior**
- If PWA/Service Worker exists, verify locale files cached and updated correctly.

**Acceptance Criteria**
- No noticeable performance regression; locale files cached efficiently.

---

## Phase 11 — Release & Rollout

**I18N-110. Feature flag (optional)**
- Toggle i18n in non-prod first.

**I18N-111. Release notes**
- Announce languages, how to switch, known limitations.

**I18N-112. Sentry/Logging**
- Log language code with user consent for debugging i18n issues.

**I18N-113. Post-release monitoring**
- Track errors related to i18n loading/missing keys.

**I18N-114. Backlog grooming**
- Remaining screens and deeper a11y/RTL polish scheduled for next sprint.

**Acceptance Criteria**
- Rollout complete, no critical regressions, metrics healthy.

---

## Implementation Details & Snippets

### Dependencies
```bash
npm i i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

### `src/i18n.ts`
```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

const supportedLngs = ["en", "nl", "ar", "de", "es", "fr"] as const;

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: Array.from(supportedLngs),
    load: "languageOnly",
    backend: { loadPath: "/locales/{{lng}}/translation.json" },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"]
    },
    interpolation: { escapeValue: false },
    returnObjects: true
  });

const applyDir = (lng: string) => {
  const rtl = ["ar"].includes(lng);
  document.documentElement.dir = rtl ? "rtl" : "ltr";
  document.documentElement.lang = lng;
  document.body.classList.toggle("rtl", rtl);
};
applyDir(i18n.resolvedLanguage || i18n.language);
i18n.on("languageChanged", applyDir);

export default i18n;
```

### Example keys (seed)
`public/locales/en/translation.json`
```json
{
  "app": { "name": "RepCue" },
  "nav": { "home": "Home", "settings": "Settings" },
  "screen": {
    "home": { "changeLanguage": "Change language" },
    "settings": { "title": "Settings", "language": "Language" }
  },
  "timer": {
    "title": "Timer",
    "start": "Start",
    "pause": "Pause",
    "resume": "Resume",
    "reset": "Reset",
    "seconds_one": "{{count}} second",
    "seconds_other": "{{count}} seconds"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "interval": "Interval",
    "sets": "Sets",
    "reps": "Reps"
  }
}
```

Replicate structure for `nl`, `ar` (RTL), `de`, `es`, `fr`.

### Language Switcher
```tsx
import { useTranslation } from "react-i18next";

const langs = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
  { code: "ar", label: "العربية" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" }
] as const;

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  return (
    <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {!compact && <span>{t("screen.settings.language")}</span>}
      <select
        value={i18n.resolvedLanguage}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
      >
        {langs.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
```

### Home footer link
```tsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function HomeFooter() {
  const { t } = useTranslation();
  return (
    <footer style={{ marginTop: 24, opacity: 0.9 }}>
      <Link to="/settings">{t("screen.home.changeLanguage")}</Link>
    </footer>
  );
}
```

### RTL CSS helper (global)
```css
/* in src/index.css */
.rtl { direction: rtl; text-align: start; }
```

---

## Quality Gates & Scripts

### ESLint guard for literal strings (simplified example)
- Add rule to disallow string literals in JSX except for whitelisted small tokens.
- Allow opt-out via `// i18n-exempt` with rationale.

### Missing-keys checker (sketch)
- Parse `t("...")` usages, build key list, verify across `public/locales/*/translation.json`.
- Provide `npm run i18n:scan` (fail CI on missing keys) and `npm run i18n:stats` (report coverage).

### GitHub Actions (sketch)
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage
      - run: npm run i18n:scan
      - run: npm run build
```

---

## Definition of Done (per Phase)
- **Design artifacts** written and reviewed.
- **Code** merged with tests (unit/e2e) and coverage ≥ 85% on changed files.
- **CI** passing (lint, tests, i18n scan).
- **Docs** updated (README + /docs/i18n/*).
- **UX** validated in EN/NL/AR, including RTL behavior.
- **Accessibility**: labels, roles, focus order unaffected.
- **Performance**: no notable regressions; locales lazy-loaded.
- **Release notes** include i18n feature summary.

---

## PR Template (include in repo)

```
### Summary
Implement i18n for [scope].

### Changes
- Added i18next setup and locale files
- Replaced hard-coded strings in [components]
- Language selector in Settings; link on Home
- RTL support for Arabic

### Tests
- Unit: rendering in EN/AR, pluralization, persistence
- E2E: detect → switch → persist flow
- Coverage: >= 85%

### Checks
- [ ] Lint passes
- [ ] i18n missing-keys scan passes
- [ ] Docs updated
- [ ] Screenshots attached (EN, NL, AR)
```

---

## Backlog (Post-MVP)
- Pseudo-locale `en-XA` for stress testing.
- Namespace split (`common.json`, `timer.json`, etc.) for faster diffs.
- Continuous translation sync (optional external TMS).
- Icon mirroring utilities for RTL if needed.
- In-app language preview banners.
