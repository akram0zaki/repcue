# User-Created Exercises Implementation Plan

## Sync Service Impact Analysis

### Current Sync Architecture

The existing sync service follows a robust pattern that **already supports** user-created content:

1. **Table-based Processing**: Syncs tables in order: `user_preferences`, `app_settings`, `exercises`, `workouts`, `activity_logs`, `workout_sessions`
2. **Ownership Model**: Uses `owner_id` field to scope records to authenticated users
3. **Conflict Resolution**: Last-writer-wins based on `updated_at` timestamps
4. **Validation**: Record validation in `validateRecord()` method with table-specific rules
5. **Sync Metadata**: Uses `dirty`, `op`, `synced_at`, `deleted`, `version` fields for tracking
6. **Cursor Management**: Incremental sync via `sync_cursors` table

### ✅ Compatibility Assessment

**EXCELLENT NEWS**: The proposed user-created content implementation is **fully compatible** with the existing sync service because:

#### 1. Database Schema Alignment
- **Exercises table already supports `owner_id`** - user-created exercises will sync naturally
- **Workouts table already supports `owner_id`** - user-created workouts will sync naturally  
- **All new tables follow sync pattern**: Include `owner_id`, `created_at`, `updated_at`, `deleted`, `version`

#### 2. SYNCABLE_TABLES Extension Required
The sync service needs to include the new tables in its processing order:

```typescript
// Current SYNCABLE_TABLES
const SYNCABLE_TABLES = [
  'user_preferences',
  'app_settings', 
  'exercises',        // ✅ Already supports user content via owner_id
  'workouts',         // ✅ Already supports user content via owner_id
  'activity_logs',
  'workout_sessions'
] as const;

// Enhanced SYNCABLE_TABLES for user-created content
const SYNCABLE_TABLES = [
  'user_preferences',
  'app_settings',
  'feature_flags',          // 🆕 Admin-only, low sync frequency
  'exercises',              // ✅ Built-in + user-created via owner_id
  'exercise_shares',        // 🆕 User sharing permissions
  'exercise_ratings',       // 🆕 User ratings and reviews  
  'exercise_videos',        // 🆕 Custom video attachments
  'workouts',               // ✅ Built-in + user-created via owner_id
  'workout_shares',         // 🆕 Workout sharing permissions
  'workout_ratings',        // 🆕 Workout ratings and reviews
  'user_favorites',         // 🆕 Replaces favorite_exercises TEXT[]
  'content_moderation',     // 🆕 Admin moderation queue
  'activity_logs',          // ✅ No changes needed
  'workout_sessions'        // ✅ No changes needed
] as const;
```

#### 3. Validation Rules Enhancement
The existing `validateRecord()` method needs rules for new content types:

```typescript
// Enhanced validation in syncService.ts
private validateRecord(record: Record<string, unknown>, tableName: string): SyncError | null {
  // ... existing validation ...

  // Enhanced table-specific validation
  switch (tableName) {
    case 'exercises':
      // Existing validation PLUS:
      if (record.owner_id && !record.name) {
        return this.createSyncError('validation', 'User exercise missing required name field', tableName, record.id as string);
      }
      // User exercises must have instructions
      if (record.owner_id && (!record.instructions || !Array.isArray(record.instructions) || record.instructions.length === 0)) {
        return this.createSyncError('validation', 'User exercise must have instructions array', tableName, record.id as string);
      }
      break;

    case 'exercise_shares':
      if (!record.exercise_id || !record.permission_level) {
        return this.createSyncError('validation', 'Exercise share missing required fields', tableName, record.id as string);
      }
      if (!['view', 'copy'].includes(record.permission_level as string)) {
        return this.createSyncError('validation', 'Invalid permission level for exercise share', tableName, record.id as string);
      }
      break;

    case 'exercise_ratings':
      if (!record.exercise_id || typeof record.rating !== 'number' || record.rating < 1 || record.rating > 5) {
        return this.createSyncError('validation', 'Exercise rating must have valid rating (1-5)', tableName, record.id as string);
      }
      break;

    case 'user_favorites':
      if (!record.item_id || !record.item_type) {
        return this.createSyncError('validation', 'User favorite missing required fields', tableName, record.id as string);
      }
      if (!['exercise', 'workout'].includes(record.item_type as string)) {
        return this.createSyncError('validation', 'Invalid item_type for user favorite', tableName, record.id as string);
      }
      break;

    // Similar validation for other new tables...
  }
  
  return null; // Validation passed
}
```

#### 4. RLS (Row Level Security) Considerations
The sync service uses service role key for admin operations but respects `owner_id` filtering:

```typescript
// Existing server-side sync logic already handles this correctly
async function getServerChanges(supabase, userId, tableName, since) {
  let query = supabase
    .from(tableName)
    .select('*')
    .eq('owner_id', userId);  // ✅ Already scopes to user's data

  // Public content access for discovery
  if (['exercises', 'workouts'].includes(tableName)) {
    query = supabase
      .from(tableName)
      .select('*')
      .or(`owner_id.eq.${userId},is_public.eq.true`);  // 🆕 Include public content
  }
}
```

### 📋 Required Sync Service Updates

#### Phase 1: Extend SYNCABLE_TABLES
```typescript
// apps/frontend/src/services/syncService.ts
const SYNCABLE_TABLES = [
  'user_preferences',
  'app_settings',
  'feature_flags',        // 🆕 Feature toggles
  'exercises',            // ✅ Enhanced with user content
  'exercise_shares',      // 🆕 Sharing permissions  
  'exercise_ratings',     // 🆕 Community ratings
  'exercise_videos',      // 🆕 Custom videos
  'workouts',             // ✅ Enhanced with user content
  'workout_shares',       // 🆕 Workout sharing
  'workout_ratings',      // 🆕 Workout ratings
  'user_favorites',       // 🆕 Unified favorites
  'content_moderation',   // 🆕 Moderation queue
  'activity_logs',
  'workout_sessions'
] as const;
```

#### Phase 2: Server-Side Sync Updates
```typescript
// supabase/functions/_shared/sync-processor.ts
async function getServerChanges(supabase, userId, tableName, since) {
  let query = supabase.from(tableName).select('*');

  // Apply user scoping and public content rules
  switch (tableName) {
    case 'exercises':
    case 'workouts':
      // User's own content + public community content
      query = query.or(`owner_id.eq.${userId},and(is_public.eq.true,deleted.eq.false)`);
      break;
      
    case 'exercise_shares':
    case 'workout_shares':
      // Shares TO this user + shares FROM this user
      query = query.or(`shared_with_user_id.eq.${userId},owner_id.eq.${userId}`);
      break;
      
    case 'feature_flags':
      // Admin-managed, read-only for clients
      query = query.eq('target_audience', 'all')
                   .or(`target_audience.eq.authenticated,target_audience.eq.${userRole}`);
      break;
      
    default:
      // Standard user-scoped tables
      query = query.eq('owner_id', userId);
      break;
  }

  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data: records, error } = await query;
  // ... rest of existing logic
}
```

#### Phase 3: Enhanced Conflict Resolution
The existing conflict resolution handles user content perfectly, but we'll add special rules for shared content:

```typescript
function resolveConflict(existing, incoming) {
  // Special case: shared content updates
  if (existing.owner_id !== incoming.owner_id) {
    // Never allow clients to modify ownership
    return { ...incoming, owner_id: existing.owner_id };
  }
  
  // Special case: public content moderation
  if ('moderation_status' in existing && existing.moderation_status === 'rejected') {
    // Rejected content cannot be restored by client
    return existing;
  }
  
  // Standard last-writer-wins
  const existingTime = new Date(existing.updated_at || 0);
  const incomingTime = new Date(incoming.updated_at || 0);
  return incomingTime >= existingTime ? incoming : existing;
}
```

