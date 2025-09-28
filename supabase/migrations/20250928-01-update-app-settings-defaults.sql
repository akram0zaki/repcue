-- Update default values for app_settings columns
-- Changes ring_timer default to false (rectangular timer)
-- Changes horizontal_exercise_layout default to true (horizontal Netflix-style layout)

-- Update ring_timer default to false for new records
ALTER TABLE app_settings
ALTER COLUMN ring_timer SET DEFAULT false;

-- Update horizontal_exercise_layout default to true for new records
ALTER TABLE app_settings
ALTER COLUMN horizontal_exercise_layout SET DEFAULT true;

-- Update existing records to use new defaults
UPDATE app_settings
SET
    ring_timer = false,
    horizontal_exercise_layout = true,
    updated_at = NOW();

-- Update column comments to reflect new defaults
COMMENT ON COLUMN app_settings.ring_timer IS 'Controls timer display shape: false (default) for rectangular timer with border progress, true for circular timer with rings';
COMMENT ON COLUMN app_settings.horizontal_exercise_layout IS 'Determines exercise layout: true (default) for horizontal Netflix-style scrolling per category, false for vertical grid';