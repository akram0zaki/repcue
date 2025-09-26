# Multi-Catalog Implementation Plan

## Overview

This plan outlines the implementation of a multi-catalog system for RepCue's exercise library, extending the current single "General Fitness" catalog to support multiple specialized catalogs (Tai Chi, Zumba, etc.) while maintaining the existing offline-first architecture and UX patterns.

## Current System Analysis

### Existing Architecture
- **Exercise Definitions**: TypeScript source in `src/data/exercises.ts` with English fallback text
- **Localization**: Separate JSON files per locale in `public/locales/*/exercises.json`
- **Media System**: Central `exercise_media.json` index + organized video assets
- **Resolution Flow**: `localizeExercise()` utility maps TypeScript IDs to i18n keys
- **Categories**: Flat structure with `ExerciseCategory` enum (CORE, STRENGTH, CARDIO, etc.)

### Key Constraints
1. **Offline-First**: All built-in exercises must work without network
2. **i18n Integrity**: All 8 locales must be maintained (en, de, es, fr, nl, ar, ar-EG, fy)
3. **UX Preservation**: No regression to timer feel/clarity, minimal layout impact
4. **Build System**: Existing media verification and translation scanning must continue working

## Design Decisions

### 1. Catalog Structure
```typescript
// New catalog metadata interface
export interface ExerciseCatalog {
  id: string;                    // 'general-fitness', 'tai-chi', 'zumba'
  nameKey: string;              // i18n key: 'catalogs.general-fitness.name'
  descriptionKey: string;       // i18n key: 'catalogs.general-fitness.description'
  isDefault: boolean;           // Only general-fitness = true
  isPremium: boolean;           // For future monetization
  displayOrder: number;         // UI sort order
  icon?: string;                // Optional catalog icon identifier
  colorTheme?: string;          // CSS theme identifier
}
```

### 2. Exercise Enhancement
```typescript
// Minimal change to existing Exercise interface
export interface Exercise extends SyncMetadata {
  // ... all existing fields unchanged ...
  catalogId: string;            // NEW: References ExerciseCatalog.id
}
```

### 3. File Organization Strategy

#### TypeScript Exercise Data
```
src/data/
├── catalogs.ts               # Catalog definitions
├── exercises.ts              # Re-export all exercises (maintain compatibility)
└── exercises/
    ├── generalFitness.ts     # Current INITIAL_EXERCISES
    ├── taiChi.ts            # New tai chi exercises
    └── zumba.ts             # New zumba exercises
```

#### Localization Files (No Change to Structure)
```
public/locales/*/
├── exercises.json            # Existing structure, exercises by ID
└── catalogs.json            # NEW: Catalog names/descriptions
```

#### Media Organization (Maintain Existing)
```
public/
├── exercise_media.json       # Existing format, no catalog separation needed
└── videos/                   # Existing flat structure works fine
```

## CRITICAL ISSUES IDENTIFIED

### 🚨 Phase 1 Implementation Status: INCOMPLETE

The current Phase 1 implementation only covers client-side type definitions and data structures. **Critical database and sync infrastructure is missing**, making the catalog system non-functional for:

1. **Data Persistence**: No `catalog_id` column in Supabase `exercises` table
2. **Sync Operations**: CorrectSyncService v2 unaware of catalog fields
3. **Cross-Device Sync**: Edge function `sync_v2` cannot handle catalog data
4. **Local Storage**: IndexedDB schema missing catalog support
5. **Foreign Key Integrity**: No catalog table to reference

### ✅ Clean Implementation Strategy (Pre-Launch)

Since the app hasn't launched yet and there are no real users, we can implement a **clean, simplified approach**:

- **No Backward Compatibility**: Can delete/recreate database structures as needed
- **Clean Schema**: Design optimal database schema from scratch
- **Simplified Migrations**: No complex data migration logic required
- **Fresh Start**: Reset development/staging databases for clean implementation

### 🚨 CRITICAL: Schema Change Impact Analysis

**⚠️ WARNING**: While we can freely change database schemas, **EVERY schema change requires careful review and updates across the entire application stack**. Missing any layer will cause weeks of debugging issues.

#### Schema Change Cascade Effect:
```
Database Schema Change
    ↓
Supabase Type Definitions (if using generated types)
    ↓
TypeScript Interfaces (src/types/*)
    ↓
StorageService Methods & Queries
    ↓
CorrectSyncService Sync Logic
    ↓
Edge Function sync_v2 Validation
    ↓
IndexedDB Schema Version
    ↓
Component Interfaces & Usage
```

#### Mandatory Review Areas for ANY Schema Change:

1. **Database Layer**:
   - Supabase table structure
   - Indexes and constraints
   - RLS policies
   - Generated TypeScript types

2. **Storage Layer** (`src/services/storageService.ts`):
   - Table definitions in Dexie
   - CRUD method signatures
   - Query methods and filters
   - Index definitions
   - Migration functions

3. **Sync Layer** (`src/services/correctSyncService.ts`):
   - `SYNC_ORDER` array
   - Field allowlists and validation
   - Dirty marking logic
   - Conflict resolution

4. **Edge Function** (`supabase/functions/sync_v2/index.ts`):
   - `SYNCABLE_TABLES` allowlist
   - `MUTABLE_FIELD_ALLOWLIST` per table
   - Pull query logic
   - Push validation logic

5. **Type Definitions** (`src/types/index.ts`):
   - Interface field definitions
   - Type exports and imports
   - Related type dependencies

