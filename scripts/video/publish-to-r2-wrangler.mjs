#!/usr/bin/env node
/**
 * RepCue Video Publisher - Upload exercise videos to Cloudflare R2 using Wrangler
 * 
 * Uploads encoded exercise videos to R2 with content-based hashing for immutability.
 * Uses Wrangler CLI for authentication (no API keys needed).
 * 
 * Usage:
 *   node scripts/video/publish-to-r2-wrangler.mjs [options]
 * 
 * Options:
 *   --dir=<path>          Source directory for encoded videos (required)
 *   --bucket=<name>       R2 bucket name (default: repcue-videos)
 *   --dry-run             Show actions without uploading
 *   --force               Upload even if file exists (skip check)
 * 
 * Prerequisites:
 *   - wrangler CLI installed: npm install -g wrangler
 *   - wrangler authenticated: wrangler login
 * 
 * File Naming Convention (input):
 *   exerciseId_v1_<resolution>.<ext>
 *   Examples: plank_v1_1080.webm, pushup_v1_720.mp4
 *   Or legacy: exerciseId_v1_1920x1080.webm
 * 
 * File Naming Convention (output in R2):
 *   exerciseId_v1_<resolution>_<hash>.<ext>
 *   Hash: First 8 chars of SHA256 for immutability
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map(s => {
  const [k, v] = s.startsWith('--') ? s.slice(2).split('=') : [s, true];
  return [k, v === undefined ? true : v];
}));

const INPUT_DIR = args.dir;
const BUCKET = args.bucket || 'repcue-videos';
const DRY_RUN = !!args['dry-run'];
const FORCE = !!args.force;

if (!INPUT_DIR) {
  console.error('❌ Error: --dir=<path> is required');
  console.log('\nUsage: node scripts/video/publish-to-r2-wrangler.mjs --dir="path/to/videos"');
  process.exit(1);
}

const MAPPING_FILE = path.join(process.cwd(), 'scripts', 'video', 'upload-mapping.json');
const MEDIA_JSON_PATH = path.join('apps', 'frontend', 'public', 'exercise_media.json');

/**
 * Compute SHA256 hash of file content
 */
async function computeFileHash(filePath) {
  const buffer = await fs.readFile(filePath);
  const hash = createHash('sha256').update(buffer).digest('hex');
  return hash.slice(0, 8); // First 8 chars
}

/**
 * Get video duration in seconds using ffprobe
 */
async function getVideoDuration(filePath) {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        const duration = parseFloat(stdout.trim());
        resolve(isNaN(duration) ? null : Math.round(duration * 100) / 100); // Round to 2 decimals
      } else {
        resolve(null); // Return null if ffprobe fails
      }
    });

    proc.on('error', () => {
      resolve(null); // ffprobe not available
    });
  });
}

/**
 * Execute wrangler command
 */
