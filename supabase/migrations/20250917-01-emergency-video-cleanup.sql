-- Emergency video files cleanup - remove duplicate and deleted records
-- This migration fixes critical sync system bug causing massive duplication

-- First, let's see what we're dealing with
DO $$
DECLARE
    total_video_files integer;
    deleted_video_files integer;
    duplicate_exercise_files integer;
BEGIN
    SELECT COUNT(*) INTO total_video_files FROM video_files;
    SELECT COUNT(*) INTO deleted_video_files FROM video_files WHERE deleted = true;

    SELECT COUNT(*) INTO duplicate_exercise_files FROM (
        SELECT exercise_id, COUNT(*) as cnt
        FROM video_files
        WHERE deleted = false
        GROUP BY exercise_id
        HAVING COUNT(*) > 1
    ) duplicates;

    RAISE NOTICE 'BEFORE CLEANUP: Total video files: %, Deleted: %, Exercises with duplicates: %',
        total_video_files, deleted_video_files, duplicate_exercise_files;
END $$;

-- Step 1: Delete all records marked as deleted (cleanup)
DELETE FROM video_files WHERE deleted = true;

-- Step 2: For exercises with multiple active video files, keep only the most recent
-- This fixes the duplication issue
WITH ranked_videos AS (
    SELECT
        id,
        exercise_id,
        ROW_NUMBER() OVER (
            PARTITION BY exercise_id
            ORDER BY created_at DESC, updated_at DESC
        ) as rn
    FROM video_files
    WHERE deleted = false
),
videos_to_delete AS (
    SELECT id FROM ranked_videos WHERE rn > 1
)
DELETE FROM video_files
WHERE id IN (SELECT id FROM videos_to_delete);

-- Step 3: Verify cleanup results
DO $$
DECLARE
    total_video_files integer;
    deleted_video_files integer;
    duplicate_exercise_files integer;
BEGIN
    SELECT COUNT(*) INTO total_video_files FROM video_files;
    SELECT COUNT(*) INTO deleted_video_files FROM video_files WHERE deleted = true;

    SELECT COUNT(*) INTO duplicate_exercise_files FROM (
        SELECT exercise_id, COUNT(*) as cnt
        FROM video_files
        WHERE deleted = false
        GROUP BY exercise_id
        HAVING COUNT(*) > 1
    ) duplicates;

    RAISE NOTICE 'AFTER CLEANUP: Total video files: %, Deleted: %, Exercises with duplicates: %',
        total_video_files, deleted_video_files, duplicate_exercise_files;
END $$;

-- Step 4: Add constraint to prevent future duplicates (one active video per exercise)
-- First check if constraint already exists
DO $$
BEGIN
    -- Create unique partial index to prevent multiple non-deleted video files per exercise
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_video_files_unique_per_exercise'
    ) THEN
        CREATE UNIQUE INDEX idx_video_files_unique_per_exercise
        ON video_files (exercise_id)
        WHERE deleted = false;

        RAISE NOTICE 'Created unique index to prevent duplicate video files per exercise';
    ELSE
        RAISE NOTICE 'Unique index already exists';
    END IF;
END $$;