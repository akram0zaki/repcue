# Supabase Changes - November 23, 2025

## Summary
Updated AI Workout Builder Edge Function to support multi-goal selection with optional goal duration field.

## Changes Made

### Edge Function: `generate-ai-workout`

**Date**: 2025-11-23  
**Type**: Function Update  
**Status**: Local Changes Only (NOT YET DEPLOYED)

#### Files Modified:

1. **`supabase/functions/generate-ai-workout/security.ts`**
   - **Change**: Updated request validation to accept `goals` array instead of single `goal`
   - **Details**:
     - Changed validation from `responses.goal` (string) to `responses.goals` (array)
     - Added `marathon_des_sables` to valid goals list
     - Added validation for optional `goalDuration` field (1-24 months)
     - Updated `sanitizeInput()` to handle `goals` array and `goalDuration`
   - **Breaking Change**: Yes - API contract changed from single goal to goals array

2. **`supabase/functions/generate-ai-workout/prompt-builder.ts`**
   - **Change**: Updated `UserProfile` interface and AI prompt generation
   - **Details**:
     - Changed `goal: string` to `goals: string[]` in UserProfile type
     - Added optional `goalDuration?: number` field
     - Added "Marathon des Sables Preparation" to goal labels
     - Updated system prompt with Marathon des Sables guidance (ultra-endurance focus)
     - Added "Multiple Goals" guidance for balanced workouts
     - Updated `buildUserProfileSection()` to display all goals with duration timeframe
     - Updated prompt instructions to reference multiple goals and consider timeframe
   - **Breaking Change**: Yes - Type signature changed

3. **`supabase/functions/generate-ai-workout/workout-generator.ts`**
   - **Change**: Updated workout metadata structure
   - **Details**:
     - Changed `generationParams.goal` to `generationParams.goals` (array)
     - Added `generationParams.goalDuration` field
   - **Breaking Change**: Yes - Metadata structure changed

4. **`supabase/functions/generate-ai-workout/index.ts`**
   - **Change**: Updated logging to reference goals array
   - **Details**:
     - Updated validation logging to show `goals` array and `goalDuration`
     - Updated processing logging to show `goals` array
   - **Breaking Change**: No - Logging only

#### API Contract Changes:

**Before:**
```typescript
{
  responses: {
    goal: 'weight_loss' | 'muscle_building' | 'health_maintenance' | 'flexibility',
    // ... other fields
  }
}
```

**After:**
```typescript
{
  responses: {
    goals: Array<'weight_loss' | 'muscle_building' | 'health_maintenance' | 'flexibility' | 'marathon_des_sables'>,
    goalDuration?: number, // months (1-24)
    // ... other fields
  }
}
```

#### Valid Goals:
- `weight_loss` - Weight Loss
- `muscle_building` - Muscle Building  
- `health_maintenance` - Health Maintenance
- `flexibility` - Flexibility & Mobility
- `marathon_des_sables` - Marathon des Sables Preparation (NEW)

#### Validation Rules:
- `goals`: Required, non-empty array, all values must be valid goals
- `goalDuration`: Optional, if provided must be number between 1-24 (months)

## Frontend Changes (Already Completed)

### Updated Files:
1. `apps/frontend/src/types/aiWorkout.ts` - Type definitions
2. `apps/frontend/src/components/AIWorkoutScreen2.tsx` - Multi-select UI
3. `apps/frontend/src/utils/aiWorkoutValidation.ts` - Array validation
4. `apps/frontend/src/hooks/useAIWorkoutFlow.ts` - Data flow
5. `apps/frontend/public/locales/*/aiWorkout.json` - All 8 locales

## Deployment Plan

### Prerequisites:
- Frontend already deployed with new structure
- Backend Edge Function changes ready locally

### Deployment Steps:

1. **Deploy to Dev Environment**:
   ```powershell
   # Deploy Edge Function to dev (xwzrsfkzqxdybjrkkkvh)
   supabase functions deploy generate-ai-workout --project-ref xwzrsfkzqxdybjrkkkvh
   ```

2. **Test in Dev**:
   - Test single goal selection
   - Test multi-goal selection (2-3 goals)
   - Test with Marathon des Sables goal
   - Test with goalDuration (various values 1-24)
   - Test without goalDuration (optional field)
   - Verify AI generates appropriate workouts
   - Verify metadata stored correctly

