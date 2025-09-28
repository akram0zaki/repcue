-- Add horizontal_exercise_layout column to app_settings table
-- This enables users to toggle between vertical (default) and horizontal exercise layouts

ALTER TABLE app_settings
ADD COLUMN horizontal_exercise_layout BOOLEAN DEFAULT false;

-- Update the updated_at timestamp
UPDATE app_settings SET updated_at = NOW() WHERE horizontal_exercise_layout IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN app_settings.horizontal_exercise_layout IS 'Determines exercise layout: false (default) for vertical grid, true for horizontal Netflix-style scrolling per category';