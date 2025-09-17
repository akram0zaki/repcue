-- Sync webauthn_challenges table schema from production to match dev
-- Dev is the source of truth, production needs to be updated

-- Step 1: Rename columns to match dev schema
ALTER TABLE public.webauthn_challenges
RENAME COLUMN user_id TO owner_id;

ALTER TABLE public.webauthn_challenges
RENAME COLUMN challenge_type TO type;

-- Step 2: Change id column default to match dev (uuid_generate_v4 instead of gen_random_uuid)
ALTER TABLE public.webauthn_challenges
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Step 3: Fix column constraints to match dev schema
ALTER TABLE public.webauthn_challenges
ALTER COLUMN created_at DROP NOT NULL;

-- Step 4: Set proper defaults
ALTER TABLE public.webauthn_challenges
ALTER COLUMN created_at SET DEFAULT now();