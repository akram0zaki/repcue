-- Make category column nullable in exercises table
-- This aligns with the badge/tag-based architecture where category is now managed via tags (e.g., 'category:core')
-- The category field is kept for backward compatibility and can be derived from tags

ALTER TABLE exercises
ALTER COLUMN category DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN exercises.category IS
'Exercise category. Optional field maintained for backward compatibility. Modern exercises use tag-based categorization (e.g., category:core in tags array). Can be null for exercises that only use tags.';

-- Set default value for existing NULL categories (if any exist after making it nullable)
UPDATE exercises
SET category = 'general'
WHERE category IS NULL;
