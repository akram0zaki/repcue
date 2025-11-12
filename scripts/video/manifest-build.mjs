#!/usr/bin/env node
/**
 * RepCue Manifest Builder - Update exercise_media.json with R2 variants
 * 
 * Reads upload mapping from publish-to-r2.mjs and updates the exercise media manifest
 * with new variants structure while preserving backward compatibility with legacy video paths.
 * 
 * Usage:
 *   node scripts/video/manifest-build.mjs [options]
 * 
 * Options:
 *   --mapping=<path>    Path to upload-mapping.json (default: scripts/video/encoded/upload-mapping.json)
 *   --dry-run           Show changes without writing to manifest
 *   --validate          Validate manifest against JSON schema
 * 
 * The script:
 * - Groups uploads by exercise ID, aspect, resolution, and format
 * - Creates/updates variants structure in exercise_media.json
 * - Preserves legacy video paths for backward compatibility
 * - Ensures deterministic key ordering for stable diffs
 * - Validates entries against expected structure
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(
  process.argv.slice(2).map(s => {
    const [k, v] = s.startsWith('--') ? s.slice(2).split('=') : [s, true];
    return [k, v === undefined ? true : v];
  })
);

const MAPPING_PATH = args.mapping || 'scripts/video/upload-mapping.json';
const DRY_RUN = args['dry-run'] === true || args['dry-run'] === 'true';
const VALIDATE = args.validate === true || args.validate === 'true';
const FORMATS = (args.formats ? String(args.formats) : 'mp4,webm')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const MANIFEST_PATH = 'apps/frontend/public/exercise_media.json';

/**
 * Load existing manifest
 */
