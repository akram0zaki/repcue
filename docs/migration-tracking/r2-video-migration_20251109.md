# Cloudflare R2 Video Hosting Migration - Implementation Tracking

**Date**: 2025-11-09  
**Feature Branch**: `feature/r2-video-bucket`  
**Related PRD**: `docs/implementation-plans/video-hosting/video-hosting-prd.md`  
**Implementation Plan**: `docs/implementation-plans/video-hosting/video-hosting-implementation-plan.md`

## Overview

This document tracks the implementation of Cloudflare R2 video hosting migration for RepCue exercise demo videos. The migration moves video storage from repository/static hosting to Cloudflare R2 with a same-origin proxy, enabling better scalability, performance, and multi-format support.

## Changes Summary

### 1. TypeScript Types (`apps/frontend/src/types/media.ts`)

**Status**: ✅ Completed

**Changes**:
- Added new type definitions for R2 variants structure:
  - `VideoFormat`: 'webm' | 'mp4'
  - `VideoAspect`: 'square' | 'portrait' | 'landscape'
  - `VideoResolution`: '720' | '1080' | '1440' | '2160'
  - `VideoVariantMeta`: Contains `url` and optional `sha256` hash
  - `ResolutionVariants`: Resolution → Format → Metadata mapping
  - `AspectVariants`: Aspect → Resolution variants mapping
  - `DefaultVariant`: Preferred aspect and resolution
- Extended `ExerciseMedia` type with:
  - `variants?: AspectVariants` (new R2 structure)
  - `default?: DefaultVariant` (selection hint)
  - Preserved legacy `video?` object for backward compatibility

**Migration Notes**:
- Backward compatible: existing code using `video.*` paths continues to work
- New variants structure optional until VIDEO_R2_ENABLED flag activated

### 2. Cloudflare Pages Function Proxy (`functions/media/[[path]].ts`)

**Status**: ✅ Completed

**Changes**:
- Created new Pages Function to proxy `/media/*` requests to R2 bucket
- **Features implemented**:
  - Path sanitization and validation (prevents traversal attacks)
  - Strict filename pattern enforcement: `^[a-z0-9_-]+_v1_\d{3,4}p?_[a-f0-9]{8,}\.(mp4|webm)$`
  - Range request support (HTTP 206 Partial Content) for seeking
  - Content-Type inference from file extension
  - Immutable cache headers (1 year max-age)
  - Error handling (400, 404, 416, 500)
  - Debug logging (gated by DEBUG env var)

**Security**:
- OWASP A01 (Broken Access Control) mitigations:
  - Reject paths with `..`, `\`, `//`
  - Regex validation of keys
  - No directory enumeration
- Additional headers:
  - `X-Content-Type-Options: nosniff`
  - `Accept-Ranges: bytes`
  - `Cache-Control: public, max-age=31536000, immutable`

**Performance**:
- Leverages Cloudflare CDN caching
- Range support enables efficient seeking
- Immutable cache headers minimize revalidation

### 3. Wrangler Configuration (`wrangler.toml`)

**Status**: ✅ Completed

**Changes**:
- Created new Wrangler config for Cloudflare Pages Functions
- R2 bucket binding: `VIDEOS` → `repcue-videos`
- Preview bucket: `repcue-videos-preview` (separate for staging)
- Environment-specific overrides:
  - Production: DEBUG=false
  - Preview: DEBUG=true
- Compatibility date: 2025-11-01

**Deployment Notes**:
- Requires R2 bucket creation: `wrangler r2 bucket create repcue-videos`
- Access keys needed (stored in GitHub Secrets):
  - `CLOUDFLARE_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`

### 4. Feature Flag (`apps/frontend/src/config/features.ts`)

**Status**: ✅ Completed

**Changes**:
- Added new feature flag: `VIDEO_R2_ENABLED`
- **Default**: `false` (disabled until pilot validation)
- **Purpose**: Controls use of new variants structure vs legacy video paths

**Rollout Strategy**:
1. Phase 1: Pilot with 5 exercises, flag OFF (test upload/manifest)
2. Phase 2: Enable in dev/staging, validate playback
3. Phase 3: Enable in production after acceptance
4. Phase 4: Remove legacy paths after full migration

### 5. Client Video Selection Logic (`apps/frontend/src/utils/selectVideoVariant.ts`)

**Status**: ✅ Completed

**Changes**:
- **Codec Detection**: 
  - Tests WebM VP9 support via `HTMLVideoElement.canPlayType`
  - Falls back to MP4 H.264 if WebM unsupported
  - Caches result for session performance
- **Aspect Ratio Selection**:
  - Portrait: aspect ratio < 0.75
  - Landscape: aspect ratio > 1.33
  - Square: everything else
- **Resolution Selection**:
  - Targets viewport max dimension
  - Prefers equal or next higher resolution
  - Falls back to highest available
- **Dual-Mode Support**:
  - Uses variants structure when VIDEO_R2_ENABLED=true
  - Falls back to legacy video paths when flag disabled or variants missing
- **Enhanced Error Handling**:
  - Graceful degradation on selection failure
  - Debug logging for troubleshooting

