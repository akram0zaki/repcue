-- Template script for inserting a new version into app_versions table
-- Replace the placeholder values with actual data for your release

-- INSTRUCTIONS:
-- 1. Update version_number to match your release (e.g., '0.5.0', '1.0.0')
-- 2. Set update_policy: 'optional' (default), 'recommended', 'critical'
-- 3. Set is_active: true to make this version active, false to keep it inactive
-- 4. Update release_date to the actual release date (or NOW() for current timestamp)
-- 5. Fill in the changelog with your features, improvements, bug fixes, and security updates
-- 6. Adjust min_supported_version if needed (versions below this will be forced to update)

INSERT INTO app_versions (
    version_number,
    build_number,
    github_build_number,
    update_policy,
    is_active,
    release_date,
    min_supported_version,
    changelog,
    release_notes_url
) VALUES (
    '0.5.0',                    -- REQUIRED: Version number (semantic versioning: major.minor.patch)
    50000,                      -- REQUIRED: Build number (increment for each build, e.g., 50000, 50001, 50002)
    'v0.5.0-build.50000',       -- REQUIRED: GitHub build number (matches CI/CD build tag)
    'optional',                 -- REQUIRED: 'optional', 'recommended', or 'critical'
    true,                       -- REQUIRED: Set to true to activate immediately, false to prepare for later
    NOW(),                      -- REQUIRED: Release date (use NOW() or specific timestamp)
    '0.3.0',                    -- OPTIONAL: Minimum supported version (older versions will be prompted to update)
    '{
        "new_features": [
            "Feature 1: Description of the new feature",
            "Feature 2: Another exciting feature",
            "Feature 3: Yet another feature"
        ],
        "improvements": [
            "Improvement 1: Better performance in X",
            "Improvement 2: Enhanced UI for Y",
            "Improvement 3: Optimized Z functionality"
        ],
        "bug_fixes": [
            "Fixed issue with timer not pausing correctly",
            "Resolved crash when switching exercises",
            "Corrected data sync issue on slow connections"
        ],
        "security_updates": [
            "Enhanced authentication token handling",
            "Improved input validation for user data",
            "Updated dependencies with security patches"
        ]
    }'::jsonb,                  -- REQUIRED: Changelog in JSONB format (at least one category should have content)
    'https://github.com/akram0zaki/repcue/releases/tag/v0.5.0'  -- OPTIONAL: URL to detailed release notes
);

-- Verify the insertion
SELECT 
    id,
    version_number,
    build_number,
    github_build_number,
    update_policy,
    is_active,
    release_date,
    min_supported_version,
    jsonb_pretty(changelog) as changelog_formatted,
    release_notes_url,
    created_at
FROM app_versions
WHERE version_number = '0.5.0'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- EXAMPLES FOR DIFFERENT RELEASE TYPES
-- ============================================================================

-- Example 1: Minor feature release (optional update)
-- INSERT INTO app_versions (version_number, build_number, github_build_number, update_policy, is_active, release_date, changelog)
-- VALUES (
--     '0.4.1',
--     40100,
--     'v0.4.1-build.40100',
--     'optional',
--     true,
--     NOW(),
--     '{
--         "new_features": [
--             "Added exercise search functionality",
--             "New workout templates for beginners"
--         ],
--         "improvements": [
--             "Faster app startup time",
--             "Improved exercise video loading"
--         ]
--     }'::jsonb
-- );

-- Example 2: Bug fix release (recommended update)
-- INSERT INTO app_versions (version_number, build_number, github_build_number, update_policy, is_active, release_date, changelog)
-- VALUES (
--     '0.4.2',
--     40200,
--     'v0.4.2-build.40200',
--     'recommended',
--     true,
--     NOW(),
--     '{
--         "bug_fixes": [
--             "Fixed critical timer sync issue",
--             "Resolved data loss on app backgrounding",
--             "Corrected dark mode contrast issues"
--         ],
--         "improvements": [
--             "Enhanced offline mode stability"
--         ]
--     }'::jsonb
-- );

-- Example 3: Security release (critical update)
-- INSERT INTO app_versions (version_number, build_number, github_build_number, update_policy, is_active, release_date, min_supported_version, changelog)
-- VALUES (
--     '0.4.3',
--     40300,
--     'v0.4.3-build.40300',
--     'critical',
--     true,
--     NOW(),
--     '0.4.0',  -- Force users below 0.4.0 to update
--     '{
--         "security_updates": [
--             "Critical security patch for authentication vulnerability",
--             "Enhanced data encryption for user information",
--             "Updated all dependencies with known vulnerabilities"
--         ],
--         "bug_fixes": [
--             "Fixed edge case in session management"
--         ]
--     }'::jsonb
-- );

-- Example 4: Major release with breaking changes
-- INSERT INTO app_versions (version_number, build_number, github_build_number, update_policy, is_active, release_date, min_supported_version, changelog, release_notes_url)
-- VALUES (
--     '1.0.0',
--     100000,
--     'v1.0.0-build.100000',
--     'critical',
--     true,
--     NOW(),
--     '0.9.0',
--     '{
--         "new_features": [
--             "Complete UI redesign with modern interface",
--             "Advanced workout analytics dashboard",
--             "Social features: share workouts with friends",
--             "Integration with fitness wearables"
--         ],
--         "improvements": [
--             "50% faster data sync",
--             "Reduced app size by 30%",
--             "Better battery optimization"
--         ],
--         "bug_fixes": [
--             "Fixed numerous minor issues from beta testing"
--         ],
--         "security_updates": [
--             "Complete security audit and hardening",
--             "New encryption for sensitive data"
--         ]
--     }'::jsonb,
--     'https://github.com/akram0zaki/repcue/releases/tag/v1.0.0'
-- );

-- ============================================================================
-- UTILITY QUERIES
-- ============================================================================

-- List all versions
-- SELECT version_number, update_policy, is_active, release_date 
-- FROM app_versions 
-- ORDER BY release_date DESC;

-- Get the currently active version
-- SELECT * FROM app_versions WHERE is_active = true ORDER BY release_date DESC LIMIT 1;

-- Deactivate a version (if needed)
-- UPDATE app_versions SET is_active = false WHERE version_number = '0.4.0';

-- Activate a version (if needed)
-- UPDATE app_versions SET is_active = true WHERE version_number = '0.5.0';
