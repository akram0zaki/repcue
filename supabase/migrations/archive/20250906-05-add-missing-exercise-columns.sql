-- =====================================================
-- Add Missing Community Features Columns to exercises table
-- This adds the columns that the migration may have missed
-- =====================================================

-- Add missing columns to exercises table
-- Each ADD COLUMN uses IF NOT EXISTS to avoid errors if column already exists

-- Community features columns
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) DEFAULT 0.00;

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS copy_count INTEGER DEFAULT 0;

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS custom_video_url TEXT;

-- Missing core columns that might be needed
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS default_duration INTEGER;

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS default_sets INTEGER;

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS default_reps INTEGER;

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS rep_duration_seconds INTEGER;

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS instructions JSONB DEFAULT '[]';

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS equipment_needed TEXT[] DEFAULT '{}';

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS muscle_groups TEXT[] DEFAULT '{}';

-- Add owner_id if it doesn't exist (for user-created exercises)
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'exercises' 
AND table_schema = 'public'
AND column_name IN (
    'default_duration', 'owner_id', 'is_public', 'rating_average', 
    'copy_count', 'custom_video_url', 'instructions', 'difficulty_level'
)
ORDER BY column_name;

-- Success message
SELECT 'Missing columns added to exercises table!' as result;