# Wrangler CLI Migration - R2 Upload Simplification

**Date**: November 9, 2025  
**Status**: ✅ Complete  
**Impact**: Simplified R2 video upload process, eliminated credential complexity

## Summary

Migrated from AWS SDK v3 to Wrangler CLI for R2 video uploads, eliminating the need for complex credential management and API token configuration.

## Problem Solved

### Original Approach (AWS SDK v3)
- Required Account API Tokens with specific format
- Complex credential derivation (token value + SHA-256 hash)
- Token length validation issues (40 chars vs expected 32 chars)
- Environment variable management
- Additional dependency: `@aws-sdk/client-s3`

### Issues Encountered
1. Cloudflare Account API Tokens are 40 characters
2. R2 expected 32-character Access Key IDs
3. Documentation mismatch between legacy and modern token systems
4. Credential complexity created onboarding friction

## New Approach (Wrangler CLI)

### Benefits
✅ **No credentials needed**: Uses `wrangler login` authentication  
✅ **Simpler setup**: One-time login, then ready to use  
✅ **Better DX**: Integrated with Cloudflare ecosystem  
✅ **No dependencies**: Wrangler already installed for Pages deployment  
✅ **Consistent**: Same auth method used for other Cloudflare operations

### Implementation
Created new script: `scripts/video/publish-to-r2-wrangler.mjs`

```javascript
// Upload using wrangler CLI
await runWrangler([
  'r2', 'object', 'put',
  `${bucket}/${key}`,
  '--file', filePath,
  '--content-type', contentType
]);
```

## Files Modified

### New Files
- `scripts/video/publish-to-r2-wrangler.mjs` - Primary upload script using wrangler

### Updated Files
- `scripts/video/publish-to-r2.mjs` - Marked as DEPRECATED/LEGACY
- `scripts/video/verify-r2-objects.mjs` - Marked as DEPRECATED/LEGACY
- `docs/implementation-plans/video-hosting/video-hosting-implementation-plan.md`
- `docs/implementation-plans/video-hosting/R2-MIGRATION-README.md`
- `package.json` - Added comment about AWS SDK being legacy

### Deprecated Files (kept for reference)
- `scripts/video/publish-to-r2.mjs` (AWS SDK version)
- `scripts/video/verify-r2-objects.mjs` (AWS SDK version)

## Usage Comparison

### Before (AWS SDK - DEPRECATED)
```powershell
# Set up credentials
$env:CLOUDFLARE_ACCOUNT_ID = "your-account-id"
$env:R2_ACCESS_KEY_ID = "32-char-token-id"
$env:R2_SECRET_ACCESS_KEY = "64-char-sha256-hash"

# Upload
node scripts/video/publish-to-r2.mjs --dir="path/to/videos"
```

### After (Wrangler - RECOMMENDED)
```powershell
# One-time authentication
wrangler login

# Upload (no credentials needed)
node scripts/video/publish-to-r2-wrangler.mjs --dir="path/to/videos"

# Update manifest
node scripts/video/manifest-build.mjs --mapping=upload-mapping.json
```

## Pilot Migration Results

Successfully uploaded 21 videos across 9 exercises:
- bear-crawl (1 variant: 848p MP4)
- bicycle-crunches (3 variants: 1080p WebM landscape/portrait/square)
- bird-dog (1 variant: 848p MP4)
- burpees (3 variants: 1080p WebM landscape/portrait/square)
- chair-squat (2 variants: 1080p WebM + MP4)
- jumping-jacks (3 variants: 1080p WebM landscape/portrait/square)
- plank (3 variants: 1080p WebM landscape/portrait/square)
- push-ups (3 variants: 1080p WebM landscape/portrait/square)
- wall-push-up (2 variants: 1080p WebM + MP4)

**Total**: 21 files uploaded successfully in ~2 minutes

## Documentation Updates

### Updated Sections
1. **R2-MIGRATION-README.md**:
   - Added ⭐ marker for recommended wrangler approach
   - Updated credential setup instructions
   - Replaced AWS SDK references with wrangler commands

2. **video-hosting-implementation-plan.md**:
   - Updated Task 5 title: "Uploader Script (Node + Wrangler CLI)"
   - Replaced dependency requirement with wrangler note
   - Updated credential requirements

3. **Script Headers**:
   - Added ⚠️ DEPRECATED warnings to AWS SDK scripts
   - Documented recommended wrangler alternative

## Lessons Learned

1. **Prefer Native Tooling**: When working with platform-specific services (like Cloudflare R2), prefer the platform's native CLI over generic SDKs
2. **Authentication Simplicity**: Managed authentication (like `wrangler login`) provides better UX than manual credential management
3. **Token Confusion**: Cloudflare has multiple token types (API tokens vs R2 access keys) - documentation should clarify which to use
4. **Gradual Migration**: Keeping legacy scripts helps with debugging and understanding what changed

## Next Steps

1. ✅ Update all documentation references to use wrangler
2. ✅ Mark AWS SDK scripts as deprecated
3. ⏳ Consider removing `@aws-sdk/client-s3` dependency after verification period
4. ⏳ Update CI workflows if they reference old scripts
5. ⏳ Full migration: Upload remaining exercises using wrangler script

## Rollback Plan

If issues arise with wrangler approach:
1. Legacy AWS SDK script still available (`publish-to-r2.mjs`)
2. Would need to properly generate R2 API tokens (32-char format)
3. Documentation for legacy approach preserved in git history

## Success Criteria

- [x] Wrangler script successfully uploads videos
- [x] No credential configuration needed
- [x] Documentation updated to recommend wrangler
- [x] Legacy scripts clearly marked as deprecated
- [x] Pilot migration completed successfully
- [ ] Team trained on new approach
- [ ] CI/CD updated to use wrangler (if applicable)

## References

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- Implementation Plan: `docs/implementation-plans/video-hosting/video-hosting-implementation-plan.md`
- Migration Tracking: `docs/migration-tracking/r2-video-migration_20251109.md`
