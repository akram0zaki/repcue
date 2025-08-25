-- Data retention and cleanup policies for GDPR compliance
-- This implements automatic data purging for inactive accounts and old data

-- Create data retention settings table
CREATE TABLE IF NOT EXISTS data_retention_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(50) NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO data_retention_settings (resource_type, retention_days, description) VALUES
    ('audit_logs', 730, 'Security audit logs - 2 years'),
    ('inactive_accounts', 1095, 'Inactive user accounts - 3 years'),
    ('deleted_accounts', 30, 'Account deletion grace period - 30 days'),
    ('activity_logs', 1095, 'User activity logs - 3 years'),
    ('workout_sessions', 2555, 'Workout session data - 7 years'),
    ('sync_cursors', 90, 'Sync state data - 3 months after last sync')
ON CONFLICT (resource_type) DO NOTHING;

-- Function to check if user is inactive
CREATE OR REPLACE FUNCTION is_user_inactive(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_activity TIMESTAMPTZ;
    retention_days INTEGER;
BEGIN
    -- Get retention policy for inactive accounts
    SELECT retention_days INTO retention_days
    FROM data_retention_settings 
    WHERE resource_type = 'inactive_accounts' AND enabled = true;
    
    -- If no policy found, default to 3 years
    IF retention_days IS NULL THEN
        retention_days := 1095;
    END IF;
    
    -- Check last login
    SELECT last_login_at INTO last_activity
    FROM profiles 
    WHERE user_id = p_user_id;
    
    -- If never logged in, check account creation date
    IF last_activity IS NULL THEN
        SELECT created_at INTO last_activity
        FROM profiles 
        WHERE user_id = p_user_id;
    END IF;
    
    -- If no profile found, check auth.users
    IF last_activity IS NULL THEN
        SELECT created_at INTO last_activity
        FROM auth.users 
        WHERE id = p_user_id;
    END IF;
    
    -- Consider inactive if last activity is older than retention period
    RETURN (last_activity < NOW() - (retention_days || ' days')::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark account for deletion
CREATE OR REPLACE FUNCTION mark_account_for_deletion(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Mark profile for deletion
    UPDATE profiles 
    SET deletion_requested_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log the deletion request
    PERFORM log_audit_event(
        p_user_id,
        'ACCOUNT_DELETION_REQUESTED',
        'user_account',
        p_user_id::TEXT,
        jsonb_build_object('requested_at', NOW()),
        NULL,
        NULL,
        true
    );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete user data
CREATE OR REPLACE FUNCTION permanently_delete_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    deletion_summary JSONB := '{}';
    deleted_count INTEGER;
BEGIN
    -- Delete user preferences
    DELETE FROM user_preferences WHERE owner_id = p_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    deletion_summary := jsonb_set(deletion_summary, '{user_preferences}', deleted_count::TEXT::JSONB);
    
    -- Delete app settings
    DELETE FROM app_settings WHERE owner_id = p_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    deletion_summary := jsonb_set(deletion_summary, '{app_settings}', deleted_count::TEXT::JSONB);
    
    -- Delete exercises (only user-created ones)
    DELETE FROM exercises WHERE owner_id = p_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    deletion_summary := jsonb_set(deletion_summary, '{exercises}', deleted_count::TEXT::JSONB);
    
    -- Delete workouts
    DELETE FROM workouts WHERE owner_id = p_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    deletion_summary := jsonb_set(deletion_summary, '{workouts}', deleted_count::TEXT::JSONB);
    
    -- Delete activity logs
    DELETE FROM activity_logs WHERE owner_id = p_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    deletion_summary := jsonb_set(deletion_summary, '{activity_logs}', deleted_count::TEXT::JSONB);
    
    -- Delete workout sessions
    DELETE FROM workout_sessions WHERE owner_id = p_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    deletion_summary := jsonb_set(deletion_summary, '{workout_sessions}', deleted_count::TEXT::JSONB);
    
    -- Delete sync cursors
    DELETE FROM sync_cursors WHERE user_id = p_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    deletion_summary := jsonb_set(deletion_summary, '{sync_cursors}', deleted_count::TEXT::JSONB);
    
    -- Delete profile (keep until the very end)
    DELETE FROM profiles WHERE user_id = p_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    deletion_summary := jsonb_set(deletion_summary, '{profiles}', deleted_count::TEXT::JSONB);
    
    -- Note: audit_logs are kept for compliance - they reference user_id but don't contain PII
    -- auth.users record is handled by Supabase auth system
    
    RETURN deletion_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup data according to retention policies
CREATE OR REPLACE FUNCTION cleanup_retained_data()
RETURNS JSONB AS $$
DECLARE
    cleanup_summary JSONB := '{}';
    deleted_count INTEGER;
    retention_days INTEGER;
    grace_period INTEGER;
BEGIN
    -- Cleanup audit logs
    SELECT retention_days INTO retention_days
    FROM data_retention_settings 
    WHERE resource_type = 'audit_logs' AND enabled = true;
    
    IF retention_days IS NOT NULL THEN
        DELETE FROM audit_logs 
        WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        cleanup_summary := jsonb_set(cleanup_summary, '{audit_logs_deleted}', deleted_count::TEXT::JSONB);
    END IF;
    
    -- Cleanup old sync cursors for deleted users
    SELECT retention_days INTO retention_days
    FROM data_retention_settings 
    WHERE resource_type = 'sync_cursors' AND enabled = true;
    
    IF retention_days IS NOT NULL THEN
        DELETE FROM sync_cursors 
        WHERE updated_at < NOW() - (retention_days || ' days')::INTERVAL
        AND user_id NOT IN (SELECT id FROM auth.users);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        cleanup_summary := jsonb_set(cleanup_summary, '{orphaned_sync_cursors_deleted}', deleted_count::TEXT::JSONB);
    END IF;
    
    -- Process accounts marked for deletion (grace period expired)
    SELECT retention_days INTO grace_period
    FROM data_retention_settings 
    WHERE resource_type = 'deleted_accounts' AND enabled = true;
    
    IF grace_period IS NOT NULL THEN
        -- Get users whose deletion grace period has expired
        FOR deleted_count IN 
            SELECT user_id::TEXT
            FROM profiles 
            WHERE deletion_requested_at IS NOT NULL 
            AND deletion_requested_at < NOW() - (grace_period || ' days')::INTERVAL
        LOOP
            -- Permanently delete user data
            PERFORM permanently_delete_user_data(deleted_count::UUID);
        END LOOP;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        cleanup_summary := jsonb_set(cleanup_summary, '{accounts_permanently_deleted}', deleted_count::TEXT::JSONB);
    END IF;
    
    -- Identify and mark inactive accounts for deletion
    SELECT retention_days INTO retention_days
    FROM data_retention_settings 
    WHERE resource_type = 'inactive_accounts' AND enabled = true;
    
    IF retention_days IS NOT NULL THEN
        -- Mark inactive accounts for deletion (if not already marked)
        UPDATE profiles 
        SET deletion_requested_at = NOW()
        WHERE user_id IN (
            SELECT p.user_id 
            FROM profiles p
            WHERE p.deletion_requested_at IS NULL
            AND is_user_inactive(p.user_id)
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        cleanup_summary := jsonb_set(cleanup_summary, '{inactive_accounts_marked_for_deletion}', deleted_count::TEXT::JSONB);
    END IF;
    
    RETURN cleanup_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to export user data (GDPR right to data portability)
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_data JSONB := '{}';
    temp_data JSONB;
BEGIN
    -- Export profile data
    SELECT jsonb_agg(to_jsonb(p.*)) INTO temp_data
    FROM profiles p
    WHERE p.user_id = p_user_id;
    user_data := jsonb_set(user_data, '{profile}', COALESCE(temp_data, '[]'::JSONB));
    
    -- Export preferences
    SELECT jsonb_agg(to_jsonb(up.*)) INTO temp_data
    FROM user_preferences up
    WHERE up.owner_id = p_user_id AND up.deleted = false;
    user_data := jsonb_set(user_data, '{preferences}', COALESCE(temp_data, '[]'::JSONB));
    
    -- Export app settings
    SELECT jsonb_agg(to_jsonb(as.*)) INTO temp_data
    FROM app_settings as
    WHERE as.owner_id = p_user_id AND as.deleted = false;
    user_data := jsonb_set(user_data, '{app_settings}', COALESCE(temp_data, '[]'::JSONB));
    
    -- Export custom exercises
    SELECT jsonb_agg(to_jsonb(e.*)) INTO temp_data
    FROM exercises e
    WHERE e.owner_id = p_user_id AND e.deleted = false;
    user_data := jsonb_set(user_data, '{exercises}', COALESCE(temp_data, '[]'::JSONB));
    
    -- Export workouts
    SELECT jsonb_agg(to_jsonb(w.*)) INTO temp_data
    FROM workouts w
    WHERE w.owner_id = p_user_id AND w.deleted = false;
    user_data := jsonb_set(user_data, '{workouts}', COALESCE(temp_data, '[]'::JSONB));
    
    -- Export activity logs
    SELECT jsonb_agg(to_jsonb(al.*)) INTO temp_data
    FROM activity_logs al
    WHERE al.owner_id = p_user_id AND al.deleted = false;
    user_data := jsonb_set(user_data, '{activity_logs}', COALESCE(temp_data, '[]'::JSONB));
    
    -- Export workout sessions
    SELECT jsonb_agg(to_jsonb(ws.*)) INTO temp_data
    FROM workout_sessions ws
    WHERE ws.owner_id = p_user_id AND ws.deleted = false;
    user_data := jsonb_set(user_data, '{workout_sessions}', COALESCE(temp_data, '[]'::JSONB));
    
    -- Add export metadata
    user_data := jsonb_set(user_data, '{export_metadata}', jsonb_build_object(
        'exported_at', NOW(),
        'user_id', p_user_id,
        'export_version', '1.0'
    ));
    
    -- Log data export
    PERFORM log_audit_event(
        p_user_id,
        'DATA_EXPORT_REQUESTED',
        'user_data',
        p_user_id::TEXT,
        jsonb_build_object('exported_at', NOW()),
        NULL,
        NULL,
        true
    );
    
    RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;