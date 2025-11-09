# Global Exercise Repository Implementation Plan

**Date**: 2025-11-09  
**Status**: Planning  
**Priority**: High  
**Complexity**: High

## Overview

Refactor the exercise catalog system from a **one-to-many** (catalog → exercises) to a **many-to-many** (catalogs ↔ exercises) relationship. This eliminates exercise duplication across catalogs and centralizes exercise definitions.

## 🚨 Critical Development Rules

These rules **MUST** be followed throughout the implementation:

### 1. Supabase Migrations & Functions
- All Supabase schema migrations and Edge Function changes **must be created and saved locally in the workspace** before deployment
- This ensures proper **version control and reproducibility**
- Use MCP tools to deploy after local files are committed

### 2. Migration Tracking
- Record **every** Supabase change in a new file under `docs/migration-tracking/`
- Use the filename format: `supabase-changes_YYYYMMDD.md`
- Include: SQL changes, edge function updates, RLS policy modifications

### 3. Styling Rules
- **No inline styles** - use Tailwind classes only
- Use **global or shared style definitions** (Tailwind utility classes, shared CSS/TS files)
- Follow style guide in `docs/ui-ux/ui-specs.md` for all UI changes

### 4. Commit Policy
- **Do not auto-commit**
- Commit only when explicitly instructed
- Use conventional commit messages

### 5. Progress Tracking
- Continuously **update the project plan** by marking completed tasks inline
- Mark modules/phases as done with `[x]` checkboxes
- Ensures sessions can resume without confusion or redundant work
- **Do NOT create external files to track progress** - always update inline in this plan

### 6. Localization Workflow
- Always update and test the **`en` locale** first (it is the canonical source)
- Only after `en` is verified, proceed with translations to other locales
- Run `pnpm i18n:scan` after any text changes
- Translations can be automated or manual, but `en` must be complete first

### 7. Development Environment
- Development workstation: **VSCode on Windows 11**
- Use **PowerShell syntax** for all terminal commands
- Two MCP servers configured:
  - `mcp_supabase_*` → Dev project (ref: `xwzrsfkzqxdybjrkkkvh`)
  - `mcp_supabase-prod_*` → Prod project (ref: `zumzzuvfsuzvvymhpymk`)
- Always test in dev first, deploy to prod only after validation

### 8. Offline-First Architecture
- Implementation of any new feature **must respect and comply** with offline-first architecture
- IndexedDB is the source of truth for client data
- Cloud sync augments UX but is not required for core functionality
- All CRUD operations must work offline with proper sync queue handling

### 9. Testing Requirements
- Write tests for all new functionality
- Run `pnpm test:ci` before marking tasks complete
- Ensure no regressions in existing tests

## Problem Statement

Current architecture forces exercise duplication:
- Same exercise (e.g., "Plank") must be fully defined in multiple catalogs
- Translations duplicated across catalog-specific `exerciseDetails.json` files
- Metadata (benefits, instructions, videos) repeated per catalog
- Difficult to maintain consistency when updating shared exercises

## Proposed Solution

### 1. Data Model Changes

#### Before (Current):
```typescript
Exercise {
  id: string;           // e.g., "plank" or "pilates-plank"
  catalogId: string;    // Single catalog ownership
  name: string;
  description: string;
  tags: string[];       // Includes catalog-specific badges
  // ... all metadata
}
```

#### After (Proposed):
```typescript
// Global exercise definition (catalog-agnostic)
GlobalExercise {
  id: string;           // e.g., "plank" (unique globally)
  name: string;         // Translation key base
  description: string;  // Translation key base
  exercise_type: ExerciseType;
  default_duration?: number;
  rep_duration_seconds?: number;
  has_video: boolean;
  custom_video_url?: string;
  
  // Core metadata (shared across catalogs)
  benefits?: string;
  limitations?: string;
  best_timing?: string;
  suggested_combinations?: string[];
  instructions?: {
    setup?: string;
    execution?: string[];
    breathing?: string;
    common_mistakes?: string[];
  };
  
  // Base tags (universal, non-catalog-specific)
  base_tags: string[];  // e.g., ['stability', 'warmup']
  
  // Sync metadata
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  version: number;
  // ... other sync fields
}

// Catalog membership (many-to-many join)
CatalogMembership {
  id: string;                    // UUID
  exercise_id: string;           // References GlobalExercise.id
  catalog_id: string;            // References ExerciseCatalog.id
  
  // Catalog-specific overrides
  catalog_tags?: string[];       // e.g., ['category:core', 'kyu:6']
  display_order?: number;        // Order within catalog
  featured?: boolean;            // Highlighted in catalog
  custom_name_key?: string;      // Override translation key
  custom_description_key?: string;
  notes?: string;                // Catalog-specific notes
  
  // Metadata
  created_at: string;
  updated_at: string;
  deleted: boolean;
  version: number;
  owner_id?: string | null;
}
```

