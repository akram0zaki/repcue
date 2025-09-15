-- Sync workout_shares table schema from production to match dev
-- Handle RLS policies that depend on columns we need to drop

-- Step 1: Drop RLS policies that depend on columns we're removing
DROP POLICY IF EXISTS "Anyone can view active workout shares" ON public.workout_shares;
DROP POLICY IF EXISTS "Users can view own workout shares" ON public.workout_shares;
DROP POLICY IF EXISTS "Users can insert own workout shares" ON public.workout_shares;
DROP POLICY IF EXISTS "Users can update own workout shares" ON public.workout_shares;
DROP POLICY IF EXISTS "Users can delete own workout shares" ON public.workout_shares;

-- Step 2: Drop production-specific columns that don't exist in dev
ALTER TABLE public.workout_shares
DROP COLUMN IF EXISTS title CASCADE,
DROP COLUMN IF EXISTS description CASCADE,
DROP COLUMN IF EXISTS is_active CASCADE,
DROP COLUMN IF EXISTS view_count CASCADE;

-- Step 3: Change workout_id from text to uuid to match dev schema
ALTER TABLE public.workout_shares
ALTER COLUMN workout_id TYPE uuid USING workout_id::uuid;

-- Step 4: Add missing columns from dev schema
ALTER TABLE public.workout_shares
ADD COLUMN IF NOT EXISTS shared_with_user_id uuid,
ADD COLUMN IF NOT EXISTS permission_level varchar DEFAULT 'view',
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS version bigint DEFAULT 1;

-- Step 5: Fix column constraints to match dev schema
ALTER TABLE public.workout_shares
ALTER COLUMN workout_id DROP NOT NULL,
ALTER COLUMN owner_id DROP NOT NULL,
ALTER COLUMN share_token DROP NOT NULL,
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL;

-- Step 6: Set proper defaults
ALTER TABLE public.workout_shares
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN permission_level SET DEFAULT 'view',
ALTER COLUMN deleted SET DEFAULT false,
ALTER COLUMN version SET DEFAULT 1;

-- Step 7: Recreate RLS policies to match dev schema
CREATE POLICY "Users can view own workout shares" ON public.workout_shares
    FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with_user_id);

CREATE POLICY "Users can insert own workout shares" ON public.workout_shares
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own workout shares" ON public.workout_shares
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own workout shares" ON public.workout_shares
    FOR DELETE USING (auth.uid() = owner_id);