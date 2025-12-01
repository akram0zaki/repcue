-- Migration: Add unique constraint to video_files for upsert support
-- Date: 2025-12-01
-- Purpose: Convert unique index to unique constraint so PostgreSQL upsert 
--          with ON CONFLICT (exercise_id, owner_id) works correctly

-- Drop the existing unique index (it doesn't work with upsert ON CONFLICT)
DROP INDEX IF EXISTS idx_video_files_unique_per_exercise;

-- Add a proper unique constraint instead
-- This allows upsert with ON CONFLICT (exercise_id, owner_id)
ALTER TABLE video_files
ADD CONSTRAINT video_files_exercise_owner_unique 
UNIQUE (exercise_id, owner_id);
