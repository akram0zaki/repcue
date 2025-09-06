-- =====================================================
-- Fix Array Column Defaults in exercises table
-- PostgreSQL arrays should have {} not '[]' as defaults
-- =====================================================

-- Check current column defaults for array columns
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'exercises' 
AND table_schema = 'public'
AND column_name IN ('tags', 'equipment_needed', 'muscle_groups')
ORDER BY column_name;

-- Fix the array column defaults
-- Remove the incorrect string defaults and set proper array defaults

ALTER TABLE exercises 
ALTER COLUMN tags SET DEFAULT '{}'::text[];

ALTER TABLE exercises 
ALTER COLUMN equipment_needed SET DEFAULT '{}'::text[];

ALTER TABLE exercises 
ALTER COLUMN muscle_groups SET DEFAULT '{}'::text[];

-- Also make sure columns have the correct data type
ALTER TABLE exercises 
ALTER COLUMN tags TYPE text[] USING 
  CASE 
    WHEN tags IS NULL THEN NULL
    WHEN tags::text = '[]' THEN '{}'::text[]
    ELSE tags
  END;

ALTER TABLE exercises 
ALTER COLUMN equipment_needed TYPE text[] USING 
  CASE 
    WHEN equipment_needed IS NULL THEN NULL  
    WHEN equipment_needed::text = '[]' THEN '{}'::text[]
    ELSE equipment_needed
  END;

ALTER TABLE exercises 
ALTER COLUMN muscle_groups TYPE text[] USING 
  CASE 
    WHEN muscle_groups IS NULL THEN NULL
    WHEN muscle_groups::text = '[]' THEN '{}'::text[]  
    ELSE muscle_groups
  END;

-- Also fix any JSONB columns that might have string defaults
ALTER TABLE exercises 
ALTER COLUMN instructions SET DEFAULT '[]'::jsonb;

-- Check if there are any existing rows with malformed array data
SELECT 
    id,
    name,
    tags,
    equipment_needed,
    muscle_groups
FROM exercises 
WHERE 
    tags::text = '[]' OR 
    equipment_needed::text = '[]' OR 
    muscle_groups::text = '[]'
LIMIT 5;

-- Update any existing malformed array data
UPDATE exercises 
SET 
    tags = '{}',
    equipment_needed = '{}', 
    muscle_groups = '{}'
WHERE 
    tags::text = '[]' OR 
    equipment_needed::text = '[]' OR 
    muscle_groups::text = '[]';

-- Verify the fixes
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'exercises' 
AND table_schema = 'public'
AND column_name IN ('tags', 'equipment_needed', 'muscle_groups', 'instructions')
ORDER BY column_name;

SELECT 'Array column defaults fixed!' as result;