3. **Deploy to Production**:
   ```powershell
   # Deploy Edge Function to prod (zumzzuvfsuzvvymhpymk)
   supabase functions deploy generate-ai-workout --project-ref zumzzuvfsuzvvymhpymk
   ```

4. **Monitor**:
   - Check Edge Function logs for errors
   - Monitor AI usage logs
   - Verify workout generation success rate

## Rollback Plan

If issues arise, rollback by redeploying previous version:

1. Revert local changes:
   ```powershell
   git checkout HEAD~1 -- supabase/functions/generate-ai-workout/
   ```

2. Redeploy old version:
   ```powershell
   supabase functions deploy generate-ai-workout --project-ref <PROJECT_REF>
   ```

3. Frontend will need hotfix to revert to single goal (or maintain backward compatibility)

## Testing Checklist

### Dev Environment:
- [ ] Single goal: weight_loss
- [ ] Single goal: marathon_des_sables
- [ ] Multi-goal: weight_loss + flexibility
- [ ] Multi-goal: muscle_building + marathon_des_sables
- [ ] With goalDuration: 6 months
- [ ] With goalDuration: 12 months
- [ ] Without goalDuration (undefined)
- [ ] Edge cases: empty array (should fail validation)
- [ ] Edge cases: invalid goal (should fail validation)
- [ ] Edge cases: goalDuration < 1 (should fail validation)
- [ ] Edge cases: goalDuration > 24 (should fail validation)

### Production Environment:
- [ ] Smoke test: Single goal workout generation
- [ ] Smoke test: Multi-goal workout generation
- [ ] Monitor error logs for 24 hours
- [ ] Verify user feedback

## Breaking Changes & Migration

**Breaking Change**: Yes - API contract changed

**Impact**: 
- All clients calling this Edge Function must update to send `goals` array
- Frontend already updated and deployed
- No database migration required (metadata field updated, but JSONB allows flexibility)

**Backward Compatibility**: None - this is a breaking change requiring coordinated frontend/backend deployment

## Notes

- Frontend completed: 2025-11-23
- Backend changes local only: 2025-11-23
- Deployment pending user approval
- Marathon des Sables is an ultra-endurance race requiring specialized training
- Goal duration helps AI adjust intensity and progression (e.g., 3 months = aggressive, 12 months = sustainable)

## Related Files

### Frontend:
- `apps/frontend/src/types/aiWorkout.ts`
- `apps/frontend/src/components/AIWorkoutScreen2.tsx`
- `apps/frontend/src/utils/aiWorkoutValidation.ts`
- `apps/frontend/src/utils/__tests__/aiWorkoutValidation.test.ts`
- `apps/frontend/src/hooks/useAIWorkoutFlow.ts`
- `apps/frontend/public/locales/en/aiWorkout.json`
- `apps/frontend/public/locales/fr/aiWorkout.json`
- `apps/frontend/public/locales/de/aiWorkout.json`
- `apps/frontend/public/locales/es/aiWorkout.json`
- `apps/frontend/public/locales/nl/aiWorkout.json`
- `apps/frontend/public/locales/ar/aiWorkout.json`
- `apps/frontend/public/locales/ar-EG/aiWorkout.json`
- `apps/frontend/public/locales/fy/aiWorkout.json`

### Backend:
- `supabase/functions/generate-ai-workout/index.ts`
- `supabase/functions/generate-ai-workout/security.ts`
- `supabase/functions/generate-ai-workout/prompt-builder.ts`
- `supabase/functions/generate-ai-workout/workout-generator.ts`

## Feature Addition: AI Feedback Field

**Date**: 2025-11-23 (afternoon)
**Type**: Feature Enhancement
**Status**: Local Changes Only (NOT YET DEPLOYED)

### Overview
Added AI-generated feedback field to provide contextual insights alongside workout plans. Feedback includes timeline assessment, attention points, recommendations, and encouragement.

### Files Modified:

#### Frontend:
1. **`apps/frontend/src/types/aiWorkout.ts`**
   - Added optional `feedback?: string` to `AIWorkoutResponse` interface

2. **`apps/frontend/src/hooks/useAIWorkoutFlow.ts`**
   - Added `feedback` state
   - Added `feedback` to hook return type
   - Extract and store feedback from API response
   - Reset feedback on flow reset

3. **`apps/frontend/src/components/AIWorkoutResultsModal.tsx`**
   - Added `feedback` prop to component
   - Display feedback in info-styled section with icon
   - Translation key: `results.feedbackTitle`

