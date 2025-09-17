-- Fix feature_flags table schema mismatch between dev and production
-- Production has 'name' column but code expects 'flag_name'

-- Add the missing flag_name column and populate it from name
ALTER TABLE public.feature_flags
ADD COLUMN IF NOT EXISTS flag_name text;

-- Copy data from name to flag_name
UPDATE public.feature_flags
SET flag_name = name
WHERE flag_name IS NULL;

-- Add target_audience column to match dev schema
ALTER TABLE public.feature_flags
ADD COLUMN IF NOT EXISTS target_audience varchar DEFAULT 'all';

-- Make flag_name NOT NULL to match dev schema
ALTER TABLE public.feature_flags
ALTER COLUMN flag_name SET NOT NULL;