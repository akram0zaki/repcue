-- Fix audit_app_versions_changes() trigger function
-- Issue: Type mismatch when comparing text (->> operator) with jsonb value
-- Solution: Use -> operator instead of ->> to keep jsonb type consistency

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
            -- FIX: Changed from ->> (text) to -> (jsonb) for proper type comparison
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
                     WHERE to_jsonb(OLD) -> key IS DISTINCT FROM value)
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
