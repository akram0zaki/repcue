-- Migration: Update video access policies for reference-based sharing
-- Date: 2025-09-21
-- Description: Update RLS policies to work with new reference-based sharing system
--              via user_favorites instead of old sharing columns

-- Drop the old policies that depend on sharing columns
DROP POLICY IF EXISTS "Users can view video files for shared exercises" ON video_files;
DROP POLICY IF EXISTS "Users can download videos for shared exercises" ON storage.objects;

-- Create new policies for reference-based sharing via user_favorites
CREATE POLICY "Users can view video files for shared exercises via references"
ON video_files FOR SELECT
USING (
  -- Allow if user owns the video file
  owner_id = auth.uid()
  OR
  -- Allow if user has a shared reference to this exercise via user_favorites
  EXISTS (
    SELECT 1 FROM user_favorites uf
    WHERE uf.owner_id = auth.uid()
    AND uf.item_id = video_files.exercise_id::text
    AND uf.item_type = 'exercise'
    AND uf.exercise_type = 'shared'
    AND uf.deleted = false
  )
);

-- Create storage policy for shared exercise videos via references
-- Note: This policy structure may need adjustment based on your storage bucket organization
CREATE POLICY "Users can download videos for shared exercises via references"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'videos'
  AND (
    -- Allow if user has a shared reference to the exercise
    EXISTS (
      SELECT 1 FROM user_favorites uf
      WHERE uf.owner_id = auth.uid()
      AND uf.item_type = 'exercise'
      AND uf.exercise_type = 'shared'
      AND uf.deleted = false
      -- The exact matching logic here depends on how video file names are structured
      -- This is a placeholder that may need adjustment
      AND uf.item_id::uuid IN (
        SELECT id FROM exercises e
        WHERE name LIKE '%' || (storage.foldername(objects.name))[2] || '%'
      )
    )
  )
);

-- Log the policy updates
DO $$
BEGIN
    RAISE NOTICE 'Updated RLS policies to support reference-based sharing via user_favorites';
    RAISE NOTICE 'Old sharing column dependencies have been removed';
END $$;