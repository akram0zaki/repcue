-- Fix exercise-videos storage policies for VideoUploadService
-- Migration: 20251201_fix_exercise_videos_storage_policies.sql
-- 
-- Problem: The existing INSERT policy doesn't validate that users upload to their own folder.
-- The path format is: userId/exerciseId/fileName.mp4
-- Position [1] is userId (first folder), position [2] is exerciseId (second folder)
--
-- The old INSERT policy was:
--   (bucket_id = 'exercise-videos') AND (auth.role() = 'authenticated')
-- This allows any authenticated user to upload anywhere in the bucket.
--
-- The old UPDATE policy checked position [2] (exerciseId) instead of [1] (userId):
--   (auth.uid())::text = (storage.foldername(name))[2]
-- This is incorrect - should check position [1] for user ownership.
--
-- For upsert to work, we need SELECT + UPDATE permissions in addition to INSERT.

-- First, drop the incorrect policies
DROP POLICY IF EXISTS "Users can upload exercise videos n3qp65_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their own videos n3qp65_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their own videos n3qp65_1" ON storage.objects;

-- Create correct INSERT policy - users can only upload to their own folder
-- Path: {userId}/{exerciseId}/{fileName}
CREATE POLICY "Users can upload to own exercise-videos folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise-videos' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Create correct UPDATE policy for upsert support - users can only update their own files
CREATE POLICY "Users can update own exercise-videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exercise-videos' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Create correct DELETE policy - users can only delete their own files  
CREATE POLICY "Users can delete own exercise-videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercise-videos' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Note: SELECT policy "Anyone can view exercise videos n3qp65_0" already exists and is correct
-- (bucket_id = 'exercise-videos') - allows public read since bucket is public
