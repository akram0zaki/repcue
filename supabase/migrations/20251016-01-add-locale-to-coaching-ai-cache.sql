-- Migration: Add locale column to coaching_ai_cache table
-- Created: 2025-10-16
-- Purpose: Support locale-specific AI insights caching to ensure users get responses in their preferred language

-- Add locale column (nullable to support existing rows)
ALTER TABLE public.coaching_ai_cache
ADD COLUMN IF NOT EXISTS locale TEXT;

-- Update index to include locale for efficient lookups
-- Drop old composite index
DROP INDEX IF EXISTS public.idx_coaching_ai_cache_user_expires;

-- Create new composite index with locale
CREATE INDEX IF NOT EXISTS idx_coaching_ai_cache_user_locale_expires 
    ON public.coaching_ai_cache(user_id, locale, expires_at DESC);

-- Add comment
COMMENT ON COLUMN public.coaching_ai_cache.locale IS 'User preferred language (e.g., en, ar, fr). Used to ensure cached insights match user language preference.';

-- Clear existing cache to force regeneration with locale
-- This ensures all cached entries have a locale value
DELETE FROM public.coaching_ai_cache;
