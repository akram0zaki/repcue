# Exercise Catalog System (Multi-Catalog with Badge System)

> **⚠️ PLANNED REFACTOR**: This system is being refactored to use a global exercise repository with many-to-many catalog memberships. See `docs/implementation-plans/global-exercise-repository.md` for details. This will eliminate exercise duplication across catalogs.

This document explains the architecture and implementation of RepCue's multi-catalog exercise system with flexible badge-based filtering, and provides a concise developer guide for adding or modifying catalogs and exercises.

## Architecture Overview

The multi-catalog system consists of:

- Exercise catalogs (metadata + badges): `apps/frontend/src/data/catalogs.ts`
- Exercise definitions per catalog: `apps/frontend/src/data/exercises/*.ts` with an aggregator at `apps/frontend/src/data/exercises.ts`
- Badge system utilities: `apps/frontend/src/utils/catalogBadges.ts`
- Badge components: `apps/frontend/src/components/BadgeFilterGroup.tsx`, `apps/frontend/src/components/BadgeFilter.tsx`
- Localization
  - Exercise texts: `apps/frontend/public/locales/*/exerciseDetails.json`
  - Catalog texts (including badge labels): `apps/frontend/public/locales/*/catalogs.json`
- Media
  - Media index: `apps/frontend/public/exercise_media.json`
  - Video assets: `apps/frontend/public/videos/*`

## Core Files and Data Shapes

- Types: `apps/frontend/src/types/index.ts` and `apps/frontend/src/types/catalog.ts`
  - `Exercise` includes `catalogId`, `tags` (for badge values), and extended metadata: `benefits`, `limitations`, `best_timing`, `suggested_combinations`, `notes`, `exercise_references`.
  - **Note**: The `category` field has been **removed**. Categories are now managed via the badge system using tags like `'category:core'`.
  - `ExerciseCatalog` includes `id`, `nameKey`, `descriptionKey`, `isDefault`, `isPremium`, `displayOrder`, `icon?`, `colorTheme?`, `pictureUrl?`, `badges?` (array of badge definitions), and `groupByBadge?` (specifies which badge to use for grouping on listing page).
  - `CatalogBadge` defines a filterable/displayable badge with `id`, `label`, `filterType`, `values`, `tagPattern`, `dynamicDiscovery`, and `computed` flags.
  - `BadgeValue` defines individual badge values with `id`, `label`, `labelParams`, `icon`, and `fallbackLabel`.

- Catalogs: `apps/frontend/src/data/catalogs.ts`
  - Exports `EXERCISE_CATALOGS` with badge definitions per catalog.
  - Helpers: `getDefaultCatalog()`, `getCatalogById()`, `getAllCatalogs()`, `getAvailableCatalogs()`.

- Exercises: `apps/frontend/src/data/exercises/*.ts`
  - One file per catalog (e.g. `generalFitness.ts`, `womenHealth.ts`, `taiChi.ts`, `zumba.ts`, `aikido.ts`). Each uses a `createExercise({...})` helper and sets `catalogId` and `tags` explicitly.
  - Aggregator `apps/frontend/src/data/exercises.ts` exports `INITIAL_EXERCISES` by concatenating all catalog arrays.

## Badge System

### Overview

The badge system replaces the legacy hardcoded category system with a flexible, catalog-specific tagging and filtering mechanism. Each catalog can define zero or more badges, and exercises are tagged with structured values that map to these badges.

### Key Concepts

1. **Tags**: Exercises have a `tags` array containing both structured badge tags (e.g., `'category:core'`, `'kyu:3'`) and free-form tags (e.g., `'balance'`, `'warmup'`).
2. **Badge Definitions**: Each catalog defines its own set of badges in the `badges` array.
3. **Tag Patterns**: Badges use patterns (prefix, suffix, or regex) to extract values from exercise tags.
4. **Grouping**: Catalogs can specify `groupByBadge` to control how exercises are grouped on the listing page.

### Badge Types

#### 1. **Simple Structured Badges** (Predefined Values with Prefix)

Used when you have a known set of values and want simple tag matching.

**Example**: Category badge in General Fitness

