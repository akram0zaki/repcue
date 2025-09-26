-- Create admin_users table for managing administrative access
-- This table defines which users have admin privileges for the PWA update system

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    permissions JSONB DEFAULT '{"version_management": true, "audit_access": true}',
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate admin entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_user_id 
    ON admin_users (user_id);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email 
    ON admin_users (email);

-- Create index for active admins
CREATE INDEX IF NOT EXISTS idx_admin_users_active 
    ON admin_users (is_active, created_at DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger for admin_users
CREATE TRIGGER update_admin_users_updated_at 
    BEFORE UPDATE ON admin_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin users to read admin list
CREATE POLICY "Allow admins to read admin list" ON admin_users
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() 
            AND au.is_active = true
        )
    );

-- Create RLS policy for admin users to manage other admins
CREATE POLICY "Allow admins to manage admin users" ON admin_users
    FOR ALL 
    USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() 
            AND au.is_active = true
            AND au.permissions->>'version_management' = 'true'
        )
    );

-- Add comments to document the admin system
COMMENT ON TABLE admin_users IS 'Defines which users have administrative privileges for the PWA update system';
COMMENT ON COLUMN admin_users.user_id IS 'Reference to auth.users.id for the admin user';
COMMENT ON COLUMN admin_users.email IS 'Email address of the admin user (for easy identification)';
COMMENT ON COLUMN admin_users.permissions IS 'JSON object defining specific admin permissions';
COMMENT ON COLUMN admin_users.granted_by IS 'User ID of who granted admin privileges';
COMMENT ON COLUMN admin_users.is_active IS 'Whether the admin privileges are currently active';

-- Insert initial admin user (replace with actual admin email)
-- This creates the first admin who can then add other admins
-- TODO: Replace 'admin@repcue.com' with the actual admin email
INSERT INTO admin_users (user_id, email, permissions, granted_by, granted_at)
SELECT 
    id,
    email,
    '{"version_management": true, "audit_access": true, "user_management": true}',
    id,
    NOW()
FROM auth.users 
WHERE email = 'akramz@gmail.com'
ON CONFLICT (user_id) DO NOTHING;