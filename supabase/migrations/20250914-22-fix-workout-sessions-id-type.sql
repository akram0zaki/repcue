-- Fix workout_sessions id column type to match dev (text instead of uuid)
-- Dev is the source of truth, production needs to be updated

-- Change id column from uuid to text to match dev schema
ALTER TABLE public.workout_sessions
ALTER COLUMN id TYPE text;