```typescript
{
  id: 'category',
  label: 'catalogs:general-fitness.badges.category.label',
  values: [
    { id: 'core', label: 'common:categories.core' },
    { id: 'strength', label: 'common:categories.strength' },
    { id: 'cardio', label: 'common:categories.cardio' },
    // ...
  ],
  tagPattern: { prefix: 'category:' }
}
```

**Exercise tags**: `['category:core', 'equipment:bodyweight']`

**How it works**:
- Badge looks for tags starting with `category:`
- Extracts the value after the prefix (`core`, `strength`, etc.)
- Matches against predefined badge values
- Displays as "Category: Core" with translation

#### 2. **Regex-Based Badges** (Extract with Pattern)

Used when the tag format is more complex and requires regex extraction.

**Example**: Kyu level badge in Aikido

```typescript
{
  id: 'kyuLevel',
  label: 'catalogs:aikido.badges.kyuLevel.label',
  values: [
    { id: 6, label: 'catalogs:aikido.badges.kyuLevel.values.6', labelParams: { level: 6 } },
    { id: 5, label: 'catalogs:aikido.badges.kyuLevel.values.5', labelParams: { level: 5 } },
    // ...
  ],
  tagPattern: { 
    prefix: 'kyu:',
    extractPattern: /^kyu:(\d+)$/ 
  }
}
```

**Exercise tags**: `['kyu:6', 'stance:tachi']`

**How it works**:
- Badge uses regex to extract numeric value from `kyu:6`
- Matches extracted value (6) against badge values
- Displays as "Kyu Level: 6th Kyu (White Belt)" with parameterized translation

#### 3. **Dynamic Discovery Badges** (Values Discovered from Tags)

Used when badge values are not known in advance and should be discovered from existing exercise tags.

**Example**: Stance badge in Aikido

```typescript
{
  id: 'stance',
  label: 'catalogs:aikido.badges.stance.label',
  dynamicDiscovery: true,
  tagPattern: { prefix: 'stance:' }
}
```

**Exercise tags**: `['stance:tachi', 'stance:suwari', 'stance:hanmi']`

**How it works**:
- Badge scans all exercises in the catalog
- Discovers all unique values after `stance:` prefix
- Generates badge values dynamically: `tachi`, `suwari`, `hanmi`
- Falls back to raw value as label if no translation exists

#### 4. **Computed Badges** (Read-Only, Derived from Data)

Used for badges derived from other exercise properties (not editable by user).

**Example**: "Has Video" or "Duration Range"

```typescript
{
  id: 'hasVideo',
  label: 'catalogs:general-fitness.badges.hasVideo.label',
  computed: true,
  values: [
    { id: 'yes', label: 'catalogs:general-fitness.badges.hasVideo.values.yes' },
    { id: 'no', label: 'catalogs:general-fitness.badges.hasVideo.values.no' }
  ]
}
```

**How it works**:
- Badge is computed from `exercise.has_video` or `exercise.custom_video_url`
- Not editable in forms (derived from actual data)
- Used for filtering only

### Badge Filtering

Badges support two filter types:

1. **Multiple selection** (default): User can select multiple values, exercises match if they have ANY selected value (OR logic).
2. **Single selection**: User can select only one value at a time, selecting another clears the previous.

**Filter logic across multiple badges**: AND logic across different badges, OR within a badge.

Example:
- Category = `core` OR `strength` (within badge: OR)
- Equipment = `bodyweight` (across badges: AND)
- Result: Exercises that are (core OR strength) AND use bodyweight equipment

### Grouping on Listing Page

Each catalog can specify `groupByBadge` to control how exercises are grouped:

```typescript
{
  id: 'general-fitness',
  groupByBadge: 'category', // Group by category badge
  badges: [ /* ... */ ]
}
```

**Grouping Examples**:

| Catalog | `groupByBadge` | Groups By |
|---------|---------------|-----------|
| General Fitness | `category` | Core, Strength, Cardio, Flexibility, Balance, Hand Warmup |
| Aikido | `kyuLevel` | 6th Kyu, 5th Kyu, 4th Kyu, 3rd Kyu, 2nd Kyu, 1st Kyu |
| Tai Chi | `category` | Flexibility, Balance |
| Zumba | `style` | Salsa, Merengue, Reggaeton, Cumbia |
| Women's Health | `category` | Core, Strength, Flexibility, Balance |

