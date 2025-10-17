# Supabase Changes - January 16, 2025

## Overview
Added locale support for AI coaching insights caching system to ensure users receive insights in their preferred language.

## Problem
AI insights were being returned in English even when users were in Arabic locale due to cache system not considering user's language preference.

## Root Cause
Two-level caching system (client-side and server-side) was keyed only by user ID and timestamp, ignoring locale:
1. **Client cache**: In-memory cache in `InsightsService` validated only by expiration time
2. **Server cache**: PostgreSQL table `coaching_ai_cache` queried only by `user_id` and `expires_at`

## Solution

### 1. Database Migration
**File**: `supabase/migrations/20251016-01-add-locale-to-coaching-ai-cache.sql`

**Changes**:
- Added `locale TEXT` column to `coaching_ai_cache` table
- Dropped old index: `idx_coaching_ai_cache_user_expires`
- Created new composite index: `idx_coaching_ai_cache_user_locale_expires (user_id, locale, expires_at DESC)`
- Cleared existing cache to force regeneration with locale

**SQL**:
```sql
ALTER TABLE public.coaching_ai_cache ADD COLUMN IF NOT EXISTS locale TEXT;
DROP INDEX IF EXISTS public.idx_coaching_ai_cache_user_expires;
CREATE INDEX idx_coaching_ai_cache_user_locale_expires ON public.coaching_ai_cache(user_id, locale, expires_at DESC);
DELETE FROM public.coaching_ai_cache;
```

### 2. Edge Function Updates
**File**: `supabase/functions/analyze-progress/index.ts`

**Changes**:

#### A. Updated `getCachedInsights()` function
- **Before**: `getCachedInsights(userId: string, correlationId: string)`
- **After**: `getCachedInsights(userId: string, locale: string, correlationId: string)`
- Added `.eq('locale', locale)` to database query
- Updated logging to include locale

#### B. Updated `cacheInsights()` function
- **Before**: `cacheInsights(userId: string, insights: ParsedInsights, correlationId: string)`
- **After**: `cacheInsights(userId: string, locale: string, insights: ParsedInsights, correlationId: string)`
- Added `locale: locale` to INSERT statement
- Updated logging to include locale

#### C. Reorganized request handler flow
- **Before**: Check cache → Parse request body → Extract locale
- **After**: Parse request body → Extract locale → Check cache with locale
- **Reason**: Need locale value before checking cache

**Code flow**:
```typescript
// Parse request body and extract locale
const requestBody = await req.json();
const analyticsPayload = requestBody.analytics || requestBody;
const userLocale = analyticsPayload.locale || 'en';

// Check cache with locale
const cachedInsights = await getCachedInsights(userId, userLocale, correlationId);

// ... generate insights if cache miss ...

// Cache insights with locale
await cacheInsights(userId, analyticsData.locale, insights, correlationId);
```

### 3. Frontend Updates (Already Completed)
**Files Modified**:
1. `apps/frontend/src/types/coaching.ts` - Added `locale?: string` to `AnalyticsSummary`
2. `apps/frontend/src/services/analyticsService.ts` - Added locale parameter and pass-through
3. `apps/frontend/src/services/insightsService.ts` - Added locale parameter and client cache invalidation
4. `apps/frontend/src/services/coachingService.ts` - Added locale parameter pass-through
5. `apps/frontend/src/hooks/useCoachingInsights.ts` - Extract locale from i18n and pass to services
6. `apps/frontend/src/pages/CoachPage.tsx` - Fixed responsive layout (unrelated)

## Deployment Steps

### Development Environment
```bash
# Deploy migration (using MCP tools)
# ✅ COMPLETED: Applied via mcp_supabase_apply_migration on 2025-10-16

# Deploy edge function
# ✅ COMPLETED: Version 8 deployed successfully on 2025-10-16
# Command: npx supabase functions deploy analyze-progress --project-ref xwzrsfkzqxdybjrkkkvh
# Note: Fixed blank index.ts issue - function now properly deployed with all code
```

### Production Environment
```bash
# ⏳ PENDING: Deploy after full testing in development

# Deploy migration (using MCP tools)
# Use: mcp_supabase-prod_apply_migration

# Deploy edge function  
# Use: npx supabase functions deploy analyze-progress --project-ref zumzzuvfsuzvvymhpymk
```

## Testing Checklist

