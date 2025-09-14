-- Create missing authentication tables for WebAuthn passkeys

-- User authenticators table for storing WebAuthn credentials
CREATE TABLE IF NOT EXISTS user_authenticators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    credential_public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    device_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WebAuthn challenges table for storing temporary challenges
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('registration', 'authentication')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs table for security tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE user_authenticators ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_authenticators
CREATE POLICY "Users can access their own authenticators" ON user_authenticators
    FOR ALL USING (user_id = auth.uid());

-- RLS policies for webauthn_challenges  
CREATE POLICY "Users can access their own challenges" ON webauthn_challenges
    FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);

-- RLS policies for audit_logs
CREATE POLICY "Users can access their own audit logs" ON audit_logs
    FOR ALL USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_user_authenticators_user ON user_authenticators(user_id);
CREATE INDEX idx_user_authenticators_credential ON user_authenticators(credential_id);
CREATE INDEX idx_webauthn_challenges_user ON webauthn_challenges(user_id);
CREATE INDEX idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);