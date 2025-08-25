-- Create tables for WebAuthn/Passkey authentication
-- These tables support the Passkey authentication system

-- Table to store user authenticators (passkeys)
CREATE TABLE IF NOT EXISTS user_authenticators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credential_id TEXT NOT NULL UNIQUE, -- JSON array of credential ID bytes
    credential_public_key TEXT NOT NULL, -- JSON array of public key bytes
    counter BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    device_name TEXT, -- Optional friendly name
    CONSTRAINT unique_user_credential UNIQUE (user_id, credential_id)
);

-- Table to store WebAuthn challenges temporarily
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Can be null for discoverable credentials
    challenge TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on WebAuthn tables
ALTER TABLE user_authenticators ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_authenticators
CREATE POLICY "Users can view their own authenticators" ON user_authenticators
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own authenticators" ON user_authenticators
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own authenticators" ON user_authenticators
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own authenticators" ON user_authenticators
    FOR DELETE USING (user_id = auth.uid());

-- Service role can manage all authenticators (for Edge Functions)
CREATE POLICY "Service role can manage authenticators" ON user_authenticators
    FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for webauthn_challenges (only service role access)
CREATE POLICY "Service role can manage challenges" ON webauthn_challenges
    FOR ALL USING (auth.role() = 'service_role');

-- Indexes for performance
CREATE INDEX idx_user_authenticators_user_id ON user_authenticators(user_id);
CREATE INDEX idx_user_authenticators_credential_id ON user_authenticators(credential_id);
CREATE INDEX idx_webauthn_challenges_user_type ON webauthn_challenges(user_id, type);
CREATE INDEX idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

-- Function to clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_webauthn_challenges()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webauthn_challenges 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get authenticator count for a user
CREATE OR REPLACE FUNCTION get_user_authenticator_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    auth_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count
    FROM user_authenticators
    WHERE user_id = p_user_id;
    
    RETURN auth_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has passkeys
CREATE OR REPLACE FUNCTION user_has_passkeys(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_authenticator_count(p_user_id) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;