-- Example SQL script to update changelog in app_versions table
-- Use this as a template for updating the changelog with proper JSON structure

-- Example: Update changelog for version 0.4.0 with AI Coach features
UPDATE app_versions
SET 
  changelog = '{
    "new_features": [
      "AI Coach: Personalized workout insights powered by Mistral AI",
      "Personal Records: Automatic tracking with celebration animations and confetti",
      "Coach Personas: Choose between Zen, Energy, or Logic coaching styles",
      "Post-Workout Survey: Share feedback after completing workouts",
      "Insights Carousel: Swipe through your personalized coaching insights"
    ],
    "improvements": [
      "Analytics: Enhanced muscle balance tracking across 6 muscle groups",
      "Progress Charts: Improved visualization of workout trends and patterns",
      "Celebration Sounds: Configurable audio feedback for achievements",
      "Cross-Device Sync: Personal records now sync across all your devices",
      "Offline Support: Core coaching analytics work without internet connection"
    ],
    "bug_fixes": [
      "Fixed timer interval clearing issue in workout mode",
      "Resolved coach personality dropdown overflow on mobile devices",
      "Corrected AI insight dismissal persistence across sessions",
      "Fixed database schema auto-upgrade timing issues"
    ],
    "security_updates": [
      "Enhanced JWT validation for AI insights API endpoints",
      "Implemented rate limiting (10 requests/hour per user)",
      "Added ownership validation on personal records sync operations",
      "Improved content scrubbing for AI-generated responses"
    ]
  }'::jsonb,
  updated_at = NOW()
WHERE version_number = '0.4.0';

-- Verify the update
SELECT 
  version_number,
  update_policy,
  is_active,
  jsonb_pretty(changelog) as changelog_formatted,
  updated_at
FROM app_versions
WHERE version_number = '0.4.0';

-- Example: Simpler changelog for a minor bug fix release
-- UPDATE app_versions
-- SET 
--   changelog = '{
--     "bug_fixes": [
--       "Fixed exercise video playback on iOS Safari",
--       "Corrected timer display for exercises over 60 seconds",
--       "Resolved dark mode color contrast issues"
--     ],
--     "improvements": [
--       "Faster app startup time",
--       "Reduced memory usage during long workouts"
--     ]
--   }'::jsonb
-- WHERE version_number = '0.3.9';

-- Example: Security-focused release
-- UPDATE app_versions
-- SET 
--   changelog = '{
--     "security_updates": [
--       "Updated authentication token expiration handling",
--       "Enhanced input validation for user-created exercises",
--       "Implemented additional XSS protection measures"
--     ],
--     "bug_fixes": [
--       "Fixed session timeout edge case",
--       "Corrected permissions check for shared content"
--     ]
--   }'::jsonb,
--   update_policy = 'critical'
-- WHERE version_number = '0.3.8';
