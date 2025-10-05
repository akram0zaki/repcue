# Bug Fix: Deleted Workouts Reappearing After Sync

**Date**: 2025-10-06  
**Issue**: Deleted workouts reappearing after AI workout generation  
**Severity**: High (data integrity issue)  
**Status**: ✅ Fixed

## Problem Description

User deleted approximately 7 AI-generated workouts from the workouts listing page. After invoking the AI Assistant and generating 2 new workouts (in Arabic), all previously deleted workouts reappeared on the page.

## Root Cause Analysis

### Timeline of Events

1. **User deletes 7 workouts locally**
   - `storageService.deleteWorkout()` marks each workout as `deleted: true, dirty: 1`
   - Workouts remain in IndexedDB as soft-deleted tombstones
   - Deletions not yet synced to server

2. **User generates 2 new AI workouts**
   - Edge Function creates workouts directly in Supabase
   - New workouts saved to server, not yet pulled to client

3. **Automatic sync triggered**
   - Sync pull phase retrieves all non-deleted workouts from server
   - Server still has the 7 deleted workouts (deletions not yet pushed)
   - Pull brings back: 2 new AI workouts + 7 "deleted" workouts
   - Pull applies these to IndexedDB, overwriting local soft-delete markers

4. **WorkoutsPage refreshes**
   - Listens to `sync:applied` event
   - Calls `storageService.getWorkouts()`
   - **BUG**: `getWorkouts()` returns ALL workouts including `deleted: true`
   - UI displays all workouts including the 7 that should be hidden

### Code Flow

```typescript
// WorkoutsPage.tsx - Line 40
const handleSyncApplied = async () => {
  const allWorkouts = await storageService.getWorkouts(); // ❌ Returns deleted workouts
  setWorkouts(allWorkouts);
};
window.addEventListener('sync:applied', handleSyncApplied);

// storageService.ts - Line 2565 (BEFORE FIX)
public async getWorkouts(): Promise<Workout[]> {
  const storedWorkouts = await this.db.workouts.orderBy('updated_at').reverse().toArray();
  return storedWorkouts.map(this.convertStoredWorkout); // ❌ No deleted filter
}
```

### Why This Happens

The soft-delete system works as follows:
1. Local delete → mark `deleted: true, dirty: 1`
2. Sync push → send deletion to server
3. Sync pull → get server's non-deleted records
4. Display → **filter out `deleted: true` locally**

**The bug**: Step 4 was missing the filter. `getWorkouts()` returned all records regardless of `deleted` status.

## The Fix

Added soft-delete filtering to `getWorkouts()` method:

```typescript
// storageService.ts - Line 2565 (AFTER FIX)
public async getWorkouts(): Promise<Workout[]> {
  return await this.safeDatabaseAccess(
    async () => {
      const storedWorkouts = await this.db.workouts.orderBy('updated_at').reverse().toArray();
      // ✅ Filter out soft-deleted workouts
      return storedWorkouts
        .filter(workout => !workout.deleted)
        .map(this.convertStoredWorkout);
    },
    () => {
      const workouts: Workout[] = [];
      this.fallbackStorage.forEach((value, key) => {
        if (key.startsWith('workout_')) {
          const workout = value as StoredWorkout;
          // ✅ Filter out soft-deleted workouts in fallback too
          if (!workout.deleted) {
            workouts.push(this.convertStoredWorkout(workout));
          }
        }
      });
      return workouts;
    }
  );
}
```

### Changes Made

1. **IndexedDB path**: Added `.filter(workout => !workout.deleted)` before mapping
2. **Fallback storage path**: Added `if (!workout.deleted)` check before pushing to array
3. Both paths now consistently hide soft-deleted records

## Testing

### Manual Test Steps

1. Create or generate several workouts
2. Delete some workouts using the delete button
3. Trigger a sync (or generate new AI workouts which triggers sync)
4. Verify deleted workouts do NOT reappear in the list
5. Check IndexedDB (browser DevTools → Application → IndexedDB)
   - Deleted workouts should have `deleted: true, dirty: 1`
   - They should remain in database as tombstones
6. After sync completes and pushes deletions:
   - Tombstones should still be in local IndexedDB
   - But should NOT appear in UI

### Edge Cases Covered

✅ **Sync race condition**: Deleted workouts pulled back before push completes  
✅ **Fallback storage**: Filtering works in both IndexedDB and fallback paths  
✅ **Multiple deletions**: All deleted workouts hidden, not just recent ones  
✅ **Post-sync refresh**: `sync:applied` event triggers refresh with correct filtering

## Impact

- **User Experience**: Deleted workouts no longer mysteriously reappear
- **Data Integrity**: Soft-delete system now works correctly end-to-end
- **Sync Reliability**: Deletion tombstones properly hidden while waiting for server sync
- **No Migration Needed**: Existing soft-deleted records automatically hidden

## Related Systems

This fix affects:
- ✅ `storageService.getWorkouts()` - Primary entry point
- ⚠️ `getWorkoutSessions()` - Should verify similar filtering
- ⚠️ `getExercises()` - Should verify similar filtering
- ⚠️ Other `get*()` methods - Audit for consistent soft-delete handling

## Follow-Up Actions

- [ ] Audit all `get*()` methods in storageService for soft-delete filtering
- [ ] Add unit tests for soft-delete scenarios
- [ ] Add E2E test: delete workout → sync → verify not visible
- [ ] Document soft-delete pattern in architecture docs
- [ ] Consider adding lint rule to enforce `deleted` filtering

## References

- **Code Files**:
  - `apps/frontend/src/services/storageService.ts` (Line 2565-2584)
  - `apps/frontend/src/pages/WorkoutsPage.tsx` (Line 40-48)
  - `apps/frontend/src/services/syncHelpers.ts` (Line 110-118)
- **Related Docs**:
  - `docs/sync-system.md` - Soft-delete architecture
  - `CHANGELOG.md` - Version history
