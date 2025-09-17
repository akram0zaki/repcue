-- Sync activity_logs table schema from production to match dev
-- Dev is the source of truth, production needs to be updated

-- Drop production-specific columns that don't exist in dev
ALTER TABLE public.activity_logs
DROP COLUMN IF EXISTS duration_ms,
DROP COLUMN IF EXISTS completed_at;

-- Add missing columns from dev schema
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS duration integer NOT NULL,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS timestamp timestamp with time zone NOT NULL,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_workout boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exercises jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sets_count integer,
ADD COLUMN IF NOT EXISTS reps_count integer;

-- Fix column constraints to match dev
ALTER TABLE public.activity_logs
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL;

-- Set proper defaults for new columns
ALTER TABLE public.activity_logs
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN version SET DEFAULT 1,
ALTER COLUMN deleted SET DEFAULT false,
ALTER COLUMN is_workout SET DEFAULT false,
ALTER COLUMN exercises SET DEFAULT '[]'::jsonb;