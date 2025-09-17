-- Sync exercises table schema from production to match dev
-- Handle foreign key constraints properly

-- Step 1: Find and drop foreign key constraints referencing exercises.id
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find all foreign key constraints that reference exercises.id
    FOR constraint_record IN
        SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'exercises'
        AND ccu.column_name = 'id'
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
END $$;

-- Step 2: Update referencing tables to use uuid type for foreign keys
-- Update exercise_ratings if it exists (text to uuid)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_ratings') THEN
        ALTER TABLE public.exercise_ratings ALTER COLUMN exercise_id TYPE uuid USING exercise_id::uuid;
    END IF;
END $$;

-- Update exercise_shares if it exists (text to uuid)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_shares') THEN
        ALTER TABLE public.exercise_shares ALTER COLUMN exercise_id TYPE uuid USING exercise_id::uuid;
    END IF;
END $$;

-- video_files.exercise_id is already uuid, so skip it

-- Step 3: Now change exercises.id from text to uuid
ALTER TABLE public.exercises ALTER COLUMN id TYPE uuid USING id::uuid;

-- Step 4: Add missing columns from dev schema
ALTER TABLE public.exercises
DROP COLUMN IF EXISTS difficulty,
DROP COLUMN IF EXISTS equipment;

ALTER TABLE public.exercises
ADD COLUMN IF NOT EXISTS exercise_type text,
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rating_average numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS copy_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS difficulty_level varchar DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS equipment_needed text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_video_url text,
ADD COLUMN IF NOT EXISTS has_video boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS default_duration numeric,
ADD COLUMN IF NOT EXISTS default_sets integer,
ADD COLUMN IF NOT EXISTS default_reps integer;

-- Step 5: Fix existing columns to match dev schema
ALTER TABLE public.exercises
ALTER COLUMN rep_duration_seconds TYPE numeric,
ALTER COLUMN instructions SET DEFAULT '[]'::jsonb,
ALTER COLUMN owner_id DROP NOT NULL,
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL,
ALTER COLUMN is_public DROP NOT NULL;

-- Step 6: Set proper defaults and constraints
ALTER TABLE public.exercises
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN version SET DEFAULT 1,
ALTER COLUMN deleted SET DEFAULT false,
ALTER COLUMN is_favorite SET DEFAULT false,
ALTER COLUMN is_public SET DEFAULT false,
ALTER COLUMN is_verified SET DEFAULT false,
ALTER COLUMN rating_average SET DEFAULT 0,
ALTER COLUMN rating_count SET DEFAULT 0,
ALTER COLUMN copy_count SET DEFAULT 0,
ALTER COLUMN difficulty_level SET DEFAULT 'beginner',
ALTER COLUMN equipment_needed SET DEFAULT '{}',
ALTER COLUMN has_video SET DEFAULT false,
ALTER COLUMN instructions SET DEFAULT '[]'::jsonb;

-- Update exercise_type for existing records
UPDATE public.exercises SET exercise_type = 'strength' WHERE exercise_type IS NULL;
ALTER TABLE public.exercises ALTER COLUMN exercise_type SET NOT NULL;

-- Step 7: Recreate foreign key constraints
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_ratings') THEN
        ALTER TABLE public.exercise_ratings
        ADD CONSTRAINT exercise_ratings_exercise_id_fkey
        FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_shares') THEN
        ALTER TABLE public.exercise_shares
        ADD CONSTRAINT exercise_shares_exercise_id_fkey
        FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;
    END IF;

    -- video_files constraint (exercise_id is already uuid)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'video_files' AND column_name = 'exercise_id'
    ) THEN
        ALTER TABLE public.video_files
        ADD CONSTRAINT video_files_exercise_id_fkey
        FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;
    END IF;
END $$;