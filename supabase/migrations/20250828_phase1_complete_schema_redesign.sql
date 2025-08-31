-- Phase 1: Complete Schema Redesign
-- This migration recreates all syncable tables with unified UUID schema and snake_case naming
-- Run this on other environments to sync schema changes

-- Step 1: Drop old syncable tables (preserve auth tables)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS workout_sessions CASCADE; 
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;

-- Step 2: Create new exercises table
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('time_based', 'repetition_based')),
  default_duration INTEGER,
  default_sets INTEGER,
  default_reps INTEGER,
  rep_duration_seconds INTEGER,
  has_video BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- Step 3: Create new workouts table
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheduled_days TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  estimated_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- Step 4: Create new workout_sessions table
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  workout_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  total_duration INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- Step 5: Create new activity_logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  notes TEXT,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  is_workout BOOLEAN DEFAULT false,
  exercises JSONB,
  sets_count INTEGER,
  reps_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- Step 6: Create new user_preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  default_interval_duration INTEGER DEFAULT 30,
  dark_mode BOOLEAN DEFAULT false,
  favorite_exercises UUID[] DEFAULT '{}',
  locale TEXT DEFAULT 'en',
  units TEXT DEFAULT 'metric',
  cues JSONB DEFAULT '{}'::jsonb,
  rep_speed_factor NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- Step 7: Create new app_settings table
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  interval_duration INTEGER DEFAULT 30,
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  beep_volume NUMERIC DEFAULT 0.5 CHECK (beep_volume >= 0.0 AND beep_volume <= 1.0),
  dark_mode BOOLEAN DEFAULT false,
  auto_save BOOLEAN DEFAULT true,
  last_selected_exercise_id UUID,
  pre_timer_countdown INTEGER DEFAULT 3 CHECK (pre_timer_countdown >= 0 AND pre_timer_countdown <= 10),
  default_rest_time INTEGER DEFAULT 60,
  rep_speed_factor NUMERIC DEFAULT 1.0 CHECK (rep_speed_factor > 0),
  show_exercise_videos BOOLEAN DEFAULT false,
  reduce_motion BOOLEAN DEFAULT false,
  auto_start_next BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- Step 8: Enable RLS on all tables
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies
-- Exercises policies
CREATE POLICY "Users can view their own exercises" ON exercises
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own exercises" ON exercises
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own exercises" ON exercises
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own exercises" ON exercises
  FOR DELETE USING (auth.uid() = owner_id);

-- Workouts policies
CREATE POLICY "Users can view their own workouts" ON workouts
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own workouts" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own workouts" ON workouts
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own workouts" ON workouts
  FOR DELETE USING (auth.uid() = owner_id);

-- Workout sessions policies
CREATE POLICY "Users can view their own workout sessions" ON workout_sessions
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own workout sessions" ON workout_sessions
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own workout sessions" ON workout_sessions
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own workout sessions" ON workout_sessions
  FOR DELETE USING (auth.uid() = owner_id);

-- Activity logs policies
CREATE POLICY "Users can view their own activity logs" ON activity_logs
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own activity logs" ON activity_logs
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own activity logs" ON activity_logs
  FOR DELETE USING (auth.uid() = owner_id);

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = owner_id);

-- App settings policies
CREATE POLICY "Users can view their own app settings" ON app_settings
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own app settings" ON app_settings
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own app settings" ON app_settings
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own app settings" ON app_settings
  FOR DELETE USING (auth.uid() = owner_id);

-- Step 10: Add performance indexes
-- Exercises indexes
CREATE INDEX idx_exercises_owner_id ON exercises(owner_id) WHERE deleted = false;
CREATE INDEX idx_exercises_category ON exercises(category) WHERE deleted = false;
CREATE INDEX idx_exercises_exercise_type ON exercises(exercise_type) WHERE deleted = false;
CREATE INDEX idx_exercises_is_favorite ON exercises(is_favorite) WHERE deleted = false AND is_favorite = true;
CREATE INDEX idx_exercises_updated_at ON exercises(updated_at) WHERE deleted = false;

-- Workouts indexes  
CREATE INDEX idx_workouts_owner_id ON workouts(owner_id) WHERE deleted = false;
CREATE INDEX idx_workouts_is_active ON workouts(is_active) WHERE deleted = false AND is_active = true;
CREATE INDEX idx_workouts_updated_at ON workouts(updated_at) WHERE deleted = false;

-- Workout Sessions indexes
CREATE INDEX idx_workout_sessions_owner_id ON workout_sessions(owner_id) WHERE deleted = false;
CREATE INDEX idx_workout_sessions_workout_id ON workout_sessions(workout_id) WHERE deleted = false;
CREATE INDEX idx_workout_sessions_start_time ON workout_sessions(start_time) WHERE deleted = false;
CREATE INDEX idx_workout_sessions_is_completed ON workout_sessions(is_completed) WHERE deleted = false;
CREATE INDEX idx_workout_sessions_updated_at ON workout_sessions(updated_at) WHERE deleted = false;

-- Activity Logs indexes
CREATE INDEX idx_activity_logs_owner_id ON activity_logs(owner_id) WHERE deleted = false;
CREATE INDEX idx_activity_logs_exercise_id ON activity_logs(exercise_id) WHERE deleted = false;
CREATE INDEX idx_activity_logs_workout_id ON activity_logs(workout_id) WHERE deleted = false;
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp) WHERE deleted = false;
CREATE INDEX idx_activity_logs_is_workout ON activity_logs(is_workout) WHERE deleted = false;
CREATE INDEX idx_activity_logs_updated_at ON activity_logs(updated_at) WHERE deleted = false;

-- User Preferences indexes
CREATE INDEX idx_user_preferences_owner_id ON user_preferences(owner_id) WHERE deleted = false;
CREATE INDEX idx_user_preferences_updated_at ON user_preferences(updated_at) WHERE deleted = false;

-- App Settings indexes
CREATE INDEX idx_app_settings_owner_id ON app_settings(owner_id) WHERE deleted = false;
CREATE INDEX idx_app_settings_updated_at ON app_settings(updated_at) WHERE deleted = false;

-- Step 11: Add foreign key constraints
ALTER TABLE app_settings 
ADD CONSTRAINT fk_app_settings_last_selected_exercise 
FOREIGN KEY (last_selected_exercise_id) REFERENCES exercises(id) ON DELETE SET NULL;

-- Migration complete
COMMENT ON SCHEMA public IS 'Phase 1 schema redesign completed - all tables use UUID PKs and snake_case naming';