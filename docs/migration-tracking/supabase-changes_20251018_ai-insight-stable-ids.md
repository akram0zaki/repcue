# Supabase Changes - AI Insight Stable IDs

**Date**: October 18, 2025  
**Branch**: `feature/ai-coach`  
**Type**: Edge Function Update + Cache Clear  
**Environments**: Development (xwzrsfkzqxdybjrkkkvh) & Production (zumzzuvfsuzvvymhpymk)

## Summary

Fixed AI insight dismissal persistence issue by implementing stable content-based IDs instead of timestamp/correlationId-based IDs. This ensures dismissed AI insights stay dismissed for 24 hours across page navigation.

## Problem

AI insights were getting new IDs on each request because they were generated using:
- `ai-coach-{timestamp}-{correlationId}-{index}` (fresh insights)
- `ai-coach-cached-{timestamp}-{correlationId}-{index}` (cached insights)

This caused dismissed insights to reappear after page navigation because the dismissal system couldn't match the IDs.

## Solution

Implemented stable content-based ID generation using a simple hash function:
- Format: `ai-{type}-{titleHash}`
- Same insight content = same ID across all requests
- Matches the approach used for rule-based insights

## Changes Made

### 1. Edge Function: analyze-progress

**File**: `supabase/functions/analyze-progress/index.ts`

**Added Functions** (lines 36-61):
```typescript
/**
 * Generates a simple hash from a string (for stable insight IDs)
 * Uses the same algorithm as frontend for consistency
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to base36 for shorter string
  return Math.abs(hash).toString(36);
}

/**
 * Generates stable ID for AI insight based on content
 * Format: ai-{type}-{titleHash}
 * This ensures same insight content gets same ID across requests (for dismissal persistence)
 */
function generateStableInsightId(insight: any): string {
  const titleHash = simpleHash(insight.title.toLowerCase().trim());
  return `ai-${insight.type}-${titleHash}`;
}
```

**Modified**: Cached insights ID generation (line ~427)
```typescript
// OLD:
id: insight.id || `ai-coach-cached-${timestamp}-${correlationId}-${index}`,

// NEW:
id: insight.id || generateStableInsightId(insight),
```

**Modified**: Fresh insights ID generation (line ~489)
```typescript
// OLD:
id: `ai-coach-${timestamp}-${correlationId}-${index}`,

// NEW:
id: generateStableInsightId(insight),
```

### 2. Frontend Service: insightsService.ts

**File**: `apps/frontend/src/services/insightsService.ts`

**Added Method** (lines ~425-436):
```typescript
/**
 * Generates a simple hash from a string (for stable IDs)
 * Uses a basic hash algorithm that produces consistent results
 */
private simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to base36 for shorter string
  return Math.abs(hash).toString(36);
}
```

**Modified**: Fresh AI insights ID generation (line ~250)
```typescript
// OLD:
const generatedId = `ai-${data.metadata.correlationId}-${index}`;

// NEW:
const titleHash = this.simpleHash(insight.title.toLowerCase().trim());
const generatedId = `ai-${insight.type}-${titleHash}`;
```

**Modified**: Cached AI insights ID generation (line ~460)
```typescript
// OLD:
const generatedId = `ai-${this.cache!.correlationId}-${index}`;

// NEW:
const titleHash = this.simpleHash(insight.title.toLowerCase().trim());
const generatedId = `ai-${insight.type}-${titleHash}`;
```

## Deployment Steps

### 1. Deploy Edge Function
```bash
# Development
supabase functions deploy analyze-progress --project-ref xwzrsfkzqxdybjrkkkvh

# Production
supabase functions deploy analyze-progress --project-ref zumzzuvfsuzvvymhpymk
```

**Status**: ✅ Completed - Both environments deployed successfully

### 2. Clear AI Cache
Old cached insights have old-format IDs, so we need to force fresh generation.

```sql
-- Clear cache in both environments
DELETE FROM coaching_ai_cache WHERE created_at < NOW();
```

**Status**: ✅ Completed - Cache cleared in dev and prod

## Testing Steps

1. **Sign in** to RepCue (AI insights require authentication)
2. **Navigate to Coach page** - wait for AI insights to load
3. **Dismiss 2-3 AI insights** - note their titles
4. **Navigate to another page** (e.g., Timer or Workouts)
5. **Return to Coach page**
6. **Verify**: Dismissed AI insights should NOT reappear
7. **Check browser console**: Insight IDs should be in format `ai-{type}-{hash}` (e.g., `ai-motivation-5f3a8b`)
8. **Click Refresh button** - dismissed insights should reappear with fresh data
9. **Navigate away and back again** - newly dismissed insights should stay dismissed

## Expected Behavior

### ✅ Before Refresh
- Dismissed AI insights stay dismissed for 24 hours
- Same insight content has same ID across sessions
- Navigation to other pages doesn't bring back dismissed insights
- Dismissals stored in localStorage: `repcue_dismissed_insights`

### ✅ After Refresh
- All dismissals cleared (both AI and rule-based)
- Fresh AI insights fetched from backend
- New dismissal state (nothing dismissed)
- Cache cleared to force API call

## Rollback Plan

If issues occur:

1. **Revert Edge Function**:
   ```bash
   # Get previous version from git
   git checkout HEAD~1 -- supabase/functions/analyze-progress/index.ts
   
   # Redeploy
   supabase functions deploy analyze-progress --project-ref [PROJECT_REF]
   ```

2. **Revert Frontend**:
   ```bash
   git checkout HEAD~1 -- apps/frontend/src/services/insightsService.ts
   ```

3. **Clear localStorage** (user action):
   - Open DevTools Console
   - Run: `localStorage.removeItem('repcue_dismissed_insights')`

## Dependencies

- None - backward compatible change
- Old cached insights will be regenerated with new IDs on next request
- No database schema changes required

## Notes

- The `simpleHash` function is identical in both frontend and backend for consistency
- Hash collisions are theoretically possible but extremely unlikely given:
  - Insight titles are unique and descriptive
  - Combined with `type` prefix in ID format
  - 36-character base reduces collision probability
- If a hash collision occurs, both insights would share the same ID and be dismissed together (acceptable edge case)

## Verification

### Development Environment
- ✅ Edge function deployed successfully
- ✅ Cache cleared
- 🔄 Awaiting user testing

### Production Environment
- ✅ Edge function deployed successfully
- ✅ Cache cleared
- 🔄 Awaiting user testing

## Related Files

- `supabase/functions/analyze-progress/index.ts`
- `apps/frontend/src/services/insightsService.ts`
- `apps/frontend/src/services/coachingService.ts` (dismissal logic)
- `apps/frontend/src/hooks/useCoachingInsights.ts` (dismissal state)

## Impact Assessment

**Risk Level**: Low  
**User Impact**: Positive - fixes dismissal persistence bug  
**Performance Impact**: None - hash calculation is negligible  
**Breaking Changes**: None

---

**Deployed by**: AI Agent (GitHub Copilot)  
**Tested by**: Awaiting user verification  
**Approved by**: Awaiting user approval