If `groupByBadge` is omitted, exercises display in a flat list.

## Localization

### Exercise Text

- Exercise text resolution uses `localizeExercise(ex, t)` which reads from the `exerciseDetails` namespace:
  - Keys: `exerciseDetails.{exerciseId}.name`, `exerciseDetails.{exerciseId}.description`

### Catalog and Badge Labels

- Catalog titles and descriptions use the `catalogs` namespace.
- Badge labels and values also use the `catalogs` namespace with a structured key format:

**Badge Label Structure**:
```json
{
  "catalogs": {
    "general-fitness": {
      "badges": {
        "category": {
          "label": "Category",
          "values": {
            "core": "Core",
            "strength": "Strength",
            "cardio": "Cardio"
          }
        },
        "equipment": {
          "label": "Equipment",
          "values": {
            "bodyweight": "Bodyweight Only",
            "dumbbells": "Dumbbells",
            "resistanceBand": "Resistance Band"
          }
        }
      }
    }
  }
}
```

**Common Badge Values** (Shared Across Catalogs):

For common badges like category, you can reference shared translation keys:

```typescript
{ id: 'core', label: 'common:categories.core' }
```

**Parameterized Labels**:

Use `labelParams` for dynamic values:

```typescript
{ 
  id: 6, 
  label: 'catalogs:aikido.badges.kyuLevel.values.6',
  labelParams: { level: 6 } 
}
```

Translation:
```json
{
  "kyuLevel": {
    "values": {
      "6": "{{level}}th Kyu (White Belt)"
    }
  }
}
```

**Fallback Labels**:

For dynamic discovery, provide `fallbackLabel`:

```typescript
{ 
  id: 'discovered-value',
  label: 'catalogs:aikido.badges.stance.values.discoveredValue',
  fallbackLabel: 'Discovered Value' // Used if translation missing
}
```

### Supported Locales

`en`, `de`, `es`, `fr`, `nl`, `ar`, `ar-EG`, `fy`

## Storage, Seeding, and Sync

### IndexedDB Schema

- `exercise_catalogs` table stores local catalog metadata (seeded, not synced).
- `exercises` table schema (v22+) includes:
  - Multi-entry index on `tags`: `*tags`
  - Compound index for badge filtering: `[catalogId+*tags]`

**Seeding**:
- `StorageService.ensureCatalogsSeeded()` seeds catalog metadata.
- Built-in exercises seeded via `StorageService.cleanBuiltInExercises()` using `INITIAL_EXERCISES`.

### Built-in vs User-Created Exercises

- **Built-in exercises**: Slug IDs (e.g., `plank`), never synced, managed via app updates.
- **User-created exercises**: UUID IDs, synced to Supabase with `catalog_id` and `tags` included in allowlist.

### Sync Implementation

**Client**: `apps/frontend/src/services/correctSyncService.ts`
- Filters built-ins from push/pull
- Maps `catalogId` ⇄ `catalog_id`
- Includes `tags` in sync allowlist
- Tag array serialization/deserialization handled automatically

**Edge Function**: `supabase/functions/sync_v2/index.ts`
- `exercises` table allowlist includes `catalog_id` and `tags`
- Server-side tag validation:
  - Type checking (array of strings)
  - Length limits (max 100 tags, each max 100 chars)
  - Format validation (alphanumeric + `:`, `-`, `_`)
  - XSS prevention (strips `<`, `>`, `&`)
  - Deduplication

**Supabase Schema** (PostgreSQL):
- `tags` column: `TEXT[]` (array of strings)
- GIN index on `tags` for efficient querying: `CREATE INDEX idx_exercises_tags_gin ON exercises USING GIN (tags)`

## UI Integration

### Catalog Selector

`apps/frontend/src/components/CatalogSelector.tsx`
- Reads `EXERCISE_CATALOGS`, uses `catalogs` namespace for labels
- Supports premium badges and images via `pictureUrl`