### 🔄 Migration Strategy for Favorites

The sync service needs to handle the migration from `favorite_exercises` TEXT[] to the new `user_favorites` table:

```typescript
// One-time migration during sync
private async migrateFavoritesToNewTable(): Promise<void> {
  const db = this.storageService.getDatabase();
  
  try {
    // Get user preferences with old favorites format
    const prefs = await db.user_preferences.toArray();
    const userPref = prefs[0];
    
    if (userPref?.favorite_exercises?.length > 0) {
      const now = new Date().toISOString();
      const userId = this.authService.getAuthState().userId;
      
      // Convert TEXT[] to user_favorites records
      const favoriteRecords = userPref.favorite_exercises.map((exerciseId: string) => ({
        id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        owner_id: userId,
        item_id: exerciseId,
        item_type: 'exercise' as const,
        exercise_type: exerciseId.includes('-') ? 'builtin' : 'user_created' as const,
        created_at: now,
        updated_at: now,
        deleted: false,
        version: 1,
        dirty: 1  // Mark for sync
      }));
      
      // Insert into new user_favorites table
      await db.user_favorites.bulkAdd(favoriteRecords);
      
      // Clear old favorites array and mark for sync
      await db.user_preferences.update(userPref.id, {
        favorite_exercises: [],
        updated_at: now,
        dirty: 1
      });
      
      console.log(`Migrated ${favoriteRecords.length} favorites to new table format`);
    }
  } catch (error) {
    console.error('Favorites migration failed:', error);
    // Non-fatal - existing favorites remain in old format
  }
}
```

### 🚀 Performance Considerations

#### 1. Sync Batch Limits
The existing service limits to 5 records per table per sync to avoid overwhelming the edge function. This remains appropriate for user-created content.

#### 2. Public Content Sync Strategy
Public content creates a challenge - all users shouldn't sync all public exercises. We'll implement smart filtering:

```typescript
// Smart public content sync - only popular/relevant content
async function getPublicContentChanges(supabase, userId, tableName, since) {
  if (!['exercises', 'workouts'].includes(tableName)) return { upserts: [], deletes: [] };
  
  // Sync public content based on user engagement
  const query = supabase
    .from(tableName)
    .select('*, exercise_ratings(rating)')
    .eq('is_public', true)
    .eq('deleted', false)
    .eq('moderation_status', 'approved')
    .gte('rating_average', 4.0)  // Only highly-rated content
    .gte('usage_count', 10)      // Content that's actually used
    .order('updated_at', { ascending: false })
    .limit(20);  // Reasonable limit for discovery
    
  if (since) {
    query.gt('updated_at', since);
  }
  
  return await query;
}
```

#### 3. Incremental Discovery
Rather than syncing all public content, we'll use on-demand loading for discovery features while keeping the core sync lean.

### ✅ Conclusion

The existing sync service is **exceptionally well-designed** for user-created content. The required changes are minimal and additive:

1. **✅ Database Schema**: Already supports `owner_id` pattern
2. **✅ Conflict Resolution**: Handles user content correctly  
3. **✅ Validation Framework**: Easily extended for new tables
4. **🔄 Sync Tables**: Simple addition of new tables to SYNCABLE_TABLES
5. **🔄 Public Content**: Smart filtering for community discovery
6. **🔄 Favorites Migration**: One-time migration preserves existing data

The sync service will handle user-created exercises and workouts **seamlessly** because it was designed with multi-user, owner-scoped data in mind. The additional tables (shares, ratings, videos) follow the same proven patterns.

**Risk Level: LOW** - The existing sync architecture is perfectly suited for this expansion.

---

## Internationalization (i18n) Impact Analysis

### Current i18n Architecture

RepCue supports **6 languages** with comprehensive localization:
- **English (en)** - Primary/fallback language
- **Dutch (nl)** - Netherlands  
- **Frisian (fy)** - West Frisian
- **Arabic (ar, ar-EG)** - Standard Arabic + Egyptian variant with RTL support
- **German (de)** - German
- **Spanish (es)** - Spanish
- **French (fr)** - French

**Namespace Structure**: `common`, `titles`, `a11y`, `exercises`, `auth`

### 🌐 New i18n Requirements

User-created content introduces **significant new UI strings** across multiple namespaces:

#### 1. New Namespace: `community.json`
Community and sharing features need a dedicated namespace:

```json
{
  "community": {
    "title": "Community",
    "subtitle": "Discover and share exercises with the community",
    "discoverExercises": "Discover Exercises", 
    "discoverWorkouts": "Discover Workouts",
    "myCreations": "My Creations",
    "sharedWithMe": "Shared With Me",
    "createExercise": "Create Exercise",
    "createWorkout": "Create Workout", 
    "shareExercise": "Share Exercise",
    "shareWorkout": "Share Workout",
    "copyExercise": "Copy Exercise",
    "copyWorkout": "Copy Workout",
    "reportContent": "Report Content",
    "moderationStatus": "Moderation Status",
    "pendingReview": "Pending Review",
    "approved": "Approved", 
    "rejected": "Rejected",
    "publicContent": "Public Content",
    "privateContent": "Private Content",
    "sharedContent": "Shared Content",
    "originalCreator": "Created by {{creator}}",
    "usageCount_one": "Used {{count}} time",
    "usageCount_other": "Used {{count}} times",
    "ratingAverage": "{{rating}} stars ({{count}} reviews)",
    "noRatings": "No ratings yet",
    "rateThisExercise": "Rate this exercise",
    "rateThisWorkout": "Rate this workout",
    "writeReview": "Write a review",
    "editReview": "Edit review",
    "yourRating": "Your rating",
    "communityRatings": "Community ratings",
    "sortBy": "Sort by",
    "sortPopular": "Most Popular", 
    "sortRecent": "Recently Added",
    "sortRated": "Highest Rated",
    "filterHasVideo": "Has video",
    "createdBy": "Created by",
    "sharedBy": "Shared by",
    "permissions": "Permissions",
    "permissionView": "View only",
    "permissionCopy": "Can copy",
    "shareWithEmail": "Share with email",
    "sharePublicly": "Share publicly",
    "removeShare": "Remove share",
    "shareSuccess": "Successfully shared!",
    "copySuccess": "Successfully copied!",
    "reportSuccess": "Content reported for review",
    "emptyDiscovery": "No community content found",
    "emptyMyCreations": "You haven't created any exercises yet",
    "emptyShared": "No content has been shared with you"
  }
}
```

#### 2. Enhanced `exercises.json` 
User-created exercises need additional strings:

