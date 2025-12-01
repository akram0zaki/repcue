-- Create unified user_profiles table
-- Stores both common personal info and nested fitness/social data
-- Data is synced bidirectionally with IndexedDB

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  -- Primary key and sync metadata
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Common personal information
  name TEXT,
  birth_year INTEGER CHECK (birth_year >= 1900 AND birth_year <= EXTRACT(YEAR FROM CURRENT_DATE)),
  
  -- Nested profile data as JSONB
  fitness JSONB, -- FitnessProfileData: gender, height, weight, goals, training preferences
  social JSONB,  -- SocialProfileData: bio, location, website, privacy settings, stats
  
  -- Metadata
  join_date TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ,
  
  -- Ensure one profile per user
  CONSTRAINT user_profiles_user_id_unique UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_owner_id ON public.user_profiles(owner_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON public.user_profiles(updated_at) WHERE deleted = FALSE;

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() = owner_id
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() = owner_id
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    auth.uid() = owner_id
  )
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() = owner_id
  );

-- Users can delete (soft delete) their own profile
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles
  FOR DELETE
  USING (
    auth.uid() = user_id AND
    auth.uid() = owner_id
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Add comment to table
COMMENT ON TABLE public.user_profiles IS 'Unified user profiles with fitness and social data. Synced with IndexedDB.';

-- Add comments to columns
COMMENT ON COLUMN public.user_profiles.name IS 'User display name (common field)';
COMMENT ON COLUMN public.user_profiles.birth_year IS 'Year of birth (used to calculate age). Range: 1900 to current year.';
COMMENT ON COLUMN public.user_profiles.fitness IS 'Fitness profile data as JSONB: {gender, height, weight, primary_goals, training_frequency, preferred_training_style, last_updated_from_wizard}';
COMMENT ON COLUMN public.user_profiles.social IS 'Social profile data as JSONB: {bio, location, website, privacy_settings, stats}';
COMMENT ON COLUMN public.user_profiles.join_date IS 'Date user created their profile';
COMMENT ON COLUMN public.user_profiles.last_active IS 'Last time user was active';
