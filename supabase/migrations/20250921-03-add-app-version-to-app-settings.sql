-- Add app_version column to app_settings table for version tracking
-- This allows tracking which app version each user is currently running

ALTER TABLE app_settings
ADD COLUMN app_version TEXT;

-- Add comment for documentation
COMMENT ON COLUMN app_settings.app_version IS 'Currently installed app version for the user';

-- Create index for analytics queries on app version distribution
CREATE INDEX IF NOT EXISTS idx_app_settings_app_version
ON app_settings (app_version)
WHERE app_version IS NOT NULL;

-- Update existing records to have the current baseline version
UPDATE app_settings
SET app_version = '0.1.0'
WHERE app_version IS NULL;