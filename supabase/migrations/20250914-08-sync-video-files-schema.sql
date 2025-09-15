-- Sync video_files table schema from production to match dev
-- Dev is the source of truth, production needs to be updated

-- Drop production-specific columns that don't exist in dev
ALTER TABLE public.video_files
DROP COLUMN IF EXISTS duration_seconds,
DROP COLUMN IF EXISTS resolution,
DROP COLUMN IF EXISTS upload_status;

-- Add missing columns from dev schema
ALTER TABLE public.video_files
ADD COLUMN IF NOT EXISTS exercise_id uuid NOT NULL,
ADD COLUMN IF NOT EXISTS file_data bytea,
ADD COLUMN IF NOT EXISTS upload_pending boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- Fix column constraints to match dev
ALTER TABLE public.video_files
ALTER COLUMN owner_id DROP NOT NULL,
ALTER COLUMN storage_path DROP NOT NULL,
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL;

-- Set proper defaults for new columns
ALTER TABLE public.video_files
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN deleted SET DEFAULT false,
ALTER COLUMN version SET DEFAULT 1,
ALTER COLUMN upload_pending SET DEFAULT true;