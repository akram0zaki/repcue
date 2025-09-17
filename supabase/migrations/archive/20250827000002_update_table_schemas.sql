-- Update existing table schemas to match application expectations

-- Update exercises table to match application schema
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS exercise_type TEXT NOT NULL DEFAULT 'REPETITION_BASED' 
    CHECK (exercise_type IN ('TIME_BASED', 'REPETITION_BASED')),
ADD COLUMN IF NOT EXISTS instructions JSONB,
ADD COLUMN IF NOT EXISTS rep_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 1;

-- Update activity_logs table to match application schema  
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id),
ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reps INTEGER,
ADD COLUMN IF NOT EXISTS sets INTEGER,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 1;

-- Rename timestamp column in activity_logs to match application
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'activity_date') THEN
        ALTER TABLE activity_logs RENAME COLUMN activity_date TO timestamp;
    END IF;
END $$;

-- Update user_preferences table to match application schema
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS units TEXT DEFAULT 'metric',
ADD COLUMN IF NOT EXISTS cues JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rep_speed_factor NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 1;

-- Update app_settings table to match application schema
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vibration_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS default_rest_time INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS auto_start_next BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 1;

-- Update workout_sessions table to match application schema
ALTER TABLE workout_sessions
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS exercises_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_exercises INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 1;

-- Rename columns to match application expectations
DO $$
BEGIN
    -- Rename started_at to start_time if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workout_sessions' AND column_name = 'started_at') THEN
        UPDATE workout_sessions SET start_time = started_at WHERE start_time IS NULL;
        ALTER TABLE workout_sessions DROP COLUMN IF EXISTS started_at;
    END IF;
    
    -- Rename completed_at to end_time if it exists  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workout_sessions' AND column_name = 'completed_at') THEN
        UPDATE workout_sessions SET end_time = completed_at WHERE end_time IS NULL;
        ALTER TABLE workout_sessions DROP COLUMN IF EXISTS completed_at;
    END IF;
END $$;

-- Add profiles table with deletion tracking if it doesn't have the required fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- Additional indexes for new columns
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_type ON exercises(exercise_type);
CREATE INDEX IF NOT EXISTS idx_exercises_favorite ON exercises(owner_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_activity_logs_exercise ON activity_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed ON workout_sessions(owner_id, is_completed);