**Selection Priority**:
1. Preferred aspect + target resolution + WebM
2. Same aspect + lower resolution + WebM
3. Same aspect + any resolution + MP4
4. Alternative aspect + any resolution + any format

### 6. Video Upload Script (`scripts/video/publish-to-r2.mjs`)

**Status**: ✅ Completed (Enhanced)

**Changes** (enhancements to existing script):
- **Content Hashing**:
  - Computes SHA256 of each file
  - Appends 8-char short hash to filename for immutability
  - Stores full hash in upload mapping
- **Performance Budget Validation**:
  - WebM: warns if > 2 MB
  - MP4: warns if > 3 MB
  - Enforces 4-second duration recommendation
- **Skip-If-Exists Logic**:
  - HEAD request before PUT
  - `--force` flag to override
- **File Naming Support**:
  - New format: `exerciseId_v1_1080.webm`
  - Legacy format: `exerciseId_v1_1920x1080.webm`
  - Output: `exerciseId_v1_1080_a1b2c3d4.webm` (with hash)
- **Upload Mapping**:
  - Generates `upload-mapping.json` for manifest builder
  - Includes: exerciseId, resolution, format, aspect, hash, URL

**Usage**:
```bash
node scripts/video/publish-to-r2.mjs \
  --dir="scripts/video/encoded" \
  --bucket="repcue-videos" \
  --manifest-update
```

**Options**:
- `--dry-run`: Preview without uploading
- `--force`: Overwrite existing files
- `--manifest-update`: Trigger manifest builder after upload

### 7. Manifest Builder Script (`scripts/video/manifest-build.mjs`)

**Status**: ✅ Completed

**Changes**:
- **New script** to update `exercise_media.json` with R2 variants
- **Features**:
  - Reads `upload-mapping.json` from publish script
  - Groups uploads by exercise ID, aspect, resolution, format
  - Builds nested variants structure
  - Selects default variant (prefers landscape 1080p)
  - Preserves legacy video paths for compatibility
  - Deterministic key ordering for stable diffs
  - Optional validation against expected structure

**Manifest Updates**:
- Adds `variants` object with hierarchy: aspect → resolution → format
- Adds `default` object with preferred aspect/resolution
- Preserves existing `video` legacy paths
- Includes `sha256` hash for integrity verification

**Usage**:
```bash
node scripts/video/manifest-build.mjs \
  --mapping="scripts/video/encoded/upload-mapping.json" \
  --validate
```

**Options**:
- `--dry-run`: Preview without writing manifest
- `--validate`: Validate structure before writing

### 8. Documentation Updates

**Status**: ✅ Completed

**Updated Files**:
- `docs/video-system.md`: Already comprehensive, covers R2 architecture
- `docs/implementation-plans/video-hosting/`: PRD and implementation plan

**Documentation Includes**:
- End-to-end flow (encoding → upload → delivery)
- Security measures and validation
- Performance monitoring and budgets
- Troubleshooting guide
- Migration checklist

## Migration Status

### Infrastructure Setup

- [ ] **R2 Bucket Creation**
  - [ ] Create production bucket: `repcue-videos`
  - [ ] Create preview bucket: `repcue-videos-preview`
  - [ ] Generate access keys (R2-only scope)
  - [ ] Store keys in GitHub Secrets
  - [ ] Test bucket access with Wrangler CLI

- [ ] **Cloudflare Pages Configuration**
  - [ ] Deploy Pages Function to production
  - [ ] Verify `/media/*` proxy works
  - [ ] Test Range request support
  - [ ] Validate cache headers
  - [ ] Monitor initial requests

### Pilot Migration (5 Exercises)

- [ ] **Video Encoding**
  - [ ] Select pilot exercises (varied aspects/durations)
  - [ ] Encode WebM VP9 variants (1080p, 720p)
  - [ ] Encode MP4 H.264 variants (1080p, 720p)
  - [ ] Validate file sizes meet budget
  - [ ] Verify seamless looping

- [ ] **Upload & Manifest**
  - [ ] Run dry-run upload
  - [ ] Upload to production R2
  - [ ] Update manifest with variants
  - [ ] Commit manifest changes
  - [ ] Deploy to staging

- [ ] **Testing & Validation**
  - [ ] Test Chrome desktop (WebM selection)
  - [ ] Test Firefox desktop (WebM selection)
  - [ ] Test Safari desktop (MP4 fallback)
  - [ ] Test Chrome mobile (portrait aspect)
  - [ ] Test Safari iOS (MP4 + portrait)
  - [ ] Verify seeking works (Range requests)
  - [ ] Test reduced motion path
  - [ ] Verify cache hit rate >95%
  - [ ] Monitor error logs (4xx/5xx)

- [ ] **Feature Flag Activation**
  - [ ] Enable VIDEO_R2_ENABLED in staging
  - [ ] Run E2E tests
  - [ ] Collect performance metrics (TTFB)
  - [ ] User acceptance testing
  - [ ] Enable in production (gradual rollout)

### Full Migration

- [ ] **Batch Encoding**
  - [ ] Encode all remaining exercises
  - [ ] Validate performance budgets
  - [ ] Organize by aspect ratio

