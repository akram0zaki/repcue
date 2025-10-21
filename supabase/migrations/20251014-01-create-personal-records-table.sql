-- Migration: Create personal_records table for offline-first sync
-- Date: 2025-10-14
-- Purpose: Enable cross-device sync for personal records tracking
-- Part of: Module 2.7.5 - Personal Records & Milestones

-- Create personal_records table with sync metadata
CREATE TABLE IF NOT EXISTS personal_records (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Exercise reference
  exercise_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  
  -- Record details
  record_type TEXT NOT NULL CHECK (record_type IN ('max-reps', 'max-sets', 'max-duration', 'max-weight')),
  value NUMERIC NOT NULL CHECK (value > 0),
  achieved_at TIMESTAMPTZ NOT NULL,
  
  -- Optional references and metadata
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  previous_record NUMERIC CHECK (previous_record IS NULL OR previous_record > 0),
  improvement_percentage INTEGER CHECK (improvement_percentage IS NULL OR improvement_percentage >= 0),
  
  -- Sync metadata (REQUIRED for offline-first architecture)
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  deleted BOOLEAN NOT NULL DEFAULT false
);

-- Performance indexes for sync queries
-- Primary sync index: enables efficient owner-based queries with temporal ordering
CREATE INDEX idx_personal_records_owner_updated_id 
  ON personal_records(owner_id, updated_at DESC, id)
  WHERE deleted = false;

-- Exercise lookup index: fast filtering by exercise for PR history
CREATE INDEX idx_personal_records_exercise 
  ON personal_records(exercise_id, owner_id)
  WHERE deleted = false;

-- Record type index: enables filtering by type (max-reps, max-sets, etc.)
CREATE INDEX idx_personal_records_type
  ON personal_records(record_type, owner_id)
  WHERE deleted = false;

-- Composite index for finding latest records per exercise
CREATE INDEX idx_personal_records_exercise_achieved
  ON personal_records(exercise_id, achieved_at DESC)
  WHERE deleted = false;

-- Row Level Security (RLS) Policies
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own personal records
CREATE POLICY "Users can view own personal records"
  ON personal_records FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can insert their own personal records
CREATE POLICY "Users can insert own personal records"
  ON personal_records FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own personal records
CREATE POLICY "Users can update own personal records"
  ON personal_records FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete their own personal records (soft delete)
CREATE POLICY "Users can delete own personal records"
  ON personal_records FOR DELETE
  USING (auth.uid() = owner_id);

-- Trigger: Auto-update updated_at timestamp on record modification
CREATE OR REPLACE FUNCTION update_personal_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_personal_records_updated_at
  BEFORE UPDATE ON personal_records
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_records_updated_at();

-- Comments for documentation
COMMENT ON TABLE personal_records IS 'Stores user personal records for exercises with offline-first sync support';
COMMENT ON COLUMN personal_records.record_type IS 'Type of record: max-reps, max-sets, max-duration, or max-weight';
COMMENT ON COLUMN personal_records.value IS 'Record value: number of reps, sets, seconds, or kilograms';
COMMENT ON COLUMN personal_records.achieved_at IS 'Timestamp when the personal record was achieved';
COMMENT ON COLUMN personal_records.previous_record IS 'Previous best value before this PR was set';
COMMENT ON COLUMN personal_records.improvement_percentage IS 'Percentage improvement over previous record';
COMMENT ON COLUMN personal_records.version IS 'Version number for conflict resolution during sync';
COMMENT ON COLUMN personal_records.deleted IS 'Soft delete flag for tombstone pattern in sync';
