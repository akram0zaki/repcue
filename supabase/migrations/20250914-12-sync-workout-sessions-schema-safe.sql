-- Sync workout_sessions table schema from production to match dev
-- Handle foreign key constraints properly

-- Step 1: Drop foreign key constraint if it exists
ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_workout_id_fkey;

-- Step 2: Change id column from text to uuid
ALTER TABLE public.workout_sessions ALTER COLUMN id TYPE uuid USING id::uuid;

-- Step 3: Change workout_id from uuid to text to match dev schema
ALTER TABLE public.workout_sessions ALTER COLUMN workout_id TYPE text;

-- Step 4: Drop production-specific columns that don't exist in dev
ALTER TABLE public.workout_sessions
DROP COLUMN IF EXISTS duration_ms,
DROP COLUMN IF EXISTS completed_at;

-- Step 5: Add missing columns from dev schema
ALTER TABLE public.workout_sessions
ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS end_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS total_duration integer,
ADD COLUMN IF NOT EXISTS total_exercises integer,
ADD COLUMN IF NOT EXISTS exercises_completed integer,
ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS completion_percentage integer DEFAULT 0;

-- Step 6: Fix existing columns to match dev schema
ALTER TABLE public.workout_sessions
ALTER COLUMN exercises SET DEFAULT '[]'::jsonb,
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL;

-- Step 7: Set proper defaults
ALTER TABLE public.workout_sessions
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN version SET DEFAULT 1,
ALTER COLUMN deleted SET DEFAULT false,
ALTER COLUMN is_completed SET DEFAULT false,
ALTER COLUMN completion_percentage SET DEFAULT 0,
ALTER COLUMN exercises SET DEFAULT '[]'::jsonb;

-- Update start_time for existing records (use created_at as fallback)
UPDATE public.workout_sessions
SET start_time = created_at
WHERE start_time IS NULL;

-- Make start_time NOT NULL after setting values
ALTER TABLE public.workout_sessions
ALTER COLUMN start_time SET NOT NULL;