-- Add theme_id setting to app_settings table
-- This setting allows users to choose from preset color themes
-- Available themes: default, energetic, professional, calm, winter, elegant
-- Part of theme customization feature (REQ-001 through REQ-017)

ALTER TABLE app_settings
ADD COLUMN theme_id TEXT DEFAULT 'default';

-- Add comment for documentation
COMMENT ON COLUMN app_settings.theme_id IS 'User selected theme ID (default, energetic, professional, calm, winter, elegant). Controls color palette for the application.';

-- Update existing records to have the default value
UPDATE app_settings
SET theme_id = 'default'
WHERE theme_id IS NULL;

-- Add constraint to ensure only valid theme IDs are stored
ALTER TABLE app_settings
ADD CONSTRAINT app_settings_theme_id_check 
CHECK (theme_id IN ('default', 'energetic', 'professional', 'calm', 'winter', 'elegant'));
