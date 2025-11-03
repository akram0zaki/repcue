-- Migration: Add missing app_settings fields
-- Description: Add 19 missing fields to app_settings table that exist in TypeScript interface
-- Date: 2025-01-27
-- Related Files: apps/frontend/src/types/index.ts (AppSettings interface)

-- Add last_selected_exercise_id for tracking user's last exercise selection
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS last_selected_exercise_id uuid;

-- Add rep_speed_factor for repetition-based exercise speed control
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS rep_speed_factor numeric DEFAULT 1.0 NOT NULL
CHECK (rep_speed_factor >= 0.5 AND rep_speed_factor <= 2.0);

-- Add update preferences for PWA update control
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS update_mode text DEFAULT 'automatic'
CHECK (update_mode IN ('automatic', 'notify', 'manual'));

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS allow_auto_updates boolean DEFAULT true;

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS update_on_metered boolean DEFAULT false;

-- Add AI Coach master toggle
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_enabled boolean DEFAULT true;

-- Add AI Coach home page display preferences
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_show_on_home boolean DEFAULT true;

-- Add AI Coach auto-refresh preferences
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_auto_refresh boolean DEFAULT true;

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_refresh_interval integer DEFAULT 300000
CHECK (coach_refresh_interval >= 60000); -- Minimum 1 minute

-- Add AI Coach insight type toggles
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_show_streak boolean DEFAULT true;

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_show_muscle_balance boolean DEFAULT true;

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_show_progression boolean DEFAULT true;

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_show_recovery boolean DEFAULT true;

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_show_suggestions boolean DEFAULT true;

-- Add AI Coach onboarding and advanced features
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_intro_seen boolean DEFAULT false;

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_ai_insights_enabled boolean DEFAULT false;

-- Add AI Coach personality style (Enhancement E1.2)
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_persona text DEFAULT 'zen'
CHECK (coach_persona IN ('zen', 'energy', 'logic'));

-- Add gamification features (Phase 1 Gamification)
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS coach_post_workout_survey_enabled boolean DEFAULT true;

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS celebration_sounds_enabled boolean DEFAULT true;

-- Add index on last_selected_exercise_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_last_selected_exercise
ON app_settings(last_selected_exercise_id)
WHERE last_selected_exercise_id IS NOT NULL;

-- Add comment documenting the migration
COMMENT ON TABLE app_settings IS 'User application settings with sync support. Updated 2025-01-27 to add 19 missing fields from TypeScript interface.';

-- Verify all required columns exist
DO $$
DECLARE
    missing_columns text[];
BEGIN
    SELECT array_agg(column_name)
    INTO missing_columns
    FROM (
        VALUES 
            ('last_selected_exercise_id'),
            ('rep_speed_factor'),
            ('update_mode'),
            ('allow_auto_updates'),
            ('update_on_metered'),
            ('coach_enabled'),
            ('coach_show_on_home'),
            ('coach_auto_refresh'),
            ('coach_refresh_interval'),
            ('coach_show_streak'),
            ('coach_show_muscle_balance'),
            ('coach_show_progression'),
            ('coach_show_recovery'),
            ('coach_show_suggestions'),
            ('coach_intro_seen'),
            ('coach_ai_insights_enabled'),
            ('coach_persona'),
            ('coach_post_workout_survey_enabled'),
            ('celebration_sounds_enabled')
    ) AS required(column_name)
    WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'app_settings'
        AND column_name = required.column_name
    );

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Migration incomplete. Missing columns: %', array_to_string(missing_columns, ', ');
    END IF;

    RAISE NOTICE 'Migration successful: All 19 fields added to app_settings table';
END $$;
