# i18n Key Styleguide (Phase 1)
Updated: 2025-08-17

This styleguide defines how we name and organize translation keys. It keeps strings consistent, discoverable, and safe to refactor.

## Principles
- Human-first, semantic keys (describe meaning, not English words)
- Stable across UI changes (avoid layout-specific or order-specific keys)
- Namespaced by feature/screen (short, predictable paths)
- Reuse common terms across the app (`common.*`)
- Prefer interpolation over string concatenation
- Use pluralization rules for counts

## Namespaces and patterns
- `app.*` Application-level strings (name, description)
- `titles.*` Document titles and route-level headings
- `nav.*` Navigation labels
- `common.*` Reusable primitives (start/stop/save/cancel/on/off/close/seconds)
- `a11y.*` Accessibility labels and aria texts
- `date.*` Weekday/month labels and format tokens
- `timer.*` Timer-specific labels (countdown, reps, sets, rest, controls)
- `settings.*` Settings sections, options, and help texts
- `workouts.*` Workout management and cards
- `exercises.*` Exercise listing, filters, badges, and actions
- `consent.*` Consent banner texts

Examples
- `common.start`, `common.stop`, `common.cancel`, `common.reset`
- `timer.countdown.banner` → "Get Ready! Timer starts in {{count}} seconds"
- `settings.timer.beepInterval` (label) and `settings.timer.interval.option.15` (value)
- `date.weekday.short.mon` / `date.weekday.long.monday`

## Interpolation
- Use named placeholders with braces: `{{name}}`, `{{count}}`, `{{set}}`
- Prefer semantic variable names over generic ones
- Keep punctuation inside the string to avoid concatenation (e.g., `Next: {{exercise}} • {{category}}`)

## Pluralization
- Use i18next plural forms: define singular/plural variants where appropriate
  - `timer.countdown.banner_one`: "Timer starts in {{count}} second"
  - `timer.countdown.banner_other`: "Timer starts in {{count}} seconds"

## Enums and derived labels
- Don’t render raw enum text to the user
- Map enums to i18n keys, e.g., `exercises.filters.category.core`, `exercises.badge.timeBased`

## Error and help text
- Group help/error texts under their feature namespace, e.g., `settings.data.export.help`

## Accessibility keys
- Keep ARIA and visually-hidden strings in `a11y.*` (e.g., `a11y.skipToMain`, `a11y.mainRegion`)

## Key review checklist
- Is the key semantic and stable if UI changes?
- Can the key be reused elsewhere? If so, place in `common.*`
- Are placeholders named and minimal?
- Are plural forms provided when counts are shown?