**🔥 Past Issues**: Schema changes without updating all layers have caused:
- Sync failures with cryptic error messages
- Silent data corruption
- IndexedDB migration failures
- Type mismatches causing runtime errors
- Edge function validation rejecting valid data

#### 🛡️ Schema Change Prevention Checklist

Before deploying ANY schema changes, verify ALL these layers are updated:

**✅ Database Layer Checklist**:
- [ ] Supabase migration applied successfully
- [ ] RLS policies updated for new fields
- [ ] Indexes created for new query patterns
- [ ] Foreign key constraints working
- [ ] Generated types reflect schema changes

**✅ StorageService Checklist**:
- [ ] IndexedDB schema version bumped
- [ ] All table definitions include new fields
- [ ] All CRUD methods handle new fields
- [ ] All query methods updated for new fields
- [ ] Indexes match new query patterns

**✅ Sync Service Checklist**:
- [ ] New tables added to SYNC_ORDER
- [ ] Field allowlists updated
- [ ] Dirty marking logic handles new fields
- [ ] Pull/push logic includes new fields
- [ ] Conflict resolution updated

**✅ Edge Function Checklist**:
- [ ] SYNCABLE_TABLES includes new tables
- [ ] MUTABLE_FIELD_ALLOWLIST updated
- [ ] Pull queries include new fields
- [ ] Push validation handles new fields
- [ ] Error handling updated

**✅ Type Safety Checklist**:
- [ ] TypeScript interfaces updated
- [ ] All imports/exports updated
- [ ] No TypeScript compilation errors
- [ ] Component props updated
- [ ] API contracts updated

### 🚨 IMPLEMENTATION REQUIREMENTS (CRITICAL)

#### 🛡️ Error Handling Requirements

**MANDATORY**: All code must have proper error handling - NEVER swallow errors to return false success.

**❌ FORBIDDEN**:
```typescript
try {
  await riskyOperation();
  return true; // ❌ DON'T DO THIS - swallows errors
} catch (error) {
  return false; // ❌ Lost error context
}
```

**✅ REQUIRED**:
```typescript
try {
  await riskyOperation();
  return { success: true };
} catch (error) {
  logger.error('Operation failed:', error);
  return { success: false, error: error.message || 'Unknown error' };
}
```

**Error Handling Checklist for ALL Code**:
- [ ] **Database Operations**: All Supabase queries wrapped with proper error handling
- [ ] **IndexedDB Operations**: All Dexie operations catch and propagate errors
- [ ] **Sync Operations**: All sync failures logged and returned with context
- [ ] **Edge Functions**: All edge function calls handle network/validation errors
- [ ] **Type Validation**: All data parsing validates types and handles malformed data
- [ ] **Component State**: All async operations in components handle loading/error states
- [ ] **Service Methods**: All service methods return error context, never just false

#### 🔧 Full Implementation Requirements

**MANDATORY**: This is a complete implementation plan - NO MOCKS, NO PLACEHOLDERS, NO "TODO" IMPLEMENTATIONS.

**✅ Full Implementation Standards**:
- [ ] **Edge Functions**: Complete `sync_v2` updates with full catalog validation
- [ ] **Database Schema**: Complete migration with all tables, indexes, constraints
- [ ] **StorageService**: All CRUD methods fully implemented for catalog operations
- [ ] **CorrectSyncService**: Complete sync logic with catalog table ordering
- [ ] **UI Components**: Complete catalog selector with all interactions
- [ ] **Type Definitions**: Complete TypeScript interfaces with no `any` types
- [ ] **Error Boundaries**: Complete error handling at all application layers
- [ ] **Testing**: Complete test coverage for all new functionality

**❌ FORBIDDEN**:
- Mock edge functions that aren't implemented
- Placeholder sync logic that "will be implemented later"
- Stub database operations
- Incomplete UI components
- Partial type definitions

#### 🔒 Exercise Sharing System Protection

**⚠️ CRITICAL**: The exercise sharing system with video syncing is working perfectly after 2 weeks of debugging. DO NOT change this mechanism unless absolutely necessary.

**Protected Components** (HANDS OFF unless required):
- Exercise sharing flow (creator → public → receiver)
- Video syncing mechanism between users
- IndexedDB storage for shared exercises
- Sharing token generation and validation
- Cross-user exercise access patterns

**Catalog Integration Rules**:
- [ ] **Shared Exercises**: Must respect existing sharing mechanism
- [ ] **Video Sync**: Must not interfere with existing video sync process
- [ ] **IndexedDB**: Catalog changes must not break shared exercise storage
- [ ] **Sync Logic**: Catalog sync must not interfere with exercise sharing sync
- [ ] **User Access**: Catalog filtering must not block shared exercise access

**Required Protection Measures**:
- [ ] Test shared exercise creation with catalog assignments
- [ ] Test shared exercise receiving with catalog preservation
- [ ] Test video sync continues working with catalog fields
- [ ] Test sharing tokens remain valid with schema changes
- [ ] Test cross-user access patterns with catalog filtering

### 🔄 Database Migration Management (CRITICAL)

**⚠️ PERSISTENT ISSUE**: Past problems with migrations being applied to dev but not prod (or vice-versa) causing environment desynchronization.

#### 🛡️ Migration File Management Protocol

**MANDATORY**: ALL database changes must be written to migration files BEFORE applying to ANY environment.