4. **`apps/frontend/src/pages/AIWorkoutOnboardingPage.tsx`**
   - Destructure `feedback` from hook
   - Pass `feedback` to results modal

5. **`apps/frontend/public/locales/en/aiWorkout.json`**
   - Added `results.feedbackTitle: "AI Coach Insights"`

#### Backend:
1. **`supabase/functions/generate-ai-workout/prompt-builder.ts`**
   - Updated OUTPUT FORMAT in system prompt to include `feedback` field
   - Added instructions: "Personalized feedback message for the user. Include: realistic timeline assessment, attention points based on their profile (injuries, fitness level, goals), motivation, and any important recommendations. Keep it concise (2-4 sentences) and encouraging."

2. **`supabase/functions/generate-ai-workout/workout-generator.ts`**
   - Added `feedback?: string` to `AIWorkoutResponse` interface
   - Return feedback along with workouts from `generateWorkouts()`
   - Log feedback presence in success message

3. **`supabase/functions/generate-ai-workout/index.ts`**
   - Updated response to include `feedback` field
   - Changed `workouts: workouts` to `workouts: workouts.workouts` (destructure)
   - Added `feedback: workouts.feedback`

### Breaking Changes
**No** - This is an additive change. Feedback field is optional in response.

### Example AI Feedback
```
Your 3-month timeline for Marathon des Sables preparation is ambitious given your intermediate fitness level. Consider extending to 6 months for safer progression and injury prevention. Focus on building base endurance before increasing intensity. Great that you disclosed knee issues - the workouts avoid high-impact exercises.
```

## Deployment History

### Dev Environment (xwzrsfkzqxdybjrkkkvh)
- **Initial Deploy**: 2025-11-23 (152.1kB) - Multi-goal support
- **Hotfix 1 Deploy**: 2025-11-23 (152.3kB) - Added defensive check for undefined goals array
- **Hotfix 2 Deploy**: 2025-11-23 - Fixed goalsText scope issue (ReferenceError) - NOT DEPLOYED
- **Feature Deploy**: 2025-11-23 (152.8kB) - Added AI feedback field + goalsText fix
- **Status**: ✅ Deployed Successfully
- **Dashboard**: https://supabase.com/dashboard/project/xwzrsfkzqxdybjrkkkvh/functions

#### Hotfix 1 Details:
- **Issue**: TypeError when `profile.goals` is undefined
- **Root Cause**: Edge Function tried to call `.map()` on undefined goals array
- **Fix**: Added defensive check in `prompt-builder.ts` line 148-152
  ```typescript
  const goals = Array.isArray(profile.goals) ? profile.goals : [];
  const goalsText = goals.length > 0 
    ? goals.map(g => goalLabels[g] || g).join(', ')
    : 'Not specified';
  ```

#### Hotfix 2 Details:
- **Issue**: ReferenceError: "goalsText is not defined"
- **Root Cause**: `goalsText` calculated in `buildUserProfileSection()` but used in `buildAIPrompt()`
- **Fix**: Moved `goalsText` calculation from `buildUserProfileSection` to `buildAIPrompt` scope (line 235-239)

### Production Environment (zumzzuvfsuzvvymhpymk)
- **Status**: ⏳ Pending deployment

## Approval Status

- [x] Code reviewed
- [x] Deployed to dev
- [ ] Testing completed in dev
- [ ] Ready for production deployment
- [ ] Deployed to production
- [ ] Production monitoring completed

---

## Feature Addition: User Profile System

**Date**: 2025-11-23 (evening)
**Type**: Feature Enhancement
**Status**: ✅ Implementation Complete, ⏳ Deployment Pending

### Overview
Added user profile system to store fitness information for AI Workout Builder pre-population. Users can save their profile data (gender, birth year, height/weight, goals, training preferences) to avoid re-entering information on subsequent uses.

### Database Changes

#### New Table: `user_profiles`

**Migration File**: `supabase/migrations/20251123_create_user_profiles_table.sql`

**Schema**:
```sql
CREATE TABLE user_profiles (
  -- Sync metadata (standard fields)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted boolean DEFAULT FALSE NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  
  -- Profile fields
  gender text CHECK (gender IN ('male', 'female', 'other')),
  birth_year integer CHECK (birth_year >= 1900 AND birth_year <= EXTRACT(YEAR FROM CURRENT_DATE)),
  height jsonb, -- {value: number, unit: 'cm' | 'ft-in'}
  weight jsonb, -- {value: number, unit: 'kg' | 'lbs'}
  primary_goals text[] CHECK (array_length(primary_goals, 1) >= 1),
  training_frequency text,
  preferred_training_style text,
  last_updated_from_wizard timestamptz,
  
  -- Constraints
  CONSTRAINT unique_user_profile UNIQUE (user_id)
);
```

