# RepCue Internationalization Guide

This guide collects the must-knows, best practices, and day-to-day workflows for working with RepCue’s internationalization (i18n) stack. It complements the focused docs in `docs/i18n/` by giving you a single reference when adding UI strings, translating locale files, or onboarding a new language.

---

## 1. Must-knows at a glance

- **Canonical locale**: `en` (English). Every new key starts here; all other locales fall back to it.
- **Supported locales**: `en`, `nl`, `fy`, `ar`, `ar-EG`, `de`, `es`, `fr` (see `supportedLngs` in `apps/frontend/src/i18n.ts`).
- **Fallback logic**: `ar-EG → ar → en`, all others → `en`.
- **Namespaces (files)**: `common`, `titles`, `a11y`, `exercises`, `auth`, `catalogs`. Each namespace maps to a JSON file per locale.
- **Exercise catalog**: Uses `public/locales/{lng}/exercises.json` with structured entries per exercise ID.
- **Primary tooling**: `pnpm i18n:scan` to detect missing keys; `pnpm test:ci` or `pnpm test:stable` to validate UI logic.
- **Key naming**: Follow `docs/i18n/key-styleguide.md`—semantic, namespaced keys with `_one`/`_other` plural forms and named interpolations.
- **No hardcoded strings**: UI components must call `t('...')` (or the `Trans` component) to remain localizable.
- **Security**: Locale files are plain JSON served from the same origin. Never embed raw HTML; if markup is unavoidable, sanitize with DOMPurify before rendering.

---

## 2. Architecture overview

RepCue uses **i18next + react-i18next** with three key additions:

1. **HTTPBackend** loads JSON resources from `/locales/{{lng}}/{{ns}}.json`.
2. **LanguageDetector** looks at `localStorage`, browser settings, then the `<html lang>` attribute.
3. **Direction management** in `apps/frontend/src/i18n.ts` toggles `<html dir>` and `body.rtl` whenever the language changes. Arabic (and its dialects) automatically switch to RTL.

All translation lookups happen via hooks/components:

- `const { t } = useTranslation();`
- `<Trans i18nKey="…">`

Services or utility modules that run outside React can import the shared i18n instance, but prefer passing localized strings in from the caller when possible.

---

## 3. Locale file structure

```
apps/frontend/public/locales/
  en/
    common.json
    titles.json
    a11y.json
    exercises.json
    auth.json
    catalogs.json
  nl/
    …same namespace files…
  fy/
    …
  ar/
    …
  ar-EG/
    … (only override values that differ from `ar`)
  de/
  es/
  fr/
```

### Namespace purpose

| Namespace | Purpose | Usage notes |
|-----------|---------|-------------|
| `common` | Reusable UI primitives (`common.start`, `common.cancel`, etc.) | Prefer this namespace for shared terms across screens. |
| `titles` | Page titles / route-level headings | Keeps document titles and large headings discoverable. |
| `a11y` | Screen-reader text, `aria-label`s, visually-hidden helpers | Required for WCAG compliance; keep descriptive and short. |
| `exercises` | Exercise catalog metadata and supporting UI copy | Includes exercise detail strings, filters, tags. |
| `auth` | Authentication flow (magic links, errors, CTA text) | Keep security messaging consistent across locales. |
| `catalogs` | Shared workout/exercise catalog UI (filters, sorting) | Used by listing and discovery pages. |

### Exercise locale files

`public/locales/{lng}/exercises.json` are structured objects combining UI strings with exercise definitions:

```json
{
  "_meta": {
    "_note": "Optional metadata for maintainers"
  },
  "filterShared": "Shared with me",
  "plank": {
    "name": "Plank",
    "description": "Hold a straight-body position on forearms",
    "notes": "Keep hips in line"
  },
  "mountain-climbers": { … }
}
```

- Use stable exercise IDs (kebap-case) as top-level keys.
- Keep text plain (no `<br>` or HTML). Markdown is also treated as unsafe.
- Missing strings fall back to the canonical EN entry; consider placeholder `TODO_` prefixes to flag untranslated content during reviews.

---

## 4. Adding a new UI string

1. **Pick a namespace and key** following the key style guide (`docs/i18n/key-styleguide.md`).
2. **Update English first**: add the key/value to `apps/frontend/public/locales/en/<namespace>.json`.
   - Maintain alphabetical/grouped ordering to reduce merge conflicts.
   - Validate JSON syntax (no trailing commas, use double quotes, etc.).
3. **Reference from code**:
   ```tsx
   import { useTranslation } from 'react-i18next';

   const { t } = useTranslation('common');
   <Button>{t('common.start')}</Button>
   ```
   - When JSX contains inline markup or components inside a localized string, use `<Trans i18nKey="…">`.
4. **Run checks**:
   ```powershell
   pnpm i18n:scan
   pnpm test:stable
   ```
   `pnpm i18n:scan` reports missing keys or unused entries per locale.
5. **Localize other languages** (see next section). If translations aren’t available yet, push with the English default and open a follow-up issue. Mark entries with `TODO_` to surface the gap.
6. **Document**: note significant i18n additions in `CHANGELOG.md` if user-facing text changed.

