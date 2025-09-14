-- =====================================================
-- Refresh Supabase Schema Cache for repcue-dev
-- Fixes PGRST204 "column not found in schema cache" errors
-- =====================================================

-- Method 1: Force schema cache reload by notifying PostgREST
NOTIFY pgrst, 'reload schema';

-- Method 2: Alternative approach - restart PostgREST via config change
-- This forces PostgREST to reload its schema cache
UPDATE pg_settings 
SET setting = setting 
WHERE name = 'shared_preload_libraries';

-- Verify the exercises table has all expected columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'exercises' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify the exercise_videos table exists and has correct structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'exercise_videos' 
AND table_schema = 'public'
ORDER BY ordinal_position;