# Changelog Format Guide for app_versions Table

## Overview

The `changelog` column in the `app_versions` table must be properly formatted JSON with specific field names for the What's New screen to display changes correctly.

## Required JSON Structure

The changelog should be a JSON object with the following optional arrays:

```json
{
  "new_features": [
    "Feature description 1",
    "Feature description 2"
  ],
  "improvements": [
    "Improvement description 1",
    "Improvement description 2"
  ],
  "bug_fixes": [
    "Bug fix description 1",
    "Bug fix description 2"
  ],
  "security_updates": [
    "Security update description 1",
    "Security update description 2"
  ]
}
```

## Field Descriptions

- **`new_features`**: Array of strings describing new features added in this version
- **`improvements`**: Array of strings describing improvements to existing features
- **bug_fixes`**: Array of strings describing bugs that were fixed
- **`security_updates`**: Array of strings describing security improvements

## Example for AI Coach Feature

For the AI Coach Phase 1 & 2 release, here's a complete example:

```json
{
  "new_features": [
    "AI Coach: Personalized workout insights powered by Mistral AI",
    "Personal Records: Automatic tracking with celebration animations",
    "Coach Personas: Choose between Zen, Energy, or Logic coaching styles",
    "Post-Workout Survey: Share feedback to improve your experience",
    "Insights Carousel: Swipe through your coaching insights"
  ],
  "improvements": [
    "Analytics: Enhanced muscle balance tracking across 6 muscle groups",
    "Progress Charts: Improved visualization of workout trends",
    "Celebration Sounds: Configurable audio feedback for achievements",
    "Cross-Device Sync: Personal records now sync across all your devices",
    "Offline Support: Core coaching analytics work without internet"
  ],
  "bug_fixes": [
    "Fixed timer interval clearing issue in workout mode",
    "Resolved coach personality dropdown overflow on mobile",
    "Corrected AI insight dismissal persistence bug",
    "Fixed database schema auto-upgrade timing"
  ],
  "security_updates": [
    "Enhanced JWT validation for AI insights API",
    "Implemented rate limiting (10 requests/hour per user)",
    "Added ownership validation on personal records sync",
    "Improved content scrubbing for AI responses"
  ]
}
```

## How to Enter in Supabase

1. Navigate to Table Editor → `app_versions`
2. Find the row for your version (or insert a new one)
3. In the `changelog` column, click to edit
4. Paste the properly formatted JSON (see examples above)
5. Ensure `is_active` is set to `true` for the latest version
6. Set the appropriate `update_policy` ('force', 'critical', or 'optional')

## Common Mistakes

### ❌ Wrong: Plain text
```
"New features and bug fixes"
```

### ❌ Wrong: Unstructured JSON
```json
{
  "changes": "Added AI coach and fixed bugs"
}
```

### ❌ Wrong: Single string instead of array
```json
{
  "new_features": "AI Coach feature"
}
```

### ✅ Correct: Structured arrays
```json
{
  "new_features": ["AI Coach feature"],
  "improvements": ["Better performance"]
}
```

## Testing

After updating the changelog:

1. Open the app
2. Go to Settings → App Updates
3. Click "Check for Updates"
4. The What's New screen should display your changelog entries
5. Verify each section appears with proper formatting

## Troubleshooting

### "No Detailed Changes Available" Shows Instead

**Cause**: The changelog JSON is either:
- Empty (`{}`)
- Null
- Missing the expected field names
- Not valid JSON

**Solution**:
1. Verify JSON is valid using a JSON validator
2. Ensure field names match exactly: `new_features`, `improvements`, `bug_fixes`, `security_updates`
3. Confirm each field is an array of strings
4. Check that `is_active = true` for this version

### Changes Don't Appear

**Cause**: Version comparison issue or caching

**Solution**:
1. Verify `version_number` is higher than current app version
2. Check `is_active = true`
3. Clear app cache: Settings → Force Refresh App
4. Restart the app

## API Response Format

The `check-version` edge function returns the changelog as-is from the database:

```typescript
interface VersionCheckResponse {
  update_available: boolean;
  latest_version: string;
  changelog?: {
    new_features?: string[];
    improvements?: string[];
    bug_fixes?: string[];
    security_updates?: string[];
  };
  // ... other fields
}
```

## Best Practices

1. **Be Specific**: Write clear, user-facing descriptions
2. **Keep it Short**: Each item should be one sentence
3. **User Perspective**: Write from the user's point of view, not technical jargon
4. **Prioritize**: List most important changes first
5. **Limit Items**: Aim for 3-5 items per category for readability
6. **Test First**: Always test in development before updating production

## Version History Example

| Version | New Features | Improvements | Bug Fixes | Security |
|---------|-------------|--------------|-----------|----------|
| 0.4.0 | 5 items | 5 items | 4 items | 4 items |
| 0.3.9 | 3 items | 2 items | 5 items | 1 item |
| 0.3.8 | 2 items | 4 items | 3 items | 2 items |

## Related Documentation

- Update System Overview: `docs/update-system.md`
- Database Schema: `supabase/migrations/20250919-03-create-app-versions-table.sql`
- Edge Function: `supabase/functions/check-version/index.ts`
- Frontend Components:
  - `apps/frontend/src/components/WhatsNewOverlay.tsx`
  - `apps/frontend/src/components/ChangelogModal.tsx`