```json
{
  "exercises": {
    // ... existing keys ...
    "createNew": "Create New Exercise",
    "editExercise": "Edit Exercise", 
    "myExercises": "My Exercises",
    "builtinExercises": "Built-in Exercises", 
    "userCreated": "User Created",
    "exerciseName": "Exercise Name",
    "exerciseDescription": "Description",
    "exerciseInstructions": "Instructions",
    "exerciseCategory": "Category",
    "exerciseType": "Exercise Type",
    "repDuration": "Rep Duration (seconds)",
    "addInstruction": "Add Instruction",
    "removeInstruction": "Remove instruction",
    "instructionPlaceholder": "e.g., Keep your back straight",
    "instructionStep": "Step {{number}}",
    "customDuration": "Custom Duration",
    "customSetsReps": "Custom Sets & Reps", 
    "saveExercise": "Save Exercise",
    "deleteExercise": "Delete Exercise",
    "deleteConfirm": "Delete '{{name}}'? This action cannot be undone.",
    "nameRequired": "Exercise name is required",
    "instructionsRequired": "At least one instruction is required",
    "durationInvalid": "Duration must be a positive number",
    "setsInvalid": "Sets must be a positive number", 
    "repsInvalid": "Reps must be a positive number",
    "createSuccess": "Exercise created successfully!",
    "updateSuccess": "Exercise updated successfully!",
    "deleteSuccess": "Exercise deleted successfully",
    "createFailed": "Failed to create exercise",
    "updateFailed": "Failed to update exercise",
    "deleteFailed": "Failed to delete exercise",
    "loadFailed": "Failed to load exercise",
    "moderationPending": "This exercise is under review",
    "moderationRejected": "This exercise was rejected during review",
    "moderationApproved": "This exercise has been approved",
    "videoUpload": "Upload Video",
    "videoRemove": "Remove Video", 
    "videoOptional": "Video demonstration (optional)",
    "videoUploading": "Uploading video...",
    "videoUploadSuccess": "Video uploaded successfully!",
    "videoUploadFailed": "Failed to upload video"
  }
}
```

#### 3. Enhanced `workouts.json`
User-created workouts need similar extensions:

```json
{
  "workouts": {
    // ... existing keys ...
    "createNew": "Create New Workout",
    "editWorkout": "Edit Workout",
    "myWorkouts": "My Workouts", 
    "builtinWorkouts": "Built-in Workouts",
    "userCreated": "User Created",
    "shareWorkout": "Share Workout",
    "copyWorkout": "Copy Workout",
    "workoutCreator": "Created by {{creator}}",
    "basedOnTemplate": "Based on {{original}} by {{creator}}",
    "makePublic": "Make Public",
    "makePrivate": "Make Private",
    "shareWithUsers": "Share with specific users",
    "publicWorkout": "Public Workout",
    "privateWorkout": "Private Workout",
    "sharedWorkout": "Shared Workout"
  }
}
```

#### 4. New Namespace: `moderation.json`
Content moderation UI needs dedicated strings:

```json
{
  "moderation": {
    "title": "Content Moderation",
    "dashboard": "Moderation Dashboard",
    "pendingReview": "Pending Review",
    "reviewContent": "Review Content",
    "approveContent": "Approve",
    "rejectContent": "Reject", 
    "requestChanges": "Request Changes",
    "moderationNotes": "Moderation Notes",
    "contentApproved": "Content approved",
    "contentRejected": "Content rejected", 
    "changesRequested": "Changes requested",
    "appealDecision": "Appeal Decision",
    "reportContent": "Report Content",
    "reportReason": "Report Reason",
    "reportReasonSpam": "Spam",
    "reportReasonInappropriate": "Inappropriate content",
    "reportReasonCopyright": "Copyright violation",
    "reportReasonSafety": "Safety concerns",
    "reportReasonOther": "Other",
    "reportSubmitted": "Report submitted for review",
    "appealSubmitted": "Appeal submitted for review",
    "feedbackType": "Feedback Type",
    "feedbackAppeal": "Appeal this decision", 
    "feedbackReport": "Report an issue",
    "feedbackSuggestion": "Suggest improvements",
    "moderationHistory": "Moderation History",
    "contentStats": "Content Statistics",
    "flaggedIssues": "Flagged Issues",
    "autoApproved": "Auto-approved",
    "humanReviewed": "Human reviewed",
    "confidenceScore": "AI Confidence: {{score}}%"
  }
}
```

#### 5. Enhanced `common.json`
New common actions and states:

```json
{
  "common": {
    // ... existing keys ...
    "create": "Create",
    "edit": "Edit", 
    "share": "Share",
    "copy": "Copy",
    "report": "Report",
    "rate": "Rate",
    "review": "Review", 
    "approve": "Approve",
    "reject": "Reject",
    "appeal": "Appeal",
    "public": "Public",
    "private": "Private",
    "shared": "Shared",
    "pending": "Pending",
    "approved": "Approved", 
    "rejected": "Rejected",
    "creator": "Creator",
    "original": "Original",
    "template": "Template",
    "instructions": "Instructions",
    "demonstration": "Demonstration",
    "community": "Community",
    "discovery": "Discovery",
    "moderation": "Moderation",
    "rating_one": "{{count}} star",
    "rating_other": "{{count}} stars",
    "usage_one": "{{count}} use", 
    "usage_other": "{{count}} uses",
    "permissions": "Permissions",
    "viewOnly": "View only",
    "canCopy": "Can copy",
    "emailAddress": "Email address",
    "uploadVideo": "Upload Video",
    "removeVideo": "Remove Video",
    "videoOptional": "Video (optional)",
    "writePlaceholder": "Write your {{type}} here...",
    "searchCommunity": "Search community content..."
  }
}
```

#### 6. Enhanced `a11y.json`
Accessibility strings for new features:

```json
{
  "a11y": {
    // ... existing keys ...
    "createExerciseButton": "Create new exercise",
    "editExerciseButton": "Edit exercise {{name}}",
    "shareExerciseButton": "Share exercise {{name}}",
    "copyExerciseButton": "Copy exercise {{name}}",
    "reportExerciseButton": "Report exercise {{name}}",
    "rateExerciseButton": "Rate exercise {{name}}",
    "removeInstructionButton": "Remove instruction {{number}}",
    "moveInstructionUpButton": "Move instruction {{number}} up",
    "moveInstructionDownButton": "Move instruction {{number}} down",
    "videoUploadArea": "Video upload area for exercise demonstration",
    "starRating": "Rate {{stars}} out of 5 stars",
    "exerciseCreatedBy": "Exercise created by {{creator}}",
    "workoutCreatedBy": "Workout created by {{creator}}",
    "moderationStatus": "Moderation status: {{status}}",
    "communityContentGrid": "Community content grid",
    "myCreationsGrid": "My created content grid", 
    "sharedContentGrid": "Content shared with me grid",
    "filterCommunityContent": "Filter community content",
    "sortCommunityContent": "Sort community content",
    "shareDialogControls": "Share settings and permissions",
    "ratingAndReviewForm": "Rating and review form",
    "contentModerationPanel": "Content moderation panel"
  }
}
```

### 📋 Implementation Strategy

#### Phase 1: Add English Keys First
All new features will be implemented with English keys first, then translated:

```typescript
// Feature development with i18n keys
const CreateExerciseForm = () => {
  const { t } = useTranslation(['exercises', 'common', 'a11y']);
  
  return (
    <form>
      <h2>{t('exercises:createNew')}</h2>
      <label>{t('exercises:exerciseName')}</label>
      <input placeholder={t('exercises:namePlaceholder')} />
      <button type="submit">
        {t('common:create')}
      </button>
    </form>
  );
};
```

#### Phase 2: Batch Translation Process
After English implementation is complete, batch translate all new keys:

```bash
# 1. Scan for new keys
pnpm i18n:scan

# 2. Generate translation templates
pnpm i18n:extract

# 3. Professional translation for all 6 languages
# Order: Dutch → German → Spanish → French → Arabic (Standard + Egyptian)
```

#### Phase 3: Translation Validation
Use automated and manual validation:

```typescript
// Automated validation in tests
describe('i18n completeness', () => {
  const requiredNamespaces = ['common', 'exercises', 'workouts', 'community', 'moderation'];
  const supportedLanguages = ['en', 'nl', 'fy', 'ar', 'ar-EG', 'de', 'es', 'fr'];
  
  supportedLanguages.forEach(lang => {
    requiredNamespaces.forEach(namespace => {
      it(`should have complete ${namespace} translations for ${lang}`, async () => {
        const enKeys = await loadTranslation('en', namespace);
        const langKeys = await loadTranslation(lang, namespace);
        
        expect(Object.keys(langKeys)).toEqual(Object.keys(enKeys));
      });
    });
  });
});
```

