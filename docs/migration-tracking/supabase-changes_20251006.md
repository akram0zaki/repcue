# Supabase Changes - 2025-01-06

## Edge Function Updates

### generate-ai-workout Function - Locale Support

**Date**: 2025-01-06  
**Type**: Edge Function Update  
**Environments**: Development (xwzrsfkzqxdybjrkkkvh), Production (zumzzuvfsuzvvymhpymk)

#### Changes Made

1. **prompt-builder.ts** - Added locale support to UserProfile interface:
   - Added `locale: string` field to `UserProfile` interface
   - Updated system prompt to include explicit language instructions
   - AI now receives clear instructions to generate workout names/descriptions in user's preferred language

2. **workout-generator.ts** - Pass locale to AI prompt:
   - Updated `userProfile` object construction to include `locale: request.locale`
   - Locale now flows from frontend → Edge Function → AI prompt builder

3. **System Prompt Enhancement**:
   - Added "IMPORTANT - LANGUAGE REQUIREMENT" section to AI prompt
   - Explicit mapping of locale codes to language names:
     - `ar`, `ar-EG` → Arabic (العربية)
     - `fr` → French (Français)
     - `de` → German (Deutsch)
     - `es` → Spanish (Español)
     - `nl` → Dutch (Nederlands)
     - `fy` → Frisian (Frysk)
     - `en` → English (default)

#### Deployment

```bash
# Development deployment
npx supabase functions deploy generate-ai-workout --project-ref xwzrsfkzqxdybjrkkkvh

# Production deployment
npx supabase functions deploy generate-ai-workout --project-ref zumzzuvfsuzvvymhpymk
```

**Deployment Status**: ✅ Successfully deployed to both environments

#### Testing

**Test Case**: User selects Arabic locale throughout AI workout onboarding
- **Before**: Workout titles and descriptions generated in English
- **Expected After**: Workout titles and descriptions generated in Arabic

**Validation Steps**:
1. Set app language to Arabic
2. Navigate to AI Assistant in Arabic UI
3. Complete all 3 onboarding screens in Arabic
4. Submit form and wait for AI generation
5. Verify generated workout titles are in Arabic
6. Verify generated workout descriptions are in Arabic

#### Related Changes

**Frontend Translation Updates**:
- Added missing translation keys to `public/locales/*/aiWorkout.json` (all 8 locales)
- Keys added: `loading.title`, `loading.elapsed`, `loading.tip`, `loading.slowWarning`, `loading.srAnnouncement`

**Frontend UI Fixes**:
- Fixed RTL button spacing in `WorkoutsPage.tsx` (changed `space-x-2` to `gap-2`)

#### Impact

- **User Experience**: AI-generated workouts now properly localized for all 8 supported languages
- **Accessibility**: Screen reader announcements and loading messages now translated
- **RTL Support**: Arabic and Egyptian Arabic users now have properly spaced UI elements

#### Rollback Plan

If issues arise, revert to previous version:

```bash
# Retrieve previous deployment
# Check Supabase dashboard for deployment history
# Redeploy previous version if needed
```

#### Notes

- No database schema changes required
- No migration files needed
- Edge Function changes only
- Backward compatible (locale field optional, defaults to English if not provided)
- Pre-existing lint errors in workout-generator.ts are unrelated to these changes

#### Follow-Up

- [ ] Monitor AI usage logs for language distribution
- [ ] Collect user feedback on translation quality
- [ ] Consider adding translation quality metrics
- [ ] Test all 8 locales with real users
