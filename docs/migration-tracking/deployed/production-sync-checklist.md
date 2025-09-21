# Production Synchronization Checklist

## Overview
This document lists all database migrations and edge functions that need to be deployed to production when syncing the `feature/multi-catalog` branch changes.

**Source Commits:**
- `fc87839` - Complete PWA Update System Implementation and Fix Shared Exercise Videos
- `19227c9` - Complete catalog sync infrastructure and resolve activity log visibility
- `8c2e68b` - Complete multi-catalog system implementation (Phases 1 & 2)
- `9f40285` - Updated claude code settings (no migrations/functions)

---

## 🗄️ Database Migrations Required

### New Migrations (Apply in Order)
```sql
-- 1. Multi-Catalog System Core Infrastructure
supabase/migrations/20250917_add_catalog_support.sql
supabase/migrations/20250917_add_extended_exercise_fields.sql

-- 2. Activity Log Catalog Integration
supabase/migrations/20250919-01-add-catalog-id-to-activity-logs.sql

-- 3. PWA Update System Database Schema
supabase/migrations/20250919-02-create-admin-users-table.sql
supabase/migrations/20250919-03-create-app-versions-table.sql
supabase/migrations/20250919-04-create-version-audit-table.sql

-- 4. Reference-Based Sharing System Migration
supabase/migrations/20250921-01-remove-old-sharing-columns.sql
supabase/migrations/20250921-02-update-video-policies-for-reference-sharing.sql

-- 5. Simplified PWA Version Management
supabase/migrations/20250921-03-add-app-version-to-app-settings.sql
```

### Migration Descriptions

#### Multi-Catalog System (Core)
1. **20250917_add_catalog_support.sql**
   - Creates `exercise_catalogs` table for catalog metadata
   - Adds `catalog_id` foreign key to `exercises` table
   - Includes RLS policies for catalog access control

2. **20250917_add_extended_exercise_fields.sql**
   - Adds extended exercise metadata fields for enhanced exercise data
   - Supports multi-catalog exercise categorization and filtering

#### Activity Log Integration
3. **20250919-01-add-catalog-id-to-activity-logs.sql**
   - **CRITICAL**: Adds `catalog_id` field to `activity_logs` table
   - **Fixes**: Activity log visibility issue where completed exercises weren't appearing
   - **Required**: Essential for activity log sync functionality

#### PWA Update System
4. **20250919-02-create-admin-users-table.sql**
   - Creates `admin_users` table for managing administrative access to version management
   - Includes RLS policies for secure admin access

5. **20250919-03-create-app-versions-table.sql**
   - Creates `app_versions` table for storing version metadata and update policies
   - Supports version numbering, build metadata, and update enforcement rules

6. **20250919-04-create-version-audit-table.sql**
   - Creates `version_audit` table for tracking version deployment and update events
   - Provides audit trail for version management operations

#### Reference-Based Sharing System
7. **20250921-01-remove-old-sharing-columns.sql**
   - **CRITICAL**: Removes obsolete copy-based sharing columns from `exercises` table
   - Drops `is_shared_copy`, `shared_from_exercise_id`, and related fields
   - **Required**: Clean up from migration to reference-based sharing system

8. **20250921-02-update-video-policies-for-reference-sharing.sql**
   - **CRITICAL**: Updates RLS policies for `video_files` table to support reference-based sharing
   - Changes policy from `is_shared_copy` checks to `user_favorites` table verification
   - **Required**: Essential for shared exercise video access functionality

#### Simplified PWA Version Management
9. **20250921-03-add-app-version-to-app-settings.sql**
   - Adds `app_version` column to `app_settings` table for user version tracking
   - Creates index for analytics queries on version distribution
   - Updates existing records with baseline version '0.1.0'
   - **Purpose**: Enables simplified version management and user analytics

---

## ⚡ Edge Functions to Deploy/Update

### New Edge Function
```
✅ NEW: check-version (v1)
```
- **Purpose**: Privacy-respecting version checking for PWA update system
- **Authentication**: No JWT required (anonymous access)
- **Dependencies**: Requires app_versions table

### Updated Edge Functions
```
⚠️  UPDATE: save-shared-exercise (v7 → v15)
⚠️  UPDATE: sync_v2 (v16 → v40) - CRITICAL FOR CATALOG SYSTEM & VERSION TRACKING
⚠️  UPDATE: download-shared-video (v1 → v2) - CRITICAL FOR SHARED EXERCISE VIDEOS
```
- **save-shared-exercise (v7 → v15)**:
  - Enhanced with video metadata fields for proper video downloading
  - Critical Fix: Resolves missing videos in saved shared exercises

