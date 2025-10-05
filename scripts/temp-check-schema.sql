-- Check the actual columns in app_versions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_versions' 
ORDER BY ordinal_position;
