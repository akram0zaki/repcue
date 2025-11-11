# Supabase Changes Tracking - November 10, 2025

**Date**: 2025-11-10  
**Phase**: Global Exercise Repository - Phase 4  
**Author**: AI Agent  
**Status**: 🔄 In Progress

---

## Overview

Phase 4 implementation adding `catalog_memberships` table to Supabase for many-to-many exercise-catalog relationships and updating sync logic.

## Changes Summary

### 1. Database Schema Changes

#### New Table: `catalog_memberships`

**File**: `supabase/migrations/20251110-01-create-catalog-memberships.sql`

**Purpose**: Enable exercises to belong to multiple catalogs with catalog-specific metadata.

**Columns**:
- `id` (uuid, PK) - Primary key
- `exercise_id` (uuid, FK → exercises.id) - Reference to exercise
- `catalog_id` (text) - Catalog identifier (e.g., 'general-fitness', 'women-health')
- `catalog_tags` (text[]) - Catalog-specific badge tags with ':' prefixes
- `display_order` (integer, nullable) - Sort order within catalog
- `featured` (boolean) - Featured/highlighted status in catalog
- `custom_name_key` (text, nullable) - Override translation key for name
- `custom_description_key` (text, nullable) - Override translation key for description
- `owner_id` (uuid, nullable, FK → auth.users) - Owner for user-created memberships
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Last update timestamp
- `version` (integer) - Version for sync conflict resolution
- `deleted` (boolean) - Soft delete flag

**Constraints**:
- Primary Key: `id`
- Foreign Key: `exercise_id` → `exercises(id)` ON DELETE CASCADE
- Unique: `(exercise_id, catalog_id)` - One membership per exercise-catalog pair

**Indexes**:
- `catalog_memberships_exercise_id_idx` - Queries by exercise
- `catalog_memberships_catalog_id_idx` - Queries by catalog
- `catalog_memberships_owner_id_idx` - User ownership queries
- `catalog_memberships_updated_at_idx` - Sync queries
- `catalog_memberships_exercise_catalog_idx` - Compound for joins

**RLS Policies**:
1. ✅ Users can view own memberships
2. ✅ Users can view public exercise memberships
3. ✅ Users can view built-in exercise memberships (owner_id IS NULL)
4. ✅ Users can insert own memberships
5. ✅ Users can update own memberships
6. ✅ Users can delete own memberships

**Audit Trigger**: ✅ `log_table_change()` trigger added

**Data Migration**: 
- Migrates existing `exercises.catalog_id` to `catalog_memberships` records
- Separates catalog-specific tags (with ':') into `catalog_tags`
- Only migrates built-in exercises (owner_id IS NULL)

---

### 2. Edge Function Changes

#### Updated: `sync_v2` Function

**File**: `supabase/functions/sync_v2/index.ts`

**Changes**:

1. **Added to SYNC_TABLES array**:
   ```typescript
   const SYNC_TABLES = [
     // ... existing tables
     'catalog_memberships'  // NEW
   ];
   ```

2. **Added to MUTABLE_FIELD_ALLOWLIST**:
   ```typescript
   catalog_memberships: new Set([
     'id', 'exercise_id', 'catalog_id', 'catalog_tags',
     'display_order', 'featured', 'custom_name_key', 
     'custom_description_key', 'owner_id', 'created_at', 
     'updated_at', 'version', 'deleted'
   ])
   ```

3. **Ownership Validation**:
   - Memberships must have `owner_id` matching authenticated user
   - Built-in memberships (owner_id IS NULL) cannot be modified by clients
   - Validated during push operations

4. **Sync Behavior**:
   - **Push**: Client sends local catalog_memberships → Server validates and stores
   - **Pull**: Server sends updated catalog_memberships → Client merges
   - **Conflict Resolution**: Same as other tables (version-based, last-write-wins for now)

---

## Implementation Checklist

### Phase 4.1: Schema Migration ✅ (Local Files Created)

- [x] Create migration file `20251110-01-create-catalog-memberships.sql`
- [x] Create tracking document `supabase-changes_20251110.md`
- [ ] Test migration in dev environment
- [ ] Apply migration to dev Supabase
- [ ] Verify table creation and RLS policies
- [ ] Test data migration from exercises.catalog_id

### Phase 4.2: Sync Function Update ✅ (Complete)