1. **Create Migration File First**:
   ```bash
   # Create timestamped migration file
   supabase migration new add_catalog_support_to_exercises
   # This creates: supabase/migrations/YYYYMMDDHHMMSS_add_catalog_support_to_exercises.sql
   ```

2. **Write Complete Migration**:
   ```sql
   -- File: supabase/migrations/20250117120000_add_catalog_support_to_exercises.sql
   -- Description: Add catalog support to exercises and create catalog table

   -- Step 1: Create exercise_catalogs table
   DROP TABLE IF EXISTS exercise_catalogs CASCADE;
   CREATE TABLE exercise_catalogs (
     id TEXT PRIMARY KEY,
     name_key TEXT NOT NULL,
     description_key TEXT NOT NULL,
     -- ... complete table definition
   );

   -- Step 2: Recreate exercises table with catalog support
   DROP TABLE IF EXISTS exercises CASCADE;
   CREATE TABLE exercises (
     id TEXT PRIMARY KEY,
     catalog_id TEXT NOT NULL DEFAULT 'general-fitness',
     -- ... complete table definition
     CONSTRAINT fk_exercises_catalog FOREIGN KEY (catalog_id) REFERENCES exercise_catalogs(id)
   );

   -- Step 3: Seed default catalogs
   INSERT INTO exercise_catalogs (id, name_key, description_key, is_default, is_premium, display_order) VALUES
   ('general-fitness', 'catalogs.general-fitness.name', 'catalogs.general-fitness.description', true, false, 0),
   ('tai-chi', 'catalogs.tai-chi.name', 'catalogs.tai-chi.description', false, true, 1),
   ('zumba', 'catalogs.zumba.name', 'catalogs.zumba.description', false, true, 2);
   ```

3. **Version Control First**:
   ```bash
   git add supabase/migrations/20250117120000_add_catalog_support_to_exercises.sql
   git commit -m "feat: add catalog support migration for exercises"
   git push
   ```

#### 🎯 Environment Synchronization Protocol

**MANDATORY ORDER**: Always apply migrations in this exact sequence:

1. **Development Environment**:
   ```bash
   # Apply to development project
   supabase db push --project-ref xwzrsfkzqxdybjrkkkvh
   # Verify migration applied successfully
   supabase db diff --project-ref xwzrsfkzqxdybjrkkkvh
   ```

2. **Generate Updated Types**:
   ```bash
   # Generate types from dev environment
   supabase gen types typescript --project-id xwzrsfkzqxdybjrkkkvh > src/types/supabase.ts
   ```

3. **Test & Validate in Development**:
   - Run all tests against dev environment
   - Verify sync functionality works
   - Validate schema changes are complete

4. **Production Environment** (ONLY after dev validation):
   ```bash
   # Apply to production project
   supabase db push --project-ref zumzzuvfsuzvvymhpymk
   # Verify migration applied successfully
   supabase db diff --project-ref zumzzuvfsuzvvymhpymk
   ```

#### 🚨 Migration Verification Checklist

Before applying to ANY environment:

**✅ Pre-Migration Checklist**:
- [ ] Migration file created and committed to version control
- [ ] Migration tested in local Supabase instance
- [ ] Migration includes rollback strategy (if possible)
- [ ] Schema changes documented in migration comments
- [ ] Migration file follows naming convention: `YYYYMMDDHHMMSS_description.sql`

**✅ Development Environment Checklist**:
- [ ] Migration applied to dev project (xwzrsfkzqxdybjrkkkvh)
- [ ] Schema diff shows expected changes only
- [ ] Generated types updated and committed
- [ ] All application layers updated and tested
- [ ] Sync functionality validated in dev environment

**✅ Production Environment Checklist**:
- [ ] Development environment fully validated first
- [ ] Migration applied to prod project (zumzzuvfsuzvvymhpymk)
- [ ] Schema diff shows expected changes only
- [ ] Both environments have identical schema
- [ ] Deployment pipeline updated if needed

#### 🔧 Environment Verification Commands

**Check Environment Sync Status**:
```bash
# Compare dev and prod schemas
supabase db diff --project-ref xwzrsfkzqxdybjrkkkvh --schema public > dev_schema.sql
supabase db diff --project-ref zumzzuvfsuzvvymhpymk --schema public > prod_schema.sql
diff dev_schema.sql prod_schema.sql

# Should show NO differences after migration
```

**Emergency Rollback** (if needed):
```bash
# Reset to specific migration (DANGEROUS - use with caution)
supabase db reset --project-ref <project-id>
# Then reapply migrations up to desired point
```

### 🔄 Sync Architecture Dependencies

Based on `docs/sync.md`, `docs/favorites-sync.md`, and `docs/exercises-sync.md`, the catalog system must integrate with:

- **Cursor-based pagination** (per-table composite cursors)
- **Version-based conflict resolution**
- **RLS security policies** for catalog access
- **Field allowlists** in edge functions
- **Foreign key ordering** (catalogs → exercises → favorites)
- **Exercise type differentiation** (built-in vs user-created exercise handling)
- **Sync filtering** (built-in exercises NEVER sync to Supabase)
- **ID format validation** (slug IDs vs UUID format detection)

### 📚 Exercise Type Considerations (Critical Addition)

From `docs/exercises-sync.md`, RepCue distinguishes between:

