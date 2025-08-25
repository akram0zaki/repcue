-- Add performance indexes for sync operations
-- These indexes optimize the queries used by the sync function

-- Indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_owner_updated ON user_preferences(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_id_owner ON user_preferences(id, owner_id);

-- Indexes for app_settings  
CREATE INDEX IF NOT EXISTS idx_app_settings_owner_updated ON app_settings(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_app_settings_id_owner ON app_settings(id, owner_id);

-- Indexes for exercises
CREATE INDEX IF NOT EXISTS idx_exercises_owner_updated ON exercises(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_exercises_id_owner ON exercises(id, owner_id);

-- Indexes for workouts
CREATE INDEX IF NOT EXISTS idx_workouts_owner_updated ON workouts(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workouts_id_owner ON workouts(id, owner_id);

-- Indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_owner_updated ON activity_logs(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_id_owner ON activity_logs(id, owner_id);

-- Indexes for workout_sessions
CREATE INDEX IF NOT EXISTS idx_workout_sessions_owner_updated ON workout_sessions(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_id_owner ON workout_sessions(id, owner_id);

-- Partial indexes for non-deleted records (for better performance)
CREATE INDEX IF NOT EXISTS idx_user_preferences_active ON user_preferences(owner_id, updated_at) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_app_settings_active ON app_settings(owner_id, updated_at) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_exercises_active ON exercises(owner_id, updated_at) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_workouts_active ON workouts(owner_id, updated_at) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_activity_logs_active ON activity_logs(owner_id, updated_at) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_workout_sessions_active ON workout_sessions(owner_id, updated_at) WHERE deleted = false;

-- Index for sync_cursors
CREATE INDEX IF NOT EXISTS idx_sync_cursors_user ON sync_cursors(user_id);

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);