### Exercise Listing Page

`apps/frontend/src/pages/ExercisePage.tsx`
- Uses `useExerciseFilter` hook for filtering
- Displays `BadgeFilterGroup` for catalog-specific badges
- Groups exercises dynamically based on `catalog.groupByBadge`
- Persists filter state (including badge selections) in localStorage

### Exercise Details

`apps/frontend/src/components/ExerciseBadgeDisplay.tsx`
- Extracts and displays badge values from exercise tags
- Uses `extractExerciseBadges` utility
- Shows badge labels with proper i18n

### Exercise Form

`apps/frontend/src/components/ExerciseForm.tsx`
- **No category dropdown** (removed)
- Users add badge tags directly in the "Tags" field
- Example: Add `category:core`, `equipment:bodyweight`, `intensity:high`
- Client-side validation via `validateBadgeTags` utility

## Developer Guide

### Add a New Catalog

1. **Add catalog entry** to `apps/frontend/src/data/catalogs.ts`:

```typescript
{
  id: 'pilates',
  nameKey: 'pilates.name',
  descriptionKey: 'pilates.description',
  isDefault: false,
  isPremium: false,
  displayOrder: 5,
  icon: 'pilates',
  colorTheme: 'teal',
  pictureUrl: '/images/catalogs/pilates-square.png',
  groupByBadge: 'level', // Optional: specify badge for grouping
  badges: [
    {
      id: 'level',
      label: 'catalogs:pilates.badges.level.label',
      filterType: 'single', // Optional, defaults to 'multiple'
      values: [
        { id: 'beginner', label: 'catalogs:pilates.badges.level.values.beginner' },
        { id: 'intermediate', label: 'catalogs:pilates.badges.level.values.intermediate' },
        { id: 'advanced', label: 'catalogs:pilates.badges.level.values.advanced' }
      ],
      tagPattern: { prefix: 'level:' }
    },
    {
      id: 'category',
      label: 'catalogs:pilates.badges.category.label',
      values: [
        { id: 'core', label: 'common:categories.core' },
        { id: 'flexibility', label: 'common:categories.flexibility' }
      ],
      tagPattern: { prefix: 'category:' }
    }
  ]
}
```

2. **Add translations** to `apps/frontend/public/locales/*/catalogs.json`:

```json
{
  "pilates": {
    "name": "Pilates",
    "description": "Low-impact exercises focusing on core strength and flexibility",
    "badges": {
      "level": {
        "label": "Level",
        "values": {
          "beginner": "Beginner",
          "intermediate": "Intermediate",
          "advanced": "Advanced"
        }
      },
      "category": {
        "label": "Category"
      }
    }
  }
}
```

3. **Add catalog image** at `public/images/catalogs/pilates-square.png`.

### Add Exercises to a Catalog

1. **Create exercise file** `apps/frontend/src/data/exercises/pilates.ts`:

```typescript
import type { Exercise } from '../../types';
import { ExerciseType } from '../../types';

function createExercise(exerciseData: Omit<Exercise, /* sync metadata fields */> & { id: string }): Exercise {
  return {
    ...exerciseData,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
    op: 'INSERT',
    synced_at: null,
    owner_id: null
  };
}

export const PILATES_EXERCISES: Exercise[] = [
  createExercise({
    id: 'pilates-hundred',
    name: 'The Hundred',
    description: 'Classic Pilates breathing exercise',
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'pilates',
    default_duration: 60,
    is_favorite: false,
    has_video: false,
    tags: ['category:core', 'level:beginner', 'breathing', 'mat'], // Badge tags + free-form
    benefits: 'Warms up the body, strengthens core, improves breathing control.',
    // ... other metadata
  }),
  // ... more exercises
];
```

2. **Update aggregator** `apps/frontend/src/data/exercises.ts`:

```typescript
import { PILATES_EXERCISES } from './exercises/pilates';

export const INITIAL_EXERCISES: Exercise[] = [
  ...GENERAL_FITNESS_EXERCISES,
  ...WOMEN_HEALTH_EXERCISES,
  ...TAI_CHI_EXERCISES,
  ...ZUMBA_EXERCISES,
  ...AIKIDO_EXERCISES,
  ...PILATES_EXERCISES // Add here
];
```

