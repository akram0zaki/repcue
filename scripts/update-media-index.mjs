#!/usr/bin/env node
/**
 * Update exercise_media.json to include thumbnail paths
 * Adds "thumbnail" field to each exercise entry
 * 
 * Usage:
 *   node scripts/update-media-index.mjs
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join, basename } from 'path';

const MEDIA_INDEX_PATH = join(process.cwd(), 'apps', 'frontend', 'public', 'exercise_media.json');
const THUMBNAIL_DIR = join(process.cwd(), 'apps', 'frontend', 'public', 'thumbnails');

async function main() {
  console.log('📝 Updating exercise_media.json with thumbnail paths\n');

  // Read existing media index
  let mediaIndex;
  try {
    const content = await readFile(MEDIA_INDEX_PATH, 'utf-8');
    mediaIndex = JSON.parse(content);
    console.log(`✅ Loaded media index: ${Object.keys(mediaIndex).length} exercises\n`);
  } catch (error) {
    console.error(`❌ Error reading media index: ${error.message}`);
    process.exit(1);
  }

  // Get list of available thumbnails
  let thumbnails;
  try {
    const files = await readdir(THUMBNAIL_DIR);
    thumbnails = new Set(
      files
        .filter(f => f.endsWith('.jpg'))
        .map(f => basename(f, '.jpg'))
    );
    console.log(`✅ Found ${thumbnails.size} thumbnail images\n`);
  } catch (error) {
    console.error(`❌ Error reading thumbnails directory: ${error.message}`);
    process.exit(1);
  }

  // Update each exercise entry
  let updated = 0;
  let missing = 0;

  for (const [exerciseId, data] of Object.entries(mediaIndex)) {
    if (thumbnails.has(exerciseId)) {
      mediaIndex[exerciseId] = {
        thumbnail: `/thumbnails/${exerciseId}.jpg`,
        ...data
      };
      console.log(`✅ ${exerciseId}`);
      updated++;
    } else {
      console.log(`⚠️  ${exerciseId} - no thumbnail found`);
      missing++;
    }
  }

  // Write updated media index
  try {
    await writeFile(
      MEDIA_INDEX_PATH,
      JSON.stringify(mediaIndex, null, 2),
      'utf-8'
    );
    console.log(`\n✅ Updated ${MEDIA_INDEX_PATH}`);
  } catch (error) {
    console.error(`❌ Error writing media index: ${error.message}`);
    process.exit(1);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Updated: ${updated} exercises`);
  console.log(`⚠️  Missing thumbnails: ${missing} exercises`);
  console.log('='.repeat(60));

  console.log('\n💡 Next steps:');
  console.log('   1. Review the updated exercise_media.json');
  console.log('   2. Test locally with: pnpm dev');
  console.log('   3. Build and deploy: pnpm build');
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
