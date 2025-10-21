# Supabase Changes Tracker - AI Coach Phase 2
**Date**: 2025-10-13
**Feature**: RepCue AI Coach Phase 2 - AI-Enhanced Recommendations

## Overview
Phase 2 of the AI Coach feature adds AI-powered progress analysis using Mistral AI via a new Supabase Edge Function. This document tracks all Supabase-related changes.

---

## Database Migrations

### Migration 1: Create coaching_ai_cache table
**File**: `20251013-01-create-coaching-ai-cache.sql`
**Status**: ✅ Created (not yet applied)
**Purpose**: Store AI-generated coaching insights with 24-hour TTL caching

**Changes**:
1. **Table**: `public.coaching_ai_cache`
   - `id` (UUID, primary key)
   - `user_id` (UUID, foreign key to auth.users)
   - `insights_data` (JSONB) - Stores ParsedInsights structure
   - `created_at` (TIMESTAMPTZ)
   - `expires_at` (TIMESTAMPTZ) - Cache expiration (24 hours)
   - Check constraint: expires_at > created_at

2. **Indexes**:
   - `idx_coaching_ai_cache_user_id` - Fast user lookups
   - `idx_coaching_ai_cache_expires_at` - Cleanup queries
   - `idx_coaching_ai_cache_user_expires` - Composite for cache validation

3. **RLS Policies**:
   - SELECT: Users can read only their own cached insights
   - INSERT: Service role can insert (used by edge function)
   - DELETE: Users can delete their own cache

4. **Function**: `cleanup_expired_coaching_cache()`
   - Deletes expired cache entries
   - Returns count of deleted rows
   - Should be run daily via scheduled job

**To Apply**:
```bash
# Development environment
npx supabase migration up --db-url "postgresql://postgres:[SUPABASE_DB_PASSWORD]@db.xwzrsfkzqxdybjrkkkvh.supabase.co:5432/postgres"

# Production environment
npx supabase migration up --db-url "postgresql://postgres:[SUPABASE_DB_PASSWORD]@db.zumzzuvfsuzvvymhpymk.supabase.co:5432/postgres"
```

**Rollback** (if needed):
```sql
-- Drop in reverse order
DROP FUNCTION IF EXISTS public.cleanup_expired_coaching_cache();
DROP TABLE IF EXISTS public.coaching_ai_cache CASCADE;
```

---

## Edge Functions

### Function 1: analyze-progress
**Directory**: `supabase/functions/analyze-progress/`
**Status**: ✅ Created (not yet deployed)
**Purpose**: Generate AI-powered coaching insights from user workout analytics

**Files Created**:
1. **index.ts** - Main edge function handler
   - JWT authentication
   - Rate limiting (10 requests/hour per user)
   - Cache checking (24-hour TTL)
   - Mistral AI integration
   - Response caching

2. **prompt-builder.ts** - AI prompt construction
   - Builds system prompt with coach persona
   - Formats user analytics data
   - Supports 8 languages (i18n)
   - Includes muscle group balance, streaks, trends

3. **insight-parser.ts** - AI response validation
   - Parses JSON from AI response
   - Schema validation (3-5 insights)
   - XSS sanitization
   - Error handling and recovery

4. **logger.ts** - Structured logging
   - Correlation ID tracking
   - JSON-formatted logs
   - Debug mode support

**Environment Variables Required**:
- `MISTRAL_API_KEY` - Mistral AI API key (already configured)
- `SUPABASE_URL` - Supabase project URL (already configured)
- `SUPABASE_ANON_KEY` - Supabase anon key (already configured)
- `SUPABASE_SERVICE_ROLE_KEY` - For cache operations (already configured)