---

## 5. Updating translations across locales

1. After modifying EN, re-run `pnpm i18n:scan`.
2. For each locale folder, add/update values in the corresponding namespace file. Maintain the same JSON structure.
3. For dialects (e.g., `ar-EG`), include only the overrides that differ from the base language file (`ar`).
4. When unsure of a translation, use `TODO_` placeholders and ping the locale owner listed in `docs/i18n/contributing.md`.
5. QA:
   - Start the app (`pnpm dev`) and manually switch languages via settings.
   - Confirm layout/RTL direction is correct.
   - Check assistive technology strings (`aria-label`s) using a screen reader if the change impacts accessibility.

---

## 6. Adding a new locale

1. Create a new folder under `apps/frontend/public/locales/{lng}` with all namespace files copied from EN.
2. Add the locale code to `supportedLngs` in `apps/frontend/src/i18n.ts`. For dialects (`xx-YY`), also add specific fallback mapping when needed.
3. Decide on fallback order: update the `fallbackLng` map to include the new code if it needs cascading fallbacks.
4. Translate keys progressively. Prefer plain-text translations; avoid machine translation without human review.
5. Update documentation (this guide or `docs/i18n/contributing.md`) with the locale owner/reviewer.
6. Regression test with `pnpm dev` in the new language, verifying RTL/LTR, typography, and truncation.

---

## 7. Interpolation, pluralization, and rich text

- **Interpolation**: Always provide named variables (`Welcome, {{name}}!`). Keep punctuation inside the string to avoid concatenation bugs.
- **Pluralization**: Use i18next built-in plurals with `_one` / `_other` (and any locale-specific forms). Example:
  ```json
  {
    "countdown_one": "Starts in {{count}} second",
    "countdown_other": "Starts in {{count}} seconds"
  }
  ```
- **Rich text**: When a localized string needs inline components (links, bold text), use `<Trans>` with numbered tags:
  ```tsx
  <Trans i18nKey="settings.backup.help">
    Create a backup in <Link to="/settings/export" />.
  </Trans>
  ```
  The JSON entry should include `<0></0>` markers to indicate where the component goes.
- **Directional text**: When rendering user-generated strings (future UGC), wrap text in elements with `dir="auto"` to respect language direction.

---

## 8. Accessibility, UX, and security best practices

- **Accessibility**: Keep ARIA labels concise and meaningful. Review `docs/i18n/rtl.md` for RTL-specific layout tips. Test with keyboard and screen readers when changing navigation or interactive labels.
- **Reduced motion**: If a localized string describes motion cues, ensure it respects reduced-motion preferences (e.g., don’t promise animations that are disabled).
- **Security**:
  - Treat all locale strings as untrusted input. Render them as text; avoid `dangerouslySetInnerHTML` unless sanitized.
  - Store locale files in the repo; never embed secrets or API tokens.
  - Use HTTPS for all resource loading (handled automatically by same-origin served assets).

---

## 9. Tooling and QA workflow

| Task | Command | Notes |
|------|---------|-------|
| Detect missing keys | `pnpm i18n:scan` | Runs static analysis across locales; fix reported issues before committing. |
| Unit/integration tests | `pnpm test:stable` | Windows-friendly runner, ensures components still render translations correctly. |
| Linting | `pnpm lint` | Confirms no hardcoded strings or unused imports. |
| Manual smoke test | `pnpm dev` | Switch languages via the settings screen and verify key flows (timer, workouts, auth). |

### Continuous quality checks

- New strings: require translation or `TODO_` placeholders + follow-up issue.
- Exercise catalog updates: run targeted tests in `src/pages/__tests__/TimerPage.*` to ensure localized names feed into timer announcements correctly.
- RTL sweep: After changing layout-affecting strings, run a quick Arabic session to catch overflow and alignment regressions.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `pnpm i18n:scan` fails with JSON parse error | Trailing comma or invalid Unicode in a locale file | Validate JSON (`npm exec jsonlint file.json`) and re-run. |
| App shows English despite translation | Missing key in locale file; fallback triggered | Add the key/value or confirm fallback order. |
| RTL layout not applying | `body.rtl` class missing | Ensure the locale code starts with `ar`; check `applyDir` logic in `i18n.ts`. |
| `Trans` renders literal `<0>` markers | JSON string missing matching markup placeholders | Update the translation entry to include `<0></0>` wrappers. |
| Build fails on CI complaining about missing namespace | Namespace file missing in one locale | Copy over the EN file structure and translate placeholders. |

---

## 11. Additional resources

- `docs/i18n/key-styleguide.md`: naming conventions and examples.
- `docs/i18n/contributing.md`: contributor workflow, locale owners, glossary plans.
- `docs/i18n/rtl.md`: RTL layout techniques and CSS tips.
- `docs/i18n/exercise-localization.md`: deep dive into the exercise catalog strategy.
- `docs/i18n/string-inventory.md`: (if present) inventory of outstanding translation work.

Keeping these practices consistent ensures RepCue delivers a polished, accessible experience in every language today and scales cleanly as we add more locales tomorrow.
