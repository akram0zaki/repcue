# Development to Production Migration Tracking

This file tracks all schema changes, edge functions, and policies applied to the development environment that need to be applied to production once the multi-catalog feature is complete.

## Migration Status
- **Development Environment**: repcue-dev (xwzrsfkzqxdybjrkkkvh)
- **Production Environment**: RepCue (zumzzuvfsuzvvymhpymk)
- **Feature**: Multi-catalog support
- **Status**: Development phase - DO NOT apply to production yet

## Database Schema Changes Applied to Development

### 1. Migration: 20250917_add_catalog_support.sql
**Date Applied**: 2025-09-17
**Status**: ✅ Applied to dev
**File Location**: `supabase/migrations/20250917_add_catalog_support.sql`

**Changes Made**:
- Created `exercise_catalogs` table with fields:
  - `id` (TEXT PRIMARY KEY)
  - `name_key` (TEXT NOT NULL)
  - `description_key` (TEXT NOT NULL)
  - `is_default` (BOOLEAN NOT NULL DEFAULT false)
  - `is_premium` (BOOLEAN NOT NULL DEFAULT false)
  - `display_order` (INTEGER NOT NULL DEFAULT 0)
  - `icon` (TEXT NOT NULL)
  - `color_theme` (TEXT NOT NULL)
  - `created_at` (TIMESTAMP WITH TIME ZONE)
  - `updated_at` (TIMESTAMP WITH TIME ZONE)

- Added `catalog_id` column to `exercises` table (TEXT NOT NULL)
- Set all existing exercises to `catalog_id = 'general-fitness'`
- Added foreign key constraint: `fk_exercises_catalog_id`
- Created indexes:
  - `idx_exercises_catalog_id`
  - `idx_exercise_catalogs_display_order`
  - `idx_exercise_catalogs_is_default`
- Enabled RLS on `exercise_catalogs` table
- Created RLS policies:
  - "Anyone can read exercise catalogs" (SELECT)
  - "Only authenticated users can modify exercise catalogs" (ALL)
- Added updated_at trigger for `exercise_catalogs`
- Inserted default catalogs: general-fitness, tai-chi, zumba

**Verification**: ✅ Migration completed successfully with verification checks

### 2. Migration: 20250917_add_extended_exercise_fields.sql
**Date Applied**: 2025-09-17
**Status**: ✅ Applied to dev
**File Location**: `supabase/migrations/20250917_add_extended_exercise_fields.sql`

**Changes Made**:
- Added `picture_url` column to `exercise_catalogs` table (TEXT)
- Added extended fields to `exercises` table:
  - `benefits` (TEXT)
  - `limitations` (TEXT)
  - `best_timing` (TEXT)
  - `suggested_combinations` (TEXT[])
  - `notes` (TEXT)
  - `exercise_references` (TEXT[]) - renamed from 'references' due to SQL reserved keyword
- Updated existing catalogs with placeholder picture URLs
- Added new catalog: `women-health` with id, metadata, and picture URL

**Verification**: ✅ Migration completed successfully with verification checks

## Edge Functions Changes Applied to Development

### 1. sync_v2 Function Updates
**Date Applied**: 2025-09-17
**Status**: ✅ Applied to dev
**Version**: 34

**Changes Made**:
- Added `exercise_catalogs` to `SYNC_TABLES` array (positioned before exercises for foreign key dependency)
- Added `exercise_catalogs` field allowlist to `MUTABLE_FIELD_ALLOWLIST`:
  - `id`, `name_key`, `description_key`, `is_default`, `is_premium`
  - `display_order`, `icon`, `color_theme`, `picture_url`
  - Standard sync metadata fields
- Updated `exercises` allowlist to include:
  - `catalog_id` field for catalog reference
  - Extended metadata fields: `benefits`, `limitations`, `best_timing`, `suggested_combinations`, `notes`, `exercise_references`
- Maintained proper sync ordering (catalogs before exercises)

**Verification**: ✅ Edge function deployed successfully as version 34

## Client-Side Changes Applied

### 1. [COMPLETED] TypeScript Interfaces
**Status**: ✅ Applied
**Changes**: Added `ExerciseCatalog` interface and `catalogId` to `Exercise` interface

### 2. [COMPLETED] Data Structure Updates
**Status**: ✅ Applied
**Changes**: Created `catalogs.ts` and migrated exercises to `generalFitness.ts`

### 3. [PENDING] IndexedDB Schema Updates
**Status**: 🔄 Pending
**Required Changes**: Update StorageService Dexie schema

### 4. [PENDING] Sync Service Updates
**Status**: 🔄 Pending
**Required Changes**: Update CorrectSyncService for catalog fields

## Production Migration Checklist

When ready to apply to production:

- [ ] **Pre-migration verification**
  - [ ] All development testing completed
  - [ ] All client-side changes tested and working
  - [ ] Edge functions tested and working
  - [ ] Sync functionality verified with new schema

- [ ] **Apply database migrations**
  - [ ] Run `20250917_add_catalog_support.sql` on production
  - [ ] Run extended exercise schema migration on production
  - [ ] Verify all constraints and indexes created
  - [ ] Verify RLS policies applied correctly

- [ ] **Deploy edge functions**
  - [ ] Deploy updated sync_v2 function to production
  - [ ] Verify function deployment successful

- [ ] **Post-migration verification**
  - [ ] Test sync functionality on production
  - [ ] Verify all existing data preserved
  - [ ] Test new catalog functionality
  - [ ] Monitor logs for any errors

## Notes
- Keep this file updated as changes are applied to development
- DO NOT apply any changes to production until explicitly instructed
- Always test thoroughly in development before production deployment
- Maintain backup of production data before applying migrations