**API Endpoint**:
```
POST /functions/v1/analyze-progress
Authorization: Bearer <JWT>

Request Body:
{
  "totalWorkouts": 42,
  "totalDuration": 75600,
  "totalExercises": 15,
  "totalReps": 1260,
  "averageWorkoutDuration": 1800,
  "workoutsPerWeek": 4.2,
  "mostActiveDay": "Monday",
  "mostActiveCategory": "general-fitness",
  "currentStreak": 5,
  "longestStreak": 12,
  "isActiveToday": true,
  "muscleGroupBalance": [...],
  "weekOverWeekChange": {...},
  "locale": "en",
  "userId": "..." // Added by function from JWT
}

Response:
{
  "insights": [
    {
      "type": "streak" | "balance" | "progress" | "suggestion" | "celebration" | "recovery",
      "title": "...",
      "message": "...",
      "priority": "high" | "medium" | "low",
      "actionable": true | false,
      "actionText": "...",
      "data": {...}
    }
  ],
  "overallTrend": "improving" | "maintaining" | "declining",
  "keyStrength": "...",
  "primaryRecommendation": "...",
  "metadata": {
    "correlationId": "...",
    "generatedAt": "...",
    "processingTimeMs": 1234,
    "cached": false
  }
}
```

**Rate Limits**:
- 10 requests per hour per user
- 24-hour cache TTL (subsequent requests return cached data)

**Deployment Commands**:
```bash
# Deploy to development
npx supabase functions deploy analyze-progress --project-ref xwzrsfkzqxdybjrkkkvh

# Deploy to production
npx supabase functions deploy analyze-progress --project-ref zumzzuvfsuzvvymhpymk
```

**Testing**:
```bash
# Test locally
npx supabase functions serve analyze-progress

# Test with curl
curl -X POST 'http://localhost:54321/functions/v1/analyze-progress' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"totalWorkouts": 10, "currentStreak": 3, ...}'
```

---

## Security Considerations

1. **Authentication**: All requests require valid JWT token
2. **Rate Limiting**: 10 requests/hour per user prevents API abuse
3. **Input Sanitization**: All AI-generated content is sanitized to prevent XSS
4. **RLS Policies**: Users can only access their own cached insights
5. **Service Role Key**: Only edge function can write to cache (uses service role key)
6. **Data Privacy**: Analytics data sent to Mistral AI is aggregated (no raw workout data)

---

## Monitoring & Maintenance

### Cache Cleanup
Run daily to remove expired entries:
```sql
SELECT public.cleanup_expired_coaching_cache();
```

**Recommended**: Set up Supabase scheduled job (pg_cron):
```sql
-- Run cleanup daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-coaching-cache',
  '0 3 * * *',
  'SELECT public.cleanup_expired_coaching_cache();'
);
```

### Monitoring Queries

**Check cache hit rate**:
```sql
SELECT 
  COUNT(*) as total_cache_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries
FROM public.coaching_ai_cache;
```

**Check user cache status**:
```sql
SELECT 
  user_id,
  created_at,
  expires_at,
  (expires_at > NOW()) as is_valid
FROM public.coaching_ai_cache
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

**Edge function logs** (via Supabase Dashboard):
- Go to Edge Functions → analyze-progress → Logs
- Filter by correlation ID for request tracing
- Monitor error rates and response times

---

## Rollback Plan

### If migration needs to be rolled back:
```sql
-- 1. Drop function first
DROP FUNCTION IF EXISTS public.cleanup_expired_coaching_cache();

