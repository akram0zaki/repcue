-- Sync workout_ratings table schema from production to match dev
-- Dev is the source of truth, production needs to be updated

-- Step 1: Rename review to review_text to match dev schema
ALTER TABLE public.workout_ratings
RENAME COLUMN review TO review_text;

-- Step 2: Add missing columns from dev schema
ALTER TABLE public.workout_ratings
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS version bigint DEFAULT 1;

-- Step 3: Fix column constraints to match dev schema
ALTER TABLE public.workout_ratings
ALTER COLUMN workout_id DROP NOT NULL,
ALTER COLUMN owner_id DROP NOT NULL,
ALTER COLUMN rating DROP NOT NULL,
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL;

-- Step 4: Set proper defaults
ALTER TABLE public.workout_ratings
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN is_verified SET DEFAULT false,
ALTER COLUMN deleted SET DEFAULT false,
ALTER COLUMN version SET DEFAULT 1;