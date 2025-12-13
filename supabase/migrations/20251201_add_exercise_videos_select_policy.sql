-- Migration: Add SELECT policies for exercise-videos storage bucket
-- Date: 2025-12-01
-- Purpose: Fix video upload failures by adding missing SELECT policies
-- 
-- The INSERT/UPDATE/DELETE policies exist but SELECT was missing.
-- This is needed for:
-- 1. Authenticated users to read their own files
-- 2. Upsert operations to check if file exists
-- 3. Public access to read videos (for shared exercises)

-- Add SELECT policy for authenticated users to read their own videos
CREATE POLICY "Users can read own exercise-videos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exercise-videos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Add public read policy since the bucket is public
-- This allows anyone to read videos (for shared exercises)
CREATE POLICY "Public can read exercise-videos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'exercise-videos');