**Indexes**:
- `idx_user_profiles_user_id` on `user_id` (WHERE deleted = FALSE)
- `idx_user_profiles_owner_id` on `owner_id` (WHERE deleted = FALSE)
- `idx_user_profiles_updated_at` on `updated_at` (WHERE deleted = FALSE)

**RLS Policies**:
- `user_profiles_select_policy`: Users can read their own profile
- `user_profiles_insert_policy`: Users can create their own profile
- `user_profiles_update_policy`: Users can update their own profile
- `user_profiles_delete_policy`: Users can delete their own profile

**Triggers**:
- `update_user_profiles_updated_at`: Auto-update `updated_at` and increment `version` on UPDATE

**Key Features**:
- One profile per user (enforced by UNIQUE constraint)
- Soft delete pattern for sync compatibility
- Version tracking for conflict resolution
- JSONB for height/weight to support multiple units
- Array type for primary_goals (supports multiple goals)

### Frontend Changes

#### IndexedDB Schema Changes

**Dexie Version**: Upgraded from v25 to v26

**New Table**: `user_profiles`
```typescript
user_profiles: 'id, user_id, owner_id, updated_at, created_at, deleted, version, dirty'
```

#### New Files

1. **`apps/frontend/src/types/userProfile.ts`**
   - `UserProfile` interface extending SyncMetadata
   - `ProfileToFormMapping` interface for type safety
   - Fields: gender, birth_year, height, weight, primary_goals, training_frequency, preferred_training_style

2. **`apps/frontend/src/utils/profileConversion.ts`**
   - `profileToScreen1()`: Convert profile to Screen1Data (calculates age from birth_year)
   - `profileToScreen2()`: Convert profile to Screen2Data  
   - `profileToScreen3()`: Convert profile to Screen3Data
   - `formDataToProfile()`: Convert form data back to profile (converts age to birth_year)

#### Modified Files

1. **`apps/frontend/src/services/storageService.ts`**
   - Added `user_profiles` table to RepCueDatabase class
   - New methods:
     * `getUserProfile()`: Fetch user's profile
     * `saveUserProfile(profileData)`: Create or update profile
     * `deleteUserProfile()`: Soft delete profile

2. **`apps/frontend/src/services/correctSyncService.ts`**
   - Added `'user_profiles'` to SYNC_ORDER array (after app_settings, before exercises)

3. **`apps/frontend/src/types/aiWorkout.ts`**
   - Added `saveToProfile: boolean` field to `Screen3Data` interface

4. **`apps/frontend/src/hooks/useAIWorkoutFlow.ts`**
   - Added profile loading on mount (useEffect)
   - Pre-populates form data if profile exists
   - Added profile saving to submit function (if checkbox checked)

5. **`apps/frontend/src/components/AIWorkoutScreen3.tsx`**
   - Added "Save to Profile" checkbox component
   - Checkbox defaults to checked
   - Accessible with aria-describedby

#### Translation Keys Added

**All 8 Locales** (`public/locales/*/aiWorkout.json`):
- `screen3.saveToProfile.label`: "Save to my profile" (+ translations)
- `screen3.saveToProfile.description`: "Save this information to pre-fill future AI Workout Builder sessions..." (+ translations)

**Languages**: en, fr, de, es, nl, ar, ar-EG, fy

### Deployment Checklist

#### Pre-Deployment
- [x] Migration file created
- [x] RLS policies defined
- [x] Indexes created
- [x] Triggers configured
- [x] Frontend schema updated (Dexie v26)
- [x] Sync service configured
- [x] Translations added (all 8 locales)
- [x] Profile conversion utilities implemented
- [x] Storage service methods implemented
- [x] UI components updated

#### Dev Environment Deployment
- [ ] Apply migration via MCP: `mcp_supabase_apply_migration`
- [ ] Verify table creation: `mcp_supabase_list_tables`
- [ ] Test profile creation
- [ ] Test profile update
- [ ] Test form pre-population
- [ ] Test sync to Supabase
- [ ] Verify RLS policies work correctly