### 🔄 Translation Timeline

#### Week 1: English Implementation
- Add all English keys for user-created content features
- Implement UI components with proper i18n hooks
- Test feature functionality with English strings

#### Week 2: Professional Translation  
- **Dutch (nl)**: 2 days - High priority European market
- **German (de)**: 2 days - Major European market  
- **Spanish (es)**: 1 day - Global reach
- **French (fr)**: 1 day - European + global markets

#### Week 3: Arabic & Quality Assurance
- **Arabic (ar, ar-EG)**: 2 days - RTL layout testing required
- **Frisian (fy)**: 1 day - Regional completion
- **Quality Assurance**: 2 days - Native speaker review for all languages
- **RTL Testing**: 1 day - Arabic layout and directional flow

### 🌍 Special Considerations

#### RTL (Right-to-Left) Support
Arabic requires special attention for new UI elements:

```css
/* RTL-aware styles for new features */
.share-dialog {
  direction: ltr;
}

.rtl .share-dialog {
  direction: rtl;
}

.rtl .rating-stars {
  flex-direction: row-reverse;
}

.rtl .instruction-list {
  text-align: right;
  padding-right: 1rem;
  padding-left: 0;
}
```

#### Cultural Sensitivity
Exercise content and sharing features need cultural consideration:
- **Arabic markets**: Conservative exercise descriptions
- **European markets**: GDPR-compliant sharing language
- **General**: Inclusive language for all fitness levels

#### Pluralization Rules
Different languages have complex pluralization:

```json
// English (2 forms)
"exercises:usageCount_one": "Used {{count}} time",
"exercises:usageCount_other": "Used {{count}} times"

// Arabic (6 forms)  
"exercises:usageCount_zero": "لم يتم استخدامه",
"exercises:usageCount_one": "تم استخدامه مرة واحدة", 
"exercises:usageCount_two": "تم استخدامه مرتين",
"exercises:usageCount_few": "تم استخدامه {{count}} مرات",
"exercises:usageCount_many": "تم استخدامه {{count}} مرة",
"exercises:usageCount_other": "تم استخدامه {{count}} مرة"
```

### 📊 Translation Metrics

**Estimated New Keys**: ~200 keys across 4 new namespaces
**Total Translation Work**: 
- 6 languages × 200 keys = 1,200 translations
- Estimated effort: 40-50 hours professional translation
- Timeline: 2-3 weeks including review and testing

### ✅ Quality Assurance Process

1. **Automated Checks**: Missing keys, placeholder validation
2. **Native Speaker Review**: Cultural appropriateness and accuracy  
3. **UI Testing**: Layout testing across all languages
4. **RTL Validation**: Arabic layout and flow testing
5. **Context Review**: Ensure translations fit UI constraints

**Risk Level: MEDIUM** - Significant translation work required but well-defined process exists.

**Date**: September 3, 2025  
**Feature**: Allow authenticated users to create custom exercises and share them with other users  
**Impact**: High - Significant changes across frontend, backend, database, and sync system

---

## Executive Summary

This feature will transform RepCue from a static exercise catalog to a dynamic, community-driven platform. Users will be able to create custom exercises with full metadata (instructions, videos, categories, etc.) and share them publicly or with specific users.

### Key Changes Required:
- **Database Schema**: New tables for exercise sharing, permissions, and discovery
- **Exercise System**: Extend existing exercise model to support user authorship and sharing
- **UI/UX**: New creation/editing flows, discovery mechanisms, permission management
- **Sync System**: Handle shared exercises across user boundaries
- **Security**: Robust permission system and content moderation capabilities

---

## Current State Analysis

### Existing Exercise System
- **Static Catalog**: 20 predefined exercises in `apps/frontend/src/data/exercises.ts`
- **Database**: Exercises table with `owner_id` field already supports user ownership
- **Sync**: Full sync system in place with conflict resolution
- **UI**: Exercise browsing, filtering, favorites, video support

### Database Schema (Already Supporting User Exercises)
```sql
-- Current exercises table (from supabase/functions/create-tables/index.ts)
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category STRING NOT NULL,
    exercise_type STRING NOT NULL,
    instructions JSON NULL,
    is_favorite BOOLEAN DEFAULT false,
    rep_duration_seconds NUMBER NULL,
    -- Sync metadata
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false,
    version BIGINT DEFAULT 1
);
```

**Good news**: The database already supports user-owned exercises! We need to extend it for sharing.

---

## Implementation Plan

### Phase 1: Database Schema Extensions (3-4 days)

#### Task 1.1: Create Exercise & Workout Sharing Tables
```sql
-- Exercise sharing permissions
CREATE TABLE exercise_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id TEXT NOT NULL, -- Can be slug (builtin) or UUID (user-created)
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Exercise owner
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL, -- NULL = public
    permission_level VARCHAR(20) DEFAULT 'view', -- view, copy, edit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate shares
    UNIQUE(exercise_id, shared_with_user_id)
);

-- Workout sharing permissions (NEW)
CREATE TABLE workout_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL, -- NULL = public
    permission_level VARCHAR(20) DEFAULT 'view', -- view, copy, edit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workout_id, shared_with_user_id)
);

-- Exercise metadata for community features
CREATE TABLE exercise_community_data (
    exercise_id TEXT PRIMARY KEY, -- Can be slug or UUID
    is_public BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false, -- Admin-verified quality
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    copy_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    has_video BOOLEAN DEFAULT false, -- Tracks if custom video exists
    video_url TEXT, -- Optional custom video URL
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout community data (NEW)
CREATE TABLE workout_community_data (
    workout_id UUID PRIMARY KEY REFERENCES workouts(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    copy_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise ratings/reviews
CREATE TABLE exercise_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified BOOLEAN DEFAULT false, -- Moderation flag
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(exercise_id, user_id)
);

-- Workout ratings/reviews (NEW)
CREATE TABLE workout_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workout_id, user_id)
);

-- Unified favorites system (MIGRATION from user_preferences.favorite_exercises)
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL, -- Can be slug (builtin) or UUID (user-created)
    exercise_type VARCHAR(20) DEFAULT 'builtin', -- 'builtin' | 'user_created' | 'shared'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, exercise_id)
);

-- Custom video uploads (for future implementation)
CREATE TABLE exercise_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id TEXT NOT NULL,
    uploader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    file_size BIGINT,
    duration_seconds INTEGER,
    is_approved BOOLEAN DEFAULT false, -- Moderation flag
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Multiple videos per exercise allowed (different angles, etc.)
    UNIQUE(exercise_id, uploader_id, video_url)
);
```