### Test 1: Arabic Insights Generation
- [ ] Switch UI to Arabic (`ar-EG`)
- [ ] Refresh AI insights
- [ ] Verify insights are in Arabic
- [ ] Check logs: `locale: 'ar-EG'`, `cached: false`

### Test 2: Cache Hit with Same Locale
- [ ] Reload page (without refresh)
- [ ] Verify insights are still in Arabic
- [ ] Check logs: `cached: true`, `locale: 'ar-EG'`

### Test 3: Cache Miss on Locale Change
- [ ] Switch UI to English
- [ ] Refresh AI insights
- [ ] Verify insights are in English
- [ ] Check logs: `locale: 'en'`, `cached: false` (cache miss for English)

### Test 4: Multiple Language Caching
- [ ] Generate insights in Arabic (creates Arabic cache)
- [ ] Switch to English and refresh (creates English cache)
- [ ] Switch back to Arabic (should hit Arabic cache)
- [ ] Verify both caches are independent

### Test 5: Cache Expiration
- [ ] Wait 5+ minutes
- [ ] Refresh insights
- [ ] Verify fresh insights are generated
- [ ] Check logs: `cached: false` (cache expired)

## Expected Behavior

### Before Fix
```
User in Arabic → Edge function checks cache by user_id only
→ Finds English cache from previous session
→ Returns English insights (wrong language)
```

### After Fix
```
User in Arabic → Edge function checks cache by (user_id, locale='ar-EG')
→ No cache found (or finds Arabic cache if exists)
→ Generates fresh Arabic insights OR returns cached Arabic insights
→ Stores in cache with locale='ar-EG'
→ Returns Arabic insights (correct language)
```

## Rollback Plan

If issues occur after deployment:

1. **Revert migration** (if database issues):
   ```sql
   ALTER TABLE public.coaching_ai_cache DROP COLUMN IF EXISTS locale;
   CREATE INDEX idx_coaching_ai_cache_user_expires ON public.coaching_ai_cache(user_id, expires_at DESC);
   ```

2. **Revert edge function**: Deploy previous version from git history

3. **Clear cache manually** (if corruption):
   ```sql
   DELETE FROM public.coaching_ai_cache;
   ```

## Performance Impact

- **Database**: Minimal - added one TEXT column and updated index (composite key)
- **Edge Function**: Negligible - same query pattern, just one additional equality check
- **Cache Hit Rate**: May temporarily decrease as cache clears and regenerates per locale
- **User Experience**: Improved - users get insights in their preferred language

## Security Considerations

- Locale value is user-controlled input (from frontend)
- Already validated in frontend (must be one of 8 supported languages)
- Edge function uses as simple string, no SQL injection risk (parameterized query)
- No sensitive data in locale field (just language code)

## Related Issues

- **Original Issue**: AI insights not respecting user's language preference
- **Related Features**: i18n system, AI coaching, caching strategy

## Success Criteria

### Development Environment
✅ Migration successfully applied to dev database  
✅ Edge function v8 deployed to dev environment (fixed blank index.ts issue)  
⏳ Arabic users receive Arabic insights (ready for testing NOW)  
⏳ English users receive English insights (ready for testing NOW)  
⏳ Language switching invalidates cache correctly (ready for testing)  
⏳ Cache hit rate remains high for same-locale requests  
⏳ No errors in edge function logs  

### Production Environment (After Dev Testing)
⏳ Migration applied to prod database  
⏳ Edge function v8+ deployed to prod environment  
⏳ Production verification in Arabic  
⏳ Production verification in English  

## Notes
- **Issue Fixed**: Version 7 deployment resulted in blank `index.ts` file in development
- **Resolution**: Redeployed using explicit project reference: `--project-ref xwzrsfkzqxdybjrkkkvh`
- **Version 8**: Successfully deployed with complete code and all dependencies
- **Supabase .env**: Updated to point to development to prevent future production accidents

- Client-side cache (InsightsService) was also updated to invalidate on locale change
- Migration clears existing cache to force regeneration with locale
- All 8 supported languages (en, fr, de, es, nl, ar, ar-EG, fy) will work correctly
- Mistral AI already receives locale instruction in prompt builder

---
**Status**: ✅ Development deployment complete - Ready for testing  
**Next Step**: Test AI insights in Arabic and English locales in development  
**Created**: 2025-10-16  
**Updated**: 2025-10-16  
**Author**: AI Agent (GitHub Copilot)