#### Production Environment Deployment
- [ ] Backup production database
- [ ] Apply migration via MCP: `mcp_supabase-prod_apply_migration`
- [ ] Verify table creation: `mcp_supabase-prod_list_tables`
- [ ] Test profile creation
- [ ] Test profile update
- [ ] Test form pre-population
- [ ] Test sync to Supabase
- [ ] Verify RLS policies work correctly
- [ ] Monitor for errors in first 24 hours

### Rollback Plan

If issues are encountered:

1. **Frontend Rollback**:
   - Revert to previous commit
   - Dexie will handle schema downgrade automatically

2. **Database Rollback**:
   ```sql
   -- Remove RLS policies
   DROP POLICY user_profiles_select_policy ON user_profiles;
   DROP POLICY user_profiles_insert_policy ON user_profiles;
   DROP POLICY user_profiles_update_policy ON user_profiles;
   DROP POLICY user_profiles_delete_policy ON user_profiles;
   
   -- Drop trigger
   DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
   
   -- Drop table
   DROP TABLE user_profiles;
   ```

### Security Considerations

#### Data Privacy
- Profile data contains PII (birth_year, height, weight)
- RLS policies ensure users can only access their own profile
- Soft delete pattern preserves data for sync conflict resolution
- Users can delete profile via deleteUserProfile() method

#### Access Control
- All queries filtered by `auth.uid()` in RLS policies
- One profile per user enforced by UNIQUE constraint
- Owner_id and user_id both verified for write operations

#### Consent
- Profile creation requires user consent (ConsentService check)
- All storage operations gated by consent
- Profile can be fully deleted via erasure path

### Performance Considerations

#### Database
- Indexes on user_id, owner_id, updated_at for fast queries
- JSONB for height/weight (flexible, indexed if needed)
- Soft delete filter on indexes to exclude deleted records

#### Frontend
- Profile loaded once on mount (cached in component state)
- Conversion utilities are pure functions (no side effects)
- Sync happens in background (non-blocking)

### Related Files

#### Types:
- `apps/frontend/src/types/userProfile.ts`
- `apps/frontend/src/types/aiWorkout.ts`

#### Utilities:
- `apps/frontend/src/utils/profileConversion.ts`

#### Services:
- `apps/frontend/src/services/storageService.ts`
- `apps/frontend/src/services/correctSyncService.ts`

#### Components:
- `apps/frontend/src/components/AIWorkoutScreen3.tsx`
- `apps/frontend/src/hooks/useAIWorkoutFlow.ts`

#### Translations:
- `apps/frontend/public/locales/*/aiWorkout.json` (all 8 locales)

#### Database:
- `supabase/migrations/20251123_create_user_profiles_table.sql`

### Notes

- Birth year stored instead of age (age changes, birth year doesn't)
- Height/weight use JSONB to support multiple unit systems
- Profile updates are optional (user controls via checkbox)
- Pre-population improves UX for returning users
- Offline-first architecture maintained (IndexedDB primary, Supabase secondary)
- Checkbox defaults to checked for better profile adoption

---

**Last Updated**: 2025-11-23  
**Author**: AI Assistant  
**Status**: Deployed to Dev - Awaiting Testing & Production Deployment

---

## Migration: Move Gender from Fitness JSONB to Main Profile Column

**Date**: 2025-11-23 (late evening)
**Type**: Schema Refactoring
**Status**:  Local Changes Complete,  Deployment Pending

### Overview
Moved `gender` field from the `fitness` JSONB object to a dedicated column in the `user_profiles` table.

### Rationale
1. **Performance**: Direct column access faster than JSONB queries
2. **Type Safety**: Database-level validation with CHECK constraint
3. **Indexing**: Efficient index on gender for analytics
4. **Clarity**: Gender is common demographic info, not fitness-specific

### Changes Made

#### Frontend
- **types/userProfile.ts**: Moved gender from FitnessProfileData to UserProfile interface
- **utils/profileConversion.ts**: Updated conversion functions to read/write gender from main profile

#### Database
- **Migration**: supabase/migrations/20251123_move_gender_to_main_profile.sql
- **Action**: DROP and RECREATE user_profiles table with gender column
- **New Column**: `gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say'))`
- **New Index**: idx_user_profiles_gender

### Deployment Status
- [x] Frontend types updated
- [x] Conversion utilities updated
- [x] Migration file created
- [ ] Applied to dev environment
- [ ] Applied to prod environment

### Files Changed
- apps/frontend/src/types/userProfile.ts
- apps/frontend/src/utils/profileConversion.ts
- supabase/migrations/20251123_move_gender_to_main_profile.sql

