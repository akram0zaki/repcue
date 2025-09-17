-- =====================================================
-- Add Missing Community Features Columns to workouts table
-- This adds the columns that the migration may have missed
-- =====================================================

-- Add missing columns to workouts table
-- Each ADD COLUMN uses IF NOT EXISTS to avoid errors if column already exists

-- Community features columns
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) DEFAULT 0.00;

ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS copy_count INTEGER DEFAULT 0;

ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'workouts' 
AND table_schema = 'public'
AND column_name IN (
    'is_public', 'is_verified', 'rating_average', 
    'rating_count', 'copy_count', 'difficulty_level', 'tags'
)
ORDER BY column_name;

-- Success message
SELECT 'Missing columns added to workouts table!' as result;