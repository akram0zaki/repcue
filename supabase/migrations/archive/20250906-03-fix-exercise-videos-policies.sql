-- =====================================================
-- Fix exercise_videos RLS policies in repcue-dev
-- Run this in Supabase SQL Editor for repcue-dev project
-- =====================================================

-- Clean up conflicting RLS policies on exercise_videos
DROP POLICY IF EXISTS "Users can manage their exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Users can manage their uploaded videos" ON exercise_videos;
DROP POLICY IF EXISTS "Users can view approved exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Users can view approved videos" ON exercise_videos;

-- Create proper RLS policies with both qual and with_check
CREATE POLICY "Users can upload videos" ON exercise_videos
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND uploader_id = auth.uid()
    );

CREATE POLICY "Users can view approved videos or their own" ON exercise_videos
    FOR SELECT USING (
        is_approved = true OR (auth.uid() IS NOT NULL AND uploader_id = auth.uid())
    );

CREATE POLICY "Users can update their own videos" ON exercise_videos
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND uploader_id = auth.uid()
    ) WITH CHECK (
        auth.uid() IS NOT NULL AND uploader_id = auth.uid()
    );

CREATE POLICY "Users can delete their own videos" ON exercise_videos
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND uploader_id = auth.uid()
    );

-- Verify the policies were created correctly
SELECT 
    policyname,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'HAS QUAL' ELSE 'NO QUAL' END as has_qual,
    CASE WHEN with_check IS NOT NULL THEN 'HAS WITH_CHECK' ELSE 'NO WITH_CHECK' END as has_with_check
FROM pg_policies 
WHERE tablename = 'exercise_videos'
ORDER BY cmd, policyname;