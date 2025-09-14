# Favorites Sync Implementation Plan

## Problem Statement

User preferences (favorites, settings) are being stored locally in IndexedDB but not syncing properly to Supabase. This affects cross-device synchronization and user experience.

## Current State Analysis

### Issues Identified
1. **Missing sync table**: `user_favorites` was missing from client-side `SYNCABLE_TABLES` array
2. **Field name mismatches**: Client `AppSettings` field names don't match Supabase `app_settings` table schema
3. **Incorrect favorite system usage**: Not properly distinguishing between built-in and user-created exercise favorites
4. **Language setting**: Language preference is missing from sync implementation
5. **Sync ordering**: Exercise sync must happen before favorites sync for foreign key integrity

### Current Data Flow
- **Settings**: SettingsPage → App.tsx → StorageService.saveAppSettings → IndexedDB → SyncService
- **Built-in Exercise Favorites**: ExercisePage → App.tsx → StorageService.toggleExerciseFavorite → IndexedDB (user_preferences.favorite_exercises)
- **User-Created Exercise Favorites**: Currently broken - should use FavoritesService → user_favorites table
- **Language**: i18next → localStorage (not synced)

## Implementation Plan

### Phase 1: Fix Core Sync Infrastructure ✅
1. ✅ Add `user_favorites` to client-side `SYNCABLE_TABLES` 
2. ✅ Add field mapping functions in StorageService:
   - `convertAppSettingsForSync()` - client → server format
   - `convertAppSettingsFromSync()` - server → client format

### Phase 2: Fix Sync Ordering for Foreign Key Integrity
1. **Update SYNCABLE_TABLES order** to prioritize exercises before favorites:
   ```
   'user_preferences',    // Built-in exercise favorites (slug IDs)
   'app_settings', 
   'exercises',           // Must sync BEFORE user_favorites
   'workouts',
   'user_favorites',      // User-created exercise favorites (UUID IDs) 
   'activity_logs',
   'workout_sessions'
   ```

### Phase 3: Implement Two-Tiered Favorite System
1. **Fix built-in exercise favorites** (slug IDs):
   - Continue using `user_preferences.favorite_exercises` array
   - Sync via existing `StorageService.toggleExerciseFavorite()`
   - No changes to current UI behavior needed

2. **Implement user-created exercise favorites** (UUID IDs):
   - Update `App.tsx.toggleExerciseFavorite()` to detect exercise type:
     ```typescript
     const isUserCreated = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exerciseId);
     if (isUserCreated) {
       await favoritesService.toggleFavorite(exerciseId, 'exercise', 'user_created');
     } else {
       await storageService.toggleExerciseFavorite(exerciseId);  // Built-in
     }
     ```
   - Ensure `user_favorites` records are created locally and marked dirty for sync

### Phase 4: Implement Field Mapping in Sync Service
1. **Modify SyncService.prepareSyncData()** to apply field mappings:
   - Transform `app_settings` records using `convertAppSettingsForSync()`
   - Keep other tables unchanged
   
2. **Modify SyncService.applySyncChanges()** to handle incoming data:
   - Transform `app_settings` records using `convertAppSettingsFromSync()`
   - Keep other tables unchanged

### Phase 5: Add Language Preference Sync
1. **Add language to UserPreferences type**:
   - Add `locale: string` field to `UserPreferences` interface
   - Map to existing `user_preferences.locale` in Supabase

2. **Update language change handler**:
   - Save language changes via `StorageService.updateUserPreferences()`
   - Trigger sync after language change

3. **Initialize language from synced preferences**:
   - Load language from `getUserPreferences()` on app start
   - Apply to i18next after loading synced data

### Phase 6: Testing & Validation
1. **Unit tests** for field mapping functions
2. **Manual testing**:
   - Change settings → verify sync to Supabase
   - Toggle favorites → verify sync to Supabase  
   - Change language → verify sync to Supabase
   - Multi-device testing