#### Task 1.2: Feature Toggle System & Content Moderation Infrastructure
```sql
-- Feature flags table for granular control
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_name VARCHAR(100) UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    description TEXT,
    target_audience VARCHAR(50) DEFAULT 'all', -- 'all', 'authenticated', 'beta', 'admin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial feature flags
INSERT INTO feature_flags (flag_name, is_enabled, description, target_audience) VALUES
('user_created_exercises', false, 'Allow users to create custom exercises', 'authenticated'),
('user_created_workouts', false, 'Allow users to create and share workouts', 'authenticated'),
('exercise_sharing', false, 'Enable exercise sharing functionality', 'authenticated'),
('workout_sharing', false, 'Enable workout sharing functionality', 'authenticated'),
('exercise_rating', false, 'Enable exercise rating and review system', 'authenticated'),
('workout_rating', false, 'Enable workout rating and review system', 'authenticated'),
('custom_video_upload', false, 'Allow custom video uploads for exercises', 'beta');

-- Content moderation infrastructure (for future AI moderation)
CREATE TABLE content_moderation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL, -- 'exercise', 'workout', 'review', 'video'
    content_id TEXT NOT NULL, -- Reference to the content being moderated
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'flagged'
    ai_confidence DECIMAL(3,2), -- AI moderation confidence score (0.00-1.00)
    ai_reasoning TEXT, -- AI explanation for decision
    human_reviewer_id UUID REFERENCES auth.users(id),
    human_decision VARCHAR(20), -- 'approved', 'rejected', 'needs_review'
    human_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    
    UNIQUE(content_type, content_id)
);
```

#### Task 1.3: Favorites Migration & Updated RLS Policies
```sql
-- Migration script for existing favorites
DO $$
DECLARE
    user_record RECORD;
    exercise_id TEXT;
BEGIN
    -- Migrate existing favorites from user_preferences.favorite_exercises
    FOR user_record IN 
        SELECT owner_id, favorite_exercises 
        FROM user_preferences 
        WHERE favorite_exercises IS NOT NULL AND array_length(favorite_exercises, 1) > 0
    LOOP
        -- Insert each favorite exercise into new table
        FOREACH exercise_id IN ARRAY user_record.favorite_exercises
        LOOP
            INSERT INTO user_favorites (user_id, exercise_id, exercise_type)
            VALUES (user_record.owner_id, exercise_id, 'builtin')
            ON CONFLICT (user_id, exercise_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Exercise access: own exercises + shared exercises + public exercises + builtin exercises
CREATE POLICY "Users can access exercises" ON exercises FOR SELECT USING (
    owner_id = auth.uid() OR  -- Own exercises
    owner_id IS NULL OR       -- System/builtin exercises (owner_id = NULL)
    id IN (  -- Shared exercises
        SELECT exercise_id FROM exercise_shares 
        WHERE shared_with_user_id = auth.uid() OR shared_with_user_id IS NULL
    ) OR
    id IN (  -- Public exercises
        SELECT exercise_id FROM exercise_community_data WHERE is_public = true
    )
);

-- Users can only modify their own exercises (not builtin ones)
CREATE POLICY "Users can modify own exercises" ON exercises 
    FOR ALL USING (owner_id = auth.uid() AND owner_id IS NOT NULL);

-- Workout access policies (similar pattern)
CREATE POLICY "Users can access workouts" ON workouts FOR SELECT USING (
    owner_id = auth.uid() OR  -- Own workouts
    id IN (  -- Shared workouts
        SELECT workout_id FROM workout_shares 
        WHERE shared_with_user_id = auth.uid() OR shared_with_user_id IS NULL
    ) OR
    id IN (  -- Public workouts
        SELECT workout_id FROM workout_community_data WHERE is_public = true
    )
);

CREATE POLICY "Users can modify own workouts" ON workouts FOR ALL USING (owner_id = auth.uid());

-- Sharing permissions
CREATE POLICY "Exercise owners can manage shares" ON exercise_shares 
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Workout owners can manage shares" ON workout_shares 
    FOR ALL USING (owner_id = auth.uid());

-- Favorites access
CREATE POLICY "Users can manage their favorites" ON user_favorites 
    FOR ALL USING (user_id = auth.uid());

-- Community data access
CREATE POLICY "Public exercise community data" ON exercise_community_data 
    FOR SELECT USING (is_public = true);

CREATE POLICY "Public workout community data" ON workout_community_data 
    FOR SELECT USING (is_public = true);

-- Ratings access
CREATE POLICY "Users can rate accessible content" ON exercise_ratings 
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can rate accessible workouts" ON workout_ratings 
    FOR ALL USING (user_id = auth.uid());
```

#### Task 1.4: Extend Exercise & Workout Models
Update TypeScript types to support new fields:
```typescript
// In apps/frontend/src/types/index.ts
export interface Exercise extends SyncMetadata {
  // Existing fields...
  name: string;
  description?: string;
  category: ExerciseCategory;
  
  // Enhanced fields for user-created exercises
  is_custom: boolean; // true for user-created, false for system exercises
  is_public?: boolean; // can be shared publicly
  is_verified?: boolean; // admin-verified quality
  instructions?: ExerciseInstruction[]; // Rich instructions
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  equipment_needed?: string[]; // Required equipment
  muscle_groups?: string[]; // Target muscle groups
  created_by_display_name?: string; // Creator's display name (for UI)
  
  // Custom video support (optional)
  custom_video_url?: string; // User-uploaded video URL
  has_custom_video?: boolean; // Tracks if custom video exists
  
  // Community stats (read-only from server)
  rating_average?: number;
  rating_count?: number;
  copy_count?: number;
}

export interface Workout extends SyncMetadata {
  // Existing fields...
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  scheduled_days: Weekday[];
  is_active: boolean;
  estimated_duration?: number;
  
  // Enhanced fields for sharing
  is_custom: boolean; // true for user-created, false for system workouts
  is_public?: boolean; // can be shared publicly
  is_verified?: boolean; // admin-verified quality
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  created_by_display_name?: string; // Creator's display name
  tags?: string[]; // Workout tags (cardio, strength, etc.)
  
  // Community stats
  rating_average?: number;
  rating_count?: number;
  copy_count?: number;
}

export interface ExerciseInstruction {
  step: number;
  text: string;
  image_url?: string; // Future: step-by-step images
  duration_seconds?: number; // For timed steps
}

export interface ExerciseShare {
  id: string;
  exercise_id: string;
  owner_id: string;
  shared_with_user_id?: string; // undefined = public share
  permission_level: 'view' | 'copy' | 'edit';
  created_at: string;
}

export interface WorkoutShare {
  id: string;
  workout_id: string;
  owner_id: string;
  shared_with_user_id?: string;
  permission_level: 'view' | 'copy' | 'edit';
  created_at: string;
}

export interface ExerciseRating {
  id: string;
  exercise_id: string;
  user_id: string;
  rating: number; // 1-5
  review_text?: string;
  is_verified: boolean;
  created_at: string;
}

export interface WorkoutRating {
  id: string;
  workout_id: string;
  user_id: string;
  rating: number; // 1-5
  review_text?: string;
  is_verified: boolean;
  created_at: string;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  exercise_id: string; // Can be slug (builtin) or UUID (user-created)
  exercise_type: 'builtin' | 'user_created' | 'shared';
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  flag_name: string;
  is_enabled: boolean;
  description?: string;
  target_audience: 'all' | 'authenticated' | 'beta' | 'admin';
  created_at: string;
  updated_at: string;
}
```

### Phase 2: Backend API Extensions (3-4 days)

#### Task 2.1: Feature Flag Service
Create feature flag management system:

```typescript
// apps/frontend/src/services/featureFlagService.ts
class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: Map<string, FeatureFlag> = new Map();
  
  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }
  
  async loadFlags(): Promise<void> {
    const { data } = await supabase.from('feature_flags').select('*');
    data?.forEach(flag => this.flags.set(flag.flag_name, flag));
  }
  
  isEnabled(flagName: string, userRole: string = 'authenticated'): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    
    if (!flag.is_enabled) return false;
    
    // Check target audience
    if (flag.target_audience === 'all') return true;
    if (flag.target_audience === 'authenticated' && userRole !== 'anonymous') return true;
    if (flag.target_audience === userRole) return true;
    
    return false;
  }
  
  // Convenience methods
  canCreateExercises(): boolean { return this.isEnabled('user_created_exercises'); }
  canCreateWorkouts(): boolean { return this.isEnabled('user_created_workouts'); }
  canShareExercises(): boolean { return this.isEnabled('exercise_sharing'); }
  canShareWorkouts(): boolean { return this.isEnabled('workout_sharing'); }
  canRateExercises(): boolean { return this.isEnabled('exercise_rating'); }
  canRateWorkouts(): boolean { return this.isEnabled('workout_rating'); }
  canUploadVideos(): boolean { return this.isEnabled('custom_video_upload'); }
}
```

