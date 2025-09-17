-- Sync user_authenticators table schema from production to match dev
-- Dev is the source of truth, production needs to be updated

-- Step 1: Rename user_id to owner_id to match dev schema
ALTER TABLE public.user_authenticators
RENAME COLUMN user_id TO owner_id;

-- Step 2: Change id column default to match dev (uuid_generate_v4 instead of gen_random_uuid)
ALTER TABLE public.user_authenticators
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Step 3: Drop production-specific columns that don't exist in dev
ALTER TABLE public.user_authenticators
DROP COLUMN IF EXISTS credential_device_type,
DROP COLUMN IF EXISTS credential_backed_up,
DROP COLUMN IF EXISTS transports;

-- Step 4: Add missing columns from dev schema
ALTER TABLE public.user_authenticators
ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS device_name text;

-- Step 5: Fix existing columns to match dev schema
-- Change credential_public_key from bytea to text
ALTER TABLE public.user_authenticators
ALTER COLUMN credential_public_key TYPE text;

-- Fix timestamp constraints
ALTER TABLE public.user_authenticators
ALTER COLUMN created_at DROP NOT NULL;

-- Step 6: Set proper defaults
ALTER TABLE public.user_authenticators
ALTER COLUMN created_at SET DEFAULT now();