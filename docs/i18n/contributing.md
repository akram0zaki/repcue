# RepCue Internationalization (i18n) Contributing Guide

This document explains how to contribute to RepCue's i18n system, including key naming, adding new translations, and RTL/DevX tips.

## Key Naming Guide
- Use semantic, namespaced keys: `timer.start`, `settings.language`, `workouts.title`.
- Avoid flat or ambiguous keys. Prefer `section.key` over `common.key` unless truly global.
- Pluralization: use `_one`/`_other` suffixes (e.g., `timer.seconds_one`, `timer.seconds_other`).
- Interpolation: use `{{variable}}` for dynamic values (e.g., `welcomeUser`: "Welcome, {{name}}!").

## Adding/Editing Translations
1. Add new keys to `public/locales/en/common.json` (or the correct namespace file).
2. Run `npm run i18n:scan` to check for missing keys in other locales.
3. Add translations for all supported languages in their respective files.
4. For new languages, mirror the EN structure and add to `supportedLngs` in `src/i18n.ts`.
5. Test in the UI and with `npm run test`.

## Proofreading/Translation Flow
- All new/changed keys should be reviewed by a native/fluent speaker before merging.
- Use the glossary and tone guide (see below) for consistency.
- For major changes, open a PR and request review from the locale owner.

## RTL Tips
- Use logical CSS properties (`padding-inline`, `margin-inline`, `text-align: start`).
- Test UI in Arabic (ar/ar-EG) to ensure correct direction and alignment.
- Use `body.rtl` for RTL-specific tweaks.

## DevX Tips
- Use `t('key')` everywhere; avoid hardcoded strings in UI.
- Run `npm run i18n:scan` before committing.
- Use `// i18n-exempt` for rare, non-translatable literals (with rationale).
- See `/docs/i18n/key-styleguide.md` for more.

## Locale Owners Table
| Language | Owner         |
|----------|--------------|
| English  | @akram0zaki  |
| Dutch    | @akram0zaki  |
| Arabic   | @akram0zaki  |
| German   | @akram0zaki  |
| Spanish  | @akram0zaki  |
| French   | @akram0zaki  |

## Glossary & Tone
- See `/docs/i18n/glossary.md` and `/docs/i18n/tone.md` (to be created) for preferred terms and style.

---

For questions, open an issue or ask in the main repo.
