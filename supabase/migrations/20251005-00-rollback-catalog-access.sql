-- =========================================
-- Rollback: Drop user_catalog_access table and related objects
-- Date: 2025-10-05
-- Purpose: Clean rollback for catalog access control migration
-- =========================================

-- Drop functions first (they depend on the table)
DROP FUNCTION IF EXISTS grant_catalog_access(text, text, text, timestamp with time zone, text);
DROP FUNCTION IF EXISTS revoke_catalog_access(text, text);

-- Drop indexes (will be dropped automatically with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_user_catalog_access_owner_catalog;
DROP INDEX IF EXISTS idx_user_catalog_access_catalog_id;
DROP INDEX IF EXISTS idx_user_catalog_access_owner_id;
DROP INDEX IF EXISTS idx_user_catalog_access_active;

-- Drop table
DROP TABLE IF EXISTS user_catalog_access;