1. **Built-in Exercises** (Slug IDs like `"plank"`, `"push-ups"`):
   - **Never synced to Supabase** (`dirty: 0` always)
   - **Source of truth**: `src/data/exercises.ts` file
   - **owner_id**: Always `null`
   - **Catalog assignment**: Defined in source code, applies to all users
   - **Management**: Via `StorageService.cleanBuiltInExercises()` during app initialization

2. **User-Created Exercises** (UUID IDs):
   - **Fully synced** with dirty tracking and ownership
   - **Source of truth**: Supabase database
   - **owner_id**: User's UUID
   - **Catalog assignment**: User-selectable, synced with exercise data

**Impact on Catalog Implementation**:
- Built-in exercises get catalog assignment from static definitions
- User-created exercises store `catalog_id` in database and sync it
- Catalog changes for built-in exercises update all users automatically
- Catalog changes for user-created exercises are per-user and synced

## Revised Requirements (2025-01-17)

### New Requirements Added:
1. **Catalog Pictures**: Each catalog must have a `pictureUrl` field for header/preview images
2. **Extended Exercise Metadata**: All built-in exercises require additional fields:
   - `benefits`: Health and fitness benefits
   - `limitations`: Contraindications or limitations
   - `best_timing`: Optimal times to perform the exercise
   - `suggested_combinations`: Array of exercise IDs that pair well
   - `notes`: Additional notes or tips
   - `exercise_references`: Sources, studies, or references
3. **New Catalogs**: Add `women-health` catalog alongside existing ones
4. **Migration Tracking**: Keep detailed log of all dev changes for later production application

### Updated Catalog Structure:
```typescript
export interface ExerciseCatalog {
  id: string;                    // 'general-fitness', 'tai-chi', 'zumba', 'women-health'
  nameKey: string;              // i18n key
  descriptionKey: string;       // i18n key
  isDefault: boolean;           // Only general-fitness = true
  isPremium: boolean;           // For future monetization
  displayOrder: number;         // UI sort order
  icon?: string;                // Optional catalog icon identifier
  colorTheme?: string;          // CSS theme identifier
  pictureUrl?: string;          // NEW: Catalog header/preview image URL
}
```

### Updated Exercise Structure:
```typescript
export interface Exercise extends SyncMetadata {
  // ... existing fields ...
  catalogId: string;            // References ExerciseCatalog.id

  // NEW: Extended exercise metadata (for built-in exercises)
  benefits?: string;            // Health and fitness benefits
  limitations?: string;         // Contraindications or limitations
  best_timing?: string;         // Optimal times to perform
  suggested_combinations?: string[]; // IDs of exercises that pair well
  notes?: string;               // Additional notes or tips
  exercise_references?: string[]; // Sources, studies, or references
}
```

## Implementation Phases

### Phase 1: Database Foundation (Week 1) ✅ COMPLETED

#### 1.1 Type System Updates ✅
- [x] Add `ExerciseCatalog` interface to `src/types/index.ts`
- [x] Add `catalogId: string` to `Exercise` interface
- [x] Add extended metadata fields to `Exercise` interface
- [x] Add `pictureUrl?: string` to `ExerciseCatalog` interface
- [x] Update `createExercise()` helper to require `catalogId`

#### 1.2 Catalog Definitions ✅
- [x] Create `src/data/catalogs.ts` with initial catalogs
- [x] Add `women-health` catalog to catalog definitions
- [x] Add `pictureUrl` to all catalog definitions
- [x] Migrate current exercises to `src/data/exercises/generalFitness.ts`
- [x] Create `src/data/exercises/womenHealth.ts` with comprehensive exercises
- [x] Create `src/data/exercises/taiChi.ts` and `src/data/exercises/zumba.ts`
- [x] Update `src/data/exercises.ts` to re-export from all catalog files
- [x] Add `catalogId: 'general-fitness'` to all existing exercises

#### 1.3 Service Layer Enhancement ✅
- [x] Add catalog-aware methods to `StorageService`:
  - `getExercisesByCatalog(catalogId: string)`
  - `getCatalogs()`
  - `getAvailableCatalogs()` (respects premium status)
- [x] Ensure backward compatibility for existing exercise retrieval

#### 1.4 Database Setup ✅
- [x] **MIGRATION FILE**: Created `20250117_add_catalog_support.sql`
- [x] **MIGRATION FILE**: Created `20250117_add_extended_exercise_fields.sql`
- [x] **VERSION CONTROL**: Migration files committed to git
- [x] **DEV APPLY**: Applied both migrations to dev environment (xwzrsfkzqxdybjrkkkvh)
- [x] **DEV VERIFY**: Migrations successful with verification checks
- [x] **MIGRATION TRACKING**: Created detailed tracking file for production deployment
- [x] **SCHEMA UPDATES**: Added `exercise_catalogs` table with all required fields
- [x] **SCHEMA UPDATES**: Added `catalog_id` and extended fields to `exercises` table
- [x] **CATALOG SEEDING**: Inserted all four catalogs (general-fitness, tai-chi, zumba, women-health)

#### 1.5 IndexedDB Schema ✅
- [x] **Update**: Bumped StorageService to Version 16 with catalog support
- [x] **Add**: `exercise_catalogs` table to IndexedDB schema with full sync metadata
- [x] **Include**: `catalog_id` field in exercises table schema with proper indexing
- [x] **Migration**: Added upgrade function to set `catalog_id = 'general-fitness'` for existing exercises
- [x] **Verification**: All catalog-aware methods already implemented in StorageService
- [x] **Testing**: TypeScript compilation successful with no errors

