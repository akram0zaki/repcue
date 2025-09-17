-- Sync production schema and data to match dev (source of truth)

-- 1. Fix profiles table schema to match dev
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferences;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_verified;

-- Rename id to owner_id to match dev schema
ALTER TABLE public.profiles RENAME COLUMN id TO owner_id;

-- Add missing columns from dev schema
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
ADD COLUMN IF NOT EXISTS last_login_ip text,
ADD COLUMN IF NOT EXISTS login_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_until timestamptz,
ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_export_requested_at timestamptz,
ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

-- 2. Fix feature_flags table to match dev schema exactly
-- Drop production-specific columns
ALTER TABLE public.feature_flags DROP COLUMN IF EXISTS name;
ALTER TABLE public.feature_flags DROP COLUMN IF EXISTS config;

-- Change id from text to UUID with auto-generation like dev
ALTER TABLE public.feature_flags ALTER COLUMN id TYPE uuid USING gen_random_uuid();
ALTER TABLE public.feature_flags ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure all columns match dev schema
ALTER TABLE public.feature_flags
ALTER COLUMN is_enabled SET DEFAULT false,
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

-- Clear existing data and insert dev data
DELETE FROM public.feature_flags;

INSERT INTO public.feature_flags (id, flag_name, is_enabled, description, target_audience, created_at, updated_at) VALUES
('682c4a83-7f0c-4968-995f-31ea3b1ce118', 'custom_video_upload', true, 'Allow custom video uploads for exercises', 'authenticated', '2025-09-05 22:27:25.763593+00', '2025-09-05 22:27:25.763593+00'),
('04940d32-7bc3-44b5-a7e6-ce66af7ec3ba', 'exercise_rating', true, 'Enable exercise rating and review system', 'authenticated', '2025-09-05 22:27:25.763593+00', '2025-09-05 22:27:25.763593+00'),
('f70bbd36-e56b-4529-9066-bdcdc394edbf', 'exercise_sharing', true, 'Enable exercise sharing functionality', 'authenticated', '2025-09-05 22:27:25.763593+00', '2025-09-05 22:27:25.763593+00'),
('becb9e8d-7c55-42ce-a667-59d275651085', 'user_created_exercises', true, 'Allow users to create custom exercises', 'authenticated', '2025-09-05 22:27:25.763593+00', '2025-09-05 22:27:25.763593+00'),
('59ea7fb2-9fa6-4c04-a05d-05669ca155b0', 'user_created_workouts', false, 'Allow users to create and share workouts', 'authenticated', '2025-09-05 22:27:25.763593+00', '2025-09-05 22:27:25.763593+00'),
('f3da3517-fcb1-4b0e-9855-dd7b563f8732', 'workout_rating', false, 'Enable workout rating and review system', 'authenticated', '2025-09-05 22:27:25.763593+00', '2025-09-05 22:27:25.763593+00'),
('e06943e5-95f7-4e9f-87d3-1dbecca3e3a2', 'workout_sharing', false, 'Enable workout sharing functionality', 'authenticated', '2025-09-05 22:27:25.763593+00', '2025-09-05 22:27:25.763593+00');

-- 3. Fix handle_new_user function to match dev schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.profiles (owner_id, display_name, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW());

    RETURN NEW;
END;
$function$;