- [x] Update `sync_v2/index.ts` with catalog_memberships support
- [x] Add field allowlist for catalog_memberships
- [x] Deploy to dev environment (version 58)
- [ ] Test push operations (create/update/delete memberships)
- [ ] Test pull operations (fetch memberships)
- [ ] Verify ownership validation
- [ ] Test with multiple users

### Phase 4.3: Testing & Validation ⏳

- [ ] Create test data in dev environment
- [ ] Test exercise with multiple catalog memberships
- [ ] Test catalog-specific tag filtering
- [ ] Verify RLS policies work correctly
- [ ] Test sync conflict resolution
- [ ] Performance test with large membership sets

### Phase 4.4: Production Deployment ⏳

- [ ] Verify dev environment stability (24-48 hours)
- [ ] Compare dev vs prod environments
- [ ] Apply migration to prod
- [ ] Deploy updated sync_v2 function to prod
- [ ] Monitor logs for errors
- [ ] Verify production sync working

---

## Risk Assessment

### High Risk
- **Data Migration**: Converting catalog_id to memberships could fail for malformed data
  - **Mitigation**: Test thoroughly in dev, use ON CONFLICT DO NOTHING
  
### Medium Risk
- **Sync Performance**: Additional table increases sync payload size
  - **Mitigation**: Indexed properly, batch limits enforced

### Low Risk
- **RLS Policy Conflicts**: Complex policy interactions
  - **Mitigation**: Policies tested in isolation

---

## Testing Strategy

### Unit Tests (Local)
1. Test StorageService membership CRUD methods ✅ (Already in Phase 2)
2. Test tag separation logic ✅ (Already in Phase 2)
3. Test membership queries by exercise/catalog ✅ (Already in Phase 2)

### Integration Tests (Dev Supabase)
1. Apply migration → Verify table structure
2. Insert test memberships → Verify RLS policies
3. Test sync push with memberships → Verify server storage
4. Test sync pull with memberships → Verify client receives
5. Test ownership validation → Verify security

### E2E Tests (After UI Updates)
1. User creates exercise → Assign to multiple catalogs
2. User views catalog → Sees correct exercises
3. User filters by catalog tags → Correct results
4. Sync across devices → Memberships preserved

---

## Rollback Plan

If critical issues occur:

1. **Immediate**: Disable sync_v2 function (commenting out catalog_memberships from SYNC_TABLES)
2. **Short-term**: Rollback migration using:
   ```sql
   DROP TABLE IF EXISTS catalog_memberships CASCADE;
   ```
3. **Long-term**: Client apps continue using exercises.catalog_id until fixed

---

## Environment Status

### Development (repcue-dev)
- **Project ID**: xwzrsfkzqxdybjrkkkvh
- **Status**: ✅ DEPLOYED & READY FOR TESTING
- **Tools**: `mcp_supabase_*`
- **Migration**: Applied successfully (8 memberships migrated)
- **sync_v2**: Version 58 deployed with catalog_memberships support
- **Next**: Test sync operations, monitor for 24-48 hours

### Production (RepCue)
- **Project ID**: zumzzuvfsuzvvymhpymk
- **Status**: ⏸️ Awaiting dev validation (24-48 hours)
- **Tools**: `mcp_supabase-prod_*`

---

## Next Actions

1. ✅ **COMPLETED**: Create local migration file
2. ✅ **COMPLETED**: Create tracking document
3. ✅ **COMPLETED**: Update sync_v2 function locally
4. ✅ **COMPLETED**: Apply migration to dev Supabase (8 memberships migrated)
5. ✅ **COMPLETED**: Deploy sync_v2 v58 to dev environment
6. **NEXT**: Test sync operations (push/pull catalog_memberships)
7. **THEN**: Monitor dev environment for 24-48 hours
8. **THEN**: Apply to production after validation
6. **THEN**: Deploy sync_v2 to dev
7. **THEN**: Comprehensive testing
8. **FINALLY**: Production deployment after 24-48h stability

---

## Notes

- Migration includes automatic data migration from exercises.catalog_id
- All existing catalog assignments preserved as memberships
- Catalog-specific tags extracted using ':' prefix detection
- Built-in exercises get memberships with owner_id = NULL
- User-created exercises will get memberships with their owner_id

---

## References

- Implementation Plan: `docs/implementation-plans/global-exercise-repository.md`
- Supabase Instructions: `.github/instructions/supabase.instructions.md`
- Type Definitions: `apps/frontend/src/types/index.ts`
- Storage Service: `apps/frontend/src/services/storageService.ts`
