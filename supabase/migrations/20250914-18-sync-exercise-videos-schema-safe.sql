-- Sync exercise_videos table schema from production to match dev
-- Handle RLS policies that depend on columns we need to drop

-- Step 1: Drop RLS policies that depend on columns we're removing
DROP POLICY IF EXISTS "Users can view their own exercise videos" ON public.exercise_videos;
DROP POLICY IF EXISTS "Users can create exercise videos" ON public.exercise_videos;
DROP POLICY IF EXISTS "Users can update their own exercise videos" ON public.exercise_videos;
DROP POLICY IF EXISTS "Users can delete their own exercise videos" ON public.exercise_videos;

-- Step 2: Backup existing data (if any)
CREATE TEMP TABLE exercise_videos_backup AS
SELECT * FROM public.exercise_videos;

-- Step 3: Drop production-specific columns that don't exist in dev
ALTER TABLE public.exercise_videos
DROP COLUMN IF EXISTS owner_id CASCADE,
DROP COLUMN IF EXISTS video_file_id CASCADE,
DROP COLUMN IF EXISTS title CASCADE,
DROP COLUMN IF EXISTS description CASCADE,
DROP COLUMN IF EXISTS is_primary CASCADE;

-- Step 4: Add missing columns from dev schema
ALTER TABLE public.exercise_videos
ADD COLUMN IF NOT EXISTS uploader_id uuid,
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS version bigint DEFAULT 1;

-- Step 5: Fix existing columns to match dev schema
-- Change exercise_id from text to uuid
ALTER TABLE public.exercise_videos ALTER COLUMN exercise_id TYPE uuid USING exercise_id::uuid;
ALTER TABLE public.exercise_videos ALTER COLUMN exercise_id DROP NOT NULL;

-- Fix timestamps
ALTER TABLE public.exercise_videos
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL;

-- Step 6: Set proper defaults
ALTER TABLE public.exercise_videos
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN is_approved SET DEFAULT false,
ALTER COLUMN deleted SET DEFAULT false,
ALTER COLUMN version SET DEFAULT 1;

-- Update video_url for existing records (placeholder since we can't migrate this data properly)
UPDATE public.exercise_videos
SET video_url = 'placeholder_url'
WHERE video_url IS NULL;

-- Make video_url NOT NULL after setting values
ALTER TABLE public.exercise_videos
ALTER COLUMN video_url SET NOT NULL;

-- Step 7: Recreate RLS policies to match dev schema (using uploader_id instead of owner_id)
CREATE POLICY "Users can view own exercise videos" ON public.exercise_videos
    FOR SELECT USING (auth.uid() = uploader_id);

CREATE POLICY "Users can insert own exercise videos" ON public.exercise_videos
    FOR INSERT WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Users can update own exercise videos" ON public.exercise_videos
    FOR UPDATE USING (auth.uid() = uploader_id);

CREATE POLICY "Users can delete own exercise videos" ON public.exercise_videos
    FOR DELETE USING (auth.uid() = uploader_id);

-- Drop the backup table
DROP TABLE exercise_videos_backup;