3. **Add exercise translations** to `apps/frontend/public/locales/*/exerciseDetails.json`:

```json
{
  "pilates-hundred": {
    "name": "The Hundred",
    "description": "Classic Pilates breathing exercise with arm pumps"
  }
}
```

4. **Add videos** (if `has_video: true`):
   - Export 3 variants: `pilates-hundred_v1_1080x1080.webm`, `pilates-hundred_v1_1080x1920.webm`, `pilates-hundred_v1_1920x1080.webm`
   - Add entry to `apps/frontend/public/exercise_media.json`

5. **Run validation**:
   ```bash
   pnpm i18n:scan
   pnpm build
   ```

### Badge Tag Guidelines

**Structure**: `badgeId:value` (lowercase, hyphen-separated)

**Examples**:
- `category:core`
- `equipment:bodyweight`
- `intensity:high`
- `kyu:6`
- `style:salsa`
- `level:beginner`

**Validation Rules** (enforced client + server):
- Max 100 tags per exercise
- Max 100 characters per tag
- Allowed chars: `a-z`, `0-9`, `:`, `-`, `_`
- Format: `[a-z0-9_-]+:[a-z0-9_-]+` (for structured badges)

**Client-side Utilities**:
- `sanitizeTagValue(value)`: Cleans user input
- `validateBadgeTags(tags, catalogId)`: Validates before save
- `validateTagsBeforeSave(tags, catalogId)`: Blocking validation (throws on error)

### Badge System Utilities

**Key Functions** (`apps/frontend/src/utils/catalogBadges.ts`):

```typescript
// Get badge definitions for a catalog
getCatalogBadges(catalogId: string): CatalogBadge[]

// Extract badge values from exercise tags
getExerciseBadgeValues(
  exercise: Exercise,
  badgeId: string,
  tagPattern: { prefix?, suffix?, extractPattern? }
): Array<string | number>

// Check if exercise matches badge filter
matchesBadgeFilter(
  exercise: Exercise,
  badge: CatalogBadge,
  selectedValues: Set<string | number>
): boolean

// Extract displayable badges from exercise
extractExerciseBadges(
  exercise: Exercise,
  catalogBadges: CatalogBadge[]
): Array<{ badge: CatalogBadge; values: BadgeValue[] }>
```

**Custom Hook** (`apps/frontend/src/hooks/useBadgeValues.ts`):
- `useBadgeValues(exercises, catalogId, badge)`: Memoized badge value discovery

**Components**:
- `<BadgeFilterGroup>`: Renders all badges for a catalog
- `<BadgeFilter>`: Single badge filter with dropdown
- `<ExerciseBadgeDisplay>`: Displays exercise badges on detail pages

## Video Requirements (unchanged)

- Variants: 1080x1080 (square), 1080x1920 (portrait), 1920x1080 (landscape)
- Format: WebM (VP9 recommended), seamless loop, clear form, clean background.

## Build and Validation

- Media verification occurs during build; missing variants for `has_video: true` will fail the build.
- `pnpm i18n:scan` validates presence of required localization keys across supported locales.

## Quick Checklists

### New Catalog
- [ ] `apps/frontend/src/data/catalogs.ts` updated with new catalog + badges
- [ ] `apps/frontend/public/locales/*/catalogs.json` entries added (catalog name, description, badge labels)
- [ ] `public/images/catalogs/*` picture added (if used)

### New Exercise (in a Catalog)
- [ ] `apps/frontend/src/data/exercises/<catalog>.ts` updated
- [ ] Exercise has proper `tags` array with structured badge tags (e.g., `category:core`)
- [ ] `apps/frontend/src/data/exercises.ts` aggregator updated
- [ ] `apps/frontend/public/locales/*/exerciseDetails.json` entries added
- [ ] `apps/frontend/public/exercise_media.json` updated (if `has_video: true`)
- [ ] Videos copied to `apps/frontend/public/videos/` (3 variants)
- [ ] `pnpm i18n:scan` and `pnpm build` pass

