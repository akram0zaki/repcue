-- =========================================
-- Migration: Create user_catalog_access table
-- Date: 2025-10-05
-- Purpose: Implement granular catalog access control for premium features
-- =========================================

-- =========================================
-- STEP 1: CREATE TABLE
-- =========================================

CREATE TABLE user_catalog_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  catalog_id text NOT NULL,
  granted_at timestamp with time zone DEFAULT now(),
  granted_by text, -- Email of admin/backoffice user who granted access
  expires_at timestamp with time zone, -- NULL = never expires
  notes text, -- Optional notes (e.g., "Beta tester", "Promotional access", "Purchased")
  created_at timestamp with time zone DEFAULT now(),

  -- Unique constraint: one record per user per catalog
  CONSTRAINT user_catalog_access_unique UNIQUE (owner_id, catalog_id),

  -- Check constraint: catalog_id must be a valid premium catalog
  CONSTRAINT user_catalog_access_catalog_id_check
    CHECK (catalog_id IN ('women-health', 'tai-chi', 'zumba'))
);

-- Add comment to table
COMMENT ON TABLE user_catalog_access IS 'Tracks user access to premium exercise catalogs. general-fitness is always free and does not require records here.';

-- Add comments to columns
COMMENT ON COLUMN user_catalog_access.owner_id IS 'User UUID from auth.users';
COMMENT ON COLUMN user_catalog_access.catalog_id IS 'Premium catalog identifier (women-health, tai-chi, zumba). general-fitness not stored here as it is always free.';
COMMENT ON COLUMN user_catalog_access.granted_by IS 'Email of admin who granted access';
COMMENT ON COLUMN user_catalog_access.expires_at IS 'Expiration timestamp. NULL means never expires.';
COMMENT ON COLUMN user_catalog_access.notes IS 'Optional notes about the grant (e.g., purchase source, promotional reason)';

-- =========================================
-- STEP 2: CREATE INDEXES
-- =========================================

-- Index for fast user lookups
CREATE INDEX idx_user_catalog_access_owner_id
  ON user_catalog_access(owner_id);

-- Index for catalog queries
CREATE INDEX idx_user_catalog_access_catalog_id
  ON user_catalog_access(catalog_id);

-- Composite index for common access check queries
-- Note: Cannot use partial index with now() as it's not immutable
-- Query will filter expired records in WHERE clause instead
CREATE INDEX idx_user_catalog_access_owner_catalog
  ON user_catalog_access(owner_id, catalog_id);

-- =========================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- =========================================

-- Function: grant_catalog_access
-- Purpose: Grant catalog access to a user by email (for backoffice use)
CREATE OR REPLACE FUNCTION grant_catalog_access(
  user_email text,
  p_catalog_id text,
  granted_by_email text,
  p_expires_at timestamp with time zone DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Find user by email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email;

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', user_email;
  END IF;

  -- Validate catalog_id (only premium catalogs can be granted)
  IF p_catalog_id NOT IN ('women-health', 'tai-chi', 'zumba') THEN
    RAISE EXCEPTION 'Invalid catalog_id: %. Must be one of: women-health, tai-chi, zumba', p_catalog_id;
  END IF;

  -- Grant access (upsert: insert or update if exists)
  INSERT INTO user_catalog_access (owner_id, catalog_id, granted_by, expires_at, notes)
  VALUES (user_uuid, p_catalog_id, granted_by_email, p_expires_at, p_notes)
  ON CONFLICT (owner_id, catalog_id)
  DO UPDATE SET
    granted_by = EXCLUDED.granted_by,
    expires_at = EXCLUDED.expires_at,
    notes = EXCLUDED.notes,
    granted_at = now();

  RAISE NOTICE 'Granted % catalog access to % (UUID: %)', p_catalog_id, user_email, user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION grant_catalog_access IS 'Grant premium catalog access to a user by email. Used by backoffice for manual grants.';

-- Function: revoke_catalog_access
-- Purpose: Revoke catalog access from a user by email (for backoffice use)
CREATE OR REPLACE FUNCTION revoke_catalog_access(
  user_email text,
  p_catalog_id text
) RETURNS void AS $$
DECLARE
  user_uuid uuid;
  deleted_count int;
BEGIN
  -- Find user by email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email;

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', user_email;
  END IF;

  -- Revoke access (delete record)
  DELETE FROM user_catalog_access
  WHERE owner_id = user_uuid AND catalog_id = p_catalog_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count = 0 THEN
    RAISE NOTICE 'No access found for user % to catalog %', user_email, p_catalog_id;
  ELSE
    RAISE NOTICE 'Revoked % catalog access from % (UUID: %)', p_catalog_id, user_email, user_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_catalog_access IS 'Revoke premium catalog access from a user by email. Used by backoffice.';

-- =========================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE user_catalog_access ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own catalog access
CREATE POLICY "Users can view own catalog access"
  ON user_catalog_access
  FOR SELECT
  USING (auth.uid() = owner_id);

COMMENT ON POLICY "Users can view own catalog access" ON user_catalog_access IS 'Users can query their own catalog access for frontend display';

-- Note: Insert/Update/Delete policies not needed yet
-- Backoffice will use service role key to call helper functions
-- Future: Add admin role-based policies when admin system is implemented

-- =========================================
-- VERIFICATION QUERIES (for manual testing)
-- =========================================

-- Run these queries after migration to verify setup:
--
-- 1. Check table exists:
-- SELECT * FROM user_catalog_access LIMIT 0;
--
-- 2. Check indexes:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'user_catalog_access';
--
-- 3. Check functions:
-- SELECT proname, prosrc FROM pg_proc WHERE proname IN ('grant_catalog_access', 'revoke_catalog_access');
--
-- 4. Test grant function (replace with real email):
-- SELECT grant_catalog_access('test@example.com', 'women-health', 'admin', NULL, 'Test grant');