async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.log('ℹ️  Manifest does not exist, will create new one');
    return [];
  }

  try {
    const content = await readFile(MANIFEST_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to parse manifest: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Load upload mapping from publish-to-r2.mjs output
 */
async function loadMapping() {
  if (!existsSync(MAPPING_PATH)) {
    console.error(`❌ Mapping file not found: ${MAPPING_PATH}`);
    console.error('   Run publish-to-r2.mjs first to generate mapping');
    process.exit(1);
  }

  try {
    const content = await readFile(MAPPING_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to parse mapping: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Group mapping entries by exercise ID
 */
function groupByExercise(mapping) {
  const grouped = new Map();

  for (const entry of mapping) {
    const { exerciseId } = entry;
    if (!grouped.has(exerciseId)) {
      grouped.set(exerciseId, []);
    }
    grouped.get(exerciseId).push(entry);
  }

  return grouped;
}

/**
 * Build variants structure from grouped entries
 */
function buildVariants(entries) {
  const variants = {};
  let duration = null;

  for (const entry of entries) {
    const { aspect, resolution, format, r2Url, sha256, durationSeconds } = entry;

    // Filter by allowed formats
    if (!FORMATS.includes(format)) {
      continue;
    }

    // Capture duration from first entry (should be same for all variants)
    if (duration === null && durationSeconds) {
      duration = durationSeconds;
    }

    // Initialize aspect if not exists
    if (!variants[aspect]) {
      variants[aspect] = {};
    }

    // Initialize resolution if not exists
    if (!variants[aspect][resolution]) {
      variants[aspect][resolution] = {};
    }

    // Add format variant
    variants[aspect][resolution][format] = {
      url: r2Url,
      sha256,
    };
  }

  return { variants, duration };
}

/**
 * Determine default variant (prefer landscape 1080p)
 */
function selectDefault(variants) {
  // Priority: landscape > square > portrait
  // Resolution: 1080 > 720 > others
  const aspectPriority = ['landscape', 'square', 'portrait'];
  const resolutionPriority = ['1080', '720', '1440', '2160'];

  for (const aspect of aspectPriority) {
    if (!variants[aspect]) continue;

    for (const res of resolutionPriority) {
      if (variants[aspect][res]) {
        return { aspect, res };
      }
    }

    // Fallback to any available resolution
    const availableRes = Object.keys(variants[aspect])[0];
    if (availableRes) {
      return { aspect, res: availableRes };
    }
  }

  // Fallback to first available
  const firstAspect = Object.keys(variants)[0];
  const firstRes = Object.keys(variants[firstAspect])[0];
  return { aspect: firstAspect, res: firstRes };
}

/**
 * Update manifest entry with variants
 */
function updateManifestEntry(existingEntry, newVariants, duration, exerciseId) {
  // Build entry with proper key ordering
  const entry = {
    id: exerciseId,
    repsPerLoop: existingEntry?.repsPerLoop || 1,
    fps: existingEntry?.fps || 30,
  };

  // Add duration after fps if available
  if (duration !== null && duration !== undefined) {
    entry.duration = duration;
  }

  // Preserve legacy video paths if they exist
  entry.video = existingEntry?.video || {};

  // Add/update variants
  entry.variants = newVariants;

  // Set default variant
  entry.default = selectDefault(newVariants);

  return entry;
}

/**
 * Sort manifest entries for deterministic output
 */
function sortManifest(manifest) {
  return manifest.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Validate manifest structure (basic validation)
 */
function validateManifest(manifest) {
  const errors = [];

  for (const entry of manifest) {
    if (!entry.id) {
      errors.push('Entry missing id');
      continue;
    }

    if (!entry.variants && !entry.video) {
      errors.push(`${entry.id}: Missing both variants and video`);
    }

    if (entry.variants) {
      for (const [aspect, resolutions] of Object.entries(entry.variants)) {
        if (!['landscape', 'portrait', 'square'].includes(aspect)) {
          errors.push(`${entry.id}: Invalid aspect '${aspect}'`);
        }

        for (const [res, formats] of Object.entries(resolutions)) {
          if (!/^\d{3,4}$/.test(res)) {
            errors.push(`${entry.id}: Invalid resolution '${res}'`);
          }

          for (const [format, meta] of Object.entries(formats)) {
            if (!['webm', 'mp4'].includes(format)) {
              errors.push(`${entry.id}: Invalid format '${format}'`);
            }
            if (!meta.url) {
              errors.push(`${entry.id}: Missing url for ${aspect}/${res}/${format}`);
            }
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Main manifest builder
 */
async function main() {
  console.log('🔧 RepCue Manifest Builder');
  console.log(`📄 Manifest: ${MANIFEST_PATH}`);
  console.log(`📊 Mapping: ${MAPPING_PATH}`);
  console.log(`🔧 Mode: ${DRY_RUN ? 'DRY RUN' : VALIDATE ? 'VALIDATE ONLY' : 'LIVE'} | Formats: ${FORMATS.join(', ')}\n`);

  // If validate-only mode and no mapping, just validate existing manifest
  if (VALIDATE && !existsSync(MAPPING_PATH)) {
    console.log('ℹ️  Validate-only mode: skipping mapping load\n');
    const manifest = await loadManifest();
    console.log('🔍 Validating existing manifest...');
    const errors = validateManifest(manifest);
    if (errors.length > 0) {
      console.error('❌ Validation errors:');
      errors.forEach(err => console.error(`   - ${err}`));
      process.exit(1);
    }
    console.log('✅ Manifest validation passed!');
    process.exit(0);
  }

  // Load data
  const manifest = await loadManifest();
  const mapping = await loadMapping();

  console.log(`📹 Processing ${mapping.length} video entries\n`);

  // Group by exercise ID
  const grouped = groupByExercise(mapping);

  // Create manifest lookup
  const manifestMap = new Map(manifest.map(e => [e.id, e]));

  // Update manifest entries
  let updatedCount = 0;
  let createdCount = 0;

  for (const [exerciseId, entries] of grouped.entries()) {
    console.log(`📝 ${exerciseId}:`);

    const { variants, duration } = buildVariants(entries);
    const existing = manifestMap.get(exerciseId);

    if (existing) {
      console.log('   ✏️  Updating existing entry');
      updatedCount++;
    } else {
      console.log('   ➕ Creating new entry');
      createdCount++;
    }

    const updated = updateManifestEntry(existing, variants, duration, exerciseId);
    manifestMap.set(exerciseId, updated);

    // Show duration if available
    if (duration !== null && duration !== undefined) {
      console.log(`   ⏱️  Duration: ${duration}s`);
    }

    // Show variants summary
    for (const [aspect, resolutions] of Object.entries(variants)) {
      for (const [res, formats] of Object.entries(resolutions)) {
        const formatList = Object.keys(formats).join(', ');
        console.log(`      ${aspect}/${res}: ${formatList}`);
      }
    }
    console.log();
  }

  // Convert map back to array and sort
  const updatedManifest = sortManifest([...manifestMap.values()]);

  // Validate if requested
  if (VALIDATE) {
    console.log('🔍 Validating manifest...');
    const errors = validateManifest(updatedManifest);
    if (errors.length > 0) {
      console.error('❌ Validation errors:');
      errors.forEach(err => console.error(`   - ${err}`));
      process.exit(1);
    }
    console.log('✅ Validation passed\n');
  }

  // Write updated manifest
  if (!DRY_RUN) {
    const json = JSON.stringify(updatedManifest, null, 2) + '\n';
    await writeFile(MANIFEST_PATH, json, 'utf8');
    console.log('✅ Manifest updated successfully');
  } else {
    console.log('🔵 Dry run - manifest not written');
  }

  console.log('\n📈 Summary:');
  console.log(`   ➕ Created: ${createdCount} entries`);
  console.log(`   ✏️  Updated: ${updatedCount} entries`);
  console.log(`   📝 Total: ${manifestMap.size} entries`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
