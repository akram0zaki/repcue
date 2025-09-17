-- Sync exercise_shares table schema from production to match dev
-- Handle RLS policies that depend on columns we need to drop

-- Step 1: Drop RLS policies that depend on columns we're removing
DROP POLICY IF EXISTS "Anyone can view active exercise shares" ON public.exercise_shares;
DROP POLICY IF EXISTS "Users can view own exercise shares" ON public.exercise_shares;
DROP POLICY IF EXISTS "Users can insert own exercise shares" ON public.exercise_shares;
DROP POLICY IF EXISTS "Users can update own exercise shares" ON public.exercise_shares;
DROP POLICY IF EXISTS "Users can delete own exercise shares" ON public.exercise_shares;

-- Step 2: Backup existing data (if any)
CREATE TEMP TABLE exercise_shares_backup AS
SELECT * FROM public.exercise_shares;

-- Step 3: Drop production-specific columns that don't exist in dev
ALTER TABLE public.exercise_shares
DROP COLUMN IF EXISTS title CASCADE,
DROP COLUMN IF EXISTS description CASCADE,
DROP COLUMN IF EXISTS is_active CASCADE,
DROP COLUMN IF EXISTS view_count CASCADE;

-- Step 4: Add missing columns from dev schema
ALTER TABLE public.exercise_shares
ADD COLUMN IF NOT EXISTS shared_with_user_id uuid,
ADD COLUMN IF NOT EXISTS permission_level varchar DEFAULT 'view',
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS version bigint DEFAULT 1,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '30 days');

-- Step 5: Fix existing columns to match dev schema
ALTER TABLE public.exercise_shares
ALTER COLUMN exercise_id DROP NOT NULL,
ALTER COLUMN owner_id DROP NOT NULL,
ALTER COLUMN share_token DROP NOT NULL,
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL;

-- Step 6: Set proper defaults
ALTER TABLE public.exercise_shares
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN permission_level SET DEFAULT 'view',
ALTER COLUMN deleted SET DEFAULT false,
ALTER COLUMN version SET DEFAULT 1,
ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

-- Step 7: Recreate RLS policies to match dev schema
CREATE POLICY "Users can view own exercise shares" ON public.exercise_shares
    FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with_user_id);

CREATE POLICY "Users can insert own exercise shares" ON public.exercise_shares
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own exercise shares" ON public.exercise_shares
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own exercise shares" ON public.exercise_shares
    FOR DELETE USING (auth.uid() = owner_id);

-- Drop the backup table
DROP TABLE exercise_shares_backup;