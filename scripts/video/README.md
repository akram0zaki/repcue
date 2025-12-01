# RepCue Video Processing Steps

## 0. Data Flow
Videos (local files)
    ↓
publish-to-r2-wrangler.mjs
    ├─→ Uploads to R2 (via wrangler CLI)
    └─→ Generates upload-mapping.json (local file)
         ↓
manifest-build.mjs
    ├─→ Reads upload-mapping.json (local file)
    └─→ Updates exercise_media.json (local file)

### Key Points
1. `publish-to-r2-wrangler.mjs`:
- Reads local video files
- Computes hashes and extracts metadata (duration, dimensions)
- Uploads to R2 via wrangler CLI
- Writes upload-mapping.json with all metadata

2. `manifest-build.mjs`:
- Does NOT connect to R2 - purely reads local upload-mapping.json
- Groups entries by exercise ID
- Transforms mapping structure into manifest variants structure
- Updates exercise_media.json (frontend public asset)

## 1. Encode Videos and Burn Watermark

.\scripts\video\Process-RepcueVideos.ps1 -InputDir "C:\Media\videos\anatomy" -WatermarkPath "C:\Media\logo\RepCue-1762545545946\RepCue-logo-transparent.png" -WatermarkScale 0.3 -WatermarkOpacity 0.6 -Similarity 0.30 -Blend 0.10 -Padding 20 -ShowOutput

## 2. Rename Files to Match RepCue Schema

.\scripts\video\Rename_Video_Files.ps1 -InputDir "C:\Media\videos\anatomy\out" -MappingCsv .\scripts\video\exercise-video-id-mapping.csv -Recurse -Overwrite -ShowSummary

## 3. Upload Videos to R2

### Navigate to workspace root
cd C:\Users\akram\OneDrive\Documents\Workspace\repcue

### Dry-run first (safe - shows what will happen without uploading)
node scripts/video/publish-to-r2-wrangler.mjs --dir="C:\Media\videos\anatomy\out" --dry-run

### If dry-run looks good, do the actual upload
node scripts/video/publish-to-r2-wrangler.mjs --dir="C:\Media\videos\anatomy\out"

## 4. Generate Manifest

### Generate Manifest (uses scripts/video/upload-mapping.json by default)
node scripts/video/manifest-build.mjs

