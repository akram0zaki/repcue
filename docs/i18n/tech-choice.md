# i18n Tech Choice (Phase 1)
Updated: 2025-08-17

We will use i18next with react-i18next for robust, well-adopted internationalization in React.

## Libraries
- i18next
- react-i18next
- i18next-browser-languagedetector (passive, non-blocking detection)
- i18next-http-backend (same-origin JSON loading from `/locales/...`)

## Rationale
- Mature ecosystem with pluralization, interpolation, and ICU-friendly patterns.
- Excellent React bindings and suspense support.
- Works offline with static JSON assets packaged in `public/locales/`.
- No third-party network calls; same-origin only (privacy-first, OWASP SSRF-safe).

## Conventions
- Namespaces: `common`, `timer`, `settings`, `workouts`, `exercises`, `consent`, `titles`, `app`, `a11y`, `date`.
- Folder structure:
  - `public/locales/en/common.json`
  - `public/locales/en/timer.json`
  - `public/locales/ar/common.json` (example for RTL)
- Default language: `en` with `fallbackLng: 'en'`.
- Supported initial locales: `en` (Phase 4 adds `ar`).

## Security & privacy
- Secrets are never embedded in translation files.
- HTTP backend constrained to same-origin `/locales/` path only.
- No dynamic user-provided URLs. Deny-by-default for any potential URL overrides.

## Acceptance criteria (Phase 1)
- These docs exist and define the contract to start Phase 2 wiring.
- No runtime code changes yet; this is a design-only phase.
