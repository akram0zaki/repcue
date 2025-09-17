-- Sync user_favorites table schema from production to match dev
-- Dev is the source of truth, production needs to be updated

-- Rename columns to match dev schema
ALTER TABLE public.user_favorites
RENAME COLUMN content_type TO item_type;

ALTER TABLE public.user_favorites
RENAME COLUMN content_id TO item_id;

-- Add missing columns from dev schema
ALTER TABLE public.user_favorites
ADD COLUMN IF NOT EXISTS exercise_type varchar DEFAULT 'builtin',
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- Fix column constraints to match dev schema
ALTER TABLE public.user_favorites
ALTER COLUMN owner_id DROP NOT NULL,
ALTER COLUMN created_at DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL;

-- Change item_type to varchar and set default
ALTER TABLE public.user_favorites
ALTER COLUMN item_type TYPE varchar,
ALTER COLUMN item_type SET DEFAULT 'exercise';

-- Set proper defaults
ALTER TABLE public.user_favorites
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now(),
ALTER COLUMN item_type SET DEFAULT 'exercise',
ALTER COLUMN exercise_type SET DEFAULT 'builtin',
ALTER COLUMN deleted SET DEFAULT false,
ALTER COLUMN version SET DEFAULT 1;