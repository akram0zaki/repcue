-- =====================================================
-- FORCE PostgREST Schema Cache Refresh for repcue-dev
-- Multiple methods to ensure schema cache is updated
-- =====================================================

-- Method 1: Standard NOTIFY command
NOTIFY pgrst, 'reload schema';

-- Method 2: Check if columns exist in information_schema
SELECT 
    'exercises' as table_name,
    column_name, 
    data_type,
    CASE WHEN column_name = 'default_duration' THEN 'TARGET COLUMN' ELSE '' END as notes
FROM information_schema.columns 
WHERE table_name = 'exercises' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Method 3: Force a schema change to trigger cache reload
-- Add a temporary comment to trigger schema detection
COMMENT ON TABLE exercises IS 'Exercise definitions - schema refresh trigger';

-- Method 4: Update a system setting (might trigger PostgREST to reload)
-- Note: This is a harmless operation that might force reload
SELECT set_config('app.schema_version', extract(epoch from now())::text, true);

-- Method 5: Verify exercises table has expected columns
SELECT 
    COUNT(*) as total_columns,
    COUNT(CASE WHEN column_name = 'default_duration' THEN 1 END) as has_default_duration,
    COUNT(CASE WHEN column_name = 'owner_id' THEN 1 END) as has_owner_id,
    COUNT(CASE WHEN column_name = 'is_public' THEN 1 END) as has_is_public,
    COUNT(CASE WHEN column_name = 'rating_average' THEN 1 END) as has_rating_average
FROM information_schema.columns 
WHERE table_name = 'exercises' 
AND table_schema = 'public';

-- Success message
SELECT 'Schema refresh commands completed. If still not working, restart the project.' as result;