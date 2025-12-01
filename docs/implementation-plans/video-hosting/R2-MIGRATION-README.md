# Cloudflare R2 Video Hosting Migration - Implementation Complete

This implementation adds Cloudflare R2 video hosting support to RepCue, enabling scalable, cached delivery of exercise demo videos with multi-format and multi-resolution support.

## What Was Implemented

### 1. Core Infrastructure

#### TypeScript Types (`apps/frontend/src/types/media.ts`)
- **New variants structure** with aspect/resolution/format hierarchy
- Support for WebM (VP9) and MP4 (H.264) formats
- Multiple resolutions per aspect ratio (720p, 1080p, 1440p, 2160p)
- Optional SHA256 integrity hashes
- **Backward compatible** with legacy `video.*` paths

#### Cloudflare Pages Function (`functions/media/[[path]].ts`)
- Same-origin proxy at `/media/*` for R2 bucket access
- **Range request support** (HTTP 206) for video seeking
- **Immutable cache headers** (1-year max-age)
- Path validation and security (OWASP A01 compliance)
- Content-Type inference and proper error handling

#### Wrangler Config (`wrangler.toml`)
- R2 bucket bindings (production + preview)
- Environment-specific configurations
- Debug logging controls

### 2. Client-Side Features

#### Feature Flag (`apps/frontend/src/config/features.ts`)
- `VIDEO_R2_ENABLED`: Controls use of R2 variants vs legacy paths
- **Default: false** for gradual rollout
- Enables safe testing before production activation

#### Enhanced Video Selection (`apps/frontend/src/utils/selectVideoVariant.ts`)
- **Codec detection**: Prefers WebM, falls back to MP4
- **Aspect ratio selection**: Portrait/Landscape/Square based on viewport
- **Resolution selection**: Matches viewport size with fallback logic
- **Dual-mode support**: Works with both R2 variants and legacy paths
- Cached codec support detection for performance

### 3. Developer Tooling

#### Upload Script (`scripts/video/publish-to-r2-wrangler.mjs`) ⭐ RECOMMENDED
**Primary upload method using Wrangler CLI:**
- **No credentials needed**: Uses `wrangler login` authentication
- **Content hashing**: SHA256 with 8-char short hash in filename
- **Immutability**: Hashed filenames enable aggressive caching
- **Performance budgets**: Warns if files exceed size limits (WebM: 2MB, MP4: 3MB)
- **Upload mapping**: Generates JSON for manifest builder
- **Simpler setup**: No AWS SDK or complex credential management

#### Legacy Upload Script (`scripts/video/publish-to-r2.mjs`) ⚠️ DEPRECATED
AWS SDK v3 version - kept for reference only. Use wrangler version instead.

#### Manifest Builder (`scripts/video/manifest-build.mjs`)
New script to update `exercise_media.json`:
- Groups uploads by exercise/aspect/resolution/format
- Builds nested variants structure
- Selects default variant (prefers landscape 1080p)
- Preserves legacy paths for compatibility
- Deterministic ordering for stable git diffs
- Optional validation

### 4. Documentation

#### Migration Tracking (`docs/migration-tracking/r2-video-migration_20251109.md`)
Comprehensive tracking document with:
- Detailed change summary for all components
- Migration status checklists (infrastructure, pilot, full migration)
- Testing checklist (unit, integration, E2E, performance)
- Security checklist
- Performance targets and cost monitoring
- Rollback plan
- Open issues and future enhancements

#### Video System Guide (`docs/video-system.md`)
Existing comprehensive documentation covers:
- End-to-end architecture
- Encoding guidelines
- Client selection logic
- Caching strategies
- Security and privacy
- Developer workflows
- Troubleshooting

## File Structure