3. **Error handling** for sync failures

## Field Mappings

### AppSettings (Client) ↔ app_settings (Supabase)
```
interval_duration      ↔ beep_interval_seconds
sound_enabled          ↔ beep_sound_enabled  
beep_volume           ↔ beep_volume
vibration_enabled     ↔ vibration_enabled
dark_mode             ↔ dark_mode
reduce_motion         ↔ reduce_motion
auto_start_next       ↔ auto_start_next
pre_timer_countdown   ↔ pre_timer_countdown
show_exercise_videos  ↔ show_exercise_videos
auto_save             ↔ data_auto_save
default_rest_time     ↔ default_rest_time

// Client-only fields (not synced):
rep_speed_factor
last_selected_exercise_id
```

### UserPreferences (Client) ↔ user_preferences (Supabase)
```
locale                ↔ locale
units                 ↔ units
rep_speed_factor      ↔ rep_speed_factor
cues                  ↔ cues
favorite_exercises    ↔ favorite_exercises (array)
```

## Technical Decisions

### Two-tiered favorite system rationale
- **Built-in exercises** (slug IDs like "push-ups", "squats"):
  - Cannot be inserted into `user_favorites` table (requires UUID primary key)
  - Stored in `user_preferences.favorite_exercises` array (current working system)
  - Same for all users, so no need for individual records
  
- **User-created exercises** (UUID IDs):
  - Can be inserted into `user_favorites` table with proper foreign key relationship
  - Need individual records for proper relational integrity
  - Use existing `FavoritesService` that was built for this purpose

### Sync ordering importance
- `exercises` table must sync before `user_favorites` table
- Prevents foreign key constraint violations when a user creates an exercise and favorites it in the same sync cycle
- SYNCABLE_TABLES order determines sync sequence

### Field mapping approach
- Implement conversion functions in `StorageService`
- Apply transformations in `SyncService` before sending/after receiving
- Keep IndexedDB schema unchanged to avoid data migration

### Language sync strategy
- Add language to `user_preferences` instead of creating separate table
- Store in both localStorage (for immediate i18next) and IndexedDB (for sync)
- Priority: synced preference > localStorage fallback > browser default

## Risk Mitigation

### Data integrity
- Field mapping functions include defaults for missing fields
- Backward compatibility with existing IndexedDB data
- Type safety with TypeScript interfaces

### Sync conflicts
- Last-writer-wins for settings (acceptable for user preferences)
- Version-based conflict resolution already implemented in sync service
- Manual sync trigger available for users

### Fallback behavior
- Settings continue to work locally if sync fails
- Language falls back to localStorage then browser default
- Favorites work locally even without sync

## Success Criteria

1. ✅ All user settings sync bidirectionally between devices
2. ✅ Built-in exercise favorites (slug IDs) sync via `user_preferences.favorite_exercises`
3. ✅ User-created exercise favorites (UUID IDs) sync via `user_favorites` table
4. ✅ Foreign key integrity maintained (exercises sync before favorites)
5. ✅ Language preference syncs across devices
6. ✅ No data loss during sync operations
7. ✅ Graceful degradation when sync is unavailable
8. ✅ Type safety maintained throughout

## Rollback Plan

- Field mapping functions are additive, no breaking changes
- SyncService changes are isolated and can be reverted
- IndexedDB schema unchanged, no data migration needed
- Feature flag can disable sync if issues arise

## Testing Strategy

### Automated Tests
- Unit tests for field mapping functions
- Sync service integration tests
- Type checking via TypeScript

### Manual Tests  
- Settings page changes sync to Supabase
- Built-in exercise favorites sync to `user_preferences` table
- User-created exercise favorites sync to `user_favorites` table
- Create exercise + favorite in same sync cycle (foreign key test)
- Language change syncs to Supabase
- Cross-device sync verification
- Offline/online sync behavior
- Conflict resolution scenarios