### 2. Benefits

1. **No Duplication**: Exercise defined once, referenced multiple times
2. **Shared Translations**: Single translation entry per exercise
3. **Easy Updates**: Change exercise once, affects all catalogs
4. **Flexible Assignment**: Add/remove exercises from catalogs without recreating
5. **Catalog-Specific Customization**: Override tags/ordering per catalog via memberships
6. **Cleaner Data Files**: Separation of concerns (exercises vs. catalog structure)

## Implementation Steps

> **Note**: Follow the Critical Development Rules above for all phases. Progress tracking uses inline checkboxes in each phase section below.

### Phase 1: Type Definitions and Data Model

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

**Files to modify**:
- `apps/frontend/src/types/index.ts`
- `apps/frontend/src/types/catalog.ts`

**Actions**:
1. [ ] Define `GlobalExercise` interface (remove `catalogId`, add `base_tags`)
2. [ ] Define `CatalogMembership` interface
3. [ ] Create type aliases for backward compatibility during migration
4. [ ] Add helper types: `ExerciseWithMemberships`, `ExerciseInCatalog`
5. [ ] Run TypeScript compilation to verify types
6. [ ] Update this plan with completion status

**New Types**:
```typescript
// apps/frontend/src/types/index.ts

export interface GlobalExercise {
  id: string;
  name: string;
  description: string;
  exercise_type: ExerciseType;
  default_duration?: number;
  rep_duration_seconds?: number;
  has_video: boolean;
  custom_video_url?: string;
  base_tags: string[];  // Universal tags only
  
  benefits?: string;
  limitations?: string;
  best_timing?: string;
  suggested_combinations?: string[];
  instructions?: ExerciseInstructions;
  exercise_references?: ExerciseReference[];
  notes?: string;
  
  // Sync fields
  owner_id?: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  version: number;
  dirty: number;
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  synced_at: string | null;
}

export interface CatalogMembership {
  id: string;
  exercise_id: string;
  catalog_id: string;
  
  // Overrides
  catalog_tags?: string[];
  display_order?: number;
  featured?: boolean;
  custom_name_key?: string;
  custom_description_key?: string;
  catalog_notes?: string;
  
  // Sync fields
  created_at: string;
  updated_at: string;
  deleted: boolean;
  version: number;
  owner_id?: string | null;
  dirty: number;
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  synced_at: string | null;
}

// Helper type for UI components
export interface ExerciseWithMemberships extends GlobalExercise {
  memberships: CatalogMembership[];
}

// For displaying exercises in a specific catalog context
export interface ExerciseInCatalog extends GlobalExercise {
  membership: CatalogMembership;
  effectiveTags: string[];  // base_tags + catalog_tags merged
}
```

### Phase 2: Storage Layer Updates

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