#### Task 2.2: Extend Sync Function for Shared Content
Modify `supabase/functions/sync/index.ts` to handle shared exercises and workouts:

```typescript
// Enhanced sync logic for exercises with mixed ID types
async function syncExercises(userId: string, clientExercises: Exercise[], since: string) {
  // Get user's own exercises (UUIDs)
  const ownExercises = await supabase
    .from('exercises')
    .select('*')
    .eq('owner_id', userId)
    .gte('updated_at', since);

  // Get shared exercises (UUIDs and slugs)
  const sharedExercises = await supabase
    .from('exercises')
    .select(`
      *,
      exercise_shares!inner(shared_with_user_id)
    `)
    .or(`exercise_shares.shared_with_user_id.eq.${userId},exercise_shares.shared_with_user_id.is.null`)
    .gte('updated_at', since);

  // Get public exercises
  const publicExercises = await supabase
    .from('exercises')
    .select(`
      *,
      exercise_community_data!inner(is_public)
    `)
    .eq('exercise_community_data.is_public', true)
    .gte('updated_at', since);

  // Get builtin exercises (owner_id IS NULL) - these use slug IDs
  const builtinExercises = await supabase
    .from('exercises')
    .select('*')
    .is('owner_id', null)
    .gte('updated_at', since);

  // Merge and deduplicate by ID
  const allServerExercises = [
    ...ownExercises.data || [],
    ...sharedExercises.data || [],
    ...publicExercises.data || [],
    ...builtinExercises.data || []
  ];

  return deduplicateById(allServerExercises);
}

// Similar function for workouts
async function syncWorkouts(userId: string, clientWorkouts: Workout[], since: string) {
  const ownWorkouts = await supabase
    .from('workouts')
    .select('*')
    .eq('owner_id', userId)
    .gte('updated_at', since);

  const sharedWorkouts = await supabase
    .from('workouts')
    .select(`
      *,
      workout_shares!inner(shared_with_user_id)
    `)
    .or(`workout_shares.shared_with_user_id.eq.${userId},workout_shares.shared_with_user_id.is.null`)
    .gte('updated_at', since);

  const publicWorkouts = await supabase
    .from('workouts')
    .select(`
      *,
      workout_community_data!inner(is_public)
    `)
    .eq('workout_community_data.is_public', true)
    .gte('updated_at', since);

  return deduplicateById([
    ...ownWorkouts.data || [],
    ...sharedWorkouts.data || [],
    ...publicWorkouts.data || []
  ]);
}
```

#### Task 2.3: New Edge Functions for Community Features
Create new Edge Functions:

```typescript
// supabase/functions/share-exercise/index.ts
export default async function shareExercise(req: Request) {
  const { exercise_id, shared_with_user_id, permission_level } = await req.json();
  
  // Check feature flag
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('is_enabled')
    .eq('flag_name', 'exercise_sharing')
    .single();
  
  if (!flag?.is_enabled) {
    throw new Error('Exercise sharing is not enabled');
  }
  
  // Validate ownership and permissions
  const exercise = await getExercise(exercise_id);
  if (exercise.owner_id !== getCurrentUserId()) {
    throw new Error('Not authorized');
  }
  
  await supabase.from('exercise_shares').upsert({
    exercise_id,
    owner_id: getCurrentUserId(),
    shared_with_user_id,
    permission_level
  });
}

// supabase/functions/share-workout/index.ts (similar pattern)
// supabase/functions/rate-exercise/index.ts
// supabase/functions/rate-workout/index.ts
// supabase/functions/copy-exercise/index.ts
// supabase/functions/copy-workout/index.ts
```

### Phase 3: Frontend UI Implementation (5-6 days)

#### Task 3.1: Feature Flag Integration & UI Guards
Update frontend to respect feature flags:

```typescript
// apps/frontend/src/hooks/useFeatureFlags.ts
export function useFeatureFlags() {
  const [flags, setFlags] = useState<Map<string, boolean>>(new Map());
  const { user } = useAuth();
  
  useEffect(() => {
    featureFlagService.loadFlags().then(() => {
      const userRole = user ? 'authenticated' : 'anonymous';
      setFlags(new Map([
        ['canCreateExercises', featureFlagService.canCreateExercises()],
        ['canCreateWorkouts', featureFlagService.canCreateWorkouts()],
        ['canShareExercises', featureFlagService.canShareExercises()],
        ['canShareWorkouts', featureFlagService.canShareWorkouts()],
        ['canRateContent', featureFlagService.canRateExercises()],
        ['canUploadVideos', featureFlagService.canUploadVideos()],
      ]));
    });
  }, [user]);
  
  return flags;
}
```

#### Task 3.2: Exercise & Workout Creation/Editing Flow
Create new pages and components:

```
apps/frontend/src/pages/
├── CreateExercisePage.tsx      # New exercise creation (feature-gated)
├── EditExercisePage.tsx        # Edit custom exercise
├── CreateWorkoutPage.tsx       # Enhanced with sharing options
├── EditWorkoutPage.tsx         # Enhanced with sharing options
├── ExerciseDetailPage.tsx      # View with sharing, rating, video
├── WorkoutDetailPage.tsx       # View with sharing and rating
└── CommunityPage.tsx           # Browse shared exercises/workouts

apps/frontend/src/components/
├── ExerciseForm.tsx            # Reusable form component
├── WorkoutForm.tsx             # Enhanced with sharing options
├── ExerciseInstructionEditor.tsx # Rich instruction editor
├── VideoUploadWidget.tsx       # Optional video upload (feature-gated)
├── ExerciseShareDialog.tsx     # Sharing configuration
├── WorkoutShareDialog.tsx      # Workout sharing configuration
├── RatingComponent.tsx         # Star rating with review text
├── ExerciseDiscovery.tsx       # Browse shared exercises
├── WorkoutDiscovery.tsx        # Browse shared workouts
└── ShareButton.tsx             # Universal share button
```

#### Task 3.3: Enhanced Exercises & Workouts Pages
Update existing pages with new functionality:

```typescript
// Enhanced ExercisePage.tsx
export function ExercisePage() {
  const flags = useFeatureFlags();
  const [viewMode, setViewMode] = useState<'all' | 'mine' | 'shared' | 'community'>('all');
  
  return (
    <div>
      <div className="page-header">
        <h1>Exercises</h1>
        {flags.get('canCreateExercises') && (
          <Link to="/exercises/create" className="btn-primary">
            Create Exercise
          </Link>
        )}
      </div>
      
      {/* View Mode Tabs */}
      <div className="view-tabs">
        <button 
          className={viewMode === 'all' ? 'active' : ''}
          onClick={() => setViewMode('all')}
        >
          All Exercises
        </button>
        <button 
          className={viewMode === 'mine' ? 'active' : ''}
          onClick={() => setViewMode('mine')}
        >
          My Exercises
        </button>
        {flags.get('canShareExercises') && (
          <>
            <button 
              className={viewMode === 'shared' ? 'active' : ''}
              onClick={() => setViewMode('shared')}
            >
              Shared with Me
            </button>
            <button 
              className={viewMode === 'community' ? 'active' : ''}
              onClick={() => setViewMode('community')}
            >
              Community
            </button>
          </>
        )}
      </div>
      
      <ExerciseGrid 
        exercises={filteredExercises}
        viewMode={viewMode}
        showCreator={viewMode !== 'mine'}
        showStats={viewMode === 'community'}
        showShareButton={flags.get('canShareExercises')}
        showRating={flags.get('canRateContent')}
        onCopy={copyExercise}
        onRate={rateExercise}
        onShare={shareExercise}
      />
    </div>
  );
}
```

