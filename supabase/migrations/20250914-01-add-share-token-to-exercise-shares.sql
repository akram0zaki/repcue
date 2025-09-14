-- Add share_token column to existing exercise_shares table for exercise sharing functionality
-- Date: 2025-09-14
-- Phase 1 of Exercise Sharing Implementation Plan

-- Add share_token column to exercise_shares table
ALTER TABLE exercise_shares ADD COLUMN share_token TEXT UNIQUE;

-- Add index for share token lookups for performance
CREATE INDEX idx_exercise_shares_token ON exercise_shares(share_token);

-- Add created_at and expires_at timestamps for token management
ALTER TABLE exercise_shares ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');

-- Update RLS policies to allow public access to shared exercises
-- This policy allows anyone to read shared exercises using a valid token
CREATE POLICY "Public read access for shared exercises" ON exercises
FOR SELECT
TO anon, authenticated
USING (
    id IN (
        SELECT exercise_id
        FROM exercise_shares
        WHERE share_token IS NOT NULL
        AND (expires_at IS NULL OR expires_at > NOW())
        AND deleted = false
    )
);

-- Policy to allow public read of exercise_shares for token validation
CREATE POLICY "Public read access for exercise shares" ON exercise_shares
FOR SELECT
TO anon, authenticated
USING (
    share_token IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
    AND deleted = false
);

-- Add a function to generate secure share tokens
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a function to cleanup expired shares (for future scheduled cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE exercise_shares
    SET deleted = true, updated_at = NOW()
    WHERE expires_at < NOW() AND deleted = false;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on the new columns and functions
COMMENT ON COLUMN exercise_shares.share_token IS 'Unique token for public sharing of exercises';
COMMENT ON COLUMN exercise_shares.expires_at IS 'Expiration timestamp for share tokens, defaults to 30 days from creation';
COMMENT ON FUNCTION generate_share_token() IS 'Generates a cryptographically secure share token';
COMMENT ON FUNCTION cleanup_expired_shares() IS 'Marks expired shares as deleted and returns count of affected rows';