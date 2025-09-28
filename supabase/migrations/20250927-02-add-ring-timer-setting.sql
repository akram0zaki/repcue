-- Add ring_timer setting to app_settings table
-- This setting controls whether the timer is displayed as a circle (true) or rectangle (false)

ALTER TABLE app_settings
ADD COLUMN ring_timer BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN app_settings.ring_timer IS 'Controls timer display shape: true for circular timer with rings, false for rectangular timer with border progress';

-- Update existing records to have the default value
UPDATE app_settings
SET ring_timer = true
WHERE ring_timer IS NULL;