#### Task 3.4: Unified Favorites System
Update favorites to work with mixed ID types:

```typescript
// apps/frontend/src/services/favoritesService.ts
class FavoritesService {
  private static instance: FavoritesService;
  
  static getInstance(): FavoritesService {
    if (!FavoritesService.instance) {
      FavoritesService.instance = new FavoritesService();
    }
    return FavoritesService.instance;
  }
  
  async toggleFavorite(exerciseId: string, exerciseType: 'builtin' | 'user_created' | 'shared'): Promise<boolean> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    
    // Check if already favorited
    const existing = await this.isFavorite(exerciseId);
    
    if (existing) {
      // Remove from favorites
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId);
      return false;
    } else {
      // Add to favorites
      await supabase
        .from('user_favorites')
        .insert({
          user_id: userId,
          exercise_id: exerciseId,
          exercise_type: exerciseType
        });
      return true;
    }
  }
  
  async getFavorites(): Promise<UserFavorite[]> {
    const userId = getCurrentUserId();
    if (!userId) return [];
    
    const { data } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return data || [];
  }
  
  async isFavorite(exerciseId: string): Promise<boolean> {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .single();
    
    return !!data;
  }
}
```

### Phase 4: Discovery, Sharing & Rating Features (4-5 days)

#### Task 4.1: Rating & Review System
```typescript
// RatingComponent.tsx
interface RatingComponentProps {
  contentId: string;
  contentType: 'exercise' | 'workout';
  currentRating?: ExerciseRating | WorkoutRating;
  averageRating?: number;
  ratingCount?: number;
  canRate: boolean;
  onRate: (rating: number, review?: string) => Promise<void>;
}

export function RatingComponent({ 
  contentId, 
  contentType, 
  currentRating, 
  averageRating, 
  ratingCount, 
  canRate, 
  onRate 
}: RatingComponentProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState(currentRating?.review_text || '');
  const [selectedRating, setSelectedRating] = useState(currentRating?.rating || 0);

  return (
    <div className="rating-component">
      {/* Display average rating */}
      <div className="rating-display">
        <StarDisplay rating={averageRating || 0} />
        <span className="rating-text">
          {averageRating?.toFixed(1) || '0.0'} ({ratingCount || 0} reviews)
        </span>
      </div>

      {/* User rating input */}
      {canRate && (
        <div className="user-rating">
          <h4>Rate this {contentType}</h4>
          <StarInput 
            value={selectedRating}
            onChange={setSelectedRating}
          />
          
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="btn-secondary"
          >
            {currentRating ? 'Edit Review' : 'Add Review'}
          </button>

          {showReviewForm && (
            <div className="review-form">
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your thoughts about this exercise..."
                rows={3}
              />
              <div className="form-actions">
                <button
                  onClick={() => onRate(selectedRating, reviewText)}
                  className="btn-primary"
                  disabled={selectedRating === 0}
                >
                  {currentRating ? 'Update Rating' : 'Submit Rating'}
                </button>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Task 4.2: Video Upload Widget (Feature-Gated)
```typescript
// VideoUploadWidget.tsx
interface VideoUploadWidgetProps {
  exerciseId: string;
  currentVideoUrl?: string;
  onVideoUploaded: (videoUrl: string) => void;
  canUpload: boolean;
}

