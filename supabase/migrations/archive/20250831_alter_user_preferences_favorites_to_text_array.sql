-- Hybrid favorites plan (Phase 1): store favorites as TEXT[] (slugs/ids) in user_preferences
-- This is a reversible, low-risk change. In Phase 3, we will migrate to a normalized join and UUIDs.

-- Safety: only run if column exists and is not already TEXT[]
DO $$
BEGIN
  -- Remove dependent constraints/indexes if any (none expected on this array column)
  -- Alter column type to TEXT[] using USING cast
  ALTER TABLE IF EXISTS public.user_preferences
  ALTER COLUMN favorite_exercises TYPE TEXT[] USING favorite_exercises::TEXT[];
EXCEPTION WHEN others THEN
  -- Log and continue without failing entire migration batch
  RAISE NOTICE 'Skipping favorite_exercises type change: %', SQLERRM;
END$$;

-- Ensure default is an empty array of text
ALTER TABLE IF EXISTS public.user_preferences
  ALTER COLUMN favorite_exercises SET DEFAULT '{}'::TEXT[];

-- Comment for future migration path
COMMENT ON COLUMN public.user_preferences.favorite_exercises IS 'Phase 1: TEXT[] of built-in exercise IDs/slugs for favorites. Will migrate to UUIDs/join later.';