-- 2. Drop table (cascades to indexes and policies)
DROP TABLE IF EXISTS public.coaching_ai_cache CASCADE;
```

### If edge function needs to be rolled back:
1. Delete function from Supabase Dashboard
2. Or redeploy previous version

---

## Next Steps

1. ✅ Migration created - **COMPLETE**
2. ✅ Edge function code complete - **COMPLETE**
3. ✅ Apply migration to dev environment - **COMPLETE** (2025-10-14)
   - Applied manually via Supabase Dashboard SQL Editor
   - Table `coaching_ai_cache` created with RLS policies
   - Function `cleanup_expired_coaching_cache()` created
4. ✅ Deploy edge function to dev environment - **COMPLETE** (2025-10-14)
   - Deployed via: `npx supabase functions deploy analyze-progress --project-ref xwzrsfkzqxdybjrkkkvh`
   - Dashboard: https://supabase.com/dashboard/project/xwzrsfkzqxdybjrkkkvh/functions
5. ⏳ Test with sample data - **READY** (dev environment fully configured)
6. ⏳ Apply migration to prod environment - **PENDING** (after dev testing)
7. ⏳ Deploy edge function to prod environment - **PENDING** (after dev testing)
8. ⏳ Set up cache cleanup scheduled job - **PENDING**

---

## Related Files

**Frontend Integration** (Module 2.2 - next phase):
- `apps/frontend/src/services/insightsService.ts` - API client
- `apps/frontend/src/services/coachingService.ts` - Integration with existing service
- `apps/frontend/src/pages/CoachPage.tsx` - UI for AI insights
- `apps/frontend/src/components/coaching/CoachingCard.tsx` - Display component

**Documentation**:
- PRD: `docs/implementation-plans/repcue-ai-coach/ai-coach-prd.md`
- Implementation Plan: `docs/implementation-plans/repcue-ai-coach/ai-coach-implementation-plan.md`

---

**Last Updated**: 2025-10-14
**Status**: Module 2.1 Complete - ✅ Fully Deployed to Dev with AI Usage Logging
**Dev Edge Function**: https://supabase.com/dashboard/project/xwzrsfkzqxdybjrkkkvh/functions/analyze-progress
**Dev Database**: `coaching_ai_cache` table created with RLS policies
**AI Usage Tracking**: ✅ Integrated - Logs to `ai_usage_logs` table via shared utility
**Next Action**: Test edge function with sample data, then proceed to Module 2.2 - Frontend AI Integration

---

## Recent Updates (2025-10-14)

### AI Usage Logging Integration - COMPLETE ✅
- ✅ Created shared `_shared/usage-logger.ts` for reuse across all AI edge functions
- ✅ Updated `analyze-progress` to log AI usage to `ai_usage_logs` table
  - Tracks: token usage, costs, processing time, success/failure
  - Request type: `coaching_insights` (distinguishes from `workout_generation`)
  - Redeployed to dev with usage logging enabled
- ✅ Updated `generate-ai-workout` to use shared usage logger
  - Migrated from local `./usage-logger.ts` to `../_shared/usage-logger.ts`
  - Added `requestType: 'workout_generation'` parameter
  - Logs both successful and failed AI generation attempts
  - Redeployed to dev with unified logging

**Files Modified**:
- `supabase/functions/_shared/usage-logger.ts` - NEW shared utility
  - Enhanced signature with `requestType` parameter
  - Accepts logger functions to avoid circular dependencies
  - Supports Mistral, Anthropic, OpenAI pricing tables
- `supabase/functions/analyze-progress/index.ts` - MODIFIED
  - Added import: `logAIUsage`, `extractMistralUsage`
  - Modified `generateAIInsights()` to accept `userId` parameter
  - Added usage logging for success, HTTP errors, and invalid responses
- `supabase/functions/generate-ai-workout/workout-generator.ts` - MODIFIED
  - Updated import from local to shared usage logger
  - Added missing parameters to both `logAIUsage()` calls
  - Success case (line 319): Added `requestType`, logger functions
  - Failure case (line 345): Added `requestType`, logger functions

**Deployment Status**:
- analyze-progress: ✅ Deployed to dev (xwzrsfkzqxdybjrkkkvh)
- generate-ai-workout: ✅ Deployed to dev (xwzrsfkzqxdybjrkkkvh)
- Both functions now log to `ai_usage_logs` table for cost tracking

**Dashboard Links**:
- analyze-progress: https://supabase.com/dashboard/project/xwzrsfkzqxdybjrkkkvh/functions/analyze-progress
- generate-ai-workout: https://supabase.com/dashboard/project/xwzrsfkzqxdybjrkkkvh/functions/generate-ai-workout
- `supabase/functions/_shared/usage-logger.ts` (new shared utility)
- `supabase/functions/analyze-progress/index.ts` (added usage logging)

**Benefits**:
- Unified AI cost tracking across all functions
- Mistral pricing: $0.20/$0.60 per 1M tokens (input/output)
- Enables cost monitoring and budget alerts
- Data available in `ai_usage_logs` table and dashboard views
