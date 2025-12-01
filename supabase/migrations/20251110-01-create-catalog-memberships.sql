-- Migration: Add catalog_memberships table for many-to-many exercise-catalog relationships
-- Date: 2025-11-10
-- Phase: Global Exercise Repository - Phase 4
-- Purpose: Enable exercises to belong to multiple catalogs with catalog-specific metadata

-- Step 1: Create catalog_memberships table
CREATE TABLE IF NOT EXISTS catalog_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL,
  catalog_id text NOT NULL,
  
  -- Catalog-specific metadata
  catalog_tags text[] DEFAULT '{}'::text[],
  display_order integer,
  featured boolean DEFAULT false,
  custom_name_key text,
  custom_description_key text,
  
  -- Sync metadata (matching other tables)
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  version integer DEFAULT 1,
  deleted boolean DEFAULT false,
  
  -- Primary key
  CONSTRAINT catalog_memberships_pkey PRIMARY KEY (id),
  
  -- Foreign keys
  CONSTRAINT catalog_memberships_exercise_id_fkey 
    FOREIGN KEY (exercise_id) 
    REFERENCES exercises(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: one membership per exercise-catalog pair
  CONSTRAINT catalog_memberships_exercise_catalog_unique 
    UNIQUE (exercise_id, catalog_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS catalog_memberships_exercise_id_idx 
  ON catalog_memberships(exercise_id);

CREATE INDEX IF NOT EXISTS catalog_memberships_catalog_id_idx 
  ON catalog_memberships(catalog_id);

CREATE INDEX IF NOT EXISTS catalog_memberships_owner_id_idx 
  ON catalog_memberships(owner_id);

CREATE INDEX IF NOT EXISTS catalog_memberships_updated_at_idx 
  ON catalog_memberships(updated_at);

-- Compound index for common queries
CREATE INDEX IF NOT EXISTS catalog_memberships_exercise_catalog_idx 
  ON catalog_memberships(exercise_id, catalog_id);

-- Step 3: Enable Row Level Security
ALTER TABLE catalog_memberships ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies

-- Policy: Users can view their own memberships
CREATE POLICY "Users can view own memberships" 
  ON catalog_memberships 
  FOR SELECT 
  USING (owner_id = auth.uid());

-- Policy: Users can view memberships for public exercises
CREATE POLICY "Users can view public exercise memberships" 
  ON catalog_memberships 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM exercises 
      WHERE exercises.id = catalog_memberships.exercise_id 
      AND exercises.is_public = true
    )
  );

-- Policy: Users can view memberships for built-in exercises (no owner)
CREATE POLICY "Users can view built-in exercise memberships" 
  ON catalog_memberships 
  FOR SELECT 
  USING (owner_id IS NULL);

-- Policy: Users can insert their own memberships
CREATE POLICY "Users can insert own memberships" 
  ON catalog_memberships 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

-- Policy: Users can update their own memberships
CREATE POLICY "Users can update own memberships" 
  ON catalog_memberships 
  FOR UPDATE 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy: Users can delete their own memberships
CREATE POLICY "Users can delete own memberships" 
  ON catalog_memberships 
  FOR DELETE 
  USING (owner_id = auth.uid());

-- Step 5: Add audit trigger for catalog_memberships (if function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'log_table_change'
  ) THEN
    CREATE TRIGGER catalog_memberships_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON catalog_memberships
      FOR EACH ROW EXECUTE FUNCTION log_table_change();
  END IF;
END $$;

-- Step 6: Create migration script for existing exercises
-- This converts existing exercises.catalog_id to catalog_memberships records
-- Only for built-in exercises (owner_id IS NULL)
DO $$
BEGIN
  -- Insert memberships for built-in exercises that have a catalog_id
  INSERT INTO catalog_memberships (
    id,
    exercise_id,
    catalog_id,
    catalog_tags,
    display_order,
    featured,
    owner_id,
    created_at,
    updated_at,
    version,
    deleted
  )
  SELECT
    gen_random_uuid(),
    e.id,
    e.catalog_id,
    COALESCE(
      ARRAY(
        SELECT tag 
        FROM unnest(e.tags) AS tag 
        WHERE tag LIKE '%:%'
      ),
      '{}'::text[]
    ) AS catalog_tags,
    NULL AS display_order,
    false AS featured,
    e.owner_id,
    e.created_at,
    e.updated_at,
    1 AS version,
    false AS deleted
  FROM exercises e
  WHERE e.catalog_id IS NOT NULL
  ON CONFLICT (exercise_id, catalog_id) DO NOTHING;
  
  RAISE NOTICE 'Migrated % existing exercise memberships', 
    (SELECT COUNT(*) FROM catalog_memberships);
END $$;

-- Step 7: Add comment for documentation
COMMENT ON TABLE catalog_memberships IS 
  'Many-to-many relationship between exercises and catalogs. Enables exercises to belong to multiple catalogs with catalog-specific metadata like tags, display order, and featured status.';

COMMENT ON COLUMN catalog_memberships.catalog_tags IS 
  'Catalog-specific badge tags (e.g., "category:core", "kyu:6", "equipment:bodyweight"). These tags are specific to the catalog''s badge filtering system.';

COMMENT ON COLUMN catalog_memberships.display_order IS 
  'Sort order within the catalog. Lower values appear first. NULL means use default alphabetical order.';

COMMENT ON COLUMN catalog_memberships.featured IS 
  'Whether this exercise is featured/highlighted in this specific catalog.';
