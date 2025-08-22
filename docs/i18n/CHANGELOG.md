# RepCue i18n Changelog

All breaking changes to i18n keys, structure, or translation process are noted here.

## 2025-08-20
- Phase 8: Docs & DevX completed. Added contributing guide, updated README, and changelog.
- i18n scripts (`i18n:scan`, `i18n:report`) confirmed in `package.json`.
- All locale files and docs are up to date.

## 2025-08-22
- Video preview UX: Added preflight HEAD check before opening preview modal. If media is missing, only a bottom snackbar is shown (no modal). This change is UI-only and does not alter translation keys. Timer inline video remains silent with debug logs when media is unavailable.
- Tests: Stabilized assertions around localized Activity Log category chips and empty-state headings using case-insensitive and regex matchers.

## 2025-08-18
- Phase 4: UI instrumentation complete. All user-facing strings now use i18n keys.

## 2025-08-17
- Phase 1: Design docs and key styleguide created.
- Phase 2: i18n infrastructure initialized.
