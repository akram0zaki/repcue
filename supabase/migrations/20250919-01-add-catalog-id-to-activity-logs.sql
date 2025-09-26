-- Migration: Add catalog_id column to activity_logs table
-- Date: 2025-09-19
-- Purpose: Track which exercise catalog each activity log belongs to for better filtering and analytics

-- Add catalog_id column to activity_logs table
ALTER TABLE activity_logs
ADD COLUMN IF NOT EXISTS catalog_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN activity_logs.catalog_id IS 'References exercise_catalogs.id - tracks which catalog the exercise belongs to';

-- Add index for better query performance when filtering by catalog
CREATE INDEX IF NOT EXISTS idx_activity_logs_catalog_id ON activity_logs(catalog_id);

-- Note: This column is optional (nullable) since existing activity logs may not have catalog information
-- and user-created exercises may not belong to a specific catalog