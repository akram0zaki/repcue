-- Create app_versions table for PWA update system version management
-- This table stores version information and update policies for the RepCue PWA

CREATE TABLE IF NOT EXISTS app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_number TEXT NOT NULL UNIQUE,
    build_number TEXT NOT NULL,
    release_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewer TEXT NOT NULL,
    git_commit_hash TEXT,
    update_policy TEXT NOT NULL CHECK (update_policy IN ('force', 'critical', 'optional')),
    changelog JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_app_versions_active_release 
    ON app_versions (is_active, release_date DESC);

CREATE INDEX IF NOT EXISTS idx_app_versions_policy_active 
    ON app_versions (update_policy, is_active);

CREATE INDEX IF NOT EXISTS idx_app_versions_version_number 
    ON app_versions (version_number);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_app_versions_updated_at 
    BEFORE UPDATE ON app_versions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for read access to active versions
-- This allows the edge function to read active versions for update checks
CREATE POLICY "Allow read access to active versions" ON app_versions
    FOR SELECT 
    USING (is_active = true);

-- Create RLS policy for admin write access
-- This restricts write access to users in the admin_users table
CREATE POLICY "Allow admin write access" ON app_versions
    FOR ALL 
    USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid() 
            AND admin_users.is_active = true
            AND admin_users.permissions->>'version_management' = 'true'
        )
    );

-- Add comment to document the table purpose
COMMENT ON TABLE app_versions IS 'Stores version information and update policies for the RepCue PWA update system';
COMMENT ON COLUMN app_versions.version_number IS 'Semantic version number (e.g., 1.2.3)';
COMMENT ON COLUMN app_versions.build_number IS 'Build identifier for CI/CD tracking';
COMMENT ON COLUMN app_versions.update_policy IS 'Update enforcement policy: force (blocking), critical (urgent), optional (user choice)';
COMMENT ON COLUMN app_versions.changelog IS 'JSON object containing categorized changes (new_features, improvements, bug_fixes, security_updates)';
COMMENT ON COLUMN app_versions.metadata IS 'Additional metadata like download_size, compatibility_notes, rollback_version';