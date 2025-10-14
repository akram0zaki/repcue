-- Migration: Create coaching_ai_cache table for AI Coach Phase 2
-- Created: 2025-10-13
-- Purpose: Store AI-generated coaching insights with 24-hour TTL caching

-- Create coaching_ai_cache table
CREATE TABLE IF NOT EXISTS public.coaching_ai_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insights_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT check_expires_after_created CHECK (expires_at > created_at)
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_coaching_ai_cache_user_id 
    ON public.coaching_ai_cache(user_id);

-- Create index on expires_at for automatic cleanup queries
CREATE INDEX IF NOT EXISTS idx_coaching_ai_cache_expires_at 
    ON public.coaching_ai_cache(expires_at);

-- Create composite index for cache lookups (user + not expired)
CREATE INDEX IF NOT EXISTS idx_coaching_ai_cache_user_expires 
    ON public.coaching_ai_cache(user_id, expires_at DESC);

-- Enable Row Level Security
ALTER TABLE public.coaching_ai_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own cached insights
CREATE POLICY "Users can read own cached insights"
    ON public.coaching_ai_cache
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service role can insert cache entries (edge function uses service role key)
CREATE POLICY "Service role can insert cache"
    ON public.coaching_ai_cache
    FOR INSERT
    WITH CHECK (true); -- Service role bypasses RLS anyway, but explicit for clarity

-- Policy: Users can delete their own cache (for manual cache clearing)
CREATE POLICY "Users can delete own cache"
    ON public.coaching_ai_cache
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.coaching_ai_cache IS 'Caches AI-generated coaching insights with 24-hour TTL. Used by analyze-progress edge function.';
COMMENT ON COLUMN public.coaching_ai_cache.insights_data IS 'JSONB containing ParsedInsights structure from AI analysis';
COMMENT ON COLUMN public.coaching_ai_cache.expires_at IS 'Cache expiration timestamp (24 hours from creation). Old entries should be cleaned up.';

-- Function to automatically clean up expired cache entries
-- Can be called manually or via scheduled job
CREATE OR REPLACE FUNCTION public.cleanup_expired_coaching_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.coaching_ai_cache
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_coaching_cache IS 'Deletes expired coaching insights from cache. Returns count of deleted rows. Should be run daily via scheduled job.';

-- Grant necessary permissions
GRANT SELECT, DELETE ON public.coaching_ai_cache TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_coaching_cache TO authenticated;