```
repcue/
├── apps/frontend/
│   ├── src/
│   │   ├── config/
│   │   │   └── features.ts (+ VIDEO_R2_ENABLED flag)
│   │   ├── types/
│   │   │   └── media.ts (+ R2 variants types)
│   │   └── utils/
│   │       └── selectVideoVariant.ts (enhanced selection)
│   └── public/
│       └── exercise_media.json (to be updated by manifest builder)
├── functions/
│   └── media/
│       └── [[path]].ts (NEW: R2 proxy)
├── scripts/video/
│   ├── publish-to-r2.mjs (enhanced with hashing)
│   └── manifest-build.mjs (NEW: manifest updater)
├── docs/
│   ├── video-system.md (existing, comprehensive)
│   ├── migration-tracking/
│   │   └── r2-video-migration_20251109.md (NEW)
│   └── implementation-plans/video-hosting/
│       ├── video-hosting-prd.md
│       └── video-hosting-implementation-plan.md
└── wrangler.toml (NEW: Cloudflare config)
```

## Next Steps

### 1. Infrastructure Setup (Manual)

#### Create R2 Buckets
```bash
# Production bucket
wrangler r2 bucket create repcue-videos

# Preview bucket (optional)
wrangler r2 bucket create repcue-videos-preview
```

#### Generate Access Keys
1. Go to Cloudflare Dashboard → R2
2. Create API Token with R2 Read & Write permissions
3. Scope to `repcue-videos` bucket only
4. Save credentials:
   - `CLOUDFLARE_ACCOUNT_ID`
   - Authenticated via `wrangler login` (no API keys needed)

#### Store Secrets
Add to GitHub repository secrets for CI/CD:
- Settings → Secrets and variables → Actions → New repository secret

### 2. Deploy Pages Function

```bash
# Build frontend
pnpm build

# Deploy to Cloudflare Pages (if using CLI)
wrangler pages deploy apps/frontend/dist
```

Or configure automatic deployment via GitHub integration.

### 3. Test Pilot Migration (5 Exercises)

#### Select Pilot Exercises
Choose diverse examples:
- 1 landscape (e.g., plank)
- 1 portrait (e.g., standing exercise)
- 1 square (e.g., core rotation)
- 2 with different durations/complexity

#### Encode Videos
```powershell
# Use existing encoding script
.\scripts\video\Process-RepcueVideos.ps1 `
  -SourceDir "C:\Videos\Pilot" `
  -OutputDir "scripts\video\encoded" `
  -Formats "webm","mp4" `
  -Resolutions "1080","720"
```

#### Upload to R2
```bash
# One-time authentication (if not already done)
wrangler login

# Dry run first (verify file discovery and hashing)
node scripts/video/publish-to-r2-wrangler.mjs --dir="path/to/encoded" --dry-run

# Real upload (uploads to R2 and generates mapping file)
node scripts/video/publish-to-r2-wrangler.mjs --dir="path/to/encoded"

# Update manifest with uploaded videos
node scripts/video/manifest-build.mjs --mapping=upload-mapping.json
```

#### Test Locally
```bash
# Build app
pnpm build

# Serve with wrangler (includes R2 binding)
wrangler pages dev apps/frontend/dist
```

**Or** use Vite preview (without R2, uses legacy paths):
```bash
pnpm preview
```

#### Validate
- [ ] Videos load via `/media/*` proxy
- [ ] Seeking works (check Network tab for 206 responses)
- [ ] WebM selected on Chrome/Firefox
- [ ] MP4 fallback on Safari
- [ ] Correct aspect ratio based on viewport
- [ ] Cache headers present (`Cache-Control: immutable`)
- [ ] No console errors

### 4. Enable Feature Flag

In `apps/frontend/src/config/features.ts`:
```typescript
export const VIDEO_R2_ENABLED = true; // Enable R2 variants
```

Rebuild and test:
```bash
pnpm build
pnpm preview
```

### 5. Full Migration

Once pilot validated:
1. Encode all remaining exercises
2. Batch upload to R2
3. Update manifest
4. Deploy to production
5. Monitor metrics (Cloudflare Analytics)
6. Gradual rollout (10% → 50% → 100%)

## Usage Examples

