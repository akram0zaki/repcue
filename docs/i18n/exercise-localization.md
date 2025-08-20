# Exercise Localization Strategy

This guide explains how to localize the built-in exercise catalog (currently 26 items) and how to future‑proof for user-generated exercises. It balances UX quality, performance, privacy, and maintainability.

## Goals
- Localize all user-facing exercise strings (name, short/long description, optional cues) using i18n resources.
- Keep a stable, language-agnostic identifier for each exercise (e.g., `bicycle-crunches`).
- Provide robust fallbacks so missing translations never break the UI.
- Prepare a scalable model for user-generated content (UGC) with per-item translations.

## Design Overview

1) Built-in exercises use i18next resource files (no schema changes required):
   - public/locales/{lng}/exercises.json
   - Keys are the stable exercise IDs, values are localized fields.

2) UGC (future): store original strings plus optional per-locale overrides in IndexedDB via `StorageService`, never destructively replace the source.

## File Structure

```
public/
  locales/
    en/
      exercises.json
    ar/
      exercises.json
    ar-EG/
      exercises.json   # optional dialect overrides
    de/
      exercises.json
    es/
      exercises.json
    fr/
      exercises.json
    nl/
      exercises.json
```

Each `exercises.json` should include only user-facing text. Technical fields (type, sets, reps, durations) remain in `src/data/exercises.ts` and are not localized.

## Example Resources

English (canonical):
```json
{
  "bicycle-crunches": {
    "name": "Bicycle Crunches",
    "description": "Alternating elbow-to-knee core exercise"
  },
  "plank": {
    "name": "Plank",
    "description": "Hold a straight-body position on forearms"
  }
}
```

Arabic:
```json
{
  "bicycle-crunches": {
    "name": "تمارين الدراجة للبطن",
    "description": "لمس الكوع للركبة بالتبادل"
  },
  "plank": {
    "name": "بلانك",
    "description": "ثبات الجسم بوضع مستقيم على الساعدين"
  }
}
```

Egyptian Arabic (dialect override where needed):
```json
{
  "bicycle-crunches": {
    "name": "الدراجة",
    "description": "تبديل كوع على ركبة"
  }
}
```

Notes:
- Use plain text only (no HTML) to avoid XSS risks.
- If a field is missing in a locale, the UI falls back to the canonical text.

## Lookup Helper (UI Consumption)

Create a tiny helper to resolve localized exercise strings with defaults.

```ts
// src/utils/localizeExercise.ts
export interface BaseExerciseText {
  id: string;
  name: string;
  description?: string;
}

export function localizeExercise(
  ex: BaseExerciseText,
  t: (key: string, opts?: Record<string, unknown>) => string
) {
  const base = `exercises.${ex.id}`;
  return {
  name: t(`${base}.name`, { defaultValue: ex.name }),
  description: t(`${base}.description`, { defaultValue: ex.description ?? '' })
  };
}
```

Usage in components:

```tsx
import { useTranslation } from 'react-i18next';
import { localizeExercise } from '@/utils/localizeExercise';

function ExerciseListItem({ exercise }: { exercise: { id: string; name: string; description?: string } }) {
  const { t } = useTranslation();
  const { name, description } = localizeExercise(exercise, t);
  return (
    <article>
      <h3 className="font-semibold">{name}</h3>
      {description && <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>}
    </article>
  );
}
```

## UGC Model (Future)

Extend the storage schema to keep original text plus optional translations. This is consent-aware via `ConsentService`.

```ts
// Types
type Lang = string; // e.g., 'en', 'ar', 'ar-EG'
type LocalizedTextMap = Record<Lang, string>;

export interface UserExercise {
  id: string;              // UUID
  sourceLang: Lang;        // Author's language
  name: LocalizedTextMap;  // must contain sourceLang
  description?: LocalizedTextMap;
  // ...existing non-text fields (type, sets, reps, etc.)
}

// Display resolution
export function pickLocalizedText(map: LocalizedTextMap | undefined, uiLang: Lang, fallbacks: Lang[]): string {
  if (!map) return '';
  return map[uiLang] ?? fallbacks.find((l) => map[l])?.toString() ?? '';
}
```

UI guidance:
- Inputs use `dir="auto"` to respect per-language direction.
- Provide an “Add translation” affordance; never overwrite the original.
- Searching/sorting should index the display string for the active language, while a separate stable slug is used for identity.

Privacy/Security:
- Do not call third-party translation APIs by default (GDPR, privacy-first). If added later, make it opt-in and clearly disclosed.
- Keep text plain (no rich HTML). If rich text is ever allowed, sanitize with DOMPurify before rendering.

## Testing

- Unit tests (Vitest):
  - Resolves name/description via i18n when keys exist.
  - Falls back to canonical values when keys are missing.
  - RTL rendering sanity for Arabic locales.
- Static check: optionally add a script to scan for missing `exercises.*` keys across locales and report counts.

## Migration Plan (Built-in 26 Exercises)

1) Create `public/locales/en/exercises.json` with all 26 canonical entries.
2) Create locale files for other languages; translate progressively (missing keys safely fall back).
3) Add `localizeExercise()` and migrate list/detail components to use it.
4) Write unit tests covering lookup and fallback logic.
5) Document contributor workflow for adding/updating exercise translations.

## Contributor Workflow

1) Add/edit entries in `public/locales/{lng}/exercises.json`.
2) Validate JSON (trailing commas, encoding).
3) Run tests locally.
4) Include a brief CHANGELOG note indicating which exercises/locales changed.

## Accessibility & UX Notes

- Keep exercise names concise for small screens.
- Respect reduced motion; names/descriptions should not trigger marquee or animated effects.
- Screen readers will read localized names; ensure they remain descriptive.

## Examples in the App

- Exercise grid/list (`src/pages/ExercisesPage.tsx`): use `localizeExercise` for each tile.
- Timer (`src/pages/TimerPage.tsx`): show the localized exercise name in the header and announcements via `AudioService.announceText()`.

## Security Considerations (OWASP)

- No HTML injection in localized strings (prevents XSS).
- Secrets are not embedded in i18n files.
- No external calls for translations unless explicitly consented.

---

Adopting this strategy ensures great UX with safe fallbacks today, and a smooth path to localized user-generated exercises tomorrow.