- [ ] **Batch Upload**
  - [ ] Upload all videos to R2
  - [ ] Monitor for errors/retries
  - [ ] Update manifest incrementally
  - [ ] Verify uploads with HEAD requests

- [ ] **Production Rollout**
  - [ ] Deploy manifest updates
  - [ ] Gradual feature flag rollout (10% → 50% → 100%)
  - [ ] Monitor metrics continuously
  - [ ] Collect user feedback

- [ ] **Legacy Cleanup**
  - [ ] Verify all exercises using variants
  - [ ] Archive legacy video files
  - [ ] Remove `/videos/*` static files from build
  - [ ] Update build scripts
  - [ ] Remove legacy fallback code (after grace period)

## Testing Checklist

### Unit Tests
- [ ] Codec detection logic
- [ ] Aspect ratio selection
- [ ] Resolution fallback ordering
- [ ] Variant URL building
- [ ] Legacy path fallback

### Integration Tests
- [ ] Manifest loading
- [ ] Variant structure validation
- [ ] Feature flag toggling
- [ ] Error handling paths

### E2E Tests
- [ ] Video playback (Chrome, Firefox, Safari)
- [ ] Seeking functionality
- [ ] Reduced motion respect
- [ ] Mobile viewports (portrait/landscape)
- [ ] Offline fallback behavior

### Performance Tests
- [ ] TTFB measurement (cached)
- [ ] Cache hit rate validation
- [ ] File size budgets
- [ ] Bandwidth consumption

## Security Checklist

- [x] Path traversal prevention (OWASP A01)
- [x] Strict filename validation (regex)
- [x] No directory enumeration
- [x] Content-Type enforcement
- [x] CSP compliance (same-origin)
- [ ] Access key rotation schedule (90 days)
- [ ] R2 bucket permissions audit
- [ ] Rate limiting configuration (Cloudflare)

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| TTFB (cached) | < 300ms | Pending validation |
| Cache Hit Rate | > 95% | Pending validation |
| WebM File Size | < 2 MB | Enforced in upload |
| MP4 File Size | < 3 MB | Enforced in upload |
| Video Duration | < 4 seconds | Recommendation only |

## Rollback Plan

### If R2 Proxy Fails
1. Set `VIDEO_R2_ENABLED = false` in features.ts
2. Revert manifest to legacy `video.*` paths
3. Redeploy application
4. Legacy paths must be preserved until full migration validated

### If Playback Issues
1. Check browser console for selection errors
2. Verify manifest structure
3. Test `/media/*` endpoint directly
4. Check Cloudflare Analytics for errors
5. Rollback feature flag if critical

## Cost Monitoring

### Expected Monthly Cost (100 videos, 10K users)

| Component | Calculation | Cost |
|-----------|-------------|------|
| Storage | 200 MB × $0.015/GB | $0.003 |
| Class B Operations | ~1M GET/HEAD × $0.36/M | $0.36 |
| Class A Operations | Minimal PUT/LIST | $0.01 |
| Bandwidth | Egress free | $0.00 |
| **Total** | | **< $0.40/month** |

### Cost Safeguards
- Skip-if-exists prevents redundant uploads
- Immutable names avoid deletions
- CDN cache reduces R2 operations
- Monitor monthly via Cloudflare Analytics

## Open Issues & Questions

### Resolved
- ✅ TypeScript types for variants structure
- ✅ Pages Function Range request implementation
- ✅ Upload script hashing logic
- ✅ Manifest builder grouping logic

### Pending
- ⏳ R2 bucket creation (requires Cloudflare account access)
- ⏳ Access key generation and secret storage
- ⏳ Pilot exercise selection and encoding
- ⏳ CI/CD integration for manifest validation

### Future Enhancements
- 🔮 AV1 format support (defer until browser support mature)
- 🔮 Captions/subtitles via `.vtt` sidecar files
- 🔮 Adaptive bitrate streaming (not needed for short loops)
- 🔮 User-uploaded video R2 integration
- 🔮 Orphaned hash cleanup automation

## Related Resources

- **PRD**: `docs/implementation-plans/video-hosting/video-hosting-prd.md`
- **Implementation Plan**: `docs/implementation-plans/video-hosting/video-hosting-implementation-plan.md`
- **Video System Docs**: `docs/video-system.md`
- **Exercise Catalog**: `docs/exercise-catalog.md`

## Changelog

### 2025-11-09: Initial Implementation
- Created TypeScript types for R2 variants
- Implemented Pages Function proxy with Range support
- Created wrangler.toml configuration
- Added VIDEO_R2_ENABLED feature flag
- Enhanced client video selection with codec detection
- Updated upload script with hashing and performance budgets
- Created manifest builder script
- Documented migration in video-system.md
- Created this tracking document

---

**Next Steps**:
1. Set up R2 bucket and access keys
2. Deploy Pages Function to staging
3. Select and encode pilot videos
4. Test end-to-end flow in staging
5. Validate performance and security
6. Enable feature flag for pilot
7. Collect metrics and feedback
8. Proceed with full migration

**For questions or issues**, contact the development team or refer to the implementation plan.