**Files to modify**:
- `apps/frontend/src/services/storageService.ts`
- `apps/frontend/src/db/schema.ts` (create if doesn't exist)

**Actions**:
1. [ ] Add `catalog_memberships` table to IndexedDB schema (v23)
2. [ ] Create indexes: `[exercise_id]`, `[catalog_id]`, `[catalog_id+exercise_id]`
3. [ ] Implement migration logic in `.upgrade()` handler:
   - [ ] Extract catalog-specific tags from exercises
   - [ ] Create membership records for each exercise-catalog relationship
   - [ ] Update exercises table (remove `catalogId`, rename `tags` → `base_tags`)
   - [ ] Test migration with backup data first
4. [ ] Add StorageService methods (with offline-first design):
   - [ ] `getCatalogMemberships(catalogId)`
   - [ ] `getExerciseMemberships(exerciseId)`
   - [ ] `addExerciseToCatalog(exerciseId, catalogId, membershipData)`
   - [ ] `removeExerciseFromCatalog(exerciseId, catalogId)`
   - [ ] `getExercisesForCatalog(catalogId)` (with optimized membership join)
5. [ ] Test all new methods with various scenarios
6. [ ] Verify offline functionality (no network required)
7. [ ] Update this plan with completion status

**IndexedDB Schema Update**:
```typescript
// Database version 23
const db = new Dexie('RepCueDB');
db.version(23).stores({
  exercises: 'id, owner_id, exercise_type, *base_tags, is_favorite, has_video',
  catalog_memberships: 'id, exercise_id, catalog_id, [catalog_id+exercise_id], display_order',
  // ... other tables
}).upgrade(tx => {
  // Migration logic
  return tx.table('exercises').toArray().then(exercises => {
    const memberships: CatalogMembership[] = [];
    
    exercises.forEach(ex => {
      if (ex.catalogId) {
        // Create membership record
        const membership: CatalogMembership = {
          id: crypto.randomUUID(),
          exercise_id: ex.id,
          catalog_id: ex.catalogId,
          catalog_tags: extractCatalogTags(ex.tags),
          // ... populate other fields
        };
        memberships.push(membership);
        
        // Update exercise (remove catalogId, filter tags)
        ex.base_tags = extractBaseTags(ex.tags);
        delete ex.catalogId;
        delete ex.tags;
      }
    });
    
    // Bulk insert memberships
    return tx.table('catalog_memberships').bulkAdd(memberships)
      .then(() => tx.table('exercises').bulkPut(exercises));
  });
});
```

### Phase 3: Data File Refactoring

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

**Files to create/modify**:
- `apps/frontend/src/data/globalExercises.ts` (NEW)
- `apps/frontend/src/data/memberships/index.ts` (NEW)
- `apps/frontend/src/data/memberships/generalFitness.ts` (NEW)
- `apps/frontend/src/data/memberships/womenHealth.ts` (NEW)
- `apps/frontend/src/data/memberships/aikido.ts` (NEW)
- `apps/frontend/src/data/memberships/taiChi.ts` (NEW)
- `apps/frontend/src/data/memberships/zumba.ts` (NEW)
- `apps/frontend/src/data/exercises.ts` (MODIFY - new aggregator)

**Actions**:
1. [ ] Analyze existing exercises across all catalogs to identify duplicates
2. [ ] Create `globalExercises.ts` with deduplicated exercises:
   - [ ] Extract unique exercises with `base_tags` only
   - [ ] Consolidate metadata (benefits, instructions, etc.)
   - [ ] Ensure all exercises have globally unique IDs
3. [ ] Create membership files for each catalog:
   - [ ] `generalFitness.ts` - General Fitness memberships
   - [ ] `womenHealth.ts` - Women's Health memberships
   - [ ] `aikido.ts` - Aikido memberships
   - [ ] `taiChi.ts` - Tai Chi memberships
   - [ ] `zumba.ts` - Zumba memberships
   - [ ] Extract catalog-specific tags to `catalog_tags` field
4. [ ] Create `memberships/index.ts` aggregator
5. [ ] Update `exercises.ts` to export both global exercises and memberships
6. [ ] Verify no exercises are lost in refactoring
7. [ ] Run build to verify no import errors
8. [ ] Update this plan with completion status

**New Structure**:
```
src/data/
├── globalExercises.ts          # All unique exercises (catalog-agnostic)
├── exercises.ts                # Exports for backward compat
├── memberships/
│   ├── index.ts               # Aggregates all memberships
│   ├── generalFitness.ts      # Memberships for General Fitness
│   ├── womenHealth.ts         # Memberships for Women's Health
│   ├── aikido.ts              # Memberships for Aikido
│   ├── taiChi.ts              # Memberships for Tai Chi
│   └── zumba.ts               # Memberships for Zumba
└── catalogs.ts                # Catalog definitions (unchanged)
```

**Example: Global Exercises**:
```typescript
// apps/frontend/src/data/globalExercises.ts

import type { GlobalExercise } from '../types';
import { ExerciseType } from '../types';

// Helper to create exercise with sync metadata
function createGlobalExercise(data: Omit<GlobalExercise, 'created_at' | 'updated_at' | /* sync fields */>): GlobalExercise {
  return {
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
    op: 'INSERT',
    synced_at: null,
    owner_id: null,
    is_favorite: false,
  };
}

export const GLOBAL_EXERCISES: GlobalExercise[] = [
  createGlobalExercise({
    id: 'plank',
    name: 'exerciseDetails.plank.name',
    description: 'exerciseDetails.plank.description',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 60,
    has_video: true,
    base_tags: ['stability', 'bodyweight', 'isometric'],
    benefits: 'Strengthens core, improves posture, builds endurance.',
    instructions: {
      setup: 'Start in push-up position, lower to forearms.',
      execution: [
        'Keep body in straight line from head to heels',
        'Engage core and glutes',
        'Hold position without sagging'
      ],
      breathing: 'Breathe steadily throughout',
      common_mistakes: [
        'Letting hips sag or pike up',
        'Not engaging core',
        'Holding breath'
      ]
    }
  }),
  
  // Other exercises (pushups, squats, burpees, etc.)
  // Each defined ONCE with universal metadata
];
```

**Example: Catalog Memberships**:
```typescript
// apps/frontend/src/data/memberships/generalFitness.ts

import type { CatalogMembership } from '../../types';

function createMembership(data: Omit<CatalogMembership, 'created_at' | 'updated_at' | /* sync fields */>): CatalogMembership {
  return {
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
    op: 'INSERT',
    synced_at: null,
    owner_id: null,
  };
}

export const GENERAL_FITNESS_MEMBERSHIPS: CatalogMembership[] = [
  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'plank',
    catalog_id: 'general-fitness',
    catalog_tags: ['category:core', 'equipment:bodyweight', 'intensity:medium'],
    display_order: 1,
    featured: true
  }),
  
  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'pushup',
    catalog_id: 'general-fitness',
    catalog_tags: ['category:strength', 'equipment:bodyweight', 'intensity:medium'],
    display_order: 2
  }),
  
  // More memberships...
];
```

**Example: Women's Health Memberships** (reuses same exercises):
```typescript
// apps/frontend/src/data/memberships/womenHealth.ts

export const WOMEN_HEALTH_MEMBERSHIPS: CatalogMembership[] = [
  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'plank',  // Same exercise!
    catalog_id: 'women-health',
    catalog_tags: ['category:core', 'pregnancy-safe:yes', 'trimester:all'],
    catalog_notes: 'Can be modified to knees for easier variation',
    display_order: 5
  }),
  
  // Other shared + women-specific exercises
];
```

### Phase 4: Supabase Schema and Sync

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

**⚠️ CRITICAL**: Follow Supabase migration rules - create all files locally before deployment

**Files to create/modify**:
- `supabase/migrations/20251109_global_exercises.sql` (NEW - **CREATE LOCALLY FIRST**)
- `supabase/functions/sync_v2/index.ts` (MODIFY - **SAVE LOCALLY FIRST**)
- `docs/migration-tracking/supabase-changes_20251109.md` (NEW - **REQUIRED TRACKING**)

**Actions**:
1. [ ] Create migration file locally: `supabase/migrations/20251109_global_exercises.sql`
   - [ ] Rename `exercises` table to `global_exercises`
   - [ ] Add `base_tags` column (rename from `tags`)
   - [ ] Create `catalog_memberships` table with proper schema
   - [ ] Add all necessary indexes (GIN, compound, etc.)
   - [ ] Create RLS policies for both tables
   - [ ] Add data migration logic for existing records
2. [ ] Update Edge Function locally: `supabase/functions/sync_v2/index.ts`
   - [ ] Add `global_exercises` to TABLE_ALLOWLIST
   - [ ] Add `catalog_memberships` to TABLE_ALLOWLIST
   - [ ] Implement `validateCatalogMembership()` function
   - [ ] Update field mapping for `base_tags`
   - [ ] Test locally with `supabase functions serve`
3. [ ] Create migration tracking document: `docs/migration-tracking/supabase-changes_20251109.md`
   - [ ] Document all SQL changes
   - [ ] Document Edge Function updates
   - [ ] Note RLS policy changes
   - [ ] Include rollback procedures
4. [ ] Test in dev environment (MCP: `mcp_supabase_*` tools):
   - [ ] Apply migration to dev Supabase (ref: xwzrsfkzqxdybjrkkkvh)
   - [ ] Deploy updated Edge Function to dev
   - [ ] Test sync operations end-to-end
   - [ ] Verify RLS policies work correctly
5. [ ] Deploy to production (MCP: `mcp_supabase-prod_*` tools) - ONLY AFTER DEV VALIDATION:
   - [ ] Apply migration to prod Supabase (ref: zumzzuvfsuzvvymhpymk)
   - [ ] Deploy Edge Function to prod
   - [ ] Monitor for errors
6. [ ] Update this plan with completion status

**Database Migration**:
```sql
-- supabase/migrations/20251109_global_exercises.sql

-- 1. Rename exercises table to global_exercises (or add new columns)
ALTER TABLE exercises RENAME TO global_exercises_old;

CREATE TABLE global_exercises (
  id TEXT PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  exercise_type TEXT NOT NULL,
  default_duration INTEGER,
  rep_duration_seconds INTEGER,
  has_video BOOLEAN DEFAULT FALSE,
  custom_video_url TEXT,
  
  base_tags TEXT[],  -- Changed from 'tags'
  
  benefits TEXT,
  limitations TEXT,
  best_timing TEXT,
  suggested_combinations TEXT[],
  instructions JSONB,
  exercise_references JSONB[],
  notes TEXT,
  
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  dirty INTEGER DEFAULT 0,
  op TEXT DEFAULT 'INSERT',
  synced_at TIMESTAMPTZ
);

-- 2. Create catalog_memberships table
CREATE TABLE catalog_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id TEXT REFERENCES global_exercises(id) ON DELETE CASCADE,
  catalog_id TEXT NOT NULL,  -- References catalog, but not FK (catalog is local-only)
  
  catalog_tags TEXT[],
  display_order INTEGER,
  featured BOOLEAN DEFAULT FALSE,
  custom_name_key TEXT,
  custom_description_key TEXT,
  catalog_notes TEXT,
  
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  dirty INTEGER DEFAULT 0,
  op TEXT DEFAULT 'INSERT',
  synced_at TIMESTAMPTZ
);

-- 3. Indexes
CREATE INDEX idx_global_exercises_owner ON global_exercises(owner_id);
CREATE INDEX idx_global_exercises_base_tags_gin ON global_exercises USING GIN(base_tags);
CREATE INDEX idx_memberships_exercise ON catalog_memberships(exercise_id);
CREATE INDEX idx_memberships_catalog ON catalog_memberships(catalog_id);
CREATE INDEX idx_memberships_catalog_exercise ON catalog_memberships(catalog_id, exercise_id);
CREATE INDEX idx_memberships_owner ON catalog_memberships(owner_id);

-- 4. RLS Policies
ALTER TABLE global_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_memberships ENABLE ROW LEVEL SECURITY;

-- Global exercises: read own + null owner (built-in)
CREATE POLICY "Users can read own exercises and built-ins"
  ON global_exercises FOR SELECT
  USING (owner_id IS NULL OR owner_id = auth.uid());

CREATE POLICY "Users can insert own exercises"
  ON global_exercises FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own exercises"
  ON global_exercises FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own exercises"
  ON global_exercises FOR DELETE
  USING (owner_id = auth.uid());

-- Memberships: read own + null owner (built-in)
CREATE POLICY "Users can read own memberships and built-ins"
  ON catalog_memberships FOR SELECT
  USING (owner_id IS NULL OR owner_id = auth.uid());

CREATE POLICY "Users can insert own memberships"
  ON catalog_memberships FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own memberships"
  ON catalog_memberships FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own memberships"
  ON catalog_memberships FOR DELETE
  USING (owner_id = auth.uid());

-- 5. Migrate data from old table
INSERT INTO global_exercises (
  id, owner_id, name, description, exercise_type,
  default_duration, rep_duration_seconds, has_video, custom_video_url,
  base_tags, benefits, limitations, best_timing,
  suggested_combinations, instructions, exercise_references, notes,
  is_favorite, created_at, updated_at, deleted, version, dirty, op, synced_at
)
SELECT 
  id, owner_id, name, description, exercise_type,
  default_duration, rep_duration_seconds, has_video, custom_video_url,
  tags as base_tags,  -- Temporarily copy all tags
  benefits, limitations, best_timing,
  suggested_combinations, instructions, exercise_references, notes,
  is_favorite, created_at, updated_at, deleted, version, dirty, op, synced_at
FROM global_exercises_old;

-- 6. Create memberships from old catalog_id
INSERT INTO catalog_memberships (
  exercise_id, catalog_id, catalog_tags, owner_id,
  created_at, updated_at, deleted, version
)
SELECT 
  id as exercise_id,
  catalog_id,
  tags as catalog_tags,  -- Temporarily assign all tags to membership
  owner_id,
  created_at, updated_at, deleted, version
FROM global_exercises_old
WHERE catalog_id IS NOT NULL;

-- 7. Drop old table
DROP TABLE global_exercises_old;

-- Note: Manual cleanup needed to properly split base_tags vs catalog_tags
```

**Sync Function Update**:
```typescript
// supabase/functions/sync_v2/index.ts

// Add to TABLE_ALLOWLIST
const TABLE_ALLOWLIST = {
  // ... existing tables
  global_exercises: [
    'id', 'owner_id', 'name', 'description', 'exercise_type',
    'default_duration', 'rep_duration_seconds', 'has_video', 'custom_video_url',
    'base_tags', 'benefits', 'limitations', 'best_timing',
    'suggested_combinations', 'instructions', 'exercise_references', 'notes',
    'is_favorite', 'created_at', 'updated_at', 'deleted', 'version'
  ],
  catalog_memberships: [
    'id', 'exercise_id', 'catalog_id', 'catalog_tags',
    'display_order', 'featured', 'custom_name_key', 'custom_description_key',
    'catalog_notes', 'owner_id', 'created_at', 'updated_at', 'deleted', 'version'
  ]
};

// Add validation for catalog_memberships
function validateCatalogMembership(record: any): string | null {
  if (!record.exercise_id || typeof record.exercise_id !== 'string') {
    return 'Invalid exercise_id';
  }
  if (!record.catalog_id || typeof record.catalog_id !== 'string') {
    return 'Invalid catalog_id';
  }
  if (record.catalog_tags && !Array.isArray(record.catalog_tags)) {
    return 'catalog_tags must be an array';
  }
  // ... more validation
  return null;
}
```

### Phase 5: UI Component Updates

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

**⚠️ CRITICAL**: Follow styling rules - **NO inline styles**, use Tailwind classes only. Verify against `docs/ui-ux/ui-specs.md`

**Files to modify**:
- `apps/frontend/src/hooks/useExerciseFilter.ts`
- `apps/frontend/src/components/ExerciseForm.tsx`
- `apps/frontend/src/components/ExerciseList.tsx`
- `apps/frontend/src/components/CatalogMultiSelector.tsx` (NEW)
- `apps/frontend/src/pages/ExercisePage.tsx`
- `apps/frontend/src/pages/TimerPage.tsx`

**Actions**:
1. [ ] Update `useExerciseFilter` hook:
   - [ ] Modify to join exercises with memberships
   - [ ] Support filtering by catalog via memberships
   - [ ] Merge `base_tags` + `catalog_tags` for badge filtering
   - [ ] Test with multiple catalogs
2. [ ] Create `CatalogMultiSelector` component (NEW):
   - [ ] Multi-select dropdown for catalog assignment
   - [ ] Use **Tailwind classes only** (no inline styles)
   - [ ] Follow style guide from `docs/ui-ux/ui-specs.md`
   - [ ] Test keyboard navigation and accessibility
3. [ ] Update `ExerciseForm`:
   - [ ] Add catalog multi-selector
   - [ ] Separate base tags from catalog-specific tags
   - [ ] Show catalog-specific tag inputs per selected catalog
   - [ ] Handle membership CRUD operations
   - [ ] Validate against new schema
4. [ ] Update `ExerciseList`:
   - [ ] Display exercises with membership context
   - [ ] Show catalog badges correctly
   - [ ] Test grouping by catalog badge
5. [ ] Update `ExercisePage`:
   - [ ] Handle new query patterns for exercises
   - [ ] Verify badge filtering with merged tags
   - [ ] Test catalog switching
6. [ ] Update `TimerPage`:
   - [ ] Ensure exercises load correctly from new schema
   - [ ] Test with exercises from different catalogs
7. [ ] Verify offline functionality:
   - [ ] All UI operations work without network
   - [ ] Changes queue for sync properly
8. [ ] Update this plan with completion status

**Key Changes**:

1. **useExerciseFilter Hook**: Join exercises with memberships
```typescript
// Before
const exercises = await storageService.getExercises();
const filtered = exercises.filter(ex => ex.catalogId === selectedCatalog);

// After
const exercises = await storageService.getExercisesForCatalog(selectedCatalog);
// Returns ExerciseInCatalog[] with merged tags
```

2. **ExerciseForm**: Multi-catalog selection
```typescript
// Add catalog selector (multi-select)
<CatalogMultiSelector
  selectedCatalogs={exercise.memberships.map(m => m.catalog_id)}
  onChange={(catalogs) => {
    // Update memberships
  }}
/>

// Show base tags + catalog-specific tags separately
<TagInput
  label="Base Tags (all catalogs)"
  tags={exercise.base_tags}
  onChange={handleBaseTagsChange}
/>

{exercise.memberships.map(membership => (
  <TagInput
    key={membership.catalog_id}
    label={`${getCatalogName(membership.catalog_id)} Tags`}
    tags={membership.catalog_tags}
    onChange={(tags) => handleCatalogTagsChange(membership.catalog_id, tags)}
  />
))}
```

3. **Badge Filtering**: Use merged tags
```typescript
// In ExerciseInCatalog type, effectiveTags already merges base + catalog tags
const effectiveTags = [...exercise.base_tags, ...(membership.catalog_tags || [])];
```

### Phase 6: Translation Updates

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

**⚠️ CRITICAL**: Follow localization workflow - update `en` locale first, then other languages

**Files to modify**:
- `apps/frontend/public/locales/en/exerciseDetails.json` (FIRST - canonical source)
- `apps/frontend/public/locales/*/exerciseDetails.json` (AFTER `en` is verified)

**Actions**:
1. [ ] Update **English (`en`) locale first**:
   - [ ] Consolidate exercise translations to single keys (remove catalog prefixes)
   - [ ] Update `exerciseDetails.json` to have one entry per unique exercise
   - [ ] Remove duplicate entries for exercises shared across catalogs
   - [ ] Verify all global exercises have translation entries
2. [ ] Run validation: `pnpm i18n:scan`
   - [ ] Fix any missing keys reported
   - [ ] Ensure 100% coverage for `en` locale
3. [ ] Update other locales (after `en` is complete):
   - [ ] `de` - German
   - [ ] `es` - Spanish
   - [ ] `fr` - French
   - [ ] `nl` - Dutch
   - [ ] `ar` - Arabic
   - [ ] `ar-EG` - Arabic (Egyptian)
   - [ ] `fy` - Frisian
4. [ ] Run final validation: `pnpm i18n:scan`
5. [ ] Test language switching in UI
6. [ ] Update this plan with completion status

**Before** (duplicated):
```json
{
  "plank": {
    "name": "Plank",
    "description": "..."
  },
  "pilates-plank": {
    "name": "Plank",
    "description": "..."
  }
}
```

**After** (deduplicated):
```json
{
  "plank": {
    "name": "Plank",
    "description": "...",
    "benefits": "...",
    "instructions": {
      "setup": "...",
      "execution": ["..."]
    }
  }
}
```

### Phase 7: Testing and Validation

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

**⚠️ CRITICAL**: Run `pnpm test:ci` before marking phase complete

**Automated Test Coverage**:
1. [ ] Write tests for StorageService membership CRUD operations
   - [ ] `getCatalogMemberships()`
   - [ ] `getExerciseMemberships()`
   - [ ] `addExerciseToCatalog()`
   - [ ] `removeExerciseFromCatalog()`
   - [ ] `getExercisesForCatalog()`
2. [ ] Write tests for exercise filtering by catalog with memberships
   - [ ] Test single catalog filtering
   - [ ] Test multi-catalog exercise display
   - [ ] Test badge filtering with merged tags
3. [ ] Write tests for badge system with merged tags (base + catalog)
   - [ ] Test tag merging logic
   - [ ] Test badge extraction from merged tags
   - [ ] Test filtering with catalog-specific badges
4. [ ] Write tests for sync operations for both tables
   - [ ] Test global_exercises sync up/down
   - [ ] Test catalog_memberships sync up/down
   - [ ] Test conflict resolution
5. [ ] Write tests for migration from old schema to new
   - [ ] Test IndexedDB migration v22 → v23
   - [ ] Test data integrity after migration
   - [ ] Test rollback scenarios
6. [ ] Write tests for UI components with multi-catalog exercises
   - [ ] Test CatalogMultiSelector
   - [ ] Test ExerciseForm with memberships
   - [ ] Test ExerciseList display
7. [ ] Run full test suite: `pnpm test:ci`
   - [ ] Fix any failing tests
   - [ ] Ensure no regressions
   - [ ] Verify 80%+ code coverage

**Manual Testing Checklist**:
1. [ ] Offline functionality:
   - [ ] Create new exercise offline, assign to multiple catalogs
   - [ ] Modify exercise metadata offline
   - [ ] Remove exercise from one catalog offline
   - [ ] Verify changes queue for sync
2. [ ] Online sync:
   - [ ] Connect to network, verify auto-sync
   - [ ] Check dev Supabase for synced data
   - [ ] Test conflict resolution scenarios
3. [ ] Multi-catalog exercise scenarios:
   - [ ] Create exercise in Catalog A
   - [ ] Add same exercise to Catalog B with different tags
   - [ ] Modify exercise in one catalog, verify update in both
   - [ ] Remove from Catalog A, verify still in Catalog B
4. [ ] Badge filtering:
   - [ ] Test filtering by base tags
   - [ ] Test filtering by catalog-specific tags
   - [ ] Test filtering with merged tags
   - [ ] Verify grouping by catalog badge
5. [ ] UI/UX validation:
   - [ ] Verify no inline styles (use browser inspector)
   - [ ] Check against `docs/ui-ux/ui-specs.md`
   - [ ] Test keyboard navigation
   - [ ] Test screen reader compatibility
6. [ ] Cross-browser testing:
   - [ ] Chrome/Edge
   - [ ] Firefox
   - [ ] Safari (iOS PWA)
   - [ ] Mobile browsers
7. [ ] Migration testing:
   - [ ] Test migration with existing user data
   - [ ] Verify favorites are preserved
   - [ ] Verify custom exercises migrate correctly
   - [ ] Check that no data is lost
8. [ ] Update this plan with completion status

## Migration Strategy

### For Developers

1. **Run migration script**: Converts existing data to new model
2. **Update imports**: Change from `exercises/*.ts` to `globalExercises.ts` + `memberships/*.ts`
3. **Test locally**: Verify all exercises display correctly per catalog
4. **Update custom exercises**: If any, migrate to new schema

### For Users

- **Automatic**: Migration runs on app startup (IndexedDB version 23)
- **Transparent**: No user action required
- **Data preserved**: All existing exercises and favorites maintained
- **Sync handled**: Cloud sync migrated automatically

## Rollout Plan

1. **Phase 1**: Local development and testing (1-2 weeks)
2. **Phase 2**: Deploy to dev environment, test sync (1 week)
3. **Phase 3**: Beta testing with select users (1 week)
4. **Phase 4**: Production deployment with migration (1 day)
5. **Phase 5**: Monitor and fix issues (1 week)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Migration data loss | High | Thorough testing, backup before migration |
| Sync conflicts during transition | Medium | Version the sync protocol, handle legacy format |
| Performance degradation (joins) | Low | Proper indexes, denormalize if needed |
| Breaking existing user workflows | Medium | Backward compat layer, gradual rollout |
| Translation key mismatches | Low | Automated validation script |

## Success Metrics

- [ ] Zero data loss during migration
- [ ] All existing exercises display correctly
- [ ] Badge filtering works with merged tags
- [ ] Sync operations complete successfully
- [ ] No performance regression (<50ms query time)
- [ ] All tests pass
- [ ] Documentation updated

## Future Enhancements

1. **Catalog-specific exercise variations**: Override name/description per catalog
2. **Exercise recommendations**: "Add to other catalogs" suggestions
3. **Batch operations**: Assign multiple exercises to catalog at once
4. **Exercise analytics**: Track usage across catalogs
5. **Import/export**: Share exercise sets across users

## Documentation Updates Required

**⚠️ NOTE**: Mark items complete inline as work progresses. Do NOT create separate tracking files.

- [ ] Update `docs/exercise-catalog.md` with new architecture
  - [ ] Document GlobalExercise schema
  - [ ] Document CatalogMembership schema
  - [ ] Update developer guide for adding exercises
  - [ ] Update developer guide for adding catalogs
  - [ ] Add migration notes from old system
- [ ] Create migration guide: `docs/implementation-plans/global-exercise-migration-guide.md`
  - [ ] Document IndexedDB migration steps
  - [ ] Document Supabase migration steps
  - [ ] Include rollback procedures
  - [ ] Add troubleshooting section
- [ ] Update API documentation for StorageService
  - [ ] Document new methods (memberships CRUD)
  - [ ] Update existing method signatures
  - [ ] Add code examples
- [ ] Document membership data structure in `docs/data-structures.md`
  - [ ] Schema definitions
  - [ ] Relationship diagrams
  - [ ] Query patterns
- [ ] Add examples for creating global exercises
  - [ ] Template for global exercise definition
  - [ ] Template for catalog membership definition
  - [ ] Examples of shared exercises across catalogs
- [ ] Update sync protocol documentation
  - [ ] Document new tables in sync allowlist
  - [ ] Document validation rules
  - [ ] Add conflict resolution strategies
- [ ] Update CHANGELOG.md with breaking changes
  - [ ] Note schema version bump (v23)
  - [ ] Note API changes
  - [ ] Migration instructions for users

## Questions to Resolve

1. Should we allow catalog-specific name/description overrides initially, or defer to v2?
2. How to handle exercise deletion when referenced by multiple catalogs?
3. Should built-in memberships be immutable, or allow user customization?
4. What's the UX for assigning exercises to catalogs in the UI?

## PowerShell Command Reference

**Development Environment**: Windows 11 + VSCode + PowerShell

```powershell
# Start development servers
pnpm dev                    # Frontend (port 5173)
pnpm dev:be                 # Backend (port 3001)

# Run tests
pnpm test                   # Interactive mode
pnpm test:ci                # CI mode (required before marking phases complete)
pnpm test:stable            # Windows-stable mode

# Linting and type checking
pnpm lint                   # ESLint with auto-fix
pnpm exec tsc --noEmit      # TypeScript type checking

# Internationalization
pnpm i18n:scan              # Check for missing translation keys (run after text changes)

# Build
pnpm build                  # Production build
pnpm build:prod             # Production build with optimizations

# Supabase (local development)
# Note: Use MCP tools (mcp_supabase_* and mcp_supabase-prod_*) for migrations
# Local CLI commands for testing:
supabase functions serve    # Test Edge Functions locally
supabase migration list     # List migrations
```

## Next Steps

**⚠️ Remember**: Follow all Critical Development Rules throughout implementation

1. [ ] Review and approve this plan
2. [ ] Create feature branch: `feature/global-exercise-repository`
   ```powershell
   git checkout -b feature/global-exercise-repository
   ```
3. [ ] Implement Phase 1 (types and data model)
   - [ ] Create types in `apps/frontend/src/types/`
   - [ ] Run `pnpm exec tsc --noEmit` to verify
   - [ ] Mark Phase 1 checkboxes complete
   - [ ] Update this plan inline
4. [ ] Implement Phase 2 (storage layer)
   - [ ] Add IndexedDB schema v23
   - [ ] Test migration locally
   - [ ] Mark Phase 2 checkboxes complete
5. [ ] Implement Phase 3 (data refactoring)
   - [ ] Create global exercises file
   - [ ] Create membership files
   - [ ] Mark Phase 3 checkboxes complete
6. [ ] Implement Phase 4 (Supabase)
   - [ ] Create migration files **locally first**
   - [ ] Create tracking doc in `docs/migration-tracking/`
   - [ ] Test in dev environment (MCP: mcp_supabase_*)
   - [ ] Deploy to prod (MCP: mcp_supabase-prod_*) after validation
   - [ ] Mark Phase 4 checkboxes complete
7. [ ] Implement Phase 5 (UI components)
   - [ ] Update components following style guide
   - [ ] Test offline functionality
   - [ ] Mark Phase 5 checkboxes complete
8. [ ] Implement Phase 6 (translations)
   - [ ] Update `en` locale first
   - [ ] Run `pnpm i18n:scan`
   - [ ] Update other locales
   - [ ] Mark Phase 6 checkboxes complete
9. [ ] Implement Phase 7 (testing)
   - [ ] Write all automated tests
   - [ ] Run `pnpm test:ci` (must pass)
   - [ ] Complete manual testing checklist
   - [ ] Mark Phase 7 checkboxes complete
10. [ ] Complete documentation updates
    - [ ] Update all docs per checklist above
    - [ ] Mark documentation checkboxes complete
11. [ ] Final validation
    - [ ] All phase checkboxes marked complete
    - [ ] All tests passing
    - [ ] No inline styles in code
    - [ ] Migration tracking doc created
    - [ ] CHANGELOG.md updated
12. [ ] Request review (do not auto-commit)
13. [ ] After approval, create PR and merge