#### 1.6 Sync Engine Integration ✅
- [x] **Add**: `exercise_catalogs` to `SYNC_ORDER` in CorrectSyncService (positioned before exercises)
- [x] **Update**: `sync_v2` edge function (v36) allowlist for catalog table
- [x] **Include**: `catalog_id` and extended fields in `MUTABLE_FIELD_ALLOWLIST` for exercises
- [x] **Include**: Complete `exercise_catalogs` field allowlist in edge function
- [x] **Ensure**: Foreign key integrity maintained (catalogs sync before exercises)
- [x] **Extended Fields**: Added `benefits`, `limitations`, `best_timing`, `suggested_combinations`, `notes`, `exercise_references`
- [x] **Verification**: Edge function successfully deployed and tested
- [x] **CRITICAL FIX**: Added missing `catalog_id` to activity_logs MUTABLE_FIELD_ALLOWLIST
- [x] **DATABASE SCHEMA**: Added `catalog_id` column to activity_logs table via migration

#### 1.7 Built-in Exercise Management ✅
- [x] **Update**: Exercise source files with proper catalog assignments
- [x] **Comprehensive**: Created `women-health` catalog with 40+ specialized exercises
- [x] **Extended**: Added comprehensive metadata to all exercises (benefits, limitations, etc.)
- [x] **Import**: Updated main exercises.ts to import from all catalog files
- [x] **Catalog Data**: Updated catalog definitions with picture URLs and new women-health catalog
- [x] **Verification**: All exercises properly categorized and include required metadata

### Phase 2: UI Implementation (Week 2) ✅ COMPLETED

#### 2.1 Catalog Selector Component ✅
- [x] Create `CatalogSelector.tsx` component
- [x] Horizontal scrollable tabs design
- [x] Premium lock indicators
- [x] Smooth catalog switching with state preservation

#### 2.2 Exercise Page Integration ✅
- [x] Integrate catalog selector into exercise page header
- [x] Update exercise listing to filter by selected catalog
- [x] Preserve search/filter state across catalog switches
- [x] Default to general-fitness catalog on load

#### 2.3 Search & Filter Adaptation ✅
- [x] Update search to work within selected catalog scope
- [x] Maintain existing filter UI (categories, tags, etc.)
- [x] Add catalog context to search results
- [x] Ensure performance with catalog filtering

#### 2.4 Bug Fixes & Stabilization ✅
- [x] Fixed catalog name display showing 'name' instead of actual catalog names
- [x] Fixed catalog filtering issue where only general-fitness exercises were showing
- [x] Created Version 17 migration to handle catalog_id field naming consistency
- [x] Updated cleanBuiltInExercises method to use latest exercise data with catalog assignments
- [x] Added Arabic and Egyptian Arabic translations for catalog system
- [x] Fixed TypeScript compilation errors with missing catalogId fields
- [x] Resolved linter errors with proper type checking
- [x] Verified complete build pipeline works correctly

**Implementation Notes**:
- Created `CatalogSelector.tsx` with themed buttons, premium badges, and catalog descriptions
- Integrated catalog filtering into `ExercisePage.tsx` with state persistence via localStorage
- Added catalog-aware filtering in `filteredExercises` useMemo
- Updated search results count to show catalog context: "Showing X of Y exercises in [Catalog Name]"
- Added translation support for catalog names and descriptions in multiple languages
- Catalog selection clears other filters to provide clean catalog switching experience
- **Critical Fix**: Resolved database field naming inconsistency between `catalog_id` (database) and `catalogId` (TypeScript)
- **Critical Fix**: Updated StorageService to properly update built-in exercises with latest catalog data
- **Localization**: Added comprehensive Arabic translations for the catalog system

### Phase 3: Localization & Content (Week 3) ✅ COMPLETED

#### 3.1 Catalog Localization ✅
- [x] Create `catalogs.json` for all 8 supported locales:
  - `en`, `de`, `es`, `fr`, `nl`, `ar`, `ar-EG`, `fy`
- [x] Add catalog name/description translations
- [x] Update `localizeExercise()` to handle catalog context if needed

#### 3.2 New Catalog Content ✅
- [x] Research and define Tai Chi exercises
- [x] Research and define Zumba exercises
- [x] Add exercises to respective catalog files
- [x] Translate all new exercises to 8 locales

#### 3.3 Localization Validation ✅
- [x] Update `pnpm i18n:scan` to validate catalog keys
- [x] Ensure no missing translations across catalogs
- [x] Verify translation consistency

### Phase 4: Testing & Schema Validation (Week 4) ✅ COMPLETED

#### 4.1 🚨 CRITICAL: Schema Change Validation ✅ COMPLETED
- [x] **Database Layer**: Test all Supabase CRUD operations with new schema
- [x] **Storage Layer**: Test all StorageService methods with catalog_id field
- [x] **Sync Layer**: Test CorrectSyncService with catalog table sync
- [x] **Edge Function**: Test sync_v2 with catalog validation and queries
- [x] **Type Safety**: Verify TypeScript compilation with updated interfaces
- [x] **RLS Policies**: Test catalog access control for different user scenarios
- [x] **Foreign Keys**: Test catalog referential integrity constraints
- [x] **🛡️ ERROR HANDLING**: Verify all operations return proper error context, never false success
- [x] **🔧 IMPLEMENTATION**: Verify no mocks, stubs, or incomplete implementations remain
- [x] **🔒 SHARING PROTECTION**: Test exercise sharing functionality still works perfectly
- [x] **ACTIVITY LOGS**: Added catalog_id support to activity logs database and sync
- [x] **COMPLETE SYNC**: Verified complete catalog sync infrastructure deployment

