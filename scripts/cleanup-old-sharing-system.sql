-- Cleanup Script for Old Copy-Based Sharing System
-- This script removes all exercises that were created via the old sharing system
-- and cleans up related data to prepare for the new reference-based system.
--
-- WARNING: This will permanently delete copied exercises from the old sharing system.
-- Only run this if you're certain you want to remove all copied shared exercises.
--
-- Run this script in the Supabase SQL editor or via the MCP apply_migration tool.

BEGIN;

-- Step 1: Log what we're about to delete for verification
DO $$
DECLARE
    copied_count INTEGER;
    favorite_count INTEGER;
    workout_exercise_count INTEGER;
BEGIN
    -- Count copied exercises
    SELECT COUNT(*) INTO copied_count
    FROM exercises
    WHERE shared_from_exercise_id IS NOT NULL;

    -- Count user_favorites that reference these copied exercises
    SELECT COUNT(*) INTO favorite_count
    FROM user_favorites uf
    INNER JOIN exercises e ON uf.item_id = e.id
    WHERE e.shared_from_exercise_id IS NOT NULL
    AND uf.item_type = 'exercise';

    -- Count workout_exercises that reference these copied exercises
    SELECT COUNT(*) INTO workout_exercise_count
    FROM workout_exercises we
    INNER JOIN exercises e ON we.exercise_id = e.id
    WHERE e.shared_from_exercise_id IS NOT NULL;

    RAISE NOTICE 'About to delete:';
    RAISE NOTICE '- % copied exercises from old sharing system', copied_count;
    RAISE NOTICE '- % user_favorites referencing copied exercises', favorite_count;
    RAISE NOTICE '- % workout_exercises referencing copied exercises', workout_exercise_count;
END $$;

-- Step 2: Delete user_favorites that reference copied exercises
-- (These favorites pointed to the copied exercises, not the originals)
DELETE FROM user_favorites
WHERE item_id IN (
    SELECT id FROM exercises WHERE shared_from_exercise_id IS NOT NULL
) AND item_type = 'exercise';

-- Step 3: Delete workout_exercises that reference copied exercises
-- (These workout references pointed to the copied exercises)
DELETE FROM workout_exercises
WHERE exercise_id IN (
    SELECT id FROM exercises WHERE shared_from_exercise_id IS NOT NULL
);

-- Step 4: Delete the copied exercises themselves
DELETE FROM exercises
WHERE shared_from_exercise_id IS NOT NULL;

-- Step 5: Verify cleanup completed
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM exercises
    WHERE shared_from_exercise_id IS NOT NULL;

    IF remaining_count = 0 THEN
        RAISE NOTICE 'Cleanup completed successfully. No copied exercises remain.';
    ELSE
        RAISE NOTICE 'WARNING: % copied exercises still remain!', remaining_count;
    END IF;
END $$;

COMMIT;

-- Note: After running this cleanup, users who had saved shared exercises via the old system
-- will need to re-save them using the new reference-based system. Since there are no real
-- users yet, this is acceptable.