function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('wrangler', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Wrangler exited with code ${code}\n${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Check if file exists in R2 bucket
 */
async function fileExistsInR2(bucket, key) {
  if (FORCE) return false;

  try {
    // Check existence using head operation (faster than get)
    const result = await runWrangler([
      'r2', 'object', 'get',
      `${bucket}/${key}`,
      '--remote',  // Check remote R2, not local
      '--pipe'
    ]);
    return true;
  } catch (err) {
    // File doesn't exist or error occurred
    return false;
  }
}

/**
 * Upload file to R2 using wrangler
 */
async function uploadToR2(bucket, key, filePath, contentType) {
  const args = [
    'r2', 'object', 'put',
    `${bucket}/${key}`,
    '--file', filePath,
    '--content-type', contentType,
    '--remote'  // Upload to actual R2, not local storage
  ];

  await runWrangler(args);
}

/**
 * Parse filename to extract exercise info
 * Formats: exerciseId_v1_1920x1080.webm or exerciseId_v1_1080.webm
 */
function inferFromName(filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  const base = path.basename(filename, path.extname(filename));

  // Try full dimensions pattern first: exerciseId_v1_WIDTHxHEIGHT
  const fullMatch = base.match(/^(.+)_v(\d+)_(\d+)x(\d+)$/);
  
  if (fullMatch) {
    const [, exerciseId, version, width, height] = fullMatch;
    const w = parseInt(width);
    const h = parseInt(height);
    
    // Determine aspect ratio
    let aspect;
    if (w === h) {
      aspect = 'square';
    } else if (w > h) {
      aspect = 'landscape';
    } else {
      aspect = 'portrait';
    }
    
    const resolution = h.toString(); // Use height as resolution
    const dimensions = `${w}x${h}`;  // Preserve full WxH
    
    return {
      exerciseId,
      version: parseInt(version),
      resolution,
      dimensions,
      aspect,
      format: ext
    };
  }
  
  // Fallback: single number (assume square)
  const simpleMatch = base.match(/^(.+)_v(\d+)_(\d+)$/);
  if (simpleMatch) {
    const [, exerciseId, version, res] = simpleMatch;
    const dimensions = `${res}x${res}`;
    
    return {
      exerciseId,
      version: parseInt(version),
      resolution: res,
      dimensions,
      aspect: 'square',
      format: ext
    };
  }
  
  throw new Error(`Invalid filename format: ${filename}. Expected: exerciseId_v1_1920x1080.webm`);
}

/**
 * Check performance budget
 */
async function checkPerformanceBudget(filePath, format) {
  const stats = await fs.stat(filePath);
  const sizeMB = stats.size / (1024 * 1024);
  
  const budgets = {
    webm: 2.0,  // 2 MB for WebM
    mp4: 3.0    // 3 MB for MP4
  };

  const budget = budgets[format] || 5.0;
  
  if (sizeMB > budget) {
    console.warn(`⚠️  Warning: ${path.basename(filePath)} exceeds budget (${sizeMB.toFixed(2)} MB > ${budget} MB)`);
    return false;
  }
  
  return true;
}

/**
 * Load existing mapping file
 */
async function loadMapping() {
  try {
    const content = await fs.readFile(MAPPING_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

/**
 * Save mapping file
 */
async function saveMapping(mapping) {
  await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2));
}

/**
 * Main upload function
 */
async function main() {
  console.log('🎬 RepCue Video Publisher (Wrangler Edition)');
  console.log(`📁 Source: ${INPUT_DIR}`);
  console.log(`🪣 Bucket: ${BUCKET}`);
  console.log(`🔍 Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Check wrangler is available
  try {
    await runWrangler(['--version']);
  } catch (err) {
    console.error('❌ Error: wrangler CLI not found or not authenticated');
    console.log('   Run: npm install -g wrangler && wrangler login');
    process.exit(1);
  }

  // Find all video files
  const files = await fs.readdir(INPUT_DIR);
  const videoFiles = files.filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));

  if (videoFiles.length === 0) {
    console.log('⚠️  No video files found in directory');
    return;
  }

  console.log(`Found ${videoFiles.length} video file(s)\n`);

  const mapping = await loadMapping();
  const results = { success: 0, skipped: 0, failed: 0, warnings: 0 };
  
  const startTime = Date.now();
  console.log(`🕐 Started at: ${new Date().toLocaleTimeString()}\n`);

  for (const file of videoFiles) {
    const filePath = path.join(INPUT_DIR, file);
    const fileStartTime = Date.now();
    
    try {
      console.log(`📹 ${file}`);

      // Parse filename
      const info = inferFromName(file);
      
      // Compute hash
      const hash = await computeFileHash(filePath);
      
      // Get video duration
      const duration = await getVideoDuration(filePath);
      
      // Build R2 key with full dimensions and hash appended
      // Format: exerciseId_v1_1920x1080_hash8.ext
      const r2Key = `${info.exerciseId}_v${info.version}_${info.dimensions}_${hash}.${info.format}`;
      console.log(`   → ${r2Key}`);
      if (duration !== null) {
        console.log(`   ⏱️  Duration: ${duration}s`);
      }

      // Check performance budget
      const budgetOk = await checkPerformanceBudget(filePath, info.format);
      if (!budgetOk) {
        results.warnings++;
      }

      if (DRY_RUN) {
        console.log(`   ✓ Would upload (dry run)`);
        results.success++;
        continue;
      }

      // Check if already exists
      const exists = await fileExistsInR2(BUCKET, r2Key);
      if (exists && !FORCE) {
        console.log(`   ⏭️  Already exists, skipping`);
        results.skipped++;
        continue;
      }

      // Upload
      const contentType = info.format === 'webm' ? 'video/webm' : 'video/mp4';
      await uploadToR2(BUCKET, r2Key, filePath, contentType);
      
      const uploadTime = ((Date.now() - fileStartTime) / 1000).toFixed(2);
      console.log(`   ✅ Uploaded successfully (${uploadTime}s)`);
      results.success++;

      // Add to mapping
      const stats = await fs.stat(filePath);
      const mappingEntry = {
        exerciseId: info.exerciseId,
        aspect: info.aspect,
        resolution: info.resolution,
        dimensions: info.dimensions,  // Full WxH for clarity
        format: info.format,
        sha256: hash,
        r2Key,
        r2Url: `/media/${r2Key}`,
        originalFile: file,
        sizeBytes: stats.size,
        uploadedAt: new Date().toISOString()
      };
      
      // Add duration if available
      if (duration !== null) {
        mappingEntry.durationSeconds = duration;
      }
      
      mapping.push(mappingEntry);

    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      results.failed++;
    }

    console.log('');
  }

  // Save mapping
  if (!DRY_RUN && mapping.length > 0) {
    await saveMapping(mapping);
    console.log(`💾 Updated ${MAPPING_FILE}`);
  }

  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const avgTime = results.success > 0 ? (totalTime / results.success).toFixed(2) : '0.00';
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Successful: ${results.success}`);
  if (results.skipped > 0) console.log(`   ⏭️  Skipped: ${results.skipped}`);
  if (results.failed > 0) console.log(`   ❌ Failed: ${results.failed}`);
  if (results.warnings > 0) console.log(`   ⚠️  Warnings: ${results.warnings}`);
  console.log(`   ⏱️  Total time: ${totalTime}s (avg: ${avgTime}s per file)`);
  console.log(`   🕐 Finished at: ${new Date().toLocaleTimeString()}`);

  // Update manifest reminder
  if (!DRY_RUN && results.success > 0) {
    console.log('\n💡 Next step: Run manifest builder');
    console.log('   node scripts/video/manifest-build.mjs');
  }

  if (results.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