#### 4.2 Sync Engine Validation (CRITICAL) ✅ COMPLETED
- [x] **Catalog Sync**: Test exercise_catalogs table sync (first in order)
- [x] **Exercise Sync**: Test exercises with catalog_id field sync correctly
- [x] **Built-in Filtering**: Verify built-in exercises never sync catalog_id
- [x] **User Exercise Sync**: Verify user-created exercises sync catalog_id
- [x] **Conflict Resolution**: Test catalog-aware conflict scenarios
- [x] **Foreign Key Sync**: Test exercises sync after catalog dependencies
- [x] **Activity Log Sync**: Test activity_logs with catalog_id field sync correctly

#### 4.3 Exercise Management Validation ✅ COMPLETED
- [x] **Built-in Seeding**: Test cleanBuiltInExercises() with catalog assignments
- [x] **Catalog Filtering**: Test exercise queries respect catalog boundaries
- [x] **Exercise Creation**: Test user exercise creation with catalog selection
- [x] **Cross-Catalog**: Verify no data leakage between catalogs
- [x] **Activity Logging**: Test activity logs include proper catalog_id field

#### 4.4 End-to-End Integration Testing ✅ COMPLETED
- [x] **Fresh Install**: Test clean database setup from scratch
- [x] **Catalog Operations**: Test all catalog CRUD operations
- [x] **Exercise Operations**: Test exercise CRUD with catalog context
- [x] **Sync Scenarios**: Test online/offline sync with catalogs
- [x] **UI Integration**: Test catalog selection affects exercise display
- [x] **Activity Log Integration**: Test exercise completion creates catalog-aware activity logs

#### 4.5 Build System Integration ✅ COMPLETED
- [x] Verify `pnpm build` works with new structure
- [x] Ensure media verification continues working
- [x] Test translation scanning with catalogs
- [x] TypeScript compilation works without errors

## Database Migration Specifications

### 🗄️ Supabase Migration Requirements

#### Migration File: `supabase/migrations/YYYYMMDDHHMMSS_add_catalog_support_to_exercises.sql`

**🚨 CRITICAL**: This complete migration file MUST be created and committed to version control BEFORE applying to any environment.

```sql
-- Migration: Add catalog support to exercises and create catalog table
-- Description: Implements multi-catalog system for RepCue exercises
-- IMPORTANT: Apply to dev environment first, then prod after validation

-- Step 1: Create exercise_catalogs table
DROP TABLE IF EXISTS exercise_catalogs CASCADE;

CREATE TABLE exercise_catalogs (
  id TEXT PRIMARY KEY,
  name_key TEXT NOT NULL,           -- i18n key for catalog name
  description_key TEXT NOT NULL,    -- i18n key for catalog description
  is_default BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  icon TEXT,
  color_theme TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sync cursor queries (per sync.md v2 requirements)
CREATE INDEX idx_exercise_catalogs_sync ON exercise_catalogs(updated_at ASC, id ASC);

-- RLS policies for exercise_catalogs
ALTER TABLE exercise_catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all catalogs" ON exercise_catalogs FOR SELECT TO authenticated USING (true);

-- Step 2: Recreate exercises table with catalog support
DROP TABLE IF EXISTS exercises CASCADE;

CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  catalog_id TEXT NOT NULL DEFAULT 'general-fitness',  -- Built-in from the start
  default_duration INTEGER,
  default_sets INTEGER,
  default_reps INTEGER,
  rep_duration_seconds REAL,
  has_video BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  instructions JSONB,
  difficulty_level TEXT,
  equipment_needed TEXT[],
  muscle_groups TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  custom_video_url TEXT,
  rating_average REAL,
  rating_count INTEGER DEFAULT 0,
  copy_count INTEGER DEFAULT 0,
  shared_from_exercise_id TEXT,
  shared_from_user_id TEXT,
  is_shared_copy BOOLEAN DEFAULT FALSE,
  -- Sync metadata
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1
);

-- Optimal indexes for catalog-aware queries
CREATE INDEX idx_exercises_catalog_id ON exercises(catalog_id);
CREATE INDEX idx_exercises_owner_catalog ON exercises(owner_id, catalog_id, updated_at DESC, id);
CREATE INDEX idx_exercises_sync ON exercises(updated_at ASC, id ASC);
CREATE INDEX idx_exercises_public ON exercises(is_public, catalog_id) WHERE is_public = true;

-- Foreign key constraint for exercise catalog references
ALTER TABLE exercises ADD CONSTRAINT fk_exercises_catalog
  FOREIGN KEY (catalog_id) REFERENCES exercise_catalogs(id);

-- RLS policies for exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own exercises" ON exercises
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own exercises" ON exercises
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own exercises" ON exercises
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own exercises" ON exercises
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can read public exercises" ON exercises
  FOR SELECT USING (is_public = true);

-- Step 3: Seed default catalogs
INSERT INTO exercise_catalogs (id, name_key, description_key, is_default, is_premium, display_order, icon, color_theme) VALUES
('general-fitness', 'catalogs.general-fitness.name', 'catalogs.general-fitness.description', true, false, 0, 'fitness', 'blue'),
('tai-chi', 'catalogs.tai-chi.name', 'catalogs.tai-chi.description', false, true, 1, 'tai-chi', 'green'),
('zumba', 'catalogs.zumba.name', 'catalogs.zumba.description', false, true, 2, 'dance', 'purple');
```

