# Catalog Badge System - Developer Guide

**Version**: 1.1
**Date**: 2025-11-30
**Status**: Production

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Badge Types](#badge-types)
4. [Implementation Guide](#implementation-guide)
5. [API Reference](#api-reference)
6. [Best Practices](#best-practices)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The catalog badge system is a flexible, catalog-specific tagging and filtering mechanism that replaces the legacy hardcoded category system. It enables each catalog to define its own set of badges, allowing for rich, domain-specific classification of exercises.

### Key Features

- **Catalog-specific**: Each catalog defines its own badges
- **Multiple badge types**: Simple, regex-based, dynamic discovery, and computed
- **Flexible filtering**: AND/OR logic across multiple badges
- **Full sync support**: Badge tags sync across devices via Supabase
- **Offline-first**: Works completely offline with IndexedDB
- **Type-safe**: Full TypeScript support with strict validation
- **I18n-ready**: Complete internationalization support

### Use Cases

- **Category filtering**: Group exercises by type (core, strength, cardio)
- **Equipment filtering**: Filter by required equipment
- **Level filtering**: Filter by difficulty or skill level (e.g., Aikido Kyu levels)
- **Style filtering**: Filter by exercise style (e.g., Zumba dance styles)
- **Dynamic tags**: Discover and filter by user-defined tags

---

## Architecture

### Data Flow

```
User selects badge value
    ↓
useExerciseFilter.toggleBadgeValue(badgeId, value)
    ↓
Update filterState.selectedBadges
    ↓
Trigger filteredExercises recalculation
    ↓
matchesBadgeFilter() for each exercise
    ↓
Return filtered list
    ↓
UI updates
```

### Storage Layers

#### 1. IndexedDB (Local)
- **Table**: `exercises`
- **Schema**: `*tags` (multi-entry index), `[catalogId+*tags]` (compound index)
- **Purpose**: Offline-first storage, fast local queries

#### 2. Supabase (Cloud)
- **Table**: `exercises`
- **Column**: `tags TEXT[]` with GIN index
- **Purpose**: Cloud backup, cross-device sync

### Filter State Management

```typescript
interface ExerciseFilterState {
  selectedCatalogId: string;
  searchTerm: string;
  showFavoritesOnly: boolean;
  exerciseFilter: 'all' | 'built-in' | 'custom' | 'shared';
  sortBy: 'name' | 'type' | 'recently-added';

  // Generic badge selections: badgeId -> Set of selected values
  selectedBadges: Record<string, Set<string | number>>;
}
```

### Filter Logic

**AND across badges, OR within badge**:

```typescript
// User selects:
//   Category: [Core, Strength]
//   Equipment: [Bodyweight]
// Result: (Core OR Strength) AND Bodyweight

function matchesAllBadges(exercise, selectedBadges) {
  for (const [badgeId, values] of Object.entries(selectedBadges)) {
    if (values.size === 0) continue;

    const badge = getCatalogBadge(badgeId);
    const matches = matchesBadgeFilter(exercise, badge, values);

    if (!matches) return false; // AND: Must match ALL badges
  }
  return true;
}
```

---

## Badge Types

### 1. Simple Structured Badges

**Use when**: You have a known set of values

**Example**: Equipment badge

```typescript
{
  id: 'equipment',
  label: 'catalogs:general-fitness.badges.equipment.label',
  values: [
    { id: 'bodyweight', label: 'catalogs:general-fitness.badges.equipment.values.bodyweight' },
    { id: 'dumbbells', label: 'catalogs:general-fitness.badges.equipment.values.dumbbells' },
    { id: 'resistance-band', label: 'catalogs:general-fitness.badges.equipment.values.resistanceBand' },
    { id: 'none', label: 'catalogs:general-fitness.badges.equipment.values.none' }
  ],
  tagPattern: { prefix: 'equipment:' }
}
```

**Exercise tags**: `['category:strength', 'equipment:dumbbells']`

**Matching**: Badge looks for tags starting with `equipment:`, extracts value after prefix

### 2. Regex-Based Badges

**Use when**: Tag format is complex and requires extraction

**Example**: Aikido Kyu level

```typescript
{
  id: 'kyuLevel',
  label: 'catalogs:aikido.badges.kyuLevel.label',
  values: [
    { id: 1, label: 'catalogs:aikido.badges.kyuLevel.values.kyu1' },
    { id: 2, label: 'catalogs:aikido.badges.kyuLevel.values.kyu2' },
    { id: 3, label: 'catalogs:aikido.badges.kyuLevel.values.kyu3' },
    { id: 4, label: 'catalogs:aikido.badges.kyuLevel.values.kyu4' },
    { id: 5, label: 'catalogs:aikido.badges.kyuLevel.values.kyu5' },
    { id: 6, label: 'catalogs:aikido.badges.kyuLevel.values.kyu6' }
  ],
  tagPattern: {
    prefix: 'kyu:'
  }
}
```

**Exercise tags**: `['kyu:6', 'stance:tachi']`

**Matching**: Regex extracts numeric value from `kyu:6`

### 3. Dynamic Discovery Badges

**Use when**: Badge values are not known in advance

**Example**: Tai Chi forms

```typescript
{
  id: 'form',
  label: 'catalogs:tai-chi.badges.form.label',
  dynamicDiscovery: true,
  tagPattern: {
    prefix: 'form:',
    extractPattern: /^form:(.+)$/
  }
}
```

**Exercise tags**: `['form:yang-24', 'form:chen', 'form:wu']`

**Matching**: Badge scans all exercises, discovers unique values: `yang-24`, `chen`, `wu`

### 4. Computed Badges

**Use when**: Badge value is derived from other exercise properties

**Example**: Has Video

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

**Computation**: Derived from `exercise.has_video` or `exercise.custom_video_url`

**Note**: Computed badges are NOT editable in forms, only used for filtering/display

---

## Implementation Guide

### Step 1: Define Catalog with Badges

**File**: `apps/frontend/src/data/catalogs.ts`

```typescript
{
  id: 'pilates',
  nameKey: 'pilates.name',
  descriptionKey: 'pilates.description',
  isDefault: false,
  isPremium: true,
  displayOrder: 5,
  icon: 'pilates',
  colorTheme: 'teal',
  pictureUrl: '/images/catalogs/pilates-square.png',
  isVisible: true,
  isIncludedInAI: true,
  groupByBadge: 'level', // Optional: group exercises by this badge
  badges: [
    {
      id: 'level',
      label: 'catalogs:pilates.badges.level.label',
      filterType: 'single', // or 'multiple' (default)
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
        { id: 'core', label: 'exercises:categories.core' },
        { id: 'flexibility', label: 'exercises:categories.flexibility' }
      ],
      tagPattern: { prefix: 'category:' }
    }
  ]
}
```

**Catalog Fields**:
- `id`: Unique identifier
- `nameKey`, `descriptionKey`: i18n keys (without `catalogs:` prefix)
- `isDefault`: Whether this is the default catalog (only one)
- `isPremium`: Whether premium access is required
- `displayOrder`: Sort order in catalog list
- `icon`: Icon name for display
- `colorTheme`: Theme color (blue, pink, black, green, purple, etc.)
- `pictureUrl`: Path to catalog image
- `isVisible`: Whether to show in catalog selection
- `isIncludedInAI`: Whether to include in AI workout generation
- `groupByBadge`: Badge ID to group exercises by on listing page
- `badges`: Array of badge definitions

### Step 2: Add Translations

**File**: `apps/frontend/public/locales/en/catalogs.json`

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

### Step 3: Create Exercises with Badge Tags

**File**: `apps/frontend/src/data/exercises/pilates.ts`

```typescript
export const PILATES_EXERCISES: Exercise[] = [
  createExercise({
    id: 'pilates-hundred',
    name: 'The Hundred',
    description: 'Classic Pilates breathing exercise',
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'pilates',
    default_duration: 60,
    tags: [
      'category:core',      // Badge tag
      'level:beginner',     // Badge tag
      'breathing',          // Free-form tag
      'mat'                 // Free-form tag
    ]
  })
];
```

### Step 4: Update Aggregator

**File**: `apps/frontend/src/data/exercises.ts`

```typescript
import { PILATES_EXERCISES } from './exercises/pilates';

export const INITIAL_EXERCISES: Exercise[] = [
  ...GENERAL_FITNESS_EXERCISES,
  ...PILATES_EXERCISES // Add new catalog exercises
];
```

### Step 5: Verify and Test

```bash
# Validate translations
pnpm i18n:scan

# Build and run tests
pnpm build
pnpm test:ci
```

---

## API Reference

### Core Utilities

**File**: `apps/frontend/src/utils/catalogBadges.ts`

#### `getCatalogBadges(catalogId: string): CatalogBadge[]`

Get all badge definitions for a catalog.

```typescript
const badges = getCatalogBadges('general-fitness');
// Returns: [{ id: 'category', ... }, { id: 'equipment', ... }]
```

#### `discoverBadgeValues(exercises, badge, catalogId): BadgeValue[]`

Discover badge values from exercise tags (for dynamic badges).

```typescript
const badge = { id: 'form', dynamicDiscovery: true, tagPattern: { prefix: 'form:' } };
const values = discoverBadgeValues(exercises, badge, 'tai-chi');
// Returns: [{ id: 'yang-24', label: '...', fallbackLabel: 'yang-24' }, ...]
```

#### `matchesBadgeFilter(exercise, badge, selectedValues): boolean`

Check if an exercise matches a badge filter.

```typescript
const badge = { id: 'category', tagPattern: { prefix: 'category:' } };
const selectedValues = new Set(['core', 'strength']);
const matches = matchesBadgeFilter(exercise, badge, selectedValues);
// Returns: true if exercise has category:core OR category:strength
```

#### `extractExerciseBadges(exercise, catalogBadges): Array<{ badge, values }>`

Extract displayable badges from an exercise.

```typescript
const catalogBadges = getCatalogBadges('general-fitness');
const exerciseBadges = extractExerciseBadges(exercise, catalogBadges);
// Returns: [
//   { badge: { id: 'category', ... }, values: [{ id: 'core', ... }] },
//   { badge: { id: 'equipment', ... }, values: [{ id: 'bodyweight', ... }] }
// ]
```

### Custom Hook

**File**: `apps/frontend/src/hooks/useBadgeValues.ts`

#### `useBadgeValues(exercises, catalogId, badge): BadgeValue[]`

Memoized hook for badge value discovery. Handles three badge types:
1. **Predefined static badges** - Returns `badge.values` directly
2. **Dynamic discovery badges** - Scans exercise tags to discover values
3. **Computed badges** - Derives values from exercise properties (e.g., `hasVideo` from media index)

**Note**: For computed badges like `hasVideo`, the hook loads the media index asynchronously to check real video availability.

```typescript
const BadgeFilter = ({ exercises, catalogId, badge }) => {
  // Memoized badge values with async media index loading for computed badges
  const values = useBadgeValues(exercises, catalogId, badge);

  return (
    <select>
      {values.map(v => (
        <option key={v.id} value={v.id}>{t(v.label)}</option>
      ))}
    </select>
  );
};
```

**Supported Computed Badge Types**:
- `hasVideo`: Checks `custom_video_url` or media index for R2/legacy videos
- `durationRange`: Derives from `default_duration` field (0-5min, 5-15min, 15-30min, 30min+)
- `difficultyLevel`: Returns `difficulty_level` field values

### Filter Hook

**File**: `apps/frontend/src/hooks/useExerciseFilter.ts`

#### `useExerciseFilter(exercises, options): ExerciseFilterResult`

Main filtering hook with badge support. Handles both direct `tags` array and `CatalogMembership` joins.

```typescript
const {
  filteredExercises,
  filterState,
  toggleBadgeValue,
  clearBadge,
  clearFilters,
  setCatalog,
  updateFilter
} = useExerciseFilter(exercises, {
  persistFilters: true,
  storageKey: 'exerciseFilters',
  excludeExercises: [] // Optional: exercises to exclude from results
});

// Toggle a badge value
toggleBadgeValue('category', 'core');

// Clear all selections for a badge
clearBadge('category');

// Clear all filters (except catalog)
clearFilters();

// Change catalog (optionally reset other filters)
setCatalog('aikido', true);
```

**Filter Logic**:
- **Catalog filter**: Exercises must match `selectedCatalogId`
- **Badge filter**: AND across badges, OR within each badge
- **Search filter**: Matches name, description, or tags
- **Favorites filter**: Optional `showFavoritesOnly`
- **Exercise type filter**: `all`, `built-in`, `custom`, `shared`

**CatalogMembership Support**:
When exercises use the GlobalExercise + CatalogMembership model, tags are merged:
```typescript
const mergedTags = [
  ...(exercise.base_tags || []),
  ...(exercise.membership?.catalog_tags || [])
];
```

### Validation Utilities

**File**: `apps/frontend/src/utils/badgeValidation.ts`

#### `sanitizeTagValue(value: string): string`

Clean user input for badge tags.

```typescript
const clean = sanitizeTagValue('  Core Strength! ');
// Returns: 'core-strength'
```

#### `validateBadgeTags(tags, catalogId): ValidationResult`

Validate badge tags before save.

```typescript
const result = validateBadgeTags(['category:core', 'invalid tag'], 'general-fitness');
// Returns: { valid: false, errors: ['Invalid tag format: "invalid tag"'], warnings: [] }
```

---

## Best Practices

### 1. Tag Naming Conventions

**DO**:
- Use lowercase: `category:core`
- Use hyphens for multi-word: `equipment:resistance-band`
- Keep it short: `kyu:6` not `kyu-level:sixth-kyu`
- Be consistent: All equipment tags use `equipment:` prefix

**DON'T**:
- Use spaces: `category: core` ❌
- Use special characters: `category:core!` ❌
- Use uppercase: `Category:Core` ❌
- Mix formats: `equipment-dumbbells` alongside `equipment:bodyweight` ❌

### 2. Badge Design

**Keep badges orthogonal**: Each badge should represent a different dimension

✅ Good:
```typescript
badges: [
  { id: 'category', ... },      // What type of exercise
  { id: 'equipment', ... },     // What equipment needed
  { id: 'intensity', ... }      // How hard the exercise
]
```

❌ Bad:
```typescript
badges: [
  { id: 'category', ... },
  { id: 'muscleGroup', ... }    // Too similar to category
]
```

**Limit badge count**: Aim for 2-5 badges per catalog

### 3. Performance Optimization

**Cache regex patterns**:

```typescript
// ✅ Good: Compiled once
const compiledRegex = useMemo(() => badge.tagPattern?.extractPattern, [badge.id]);

// ❌ Bad: Recompiled every render
const matches = tag.match(/^kyu:(\d+)$/);
```

**Use compound indexes**:

```typescript
// IndexedDB schema (already implemented)
'[catalogId+*tags]' // Efficient: filter by catalog AND tags
```

### 4. Internationalization

**Use consistent key patterns**:

```
catalogs:{catalogId}.badges.{badgeId}.label
catalogs:{catalogId}.badges.{badgeId}.values.{valueId}
```

**Provide fallback labels**:

```typescript
{
  id: 'discovered-value',
  label: 'catalogs:aikido.badges.stance.values.discoveredValue',
  fallbackLabel: 'Discovered Value' // Used if translation missing
}
```

### 5. Testing

**Test ALL badge types**:
- Simple structured ✓
- Regex-based ✓
- Dynamic discovery ✓
- Computed ✓

**Test filter combinations**:
- Single badge selection
- Multiple values within badge (OR)
- Multiple badges (AND)
- Clear badge
- Clear all filters
- Catalog switching

---

## Testing

### Unit Tests

**File**: `apps/frontend/src/utils/__tests__/catalogBadges.test.ts`

```typescript
describe('catalogBadges', () => {
  it('should discover badge values from tags', () => {
    const badge = { id: 'equipment', dynamicDiscovery: true, tagPattern: { prefix: 'equipment:' } };
    const exercises = [
      { tags: ['equipment:dumbbells'] },
      { tags: ['equipment:bodyweight'] }
    ];

    const values = discoverBadgeValues(exercises, badge, 'general-fitness');

    expect(values.map(v => v.id)).toEqual(['bodyweight', 'dumbbells']);
  });

  it('should match badge filter with OR logic', () => {
    const badge = { id: 'category', tagPattern: { prefix: 'category:' } };
    const exercise = { tags: ['category:core'] };
    const selectedValues = new Set(['core', 'strength']);

    const matches = matchesBadgeFilter(exercise, badge, selectedValues);

    expect(matches).toBe(true);
  });
});
```

### Integration Tests

**File**: `apps/frontend/src/hooks/__tests__/useExerciseFilter.badge-integration.test.ts`

```typescript
describe('useExerciseFilter - Badge Integration', () => {
  it('should apply AND logic across different badges', () => {
    const exercises = [
      { tags: ['category:strength', 'equipment:bodyweight'] },
      { tags: ['category:strength', 'equipment:dumbbells'] },
      { tags: ['category:cardio', 'equipment:bodyweight'] }
    ];

    const { result } = renderHook(() => useExerciseFilter(exercises));

    act(() => {
      result.current.toggleBadgeValue('category', 'strength');
      result.current.toggleBadgeValue('equipment', 'bodyweight');
    });

    // Should match: (strength) AND (bodyweight) = 1 exercise
    expect(result.current.filteredExercises).toHaveLength(1);
  });
});
```

### E2E Tests

**File**: `apps/frontend/tests/e2e/catalog-badges.spec.ts`

```typescript
test('should filter exercises by badge selection', async ({ page }) => {
  await page.goto('/exercises');

  // Select badge value
  await page.click('button:has-text("Strength")');

  // Verify filtered results
  const exercises = page.locator('[data-testid="exercise-card"]');
  await expect(exercises).toHaveCount(15);
});
```

---

## Troubleshooting

### Issue: Badge values not appearing

**Symptom**: Badge filter shows no values

**Solutions**:
1. Check if exercises have correct tags: `tags: ['category:core']`
2. Verify badge has `tagPattern` defined
3. Check if catalog ID matches: `catalogId: 'general-fitness'`
4. For dynamic discovery, ensure `dynamicDiscovery: true`

### Issue: Filtering not working

**Symptom**: Selecting badge doesn't filter exercises

**Solutions**:
1. Verify tag prefix matches pattern: `tagPattern: { prefix: 'category:' }` matches `'category:core'`
2. Check if filter state is updating (React DevTools)
3. Verify `matchesBadgeFilter` logic in hook
4. Check if exercises belong to selected catalog

### Issue: Tags not syncing

**Symptom**: Badge tags don't appear on other devices

**Solutions**:
1. Verify `tags` field is in sync allowlist (edge function)
2. Check if exercise has `dirty: 1` flag
3. Verify server-side validation isn't rejecting tags
4. Check network tab for sync errors
5. Verify tag format: `/^[a-z0-9-]{1,30}:[a-z0-9-_]{1,50}$/i`

### Issue: Performance slow with many exercises

**Symptom**: Filtering takes > 100ms

**Solutions**:
1. Verify regex is memoized: `useMemo(() => extractPattern, [badge.id])`
2. Check if badge value discovery is cached
3. Use IndexedDB compound index: `[catalogId+*tags]`
4. Limit exercises loaded at once (virtualization)

### Issue: Translation missing

**Symptom**: Badge shows key instead of label

**Solutions**:
1. Check if translation key exists in `catalogs.json`
2. Verify key format: `catalogs:{catalogId}.badges.{badgeId}.values.{valueId}`
3. Provide `fallbackLabel` for dynamic discovery
4. Run `pnpm i18n:scan` to validate

---

## Advanced Topics

### Custom Badge Components

Create specialized badge filters:

```typescript
const IntensitySlider = ({ badge, selectedValues, onToggle }) => {
  const intensity = selectedValues.values().next().value || 'moderate';

  return (
    <Slider
      value={['low', 'moderate', 'high'].indexOf(intensity)}
      onChange={(index) => {
        onToggle(badge.id, ['low', 'moderate', 'high'][index]);
      }}
    />
  );
};
```

### Batch Tag Operations

Update multiple exercises at once:

```typescript
async function addTagToMultipleExercises(exerciseIds: string[], tag: string) {
  const storage = StorageService.getInstance();

  for (const id of exerciseIds) {
    await storage.addTagsToExercise(id, [tag]);
  }
}
```

### Badge Analytics

Track badge usage:

```typescript
function trackBadgeFilter(badgeId: string, value: string | number) {
  analytics.track('badge_filter_applied', {
    badge_id: badgeId,
    value: value,
    catalog_id: selectedCatalogId
  });
}
```

---

## Summary

The catalog badge system provides a flexible, scalable way to organize and filter exercises. Key takeaways:

- **Use appropriate badge types** for your use case
- **Follow naming conventions** for consistency
- **Optimize performance** with memoization and indexes
- **Test thoroughly** with unit, integration, and E2E tests
- **Provide good i18n** with fallback labels

For more examples, see `apps/frontend/src/data/catalogs.ts` and existing badge implementations.

---

**Last Updated**: 2025-11-30
**Maintained By**: RepCue Development Team
