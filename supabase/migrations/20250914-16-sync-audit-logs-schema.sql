-- Sync audit_logs table schema from production to match dev
-- Dev is the source of truth, production needs to be updated

-- Rename user_id to owner_id to match dev schema
ALTER TABLE public.audit_logs
RENAME COLUMN user_id TO owner_id;

-- Change id column default to match dev (uuid_generate_v4 instead of gen_random_uuid)
ALTER TABLE public.audit_logs
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Add missing columns from dev schema
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS success boolean DEFAULT true;

-- Fix existing columns to match dev schema
ALTER TABLE public.audit_logs
ALTER COLUMN resource_type SET NOT NULL,
ALTER COLUMN details SET DEFAULT '{}'::jsonb,
ALTER COLUMN ip_address TYPE text,
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN success SET DEFAULT true;

-- Set proper defaults
ALTER TABLE public.audit_logs
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN details SET DEFAULT '{}'::jsonb;