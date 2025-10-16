-- Clear AI Insights Cache
-- 
-- Purpose: Force regeneration of AI insights with latest Edge Function changes
-- Usage: Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/xwzrsfkzqxdybjrkkkvh/sql/new)
-- 
-- This will delete all cached AI insights, forcing the next request to:
-- 1. Call Mistral AI with fresh data
-- 2. Apply the latest sanitization logic (without apostrophe encoding)
-- 3. Cache the new, properly formatted insights
--

DELETE FROM coaching_ai_cache WHERE created_at < NOW();

-- Verify deletion
SELECT 
  COUNT(*) as remaining_cache_entries,
  COUNT(DISTINCT user_id) as affected_users
FROM coaching_ai_cache;

