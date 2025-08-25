-- Enable Row Level Security for all syncable tables
-- This ensures users can only access their own data

-- Enable RLS on all syncable tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_cursors ENABLE ROW LEVEL SECURITY;

-- Policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own preferences" ON user_preferences
    FOR DELETE USING (owner_id = auth.uid());

-- Policies for app_settings
CREATE POLICY "Users can view their own app settings" ON app_settings
    FOR SELECT USING (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can insert their own app settings" ON app_settings
    FOR INSERT WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can update their own app settings" ON app_settings
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own app settings" ON app_settings
    FOR DELETE USING (owner_id = auth.uid());

-- Policies for exercises
CREATE POLICY "Users can view their own exercises" ON exercises
    FOR SELECT USING (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can insert their own exercises" ON exercises
    FOR INSERT WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can update their own exercises" ON exercises
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own exercises" ON exercises
    FOR DELETE USING (owner_id = auth.uid());

-- Policies for workouts
CREATE POLICY "Users can view their own workouts" ON workouts
    FOR SELECT USING (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can insert their own workouts" ON workouts
    FOR INSERT WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can update their own workouts" ON workouts
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own workouts" ON workouts
    FOR DELETE USING (owner_id = auth.uid());

-- Policies for activity_logs
CREATE POLICY "Users can view their own activity logs" ON activity_logs
    FOR SELECT USING (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can insert their own activity logs" ON activity_logs
    FOR INSERT WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can update their own activity logs" ON activity_logs
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own activity logs" ON activity_logs
    FOR DELETE USING (owner_id = auth.uid());

-- Policies for workout_sessions
CREATE POLICY "Users can view their own workout sessions" ON workout_sessions
    FOR SELECT USING (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can insert their own workout sessions" ON workout_sessions
    FOR INSERT WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can update their own workout sessions" ON workout_sessions
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own workout sessions" ON workout_sessions
    FOR DELETE USING (owner_id = auth.uid());

-- Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own profile" ON profiles
    FOR DELETE USING (user_id = auth.uid());

-- Policies for sync_cursors
CREATE POLICY "Users can view their own sync cursor" ON sync_cursors
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sync cursor" ON sync_cursors
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sync cursor" ON sync_cursors
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sync cursor" ON sync_cursors
    FOR DELETE USING (user_id = auth.uid());