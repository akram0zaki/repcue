-- Migration: Remove old sharing system columns
-- Date: 2025-09-21
-- Description: Remove shared_from_exercise_id and shared_from_user_id columns
--              from exercises table as they are no longer needed after
--              migrating to reference-based sharing system.

-- First, ensure all copied exercises have been cleaned up
DO $$
DECLARE
    copied_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO copied_count
    FROM exercises
    WHERE shared_from_exercise_id IS NOT NULL;

    IF copied_count > 0 THEN
        RAISE EXCEPTION 'Cannot remove sharing columns: % copied exercises still exist. Run cleanup script first.', copied_count;
    END IF;
END $$;

-- Remove the old sharing system columns
ALTER TABLE exercises
DROP COLUMN IF EXISTS shared_from_exercise_id,
DROP COLUMN IF EXISTS shared_from_user_id;

-- Update table comment to reflect the change
COMMENT ON TABLE exercises IS 'Exercise definitions. Sharing is now handled via user_favorites with exercise_type=''shared'' for reference-based sharing.';

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Removed old sharing system columns from exercises table';
    RAISE NOTICE 'Sharing now uses reference-based system via user_favorites table';
END $$;