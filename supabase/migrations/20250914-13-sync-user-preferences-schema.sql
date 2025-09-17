-- Sync user_preferences table schema from production to match dev
-- This is a major structural change - production uses key-value pairs, dev uses columns

-- Step 1: Backup existing data (if any)
CREATE TEMP TABLE user_preferences_backup AS
SELECT * FROM public.user_preferences;

-- Step 2: Drop the existing table and recreate with dev schema
DROP TABLE public.user_preferences;

-- Step 3: Create table with dev schema
CREATE TABLE public.user_preferences (
    id text NOT NULL PRIMARY KEY,
    locale text DEFAULT 'en'::text,
    units text DEFAULT 'metric'::text,
    rep_speed_factor numeric DEFAULT 1.0,
    cues jsonb DEFAULT '{}'::jsonb,
    favorite_exercises text[] DEFAULT '{}'::text[],
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1,
    deleted boolean DEFAULT false
);

-- Step 4: Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies to match other tables
CREATE POLICY "Users can view own user_preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own user_preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own user_preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own user_preferences" ON public.user_preferences
    FOR DELETE USING (auth.uid() = owner_id);

-- Step 6: Try to migrate any existing data from backup
-- This is best effort since the schemas are so different
DO $$
DECLARE
    backup_record RECORD;
    user_id uuid;
    pref_id text;
BEGIN
    -- For each unique owner_id in backup, create a user_preferences record
    FOR user_id IN
        SELECT DISTINCT owner_id FROM user_preferences_backup WHERE owner_id IS NOT NULL
    LOOP
        -- Generate a preference ID for this user
        pref_id := 'pref_' || replace(user_id::text, '-', '');

        -- Insert basic preferences record
        INSERT INTO public.user_preferences (id, owner_id, created_at, updated_at)
        VALUES (pref_id, user_id, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;

-- Drop the backup table
DROP TABLE user_preferences_backup;