### Upload Videos
```bash
# Basic upload
node scripts/video/publish-to-r2.mjs

# Custom directory
node scripts/video/publish-to-r2.mjs --dir="C:\Videos\Encoded"

# Dry run (preview only)
node scripts/video/publish-to-r2.mjs --dry-run

# Force overwrite existing
node scripts/video/publish-to-r2.mjs --force

# Upload and update manifest
node scripts/video/publish-to-r2.mjs --manifest-update
```

### Update Manifest
```bash
# Basic usage (uses default mapping path)
node scripts/video/manifest-build.mjs

# Custom mapping file
node scripts/video/manifest-build.mjs --mapping="C:\Videos\mapping.json"

# Dry run
node scripts/video/manifest-build.mjs --dry-run

# With validation
node scripts/video/manifest-build.mjs --validate
```

### Test Proxy Locally
```bash
# With Wrangler (includes R2)
wrangler pages dev apps/frontend/dist

# Access test video
# http://localhost:8788/media/plank_v1_1080_a1b2c3d4.webm
```

## Performance Budget

| Format | Max Size | Target Duration |
|--------|----------|-----------------|
| WebM (VP9) | 2 MB | < 4 seconds |
| MP4 (H.264) | 3 MB | < 4 seconds |

⚠️ Upload script warns if files exceed these limits.

## Security Features

- **Path Validation**: Strict regex prevents traversal attacks
- **No Directory Listing**: Only direct file access allowed
- **Same-Origin**: CSP compliant, no third-party domains
- **Immutable Cache**: Content-based hashing prevents tampering
- **Scoped Keys**: R2 access keys limited to single bucket

## Rollback Strategy

If issues arise:

1. **Disable Feature Flag**:
   ```typescript
   export const VIDEO_R2_ENABLED = false;
   ```

2. **Revert Manifest**: Restore legacy `video.*` paths from git history

3. **Redeploy**: Build and deploy with flag disabled

4. **Fallback**: Legacy paths preserved, no data loss

## Cost Estimate

**Expected monthly cost** (100 videos, 10K users):
- Storage: 200 MB × $0.015/GB = **$0.003**
- Operations: ~1M GET × $0.36/M = **$0.36**
- **Total: < $0.40/month** ✅

Much cheaper than video hosting services!

## Testing Checklist

Before enabling in production:

- [ ] Pilot videos uploaded successfully
- [ ] Manifest updated with variants structure
- [ ] `/media/*` proxy returns 200 OK
- [ ] Range requests return 206 Partial Content
- [ ] Cache headers present and correct
- [ ] WebM selected on supporting browsers
- [ ] MP4 fallback works on Safari/iOS
- [ ] Video seeking works smoothly
- [ ] Aspect ratios correct on different viewports
- [ ] No console errors or warnings
- [ ] Performance budget met (<2MB WebM, <3MB MP4)
- [ ] Legacy exercises still work (backward compatibility)

## Troubleshooting

### Videos not loading
- Check R2 bucket exists and has files
- Verify environment variables set correctly
- Test `/media/*` endpoint directly in browser
- Check Cloudflare Pages Functions deployment status

### Wrong format selected
- Check browser console for codec detection logs
- Verify WebM files are VP9 codec (not VP8)
- Ensure MP4 files have `+faststart` flag

### Seeking doesn't work
- Check Network tab for 206 responses
- Verify Range headers sent by browser
- Test with curl: `curl -H "Range: bytes=0-1023" <url>`

### Performance issues
- Check file sizes meet budget
- Verify cache headers present
- Monitor Cloudflare Analytics for cache hit rate
- Consider encoding with higher CRF values

## Support

For questions or issues:
1. Check implementation plan: `docs/implementation-plans/video-hosting/`
2. Review migration tracking: `docs/migration-tracking/r2-video-migration_20251109.md`
3. Consult video system docs: `docs/video-system.md`
4. Contact development team

---

**Status**: ✅ Implementation complete, ready for infrastructure setup and pilot testing  
**Last Updated**: 2025-11-09  
**Feature Branch**: `feature/r2-video-bucket`
