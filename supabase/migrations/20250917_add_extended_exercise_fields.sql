-- Migration: Add extended exercise fields and catalog pictures
-- Date: 2025-01-17
-- Description: Add benefits, limitations, best_timing, suggested_combinations, notes, references to exercises
--              Add picture_url to exercise_catalogs
-- Environment: Development first, then production
-- Impact: exercises and exercise_catalogs table schema expansion

-- Add picture_url to exercise_catalogs table
ALTER TABLE public.exercise_catalogs
ADD COLUMN IF NOT EXISTS picture_url TEXT;

-- Add extended fields to exercises table
ALTER TABLE public.exercises
ADD COLUMN IF NOT EXISTS benefits TEXT,
ADD COLUMN IF NOT EXISTS limitations TEXT,
ADD COLUMN IF NOT EXISTS best_timing TEXT,
ADD COLUMN IF NOT EXISTS suggested_combinations TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS exercise_references TEXT[];

-- Update existing catalogs with picture URLs (placeholder URLs for now)
UPDATE public.exercise_catalogs
SET picture_url = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
WHERE id = 'general-fitness';

UPDATE public.exercise_catalogs
SET picture_url = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop'
WHERE id = 'tai-chi';

UPDATE public.exercise_catalogs
SET picture_url = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop'
WHERE id = 'zumba';

-- Add new catalogs for women-health requirement
INSERT INTO public.exercise_catalogs (id, name_key, description_key, is_default, is_premium, display_order, icon, color_theme, picture_url) VALUES
('women-health', 'catalogs.women-health.name', 'catalogs.women-health.description', false, true, 3, 'woman', 'pink', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop')
ON CONFLICT (id) DO UPDATE SET
  picture_url = EXCLUDED.picture_url,
  display_order = EXCLUDED.display_order;

-- Verify the migration
DO $$
BEGIN
    -- Check that picture_url column exists in exercise_catalogs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercise_catalogs' AND column_name = 'picture_url') THEN
        RAISE EXCEPTION 'picture_url column was not added to exercise_catalogs table';
    END IF;

    -- Check that extended fields exist in exercises
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'benefits') THEN
        RAISE EXCEPTION 'benefits column was not added to exercises table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'limitations') THEN
        RAISE EXCEPTION 'limitations column was not added to exercises table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'best_timing') THEN
        RAISE EXCEPTION 'best_timing column was not added to exercises table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'suggested_combinations') THEN
        RAISE EXCEPTION 'suggested_combinations column was not added to exercises table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'notes') THEN
        RAISE EXCEPTION 'notes column was not added to exercises table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'exercise_references') THEN
        RAISE EXCEPTION 'exercise_references column was not added to exercises table';
    END IF;

    -- Check that women-health catalog was inserted
    IF NOT EXISTS (SELECT 1 FROM public.exercise_catalogs WHERE id = 'women-health') THEN
        RAISE EXCEPTION 'women-health catalog was not inserted';
    END IF;

    RAISE NOTICE 'Extended fields migration completed successfully';
END
$$;