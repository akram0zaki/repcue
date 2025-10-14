-- Migration: Add GIN index on exercises.tags for badge filtering performance
-- Purpose: Catalog Badge System - Phase 5 (Database Schema)
-- Date: 2025-01-09
-- Description: 
--   - Creates GIN index on exercises.tags array for efficient badge filtering
--   - Adds deprecation comment to exercises.category column
--   - Supports the new catalog badge system where badges are stored as tags

-- Add GIN index on exercises.tags for efficient badge filtering
-- This improves performance when querying exercises by tag patterns (e.g., 'category:core', 'equipment:dumbbells')
CREATE INDEX IF NOT EXISTS idx_exercises_tags_gin ON exercises USING GIN (tags);

-- Add database comment documenting category field deprecation
COMMENT ON COLUMN exercises.category IS 'DEPRECATED: Use category badge in tags array instead (e.g., ''category:core''). Kept for backward compatibility. New exercises should use the badge system via tags array.';

-- Note: The category field is already nullable, no ALTER needed
-- Note: The tags field already exists as TEXT[], no ALTER needed

