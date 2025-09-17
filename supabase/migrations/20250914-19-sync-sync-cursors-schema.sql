-- Sync sync_cursors table schema from production to match dev
-- Dev is the source of truth, production needs to be updated

-- Step 1: Backup existing data (if any)
CREATE TEMP TABLE sync_cursors_backup AS
SELECT * FROM public.sync_cursors;

-- Step 2: Drop the existing table and recreate with dev schema
DROP TABLE public.sync_cursors;

-- Step 3: Create table with dev schema
CREATE TABLE public.sync_cursors (
    owner_id uuid NOT NULL PRIMARY KEY,
    last_ack_cursor text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Step 4: Enable RLS
ALTER TABLE public.sync_cursors ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies to match other tables
CREATE POLICY "Users can view own sync cursors" ON public.sync_cursors
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own sync cursors" ON public.sync_cursors
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own sync cursors" ON public.sync_cursors
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own sync cursors" ON public.sync_cursors
    FOR DELETE USING (auth.uid() = owner_id);

-- Step 6: Try to migrate any existing data from backup
-- This is best effort since the schemas are so different
DO $$
DECLARE
    backup_record RECORD;
BEGIN
    -- For each unique user_id in backup, create a sync_cursors record
    FOR backup_record IN
        SELECT DISTINCT user_id FROM sync_cursors_backup WHERE user_id IS NOT NULL
    LOOP
        -- Insert basic sync cursor record
        INSERT INTO public.sync_cursors (owner_id, created_at, updated_at)
        VALUES (backup_record.user_id, NOW(), NOW())
        ON CONFLICT (owner_id) DO NOTHING;
    END LOOP;
END $$;

-- Drop the backup table
DROP TABLE sync_cursors_backup;