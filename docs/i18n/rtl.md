# RTL Strategy (Phase 1)
Updated: 2025-08-17

Goal: Ensure the UI renders correctly in right-to-left (RTL) languages without breaking timer clarity during workouts.

## Direction and language attributes
- On language change, set:
  - `<html lang="{{lang}}" dir="{{dir}}">` where `dir` is `rtl` for Arabic/Hebrew, else `ltr`.
  - Toggle a `rtl` class on `<body>` for Tailwind helpers when needed.
- Respect user/system preferences if we later expose a manual RTL override.

## CSS strategy
- Prefer CSS logical properties where possible:
  - `margin-inline-start/end`, `padding-inline-*`, `inset-inline-*`, `text-align: start/end`.
- Tailwind helpers:
  - Use `rtl:` variant for directional tweaks (via plugin or utility classes when introduced in Phase 4–5).
  - Avoid manual `left/right` unless unavoidable; wrap with `ltr:`/`rtl:` when needed.

## Iconography and layout
- Icons that imply direction (chevrons, arrows, progress triangles) should be mirrored in RTL.
- Neutral icons (play/pause, timer, star) remain unchanged.
- Progress rings and numeric counters remain left-to-right numerically unless locale specifies otherwise (we’ll use locale-aware number formatting in Phase 6).

## Typography & numbers
- Use `Intl.NumberFormat(activeLocale)` for numbers in Phase 6.
- Keep time formats and rep counters locale-aware but consistent for workouts (avoid confusion mid-session).

## Text content and punctuation
- Keep punctuation inside localized strings to avoid directionality issues.
- Prefer `•` or locale-appropriate separators; these belong inside the translation.

## Testing checklist (when implementing)
- Verify layout flips for menus, toasts, and modal close buttons.
- Ensure focus order matches visual order in RTL.
- Swipe/gesture directions: confirm natural mapping (e.g., back gesture right-to-left).
- Progress calculations and animations remain unaffected by direction.

## Implementation notes (future phases)
- Language/dir switch performed once during i18n init and on `changeLanguage`.
- No third-party fonts required; use system fonts to avoid CLS.
- Keep same-origin policies; do not fetch external resources based on user input (OWASP SSRF safe).
