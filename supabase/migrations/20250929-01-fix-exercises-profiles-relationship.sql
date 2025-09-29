-- Fix relationship between exercises and profiles tables
-- Issue: PostgREST can't find relationship between exercises.owner_id and profiles.owner_id
-- Both reference auth.users.id but need explicit relationship for Supabase queries

-- Add foreign key constraint to establish the relationship
-- This allows queries like profiles!owner_id(display_name) to work properly
ALTER TABLE public.exercises
ADD CONSTRAINT exercises_profiles_fkey
FOREIGN KEY (owner_id) REFERENCES public.profiles(owner_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Add comment to document the relationship
COMMENT ON CONSTRAINT exercises_profiles_fkey ON public.exercises IS
'Foreign key relationship to profiles table for PostgREST joins. Allows queries like profiles!owner_id(display_name) to work.';