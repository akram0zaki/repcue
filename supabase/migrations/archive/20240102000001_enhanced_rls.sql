-- Enhanced Row Level Security policies with additional security measures
-- This builds upon the basic RLS policies with more sophisticated controls

-- Add security-related columns to profiles for enhanced monitoring
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_ip INET;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_export_requested_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT account_locked, locked_until, failed_login_attempts
    INTO profile_record
    FROM profiles
    WHERE user_id = p_user_id;
    
    -- If no profile found, assume not locked
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if account is explicitly locked
    IF profile_record.account_locked THEN
        -- Check if lock has expired
        IF profile_record.locked_until IS NOT NULL AND profile_record.locked_until < NOW() THEN
            -- Unlock account
            UPDATE profiles 
            SET account_locked = false, locked_until = NULL, failed_login_attempts = 0
            WHERE user_id = p_user_id;
            RETURN FALSE;
        ELSE
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check for too many failed attempts (auto-lock)
    IF profile_record.failed_login_attempts >= 5 THEN
        -- Lock account for 1 hour
        UPDATE profiles 
        SET account_locked = true, locked_until = NOW() + INTERVAL '1 hour'
        WHERE user_id = p_user_id;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced policies with security checks
-- Drop existing policies to recreate with enhanced security
DO $$ 
DECLARE
    policy_name TEXT;
    table_name TEXT;
BEGIN
    FOR table_name IN SELECT unnest(ARRAY['user_preferences', 'app_settings', 'exercises', 'workouts', 'activity_logs', 'workout_sessions'])
    LOOP
        -- Drop existing policies
        FOR policy_name IN 
            SELECT policyname FROM pg_policies 
            WHERE tablename = table_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS "%s" ON %s', policy_name, table_name);
        END LOOP;
    END LOOP;
END $$;

-- Enhanced policies for user_preferences
CREATE POLICY "Enhanced: Users can view their own preferences" ON user_preferences
    FOR SELECT USING (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can delete their own preferences" ON user_preferences
    FOR DELETE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

-- Enhanced policies for app_settings
CREATE POLICY "Enhanced: Users can view their own app settings" ON app_settings
    FOR SELECT USING (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can insert their own app settings" ON app_settings
    FOR INSERT WITH CHECK (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can update their own app settings" ON app_settings
    FOR UPDATE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can delete their own app settings" ON app_settings
    FOR DELETE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

-- Enhanced policies for exercises
CREATE POLICY "Enhanced: Users can view their own exercises" ON exercises
    FOR SELECT USING (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can insert their own exercises" ON exercises
    FOR INSERT WITH CHECK (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can update their own exercises" ON exercises
    FOR UPDATE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can delete their own exercises" ON exercises
    FOR DELETE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

-- Enhanced policies for workouts
CREATE POLICY "Enhanced: Users can view their own workouts" ON workouts
    FOR SELECT USING (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can insert their own workouts" ON workouts
    FOR INSERT WITH CHECK (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can update their own workouts" ON workouts
    FOR UPDATE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can delete their own workouts" ON workouts
    FOR DELETE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

-- Enhanced policies for activity_logs
CREATE POLICY "Enhanced: Users can view their own activity logs" ON activity_logs
    FOR SELECT USING (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can insert their own activity logs" ON activity_logs
    FOR INSERT WITH CHECK (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can update their own activity logs" ON activity_logs
    FOR UPDATE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can delete their own activity logs" ON activity_logs
    FOR DELETE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

-- Enhanced policies for workout_sessions
CREATE POLICY "Enhanced: Users can view their own workout sessions" ON workout_sessions
    FOR SELECT USING (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can insert their own workout sessions" ON workout_sessions
    FOR INSERT WITH CHECK (
        (owner_id = auth.uid() OR owner_id IS NULL) 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can update their own workout sessions" ON workout_sessions
    FOR UPDATE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

CREATE POLICY "Enhanced: Users can delete their own workout sessions" ON workout_sessions
    FOR DELETE USING (
        owner_id = auth.uid() 
        AND NOT is_account_locked(auth.uid())
    );

-- Function to track login attempts
CREATE OR REPLACE FUNCTION track_login_attempt(
    p_user_id UUID,
    p_success BOOLEAN,
    p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    IF p_success THEN
        -- Successful login - reset failed attempts and update login info
        UPDATE profiles 
        SET 
            last_login_at = NOW(),
            last_login_ip = p_ip_address,
            login_count = login_count + 1,
            failed_login_attempts = 0,
            account_locked = CASE 
                WHEN locked_until IS NOT NULL AND locked_until < NOW() THEN false 
                ELSE account_locked 
            END,
            locked_until = CASE 
                WHEN locked_until IS NOT NULL AND locked_until < NOW() THEN NULL 
                ELSE locked_until 
            END
        WHERE user_id = p_user_id;
        
        -- Log successful login
        PERFORM log_audit_event(
            p_user_id,
            'USER_LOGIN_SUCCESS',
            'authentication',
            p_user_id::TEXT,
            jsonb_build_object('ip_address', p_ip_address),
            p_ip_address,
            NULL,
            true
        );
    ELSE
        -- Failed login - increment failed attempts
        UPDATE profiles 
        SET failed_login_attempts = failed_login_attempts + 1
        WHERE user_id = p_user_id;
        
        -- Log failed login
        PERFORM log_audit_event(
            p_user_id,
            'USER_LOGIN_FAILED',
            'authentication',
            p_user_id::TEXT,
            jsonb_build_object('ip_address', p_ip_address),
            p_ip_address,
            NULL,
            false
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;