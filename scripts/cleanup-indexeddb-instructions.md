# IndexedDB Cleanup Instructions for Old Sharing System

Since the frontend caches exercises in IndexedDB, users who had saved shared exercises via the old copy-based system may have stale data in their local storage. Here's how to handle the cleanup:

## Option 1: Automatic Cleanup via Version Bump (Recommended)

The cleanest approach is to increment the database version in the frontend, which will trigger a fresh sync and remove any stale copied exercises.

### Steps:

1. **Update Database Version** in `apps/frontend/src/services/storageService.ts`:
   ```typescript
   // Increment this version to force a fresh sync after cleanup
   private static readonly DB_VERSION = 2; // Increment from current version
   ```

2. **Clear Stale Data** - Add a migration in the database upgrade handler:
   ```typescript
   // In the database upgrade handler, add:
   if (oldVersion < 2) {
     // Clear exercises that were copied via old sharing system
     const tx = db.transaction(['exercises'], 'readwrite');
     const store = tx.objectStore('exercises');
     const allExercises = await store.getAll();

     for (const exercise of allExercises) {
       // Remove exercises that have shared_from_exercise_id (old copies)
       if (exercise.shared_from_exercise_id) {
         await store.delete(exercise.id);
       }
     }
   }
   ```

## Option 2: Manual Cleanup via Developer Tools

For testing purposes, you can manually clear IndexedDB:

1. Open Developer Tools (F12)
2. Go to Application tab
3. Find "Storage" → "IndexedDB" → "RepCueDB"
4. Right-click and select "Delete database"
5. Refresh the page to rebuild the database

## Option 3: Programmatic Cleanup Function

Add a cleanup function that can be called manually during development:

```typescript
// Add to StorageService for development cleanup
async cleanupOldSharedExercises(): Promise<void> {
  if (this.db) {
    const tx = this.db.transaction(['exercises'], 'readwrite');
    const store = tx.objectStore('exercises');
    const allExercises = await store.getAll();

    let deletedCount = 0;
    for (const exercise of allExercises) {
      if (exercise.shared_from_exercise_id) {
        await store.delete(exercise.id);
        deletedCount++;
      }
    }

    console.log(`Cleaned up ${deletedCount} old shared exercises from IndexedDB`);

    // Trigger a fresh sync to repopulate with current data
    await this.syncService?.performFullSync();
  }
}
```

## Recommended Approach

Use **Option 1** (version bump) as it's the cleanest and most user-friendly approach. It will automatically handle the cleanup for all users when they next load the app, without any manual intervention required.

## Verification

After cleanup, verify that:
1. No exercises with `shared_from_exercise_id` exist in IndexedDB
2. Users can still save shared exercises via the new reference-based system
3. The new references appear correctly in the exercise list
4. Sync continues to work properly with the cleaned data