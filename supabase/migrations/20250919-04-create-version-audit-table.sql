-- Create version_audit table for tracking changes to app_versions
-- This table maintains an audit trail of all changes made to version entries

CREATE TABLE IF NOT EXISTS version_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES app_versions(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE')),
    changed_by TEXT NOT NULL,
    changes JSONB DEFAULT '{}',
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_version_audit_version_id 
    ON version_audit (version_id);

CREATE INDEX IF NOT EXISTS idx_version_audit_created_at 
    ON version_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_version_audit_action 
    ON version_audit (action);

CREATE INDEX IF NOT EXISTS idx_version_audit_changed_by 
    ON version_audit (changed_by);

-- Enable Row Level Security
ALTER TABLE version_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin read access to audit logs
-- Allows users in admin_users table to read audit logs
CREATE POLICY "Allow admin read access to audit logs" ON version_audit
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid() 
            AND admin_users.is_active = true
            AND admin_users.permissions->>'audit_access' = 'true'
        )
    );

-- Create RLS policy for insert access (system-generated entries)
-- This allows the audit trigger to insert records
CREATE POLICY "Allow system insert access" ON version_audit
    FOR INSERT 
    WITH CHECK (true);

-- Create audit trigger function for app_versions table
CREATE OR REPLACE FUNCTION audit_app_versions_changes()
RETURNS TRIGGER AS $$
DECLARE
    changed_by_user TEXT;
BEGIN
    -- Get the user who made the change (fallback to 'system' if not available)
    changed_by_user := COALESCE(
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        'system'
    );

    -- Handle different trigger operations
    IF TG_OP = 'DELETE' THEN
        INSERT INTO version_audit (
            version_id,
            action,
            changed_by,
            old_values,
            changes
        ) VALUES (
            OLD.id,
            'DELETE',
            changed_by_user,
            to_jsonb(OLD),
            jsonb_build_object('deleted_at', NOW())
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if this is an activation/deactivation
        IF OLD.is_active != NEW.is_active THEN
            INSERT INTO version_audit (
                version_id,
                action,
                changed_by,
                old_values,
                new_values,
                changes
            ) VALUES (
                NEW.id,
                CASE WHEN NEW.is_active THEN 'ACTIVATE' ELSE 'DEACTIVATE' END,
                changed_by_user,
                to_jsonb(OLD),
                to_jsonb(NEW),
                jsonb_build_object(
                    'is_active_changed', true,
                    'from', OLD.is_active,
                    'to', NEW.is_active
                )
            );
        ELSE
            INSERT INTO version_audit (
                version_id,
                action,
                changed_by,
                old_values,
                new_values,
                changes
            ) VALUES (
                NEW.id,
                'UPDATE',
                changed_by_user,
                to_jsonb(OLD),
                to_jsonb(NEW),
                jsonb_build_object('updated_fields', 
                    (SELECT jsonb_object_agg(key, value) 
                     FROM jsonb_each(to_jsonb(NEW)) 
                     WHERE to_jsonb(OLD) ->> key IS DISTINCT FROM value)
                )
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO version_audit (
            version_id,
            action,
            changed_by,
            new_values,
            changes
        ) VALUES (
            NEW.id,
            'INSERT',
            changed_by_user,
            to_jsonb(NEW),
            jsonb_build_object('created_at', NOW())
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the audit trigger on app_versions table
CREATE TRIGGER app_versions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON app_versions
    FOR EACH ROW
    EXECUTE FUNCTION audit_app_versions_changes();

-- Add comments to document the audit system
COMMENT ON TABLE version_audit IS 'Audit trail for all changes made to app_versions table';
COMMENT ON COLUMN version_audit.action IS 'Type of change: INSERT, UPDATE, DELETE, ACTIVATE, DEACTIVATE';
COMMENT ON COLUMN version_audit.changed_by IS 'Email or identifier of user who made the change';
COMMENT ON COLUMN version_audit.changes IS 'Summary of what changed in this operation';
COMMENT ON COLUMN version_audit.old_values IS 'Complete record state before the change';
COMMENT ON COLUMN version_audit.new_values IS 'Complete record state after the change';
COMMENT ON FUNCTION audit_app_versions_changes() IS 'Trigger function to automatically log changes to app_versions table';