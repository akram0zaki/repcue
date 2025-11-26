#!/usr/bin/env node
/**
 * Generate thumbnail images from exercise videos
 * Extracts the first frame from each video and saves as JPG
 * 
 * Prerequisites:
 * - ffmpeg must be installed and in PATH
 * - Videos must be in the source directory
 * 
 * Usage:
 *   node scripts/generate-thumbnails.mjs
 */

import { spawn } from 'child_process';
import { readdir, mkdir, access, stat } from 'fs/promises';
import { join, basename, extname } from 'path';
import { constants } from 'fs';

const VIDEO_SOURCE_DIR = 'C:\\Users\\akram\\OneDrive\\Documents\\RepCue\\videos\\anatomy\\out';
const THUMBNAIL_OUTPUT_DIR = join(process.cwd(), 'apps', 'frontend', 'public', 'thumbnails');
const THUMBNAIL_WIDTH = 640; // Width for thumbnail (maintains aspect ratio)

/**
 * Check if ffmpeg is installed
 */
async function checkFFmpeg() {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    ffmpeg.on('error', () => resolve(false));
    ffmpeg.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Extract first frame from video as thumbnail
 */
async function generateThumbnail(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', videoPath,           // Input video
      '-ss', '00:00:00.5',       // Seek to 0.5 seconds (better frame than 0)
      '-vframes', '1',           // Extract 1 frame
      '-vf', `scale=${THUMBNAIL_WIDTH}:-1`, // Scale to width, maintain aspect ratio
      '-q:v', '2',               // Quality (2 is high quality for JPEG)
      '-y',                      // Overwrite output file
      outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed with code ${code}\n${stderr}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });
  });
}

/**
 * Get exercise ID from video filename
 * Example: "3-4-sit-ups_v1_1920x1080.mp4" -> "3-4-sit-ups"
 */
function getExerciseIdFromFilename(filename) {
  // Remove extension
  const nameWithoutExt = basename(filename, extname(filename));
  // Extract exercise ID (everything before _v1)
  const match = nameWithoutExt.match(/^(.+?)_v1/);
  return match ? match[1] : nameWithoutExt;
}

/**
 * Main execution
 */
async function main() {
  console.log('🎬 Exercise Video Thumbnail Generator\n');

  // Check if ffmpeg is installed
  console.log('Checking for ffmpeg...');
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.error('❌ Error: ffmpeg is not installed or not in PATH');
    console.error('   Please install ffmpeg: https://ffmpeg.org/download.html');
    process.exit(1);
  }
  console.log('✅ ffmpeg found\n');

  // Check if source directory exists
  try {
    await access(VIDEO_SOURCE_DIR, constants.R_OK);
  } catch (error) {
    console.error(`❌ Error: Cannot access video directory: ${VIDEO_SOURCE_DIR}`);
    process.exit(1);
  }

  // Create thumbnail output directory if it doesn't exist
  try {
    await mkdir(THUMBNAIL_OUTPUT_DIR, { recursive: true });
    console.log(`📁 Output directory: ${THUMBNAIL_OUTPUT_DIR}\n`);
  } catch (error) {
    console.error(`❌ Error creating output directory: ${error.message}`);
    process.exit(1);
  }

  // Get all video files
  let videoFiles;
  try {
    const files = await readdir(VIDEO_SOURCE_DIR);
    videoFiles = files.filter(f => /\.(mp4|webm|mov)$/i.test(f));
    console.log(`Found ${videoFiles.length} video files\n`);
  } catch (error) {
    console.error(`❌ Error reading video directory: ${error.message}`);
    process.exit(1);
  }

  if (videoFiles.length === 0) {
    console.log('No video files found. Exiting.');
    process.exit(0);
  }

  // Process each video
  let successful = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < videoFiles.length; i++) {
    const videoFile = videoFiles[i];
    const exerciseId = getExerciseIdFromFilename(videoFile);
    const videoPath = join(VIDEO_SOURCE_DIR, videoFile);
    const thumbnailPath = join(THUMBNAIL_OUTPUT_DIR, `${exerciseId}.jpg`);

    process.stdout.write(`[${i + 1}/${videoFiles.length}] ${exerciseId}... `);

    try {
      // Check if thumbnail already exists
      try {
        await access(thumbnailPath, constants.R_OK);
        console.log('⏭️  (exists)');
        successful++;
        continue;
      } catch {
        // Thumbnail doesn't exist, generate it
      }

      await generateThumbnail(videoPath, thumbnailPath);
      
      // Verify thumbnail was created
      const stats = await stat(thumbnailPath);
      if (stats.size > 0) {
        console.log(`✅ (${(stats.size / 1024).toFixed(1)} KB)`);
        successful++;
      } else {
        console.log('❌ (0 bytes)');
        failed++;
        errors.push({ video: videoFile, error: 'Generated file is empty' });
      }
    } catch (error) {
      console.log(`❌ ${error.message}`);
      failed++;
      errors.push({ video: videoFile, error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach(({ video, error }) => {
      console.log(`  - ${video}: ${error}`);
    });
  }

  console.log(`\n📁 Thumbnails saved to: ${THUMBNAIL_OUTPUT_DIR}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Review generated thumbnails');
  console.log('   2. Run: node scripts/update-media-index.mjs (to add thumbnail paths)');
  console.log('   3. Deploy thumbnails to R2: wrangler r2 object put repcue-exercise-videos/thumbnails/...');
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
