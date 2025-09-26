-- Migration: Add catalog support to RepCue
-- Date: 2025-01-17
-- Description: Add exercise catalogs and catalog_id to exercises table
-- Environment: Development first, then production
-- Impact: exercises table schema change, sync service update required

-- Create exercise_catalogs table
CREATE TABLE IF NOT EXISTS public.exercise_catalogs (
    id TEXT PRIMARY KEY,
    name_key TEXT NOT NULL,
    description_key TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    icon TEXT NOT NULL,
    color_theme TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default catalogs
INSERT INTO public.exercise_catalogs (id, name_key, description_key, is_default, is_premium, display_order, icon, color_theme) VALUES
('general-fitness', 'catalogs.general-fitness.name', 'catalogs.general-fitness.description', true, false, 0, 'fitness', 'blue'),
('tai-chi', 'catalogs.tai-chi.name', 'catalogs.tai-chi.description', false, true, 1, 'tai-chi', 'green'),
('zumba', 'catalogs.zumba.name', 'catalogs.zumba.description', false, true, 2, 'dance', 'purple');

-- Add catalog_id column to exercises table
ALTER TABLE public.exercises
ADD COLUMN IF NOT EXISTS catalog_id TEXT;

-- Set default catalog_id for existing exercises (all existing exercises go to general-fitness)
UPDATE public.exercises
SET catalog_id = 'general-fitness'
WHERE catalog_id IS NULL;

-- Make catalog_id NOT NULL after setting defaults
ALTER TABLE public.exercises
ALTER COLUMN catalog_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE public.exercises
ADD CONSTRAINT fk_exercises_catalog_id
FOREIGN KEY (catalog_id) REFERENCES public.exercise_catalogs(id) ON DELETE RESTRICT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercises_catalog_id ON public.exercises(catalog_id);
CREATE INDEX IF NOT EXISTS idx_exercise_catalogs_display_order ON public.exercise_catalogs(display_order);
CREATE INDEX IF NOT EXISTS idx_exercise_catalogs_is_default ON public.exercise_catalogs(is_default);

-- Enable RLS on exercise_catalogs table
ALTER TABLE public.exercise_catalogs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Anyone can read catalogs (they're public metadata)
CREATE POLICY "Anyone can read exercise catalogs" ON public.exercise_catalogs
    FOR SELECT USING (true);

-- RLS policy: Only authenticated users can insert/update/delete catalogs (admin functionality)
CREATE POLICY "Only authenticated users can modify exercise catalogs" ON public.exercise_catalogs
    FOR ALL USING (auth.role() = 'authenticated');

-- Update the updated_at timestamp trigger for exercise_catalogs
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_exercise_catalogs_updated_at
    BEFORE UPDATE ON public.exercise_catalogs
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Verify the migration
DO $$
BEGIN
    -- Check that exercise_catalogs table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exercise_catalogs') THEN
        RAISE EXCEPTION 'exercise_catalogs table was not created';
    END IF;

    -- Check that catalog_id column exists in exercises
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'catalog_id') THEN
        RAISE EXCEPTION 'catalog_id column was not added to exercises table';
    END IF;

    -- Check that foreign key constraint exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_name = 'fk_exercises_catalog_id') THEN
        RAISE EXCEPTION 'foreign key constraint was not created';
    END IF;

    -- Check that default catalogs were inserted
    IF (SELECT COUNT(*) FROM public.exercise_catalogs) < 3 THEN
        RAISE EXCEPTION 'default catalogs were not inserted';
    END IF;

    RAISE NOTICE 'Migration completed successfully';
END
$$;