#### Migration Application Protocol

The complete migration above follows this protocol:

1. **Version Control First**: Migration file committed before any application
2. **Dev Environment First**: Apply to `xwzrsfkzqxdybjrkkkvh` development project
3. **Full Testing**: All application layers tested against dev environment
4. **Production Last**: Apply to `zumzzuvfsuzvvymhpymk` production project only after dev validation
5. **Environment Sync**: Verify both environments have identical schemas

### 💾 IndexedDB Migration Requirements

#### Clean IndexedDB Schema (Pre-Launch)
```javascript
// Since no users exist, we can simply reset IndexedDB and start clean
// StorageService - bump to version 14 with full catalog support from the start

this.version(14).stores({
  exercises: 'id, name, category, exercise_type, catalog_id, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
  activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
  user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
  app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
  user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
  workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
  workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
  // Catalog metadata table with full sync support
  exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty',
  video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty'
});

// No complex migration needed - fresh start with catalog support built-in
// Built-in exercises will be seeded with catalog_id from source files
// User-created exercises will have catalog_id required from creation
```

### 🔄 Sync Engine Integration Requirements

#### CorrectSyncService Updates
```javascript
// Update SYNC_ORDER to include catalog table (must sync before exercises)
const SYNC_ORDER = [
  'user_preferences',
  'app_settings',
  'exercise_catalogs',  // NEW: Must sync before exercises
  'exercises',          // Now includes catalog_id field
  'user_favorites',
  'workouts',
  'activity_logs',
  'workout_sessions',
  'video_files'
];
```

#### Edge Function sync_v2 Updates
```javascript
// Add to SYNCABLE_TABLES allowlist
const SYNCABLE_TABLES = [
  'user_preferences',
  'app_settings',
  'exercise_catalogs',  // NEW: Catalog metadata sync
  'exercises',
  'user_favorites',
  'workouts',
  'activity_logs',
  'workout_sessions',
  'video_files'
];

// Add catalog_id to mutable fields
const MUTABLE_FIELD_ALLOWLIST = {
  exercises: new Set([
    'name', 'description', 'category', 'exercise_type', 'catalog_id',  // NEW
    'default_duration', 'default_sets', 'default_reps', 'rep_duration_seconds',
    'has_video', 'is_favorite', 'tags', 'instructions', 'difficulty_level',
    'equipment_needed', 'muscle_groups', 'is_public', 'is_verified', 'custom_video_url'
  ]),
  exercise_catalogs: new Set([  // NEW table
    'name_key', 'description_key', 'is_default', 'is_premium',
    'display_order', 'icon', 'color_theme'
  ])
  // ... other tables unchanged
};
```

### 🎯 Catalog Assignment Strategy

Based on `docs/exercises-sync.md`, catalog assignment works differently for each exercise type:

#### Built-in Exercise Catalog Assignment
```typescript
// In src/data/exercises/generalFitness.ts
export const GENERAL_FITNESS_EXERCISES: Exercise[] = [
  createExercise({
    id: 'plank',                    // Slug ID
    catalogId: 'general-fitness',   // Static assignment in source code
    // ... other fields
  })
];

// Future catalogs:
// src/data/exercises/taiChi.ts
export const TAI_CHI_EXERCISES: Exercise[] = [
  createExercise({
    id: 'cloud-hands',             // Slug ID
    catalogId: 'tai-chi',          // Static assignment
    // ... other fields
  })
];
```

#### User-Created Exercise Catalog Assignment
```typescript
// When user creates an exercise, they select catalog
const newExercise = {
  id: crypto.randomUUID(),         // UUID format
  catalogId: selectedCatalogId,    // User-selected, stored in DB
  owner_id: currentUserId,         // User ownership
  dirty: 1,                        // Marked for sync
  // ... other fields
};

// Catalog ID is synced to Supabase as part of exercise data
```

#### Sync Filtering Implications
```typescript
// Only user-created exercises sync their catalog_id to Supabase
const syncableExercises = exercises.filter(ex =>
  ex.dirty === 1 &&
  ex.owner_id === currentUserId &&
  ex.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
);

// Built-in exercises never sync, catalog changes come from app updates
const builtInExercises = exercises.filter(ex =>
  !ex.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
);
// These are managed by StorageService.cleanBuiltInExercises()
```

### ✅ Simplified ID Strategy (Pre-Launch)

Since we can start fresh, we'll use a clean ID strategy:

#### Built-in Exercise ID Convention
```typescript
// Current general-fitness exercises: Keep existing IDs
{ id: "plank", catalogId: "general-fitness" }
{ id: "push-ups", catalogId: "general-fitness" }

// New catalog exercises: Use namespaced IDs
{ id: "tai-chi-cloud-hands", catalogId: "tai-chi" }
{ id: "tai-chi-wave-hands", catalogId: "tai-chi" }
{ id: "zumba-salsa-step", catalogId: "zumba" }
```

#### User-Created Exercises: UUID Always
```typescript
// User exercises always use UUIDs regardless of catalog
{ id: "550e8400-e29b-41d4-a716-446655440000", catalogId: "general-fitness" }
{ id: "123e4567-e89b-12d3-a456-426614174000", catalogId: "tai-chi" }
```

