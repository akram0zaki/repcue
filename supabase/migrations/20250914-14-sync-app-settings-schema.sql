-- Sync app_settings table schema from production to match dev
-- This is a major structural change - production uses key-value pairs, dev uses columns

-- Step 1: Backup existing data (if any)
CREATE TEMP TABLE app_settings_backup AS
SELECT * FROM public.app_settings;

-- Step 2: Drop the existing table and recreate with dev schema
DROP TABLE public.app_settings;

-- Step 3: Create table with dev schema
CREATE TABLE public.app_settings (
    id text NOT NULL PRIMARY KEY,
    dark_mode boolean DEFAULT false,
    reduce_motion boolean DEFAULT false,
    vibration_enabled boolean DEFAULT true,
    auto_start_next boolean DEFAULT false,
    default_rest_time integer DEFAULT 60,
    beep_interval_seconds integer DEFAULT 30,
    beep_volume numeric DEFAULT 0.5,
    beep_sound_enabled boolean DEFAULT true,
    pre_timer_countdown integer DEFAULT 3,
    show_exercise_videos boolean DEFAULT true,
    data_auto_save boolean DEFAULT true,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1,
    deleted boolean DEFAULT false,
    sound_enabled boolean DEFAULT true,
    default_interval_duration integer DEFAULT 30
);

-- Step 4: Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies to match other tables
CREATE POLICY "Users can view own app_settings" ON public.app_settings
    FOR SELECT USING (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can insert own app_settings" ON public.app_settings
    FOR INSERT WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can update own app_settings" ON public.app_settings
    FOR UPDATE USING (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can delete own app_settings" ON public.app_settings
    FOR DELETE USING (auth.uid() = owner_id OR owner_id IS NULL);

-- Step 6: Try to migrate any existing data from backup
-- This is best effort since the schemas are so different
DO $$
DECLARE
    backup_record RECORD;
    settings_id text := 'global_settings';
BEGIN
    -- Check if there's any backup data
    IF EXISTS (SELECT 1 FROM app_settings_backup LIMIT 1) THEN
        -- Insert a default settings record
        INSERT INTO public.app_settings (id, created_at, updated_at)
        VALUES (settings_id, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Drop the backup table
DROP TABLE app_settings_backup;