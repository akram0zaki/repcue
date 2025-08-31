-- Supabase Database Schema
-- Generated from information_schema.columns

-- ACTIVITY_LOGS Table
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id UUID,
  exercise_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL,
  reps INTEGER,
  sets INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1,
  exercise_name TEXT,
  workout_id TEXT,
  is_workout BOOLEAN DEFAULT false,
  exercises JSONB
);

-- APP_SETTINGS Table  
CREATE TABLE app_settings (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id UUID,
  dark_mode BOOLEAN DEFAULT false,
  reduce_motion BOOLEAN DEFAULT false,
  vibration_enabled BOOLEAN DEFAULT true,
  default_rest_time INTEGER DEFAULT 60,
  auto_start_next BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1,
  interval_duration INTEGER DEFAULT 30,
  sound_enabled BOOLEAN DEFAULT true,
  beep_volume NUMERIC DEFAULT 0.5,
  auto_save BOOLEAN DEFAULT true,
  last_selected_exercise_id TEXT,
  pre_timer_countdown INTEGER DEFAULT 3,
  rep_speed_factor NUMERIC DEFAULT 1.0,
  show_exercise_videos BOOLEAN DEFAULT false
);

-- EXERCISES Table
CREATE TABLE exercises (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id UUID,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  description TEXT,
  instructions JSONB,
  rep_duration_seconds INTEGER,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1,
  tags JSONB DEFAULT '[]'::jsonb
);

-- USER_PREFERENCES Table
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id UUID,
  locale TEXT DEFAULT 'en'::text,
  units TEXT DEFAULT 'metric'::text,
  cues JSONB DEFAULT '{}'::jsonb,
  rep_speed_factor NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1,
  sound_enabled BOOLEAN DEFAULT true,
  default_interval_duration INTEGER DEFAULT 30,
  dark_mode BOOLEAN DEFAULT false,
  favorite_exercises UUID[] DEFAULT '{}'::uuid[]
);

-- WORKOUT_SESSIONS Table
CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id UUID,
  workout_id TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT false,
  exercises_completed INTEGER DEFAULT 0,
  total_exercises INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- WORKOUTS Table
CREATE TABLE workouts (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);