export function VideoUploadWidget({ 
  exerciseId, 
  currentVideoUrl, 
  onVideoUploaded, 
  canUpload 
}: VideoUploadWidgetProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!canUpload) {
    return (
      <div className="video-upload-disabled">
        <p>Video uploads are not available yet.</p>
        <p>You can add a video URL placeholder for now.</p>
        <input
          type="url"
          placeholder="Video URL (optional)"
          defaultValue={currentVideoUrl}
          onChange={(e) => onVideoUploaded(e.target.value)}
        />
      </div>
    );
  }

  const handleVideoUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Future implementation: Upload to Supabase Storage
      // For now, just simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // Simulate upload completion
      setTimeout(() => {
        clearInterval(progressInterval);
        setUploading(false);
        setUploadProgress(0);
        onVideoUploaded(`/uploads/exercises/${exerciseId}/${file.name}`);
      }, 2000);

    } catch (error) {
      console.error('Video upload failed:', error);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="video-upload-widget">
      <h4>Exercise Video</h4>
      
      {currentVideoUrl ? (
        <div className="current-video">
          <video src={currentVideoUrl} controls />
          <button onClick={() => onVideoUploaded('')}>Remove Video</button>
        </div>
      ) : (
        <div className="upload-area">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
            disabled={uploading}
          />
          
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span>{uploadProgress}% uploaded</span>
            </div>
          )}
        </div>
      )}
      
      <p className="upload-hint">
        Upload a demonstration video for this exercise (optional)
      </p>
    </div>
  );
}
```

#### Task 4.3: Community Discovery Pages
```typescript
// CommunityPage.tsx
export function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'exercises' | 'workouts'>('exercises');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rated'>('popular');
  const [filters, setFilters] = useState({
    category: 'all',
    difficulty: 'all',
    hasVideo: false
  });

  return (
    <div className="community-page">
      <div className="page-header">
        <h1>Community Content</h1>
        <p>Discover exercises and workouts created by the community</p>
      </div>

      {/* Content Type Tabs */}
      <div className="content-tabs">
        <button
          className={activeTab === 'exercises' ? 'active' : ''}
          onClick={() => setActiveTab('exercises')}
        >
          Exercises
        </button>
        <button
          className={activeTab === 'workouts' ? 'active' : ''}
          onClick={() => setActiveTab('workouts')}
        >
          Workouts
        </button>
      </div>

      {/* Filters & Sorting */}
      <div className="discovery-filters">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="popular">Most Popular</option>
          <option value="recent">Recently Added</option>
          <option value="rated">Highest Rated</option>
        </select>

        <select 
          value={filters.category} 
          onChange={(e) => setFilters({...filters, category: e.target.value})}
        >
          <option value="all">All Categories</option>
          {Object.values(ExerciseCategory).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select 
          value={filters.difficulty} 
          onChange={(e) => setFilters({...filters, difficulty: e.target.value})}
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={filters.hasVideo}
            onChange={(e) => setFilters({...filters, hasVideo: e.target.checked})}
          />
          Has Video
        </label>
      </div>

      {/* Content Grid */}
      {activeTab === 'exercises' ? (
        <ExerciseDiscoveryGrid 
          filters={filters}
          sortBy={sortBy}
          showCreator={true}
          showStats={true}
          showRating={true}
        />
      ) : (
        <WorkoutDiscoveryGrid 
          filters={filters}
          sortBy={sortBy}
          showCreator={true}
          showStats={true}
          showRating={true}
        />
      )}
    </div>
  );
}
```

#### Task 4.4: Enhanced Sharing Dialogs
```typescript
// ExerciseShareDialog.tsx
export function ExerciseShareDialog({ exercise, onClose }: Props) {
  const [isPublic, setIsPublic] = useState(exercise.is_public || false);
  const [shareEmail, setShareEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'copy'>('view');
  const [shares, setShares] = useState<ExerciseShare[]>([]);

  return (
    <Dialog onClose={onClose}>
      <div className="share-dialog">
        <h2>Share "{exercise.name}"</h2>

        {/* Public Sharing Toggle */}
        <div className="public-sharing">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span className="toggle-text">
              Make public for community discovery
            </span>
          </label>
          {isPublic && (
            <p className="help-text">
              Public exercises appear in community search and can be copied by anyone.
            </p>
          )}
        </div>

        {/* Direct Sharing */}
        <div className="direct-sharing">
          <h3>Share with specific users</h3>
          <div className="share-form">
            <input
              type="email"
              placeholder="Enter email address"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
            />
            <select 
              value={permission} 
              onChange={(e) => setPermission(e.target.value as 'view' | 'copy')}
            >
              <option value="view">View only</option>
              <option value="copy">Can copy</option>
            </select>
            <button 
              onClick={handleDirectShare}
              disabled={!shareEmail.includes('@')}
              className="btn-primary"
            >
              Share
            </button>
          </div>
        </div>

        {/* Current Shares List */}
        <div className="current-shares">
          <h3>Currently shared with</h3>
          {shares.length === 0 ? (
            <p>Not shared with anyone yet.</p>
          ) : (
            <div className="shares-list">
              {shares.map(share => (
                <div key={share.id} className="share-item">
                  <span className="share-target">
                    {share.shared_with_user_id ? 
                      getUserDisplayName(share.shared_with_user_id) : 
                      'Public'
                    }
                  </span>
                  <span className="share-permission">
                    {share.permission_level}
                  </span>
                  <button 
                    onClick={() => removeShare(share.id)}
                    className="btn-danger-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialog Actions */}
        <div className="dialog-actions">
          <button onClick={handleSave} className="btn-primary">
            Save Changes
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}
```

### Phase 5: Storage & Sync Updates (2-3 days)

#### Task 5.1: Update StorageService
Extend `apps/frontend/src/services/storageService.ts`:

```typescript
class StorageService {
  // Existing methods...
  
  async createCustomExercise(exerciseData: Omit<Exercise, SyncMetadata>): Promise<Exercise> {
    if (!consentService.hasConsent()) {
      throw new Error('Storage consent required');
    }
    
    const exercise = prepareUpsert({
      ...exerciseData,
      id: generateUuid(),
      is_custom: true,
      is_public: false,
      owner_id: getCurrentUserId(),
    });
    
    await this.db.exercises.add(exercise);
    return exercise;
  }
  
  async getSharedExercises(): Promise<Exercise[]> {
    // Get exercises shared with current user (synced from server)
    return this.db.exercises
      .where('owner_id')
      .notEqual(getCurrentUserId() || '')
      .and(exercise => !exercise.deleted)
      .toArray();
  }
  
  async copyExercise(sourceExercise: Exercise): Promise<Exercise> {
    const copy = prepareUpsert({
      ...sourceExercise,
      id: generateUuid(),
      name: `${sourceExercise.name} (Copy)`,
      owner_id: getCurrentUserId(),
      is_custom: true,
      is_public: false,
      // Remove community stats
      rating_average: undefined,
      rating_count: undefined,
      copy_count: undefined,
    });
    
    await this.db.exercises.add(copy);
    return copy;
  }
}
```

#### Task 5.2: Update SyncService
Modify sync logic to handle shared exercises without conflicts:

```typescript
// In syncService.ts
class SyncService {
  async syncExercises(since: string): Promise<SyncResult> {
    const localExercises = await storageService.getAllExercises();
    const ownExercises = localExercises.filter(e => e.owner_id === getCurrentUserId());
    
    // Only sync owned exercises to server (not shared ones)
    const result = await this.syncTable('exercises', ownExercises, since);
    
    // Server returns: own exercises + shared exercises + public exercises
    // Local sync merges them appropriately
    return result;
  }
}
```

### Phase 6: Testing & Polish (2-3 days)

#### Task 6.1: Unit Tests
- Exercise creation/editing components
- Sharing permission logic
- Sync behavior with shared exercises
- Storage service methods

#### Task 6.2: E2E Tests
- Complete exercise creation flow
- Exercise sharing workflow
- Discovery and copying flow
- Permission verification

#### Task 6.3: i18n Updates
Add new translation keys:
```json
{
  "exercise": {
    "create": "Create Exercise",
    "edit": "Edit Exercise",
    "share": "Share Exercise",
    "copy": "Copy Exercise",
    "makePublic": "Make Public",
    "shareWith": "Share with...",
    "createdBy": "Created by {{name}}",
    "communityExercises": "Community Exercises",
    "myExercises": "My Exercises",
    "sharedWithMe": "Shared with Me"
  }
}
```

---

## Security Considerations

### Data Privacy & Permissions
- **RLS Enforcement**: All database access controlled by Row Level Security
- **Permission Validation**: Server-side validation of all sharing operations
- **Content Moderation**: Admin tools to review/remove inappropriate exercises
- **Privacy Controls**: Users can make exercises private/public at any time

### Potential Risks & Mitigations
- **Spam/Inappropriate Content**: Admin review system for public exercises
- **Copyright Issues**: Clear terms of service, user responsibility
- **Data Leakage**: Strict RLS policies prevent unauthorized access
- **Sync Conflicts**: Read-only shared exercises prevent ownership conflicts

---

## Migration Strategy

### Phase 1: Backward Compatibility
- All existing functionality remains unchanged
- Static exercise catalog becomes "system exercises" (owner_id = null)
- New features only available to authenticated users

### Phase 2: Data Migration
- No existing data migration needed
- System exercises marked with special owner_id or is_system flag
- User favorites and settings preserved

### Phase 3: Rollout
- Feature flag controlled release
- Start with power users/beta testers
- Gradual rollout to all authenticated users

---

## Future Enhancements

### Phase 2 Features (Beyond Initial Release)
- **Exercise Ratings & Reviews**: Community feedback system
- **Exercise Collections**: Curated sets of exercises
- **Video Upload**: User-generated exercise videos
- **Exercise Templates**: Pre-filled exercise templates
- **Advanced Search**: Full-text search, filtering by equipment/muscle groups
- **Exercise Analytics**: Usage statistics, popular trends

### Community Features
- **Follow Creators**: Subscribe to specific exercise creators
- **Exercise Challenges**: Community workout challenges
- **Verification System**: Quality verification for trusted creators
- **Exercise Competitions**: Community contests for best exercises

---

## Success Metrics

### User Engagement
- Number of custom exercises created per user
- Exercise sharing rate and virality
- Time spent in exercise discovery
- User retention after creating first exercise

### Content Quality
- Average exercise rating
- Copy/usage rate of shared exercises
- User feedback and reviews
- Admin moderation volume

### Technical Performance
- Sync performance with larger exercise datasets
- App performance with expanded exercise catalog
- Database query performance for discovery features

---

## Conclusion

This feature represents a significant evolution of RepCue from a static exercise app to a dynamic, community-driven platform. The implementation plan leverages existing infrastructure (database schema, sync system, authentication) while adding the necessary components for user-generated content and sharing.

**Key Benefits:**
- ✅ Leverages existing database schema and sync infrastructure
- ✅ Maintains backward compatibility with current features  
- ✅ Provides clear path for community growth
- ✅ Includes robust security and privacy controls
- ✅ Enables future monetization opportunities (premium exercises, creator tools)

**Estimated Timeline: 15-20 development days** across 6 phases with parallel work possible on UI and backend components.

The phased approach allows for incremental delivery and user feedback incorporation while maintaining system stability throughout the implementation process.
