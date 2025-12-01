# Exercise Page N+1 Query Fix (2025-01-25)

## Problem Summary

The Exercises page was taking ~2 seconds to load even after implementing video caching and lazy loading optimizations. Investigation revealed a classic **N+1 query problem** where each ExerciseCard component was independently querying IndexedDB for exercise memberships on mount.

## Root Cause

### Before (N+1 Pattern)
```typescript
// ExerciseCard.tsx - BAD: Ran for EVERY card
useEffect(() => {
  const memberships = await storageService.getExerciseMemberships(exercise.id);
  setCatalogIds(memberships.map(m => m.catalog_id));
}, [exercise.id]);
```

**Impact**: With 50+ exercises on the page:
- 50+ simultaneous IndexedDB queries
- Massive query contention blocking main thread
- Each card independently loading same type of data
- ~2 second delay despite other optimizations

## Solution: Bulk Loading

### 1. New Bulk Query Method
**File**: `apps/frontend/src/services/storageService.ts`

```typescript
/**
 * Bulk load catalog memberships for multiple exercises
 * Prevents N+1 query problems when displaying multiple exercises
 */
public async getAllExerciseMemberships(
  exerciseIds: string[]
): Promise<Map<string, CatalogMembership[]>> {
  const memberships = await this.db.catalog_memberships
    .where('exercise_id')
    .anyOf(exerciseIds)
    .and(m => !m.deleted)
    .toArray();
  
  // Group by exercise ID
  const membershipMap = new Map<string, CatalogMembership[]>();
  memberships.forEach(membership => {
    const existing = membershipMap.get(membership.exercise_id) || [];
    existing.push(membership);
    membershipMap.set(membership.exercise_id, existing);
  });
  
  return membershipMap;
}
```

### 2. Page-Level Bulk Load
**File**: `apps/frontend/src/pages/ExercisePage.tsx`

```typescript
// Load ALL memberships once at page mount
const [exerciseMemberships, setExerciseMemberships] = 
  useState<Map<string, CatalogMembership[]>>(new Map());

useEffect(() => {
  const loadMemberships = async () => {
    const exerciseIds = exercises.map(ex => ex.id);
    const memberships = await storageService.getAllExerciseMemberships(exerciseIds);
    setExerciseMemberships(memberships);
  };
  loadMemberships();
}, [exercises]);
```

### 3. Pass Down to Cards
```typescript
<ExerciseCard
  exercise={exercise}
  // ... other props
  memberships={exerciseMemberships.get(exercise.id) || []}
/>
```

### 4. Card Uses Pre-Loaded Data
**File**: `apps/frontend/src/pages/ExercisePage.tsx` (ExerciseCard component)

```typescript
// GOOD: Use pre-loaded memberships, no query
const catalogIds = useMemo(() => {
  if (memberships && memberships.length > 0) {
    return Array.from(new Set(memberships.map(m => m.catalog_id)));
  }
  return exercise.catalogId ? [exercise.catalogId] : [];
}, [memberships, exercise.catalogId]);
```

## Performance Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **IndexedDB Queries** | 50+ queries | 1 query | 98% reduction |
| **Query Pattern** | N+1 (serial) | Bulk (single) | Batched |
| **Page Load Time** | ~2 seconds | Target <500ms | 75%+ faster |
| **Main Thread Blocking** | High | Minimal | Significantly reduced |

## Combined Optimization Results

This fix is part of a multi-phase performance optimization:

1. **Phase 1** (Nov 24): Video caching - eliminated network requests
2. **Phase 2** (Nov 24): Skip probe for cached videos - 3s → 1.5s
3. **Phase 3** (Nov 24): Lazy loading with Intersection Observer - render optimization
4. **Phase 4** (Jan 25): **Bulk membership loading - IndexedDB optimization** (this fix)

**Total Expected Impact**: 3+ seconds → <500ms target ✅

## Files Modified

- ✅ `apps/frontend/src/services/storageService.ts`
  - Added `getAllExerciseMemberships()` bulk query method
  
- ✅ `apps/frontend/src/pages/ExercisePage.tsx`
  - Import `CatalogMembership` type
  - Bulk load memberships on mount
  - Pass memberships to ExerciseCard components
  - Updated ExerciseCard to accept `memberships` prop
  - Replaced useEffect query with useMemo transformation

- ✅ `apps/frontend/src/hooks/useIntersectionObserver.ts`
  - Fixed TypeScript type for ref (`RefObject<T | null>`)

- ✅ `CHANGELOG.md`
  - Documented optimization and performance impact

## Testing Recommendations

1. **Performance Testing**:
   ```bash
   # Chrome DevTools Performance tab
   1. Navigate to Exercises page
   2. Record performance profile
   3. Verify single IndexedDB query
   4. Confirm <500ms time to interactive
   ```

2. **Functional Testing**:
   - Catalog badges still display correctly
   - Multi-catalog exercises show all badges
   - No visual regressions in card layout
   - Badges appear instantly (no loading delay)

3. **Edge Cases**:
   - Empty exercises array
   - Exercise with no memberships
   - Exercise with multiple catalog memberships
   - Rapid page switching (membership loading cancellation)

## Key Learnings

### N+1 Query Pattern Detection
- **Symptom**: Component-level data loading in lists
- **Red Flag**: `useEffect` with per-item API/DB calls
- **Impact**: Multiplies with list size (10x items = 10x queries)

### Solution Pattern
1. **Identify**: Component doing per-item data loading
2. **Bulk API**: Create method to load all data at once
3. **Lift Up**: Move loading to parent/page level
4. **Pass Down**: Distribute data via props/context
5. **Optimize**: Use memoization for transformations

### Performance Optimization Layers
- **Network**: Caching (video cache service)
- **Rendering**: Lazy loading (intersection observer)
- **Data Access**: Bulk queries (this fix)
- **All layers matter**: Each contributes to overall performance

## Future Considerations

1. **Pagination**: If exercise list grows significantly
2. **Virtual Scrolling**: For very large catalogs (500+ items)
3. **Prefetching**: Load next catalog's memberships in background
4. **Service Worker**: Cache membership data (if appropriate)

---

**Status**: ✅ Implemented and Built Successfully  
**Expected Performance**: <500ms Exercises page load time  
**Next Steps**: User testing and performance validation
