-- Sync workouts table schema from production to match dev
-- Handle foreign key constraints properly

-- Step 1: Find and drop foreign key constraints referencing workouts.id
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find all foreign key constraints that reference workouts.id
    FOR constraint_record IN
        SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'workouts'
        AND ccu.column_name = 'id'
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
END $$;

-- Step 2: Update referencing tables to use uuid type for foreign keys
-- Update workout_ratings if it exists (text to uuid)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_ratings') THEN
        ALTER TABLE public.workout_ratings ALTER COLUMN workout_id TYPE uuid USING workout_id::uuid;
    END IF;
END $$;

-- Update workout_sessions if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_sessions') THEN
        -- Check if workout_id column exists and what type it is
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'workout_sessions' AND column_name = 'workout_id' AND data_type = 'text'
        ) THEN
            ALTER TABLE public.workout_sessions ALTER COLUMN workout_id TYPE uuid USING workout_id::uuid;
        END IF;
    END IF;
END $$;

-- Step 3: Now change workouts.id from text to uuid
ALTER TABLE public.workouts ALTER COLUMN id TYPE uuid USING id::uuid;

-- Step 4: Drop production-specific columns and add missing ones
ALTER TABLE public.workouts
DROP COLUMN IF EXISTS estimated_duration_minutes,
DROP COLUMN IF EXISTS difficulty;

ALTER TABLE public.workouts
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rating_average numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS copy_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS difficulty_level varchar DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS scheduled_days text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS estimated_duration integer;

-- Step 5: Fix existing columns to match dev schema
ALTER TABLE public.workouts
ALTER COLUMN exercises SET DEFAULT '[]'::jsonb,
ALTER COLUMN owner_id DROP NOT NULL,
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL,
ALTER COLUMN is_public DROP NOT NULL;

-- Step 6: Set proper defaults
ALTER TABLE public.workouts
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN version SET DEFAULT 1,
ALTER COLUMN deleted SET DEFAULT false,
ALTER COLUMN is_public SET DEFAULT false,
ALTER COLUMN is_verified SET DEFAULT false,
ALTER COLUMN rating_average SET DEFAULT 0,
ALTER COLUMN rating_count SET DEFAULT 0,
ALTER COLUMN copy_count SET DEFAULT 0,
ALTER COLUMN difficulty_level SET DEFAULT 'beginner',
ALTER COLUMN scheduled_days SET DEFAULT '{}',
ALTER COLUMN is_active SET DEFAULT true;

-- Step 7: Recreate foreign key constraints
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_ratings') THEN
        ALTER TABLE public.workout_ratings
        ADD CONSTRAINT workout_ratings_workout_id_fkey
        FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_sessions') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'workout_sessions' AND column_name = 'workout_id'
        ) THEN
            ALTER TABLE public.workout_sessions
            ADD CONSTRAINT workout_sessions_workout_id_fkey
            FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;