**Benefits of This Approach**:
- No ID conflicts possible
- Clean separation between built-in and user-created exercises
- Simple exercise resolution logic
- Future-proof for additional catalogs

## UX Design Specifications

### Catalog Selector Design
- **Position**: Top of exercise page, below search bar
- **Default State**: General Fitness selected and visible
- **Premium Catalogs**: Show with lock icon + "Upgrade" badge
- **Interaction**: Horizontal scroll on mobile, tabs on desktop
- **Visual**: Subtle pills/tabs, current catalog highlighted

### Catalog Switching Behavior
- **State Preservation**: Maintain search query when switching catalogs
- **Filter Reset**: Clear category filters when switching (they may not apply)
- **Loading**: Smooth transition, no jarring reloads
- **Fallback**: If premium catalog locked, show preview + upgrade prompt

### Search & Filter Integration
- **Scope**: Search within currently selected catalog
- **Visual Feedback**: Search results show catalog context if needed
- **Global Search**: Future feature to search across all unlocked catalogs

## Monetization Integration (Future)

### Premium Catalog Access
- Free users: Access to General Fitness only
- Premium users: Access to all catalogs
- Preview mode: Show locked catalogs with exercise count + sample names

### Upgrade Flow
- Clear value proposition for premium catalogs
- Seamless upgrade from catalog preview
- Graceful handling of subscription status changes

## Risk Mitigation

### Backward Compatibility
- All existing exercises continue working unchanged
- Exercise IDs remain stable across catalogs
- API contracts preserved for existing components

### Performance Considerations
- Lazy load catalog content on demand
- Maintain search/filter performance
- Efficient catalog switching without re-renders

### Translation Integrity
- Comprehensive translation validation pipeline
- Fallback to English for missing catalog translations
- Clear documentation for adding new locales

## Success Metrics

### Technical Success
- [ ] Zero breaking changes to existing functionality
- [ ] All existing tests continue passing
- [ ] Build system continues working correctly
- [ ] No performance degradation in exercise loading

### UX Success
- [ ] Default catalog loads immediately
- [ ] Catalog switching feels smooth and responsive
- [ ] Search/filter work intuitively within catalog scope
- [ ] Premium catalog preview drives upgrade interest

### Content Success
- [ ] All new exercises properly localized
- [ ] Video system works with new catalogs
- [ ] Exercise quality meets RepCue standards

## Timeline Summary

- **Week 1**: Core types, data structure, service layer
- **Week 2**: UI components, catalog selection, exercise filtering
- **Week 3**: New content creation, full localization
- **Week 4**: Testing, polish, deployment preparation

## 🎉 IMPLEMENTATION COMPLETED (2025-01-19)

### ✅ COMPLETE MULTI-CATALOG SYSTEM IMPLEMENTED

**All 4 Phases Successfully Completed:**

**Phase 1 ✅**: Database Foundation, Type System, Service Layer, Sync Infrastructure
**Phase 2 ✅**: UI Implementation, Catalog Selector, Exercise Page Integration
**Phase 3 ✅**: Localization & Content (8 locales, Tai Chi, Zumba, Women's Health)
**Phase 4 ✅**: Testing & Schema Validation, Complete Sync Infrastructure

### 🔧 Critical Issues Resolved

**✅ Original Issue**: "I just finished Bicycle Crunches and I can't even see it in the table"
- **Root Cause**: Missing `catalog_id` field in activity logs sync infrastructure
- **Solution**: Added complete catalog support to activity logs including database schema, sync allowlists, and edge function validation

**✅ Sync Infrastructure**: Complete catalog sync system implemented:
- Database migrations applied to both dev and production environments
- Edge function `sync_v2` v36 deployed with complete catalog support
- Activity logs now include `catalog_id` field for proper exercise tracking
- Foreign key integrity maintained with proper sync ordering

**✅ Database Schema**: All required tables and fields implemented:
- `exercise_catalogs` table with full sync metadata
- `catalog_id` field added to `exercises` and `activity_logs` tables
- Proper indexing and RLS policies configured
- Migration files properly versioned and applied

### 🚀 System Status

**Deployment Ready**: All catalog functionality is production-ready
**Sync Verified**: Complete catalog sync infrastructure tested and deployed
**UI Complete**: Catalog selector and filtering fully implemented
**Localization**: All 8 supported locales include catalog translations
**Content**: 4 catalogs with comprehensive exercise libraries

### 📈 Achievement Metrics

**✅ Technical Success**:
- Zero breaking changes to existing functionality
- TypeScript compilation successful with no errors
- Complete sync infrastructure operational
- All database migrations successfully applied

**✅ Content Success**:
- 4 complete exercise catalogs implemented
- All new exercises properly localized across 8 languages
- Extended exercise metadata (benefits, limitations, timing, etc.)
- Proper catalog assignment for all exercises

**✅ UX Success**:
- Catalog selection seamlessly integrated
- Exercise filtering by catalog works correctly
- Activity logs properly track catalog context
- Search and filter functionality preserved

## Post-Implementation

### Maintenance
- Update `docs/exercise-catalog.md` with multi-catalog workflow
- Create catalog-specific exercise addition guidelines
- Document premium catalog management procedures

### Future Enhancements
- Dynamic catalog loading from server
- User-created catalogs
- Catalog-specific theming
- Cross-catalog search and favorites