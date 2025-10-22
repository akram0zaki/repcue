-- Migration: Create legal_acceptances table
-- Date: 2025-10-21
-- Purpose: Store user acceptance records for legal documents (Terms, Privacy, etc.)
-- Feature: Legal Acceptance V3
-- Related: docs/implementation-plans/legal-acceptance/

-- =====================================================
-- Table: legal_acceptances
-- =====================================================
-- Stores user acceptance of versioned legal documents
-- Syncs across devices for authenticated users
-- Uses composite primary key (user_id, doc_id)

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  -- User who accepted the document
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Document identifier (e.g., 'terms_conditions', 'privacy_policy')
  doc_id text NOT NULL,
  
  -- Semantic version of the accepted document (e.g., '1.0.0')
  accepted_version text NOT NULL,
  
  -- SHA-256 base64 hash of the document content for change detection
  content_hash text NOT NULL,
  
  -- Locale the user viewed when accepting (audit trail)
  locale text NOT NULL,
  
  -- Timestamp of acceptance (for conflict resolution)
  accepted_at timestamptz NOT NULL DEFAULT now(),
  
  -- Composite primary key
  PRIMARY KEY (user_id, doc_id)
);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
-- Enable RLS to ensure users can only access their own acceptances
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own acceptances
CREATE POLICY "Users can view own acceptances"
  ON public.legal_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own acceptances
CREATE POLICY "Users can insert own acceptances"
  ON public.legal_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own acceptances
CREATE POLICY "Users can update own acceptances"
  ON public.legal_acceptances
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own acceptances
CREATE POLICY "Users can delete own acceptances"
  ON public.legal_acceptances
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Indexes for Performance
-- =====================================================
-- Index on user_id for efficient user-specific queries
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_id 
  ON public.legal_acceptances(user_id);

-- Index on doc_id for efficient document-specific queries
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_doc_id 
  ON public.legal_acceptances(doc_id);

-- Index on accepted_at for conflict resolution (last-write-wins)
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_accepted_at 
  ON public.legal_acceptances(accepted_at DESC);

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON TABLE public.legal_acceptances IS 
  'Stores user acceptance records for versioned legal documents. Syncs across devices for authenticated users.';

COMMENT ON COLUMN public.legal_acceptances.user_id IS 
  'User who accepted the document (references auth.users)';

COMMENT ON COLUMN public.legal_acceptances.doc_id IS 
  'Document identifier (e.g., terms_conditions, privacy_policy)';

COMMENT ON COLUMN public.legal_acceptances.accepted_version IS 
  'Semantic version of the accepted document (e.g., 1.0.0)';

COMMENT ON COLUMN public.legal_acceptances.content_hash IS 
  'SHA-256 base64 hash of document content for change detection';

COMMENT ON COLUMN public.legal_acceptances.locale IS 
  'Locale the user viewed when accepting (for audit trail)';

COMMENT ON COLUMN public.legal_acceptances.accepted_at IS 
  'Timestamp of acceptance (for conflict resolution via last-write-wins)';

-- =====================================================
-- Grant Permissions
-- =====================================================
-- Grant usage on schema (if needed)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.legal_acceptances TO authenticated;

-- =====================================================
-- Verification Queries (for testing)
-- =====================================================
-- Uncomment below to test after migration

-- -- Verify table structure
-- \d public.legal_acceptances

-- -- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'legal_acceptances';

-- -- Verify policies exist
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE tablename = 'legal_acceptances';

-- -- Verify indexes
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'legal_acceptances';