### New Badge Type
- [ ] Badge definition added to catalog's `badges` array
- [ ] Tag pattern specified (prefix, suffix, or regex)
- [ ] Badge values defined (or `dynamicDiscovery: true`)
- [ ] Translations added to `catalogs.json` for all locales
- [ ] Exercises updated with appropriate tags (e.g., `mybadge:value`)

## Migration from Legacy Category System

**The `category` field has been removed from the `Exercise` interface.** All category information is now managed via the badge system.

**Before**:
```typescript
{
  id: 'plank',
  name: 'Plank',
  category: ExerciseCategory.CORE, // ❌ Removed
  tags: ['core', 'stability']
}
```

**After**:
```typescript
{
  id: 'plank',
  name: 'Plank',
  tags: ['category:core', 'stability'] // ✅ Badge tag + free-form
}
```

**Deprecated Components**:
- `CategoryFilter` → Use `BadgeFilterGroup`
- `CategorySelector` → Use `BadgeFilter`
- `getExercisesByCategory()` → Use badge-based filtering with `useExerciseFilter` hook

**Helper Functions**:
- `getExerciseCategory(exercise)`: Still available but deprecated, extracts category from tags

## Notes on Sync and Privacy

- Built-in exercises (slug IDs) never sync to Supabase; they're seeded locally and updated via app updates.
- User-created exercises (UUID IDs) sync with `catalog_id` and `tags` included in allowlist.
- `exercise_catalogs` metadata is local-only and not synced.
- All media is served from same-origin static assets. No third-party calls.
- Tag validation happens both client-side and server-side for security.

## Performance Considerations

- **Regex Memoization**: Badge regex patterns are compiled once and memoized per badge ID
- **Badge Value Discovery**: Results cached in `useMemo` keyed by `catalogId + badge.id`
- **IndexedDB Indexes**: Multi-entry index on `tags` and compound index `[catalogId+*tags]` for efficient querying
- **Supabase GIN Index**: Server-side GIN index on `tags` column for fast PostgreSQL queries

## Examples

### Example 1: General Fitness Category Badge

**Catalog Definition**:
```typescript
{
  id: 'category',
  label: 'catalogs:general-fitness.badges.category.label',
  values: [
    { id: 'core', label: 'common:categories.core' },
    { id: 'strength', label: 'common:categories.strength' }
  ],
  tagPattern: { prefix: 'category:' }
}
```

**Exercise**:
```typescript
{
  id: 'plank',
  tags: ['category:core', 'equipment:bodyweight', 'stability']
}
```

**UI Display**: "Category: Core" (translated)

### Example 2: Aikido Kyu Level Badge (Regex)

**Catalog Definition**:
```typescript
{
  id: 'kyuLevel',
  label: 'catalogs:aikido.badges.kyuLevel.label',
  values: [
    { id: 6, label: 'catalogs:aikido.badges.kyuLevel.values.6', labelParams: { level: 6 } }
  ],
  tagPattern: { 
    prefix: 'kyu:',
    extractPattern: /^kyu:(\d+)$/ 
  }
}
```

**Exercise**:
```typescript
{
  id: 'ukemi-basics',
  tags: ['kyu:6', 'stance:tachi', 'ukemi']
}
```

**UI Display**: "Kyu Level: 6th Kyu (White Belt)" (parameterized translation)

### Example 3: Dynamic Discovery Badge

**Catalog Definition**:
```typescript
{
  id: 'stance',
  label: 'catalogs:aikido.badges.stance.label',
  dynamicDiscovery: true,
  tagPattern: { prefix: 'stance:' }
}
```

**Exercises**:
```typescript
{ tags: ['stance:tachi', ...] }
{ tags: ['stance:suwari', ...] }
{ tags: ['stance:hanmi', ...] }
```

**UI Display**: Discovers and displays: "Tachi", "Suwari", "Hanmi" (with fallback labels)

---

**For questions or clarifications, refer to the implementation in `apps/frontend/src/data/catalogs.ts` and `apps/frontend/src/utils/catalogBadges.ts`.**
