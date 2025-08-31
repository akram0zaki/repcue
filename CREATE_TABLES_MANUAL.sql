-- MANUAL DATABASE SETUP
-- Copy and paste this SQL into your Supabase Dashboard > SQL Editor
-- Then click "Run" to create the missing tables

-- Create core application tables for sync functionality
-- These tables store user data that needs to be synchronized between client and server

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Preference data
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    
    -- Sync metadata
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false,
    
    UNIQUE(owner_id) -- One preference record per user
);

-- App settings table  
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Settings data
    auto_save BOOLEAN DEFAULT true,
    backup_enabled BOOLEAN DEFAULT true,
    data_usage_consent BOOLEAN DEFAULT false,
    
    -- Sync metadata
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false,
    
    UNIQUE(owner_id) -- One settings record per user
);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Exercise data
    name VARCHAR(255) NOT NULL,
    description TEXT,
    muscle_groups TEXT[], -- Array of muscle group names
    equipment TEXT[], -- Array of equipment needed
    difficulty VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
    instructions TEXT,
    
    -- Sync metadata
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Workout data
    name VARCHAR(255) NOT NULL,
    description TEXT,
    exercises JSONB DEFAULT '[]', -- Array of exercise references with sets/reps
    duration_minutes INTEGER,
    difficulty VARCHAR(20) DEFAULT 'beginner',
    
    -- Sync metadata
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Activity data
    activity_type VARCHAR(50) NOT NULL, -- workout_completed, exercise_added, etc.
    activity_data JSONB DEFAULT '{}',
    activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Sync metadata
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false
);

-- Workout sessions table
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Session data
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, cancelled
    session_data JSONB DEFAULT '{}', -- Detailed session information
    
    -- Sync metadata
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false
);

-- Sync cursors table for tracking last sync state
CREATE TABLE IF NOT EXISTS sync_cursors (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_ack_cursor TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_cursors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can access their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can access their own settings" ON app_settings;
DROP POLICY IF EXISTS "Users can access their own exercises" ON exercises;
DROP POLICY IF EXISTS "Users can access their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can access their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can access their own workout sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can access their own sync cursor" ON sync_cursors;

-- RLS policies - users can only access their own data
CREATE POLICY "Users can access their own preferences" ON user_preferences
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can access their own settings" ON app_settings
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can access their own exercises" ON exercises
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can access their own workouts" ON workouts
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can access their own activity logs" ON activity_logs
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can access their own workout sessions" ON workout_sessions
    FOR ALL USING (owner_id = auth.uid());

-- Users can only access their own sync cursor
CREATE POLICY "Users can access their own sync cursor" ON sync_cursors
    FOR ALL USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_owner ON user_preferences(owner_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_owner ON app_settings(owner_id);
CREATE INDEX IF NOT EXISTS idx_exercises_owner ON exercises(owner_id);
CREATE INDEX IF NOT EXISTS idx_exercises_updated ON exercises(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_owner ON workouts(owner_id);
CREATE INDEX IF NOT EXISTS idx_workouts_updated ON workouts(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_owner ON activity_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(owner_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_owner ON workout_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout ON workout_sessions(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_updated ON workout_sessions(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_cursors_updated ON sync_cursors(updated_at DESC);

-- Verify tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'user_preferences',
    'app_settings', 
    'exercises',
    'workouts',
    'activity_logs',
    'workout_sessions',
    'sync_cursors'
)
ORDER BY tablename;