- **sync_v2 (v16 → v40)**:
  - **CRITICAL**: Added complete catalog support infrastructure
  - Added `exercise_catalogs` to SYNC_TABLES array for catalog metadata sync
  - Added `catalog_id` to exercises and activity_logs field allowlists
  - Added `app_version` to app_settings field allowlist for version tracking
  - **Required**: Essential for multi-catalog system, activity log visibility fix, and version analytics

- **download-shared-video (v1 → v2)**:
  - **CRITICAL**: Updated from copy-based to reference-based sharing verification
  - Changed from checking `exercises.is_shared_copy` to checking `user_favorites` table
  - **Required**: Essential for shared exercise video access in reference-based system

### Edge Functions Status Summary
| Function | Production | Development | Action Required |
|----------|------------|-------------|-----------------|
| check-version | ❌ Missing | ✅ v1 | 🆕 **Deploy New** |
| save-shared-exercise | ⚠️ v7 | ✅ v15 | 🔄 **Update Critical** |
| sync_v2 | ⚠️ v16 | ✅ v40 | 🔄 **Update Critical** |
| download-shared-video | ⚠️ v1 | ✅ v2 | 🔄 **Update Critical** |
| get-shared-exercise | ✅ v19 | ✅ v21 | ⚠️ **Review Optional** |

---

## 🔄 Deployment Sequence

### 1. Database Migrations
```bash
# Apply migrations in order (production Supabase project)
1. 20250917_add_catalog_support.sql
2. 20250917_add_extended_exercise_fields.sql
3. 20250919-01-add-catalog-id-to-activity-logs.sql
4. 20250919-02-create-admin-users-table.sql
5. 20250919-03-create-app-versions-table.sql
6. 20250919-04-create-version-audit-table.sql
7. 20250921-01-remove-old-sharing-columns.sql
8. 20250921-02-update-video-policies-for-reference-sharing.sql
9. 20250921-03-add-app-version-to-app-settings.sql
```

### 2. Edge Function Deployments
```bash
# CRITICAL: Update sync function first (required for catalog system)
supabase functions deploy sync_v2 --project-ref zumzzuvfsuzvvymhpymk

# CRITICAL: Update shared video access function (required for reference-based sharing)
supabase functions deploy download-shared-video --project-ref zumzzuvfsuzvvymhpymk

# Deploy new function
supabase functions deploy check-version --project-ref zumzzuvfsuzvvymhpymk

# Update existing function
supabase functions deploy save-shared-exercise --project-ref zumzzuvfsuzvvymhpymk
```

### 3. Verification Steps
- [ ] Verify all migrations applied successfully
- [ ] **CRITICAL**: Confirm old sharing columns removed from `exercises` table
- [ ] **CRITICAL**: Verify new video RLS policies work with `user_favorites` table
- [ ] Test `check-version` function returns proper version data
- [ ] Test `save-shared-exercise` with video-enabled shared exercises
- [ ] **CRITICAL**: Test `download-shared-video` function with reference-based verification
- [ ] Confirm video downloading works in saved shared exercises using `user_favorites` table
- [ ] Verify shared exercise videos display correctly in recipient's catalog
- [ ] Test both sync and video resolution use the edge function for shared exercises
- [ ] Verify no breaking changes to existing functionality
- [ ] Test that old copy-based sharing references are cleaned up

---

## ⚠️ Important Notes

### Version Differences to Review
- **sync_v2**: Dev v40 vs Prod v16 (significant version gap - review changes)
- **download-shared-video**: Dev v2 vs Prod v1 (critical update - reference-based sharing)
- **get-shared-exercise**: Dev v21 vs Prod v19 (minor updates - likely safe)

### Pre-Deployment Checklist
- [ ] Backup production database before applying migrations
- [ ] Test migrations on staging environment first
- [ ] Verify edge function dependencies are met
- [ ] Confirm RLS policies work correctly
- [ ] Test shared exercise functionality end-to-end

### Post-Deployment Verification
- [ ] PWA update system functional (if implemented in frontend)
- [ ] Shared exercise saving works with videos
- [ ] No regressions in existing exercise sharing
- [ ] Database performance acceptable with new tables
- [ ] Edge function response times within acceptable limits

---

## 🚨 Rollback Plan

### Database Rollback
```sql
-- If needed, drop new tables (in reverse order)
DROP TABLE IF EXISTS version_audit;
DROP TABLE IF EXISTS app_versions;
DROP TABLE IF EXISTS admin_users;
```

### Edge Function Rollback
```bash
# Revert save-shared-exercise to previous working version
# Delete check-version if causing issues
supabase functions delete check-version --project-ref zumzzuvfsuzvvymhpymk
```

---

## 📞 Emergency Contacts
- **Database Issues**: Check Supabase dashboard logs
- **Edge Function Issues**: Monitor edge function logs in Supabase
- **Critical Failures**: Rollback using commands above

---

**Last Updated**: 2025-09-21
**Prepared for**: feature/multi-catalog → production sync