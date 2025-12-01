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
 *   --reset-mapping       Ignore existing upload mapping (re-upload all)
 *   (implicit) verify     After upload, verifies object exists before logging success
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
import fssync from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const out = {};
  const arr = argv.slice(2);
  for (let i = 0; i < arr.length; i++) {
    const token = arr[i];
    if (!token.startsWith('--')) {
      // Positional tokens are ignored for now
      continue;
    }
    const body = token.slice(2);
    const eqIdx = body.indexOf('=');
    if (eqIdx !== -1) {
      const key = body.slice(0, eqIdx);
      const val = body.slice(eqIdx + 1);
      out[key] = val;
    } else {
      const key = body;
      const next = arr[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

const args = parseArgs(process.argv);

const INPUT_DIR = args.dir;
const BUCKET = args.bucket || 'repcue-exercise-videos';
const DRY_RUN = !!args['dry-run'];
const FORCE = !!args.force;
const VERBOSE = !!args.verbose;
const RESET_MAPPING = !!args['reset-mapping'];
const ACCOUNT_ID = args['account-id'] || process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const PROFILE = args.profile || process.env.CF_PROFILE;

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
 * Resolve wrangler executable and execute commands with global flags
 */
const isWin = process.platform === 'win32';
const localWrangler = path.join(process.cwd(), 'node_modules', '.bin', isWin ? 'wrangler.cmd' : 'wrangler');

function resolveWranglerInvocation() {
  // Prefer local devDependency
  try {
    if (fssync.existsSync(localWrangler)) {
      return { cmd: localWrangler, baseArgs: [] };
    }
  } catch {}
  // Try global wrangler
  const v1 = spawnSync('wrangler', ['--version'], { shell: true, stdio: 'ignore' });
  if (v1.status === 0) {
    return { cmd: 'wrangler', baseArgs: [] };
  }
  // Fallback to npx wrangler (requires network on first run)
  const v2 = spawnSync('npx', ['wrangler', '--version'], { shell: true, stdio: 'ignore' });
  if (v2.status === 0) {
    return { cmd: 'npx', baseArgs: ['wrangler'] };
  }
  return null;
}

const wranglerInvocation = resolveWranglerInvocation();

function withGlobalFlags(args) {
  const flags = [];
  // Note: Wrangler v4 doesn't accept --account-id as a global flag for R2; use env var instead.
  if (PROFILE) {
    flags.push('--profile', PROFILE);
  }
  return [...flags, ...args];
}

function runWrangler(args, options = {}) {
  const { discardStdout = false } = options;
  if (!wranglerInvocation) {
    const installTip = 'pnpm add -D wrangler@4.47.0; pnpm exec wrangler login';
    throw new Error(`Wrangler CLI not found. Install locally then login:\n   ${installTip}`);
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(wranglerInvocation.cmd, [...wranglerInvocation.baseArgs, ...withGlobalFlags(args)], {
      stdio: ['ignore', discardStdout ? 'ignore' : 'pipe', 'pipe'],
      shell: true,
      env: {
        ...process.env,
        // Prefer CLOUDFLARE_ACCOUNT_ID; include legacy aliases for safety
        ...(ACCOUNT_ID ? { CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID, CF_ACCOUNT_ID: ACCOUNT_ID } : {}),
      }
    });

    let stdout = '';
    let stderr = '';

    if (!discardStdout) {
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(`Wrangler exited with code ${code}${stderr ? `\n${stderr}` : ''}`);
        reject(err);
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Existence check compatible with current Wrangler (no head/list):
 * Uses GET with --pipe and checks exit code. Returns true if object exists.
 */
async function fileExistsInR2(bucket, key) {
  if (FORCE) return false;
  try {
    await runWrangler(['r2','object','get', `${bucket}/${key}`, '--pipe'], { discardStdout: true });
    if (VERBOSE) console.log(`      [exist-check:get] found ${key}`);
    return true;
  } catch (err) {
    if (VERBOSE) console.log(`      [exist-check:get] missing ${key}: ${err.message}`);
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
    '--content-type', contentType
  ];

  await runWrangler(args);
}

async function verifyExistsWithRetry(bucket, key, attempts = 3) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      await runWrangler(['r2','object','get', `${bucket}/${key}`, '--pipe'], { discardStdout: true });
      return true;
    } catch (err) {
      lastErr = err;
      // backoff: 150ms, 400ms, 800ms
      const delay = i === 0 ? 150 : i === 1 ? 400 : 800;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  if (VERBOSE && lastErr) console.error(`      [verify] failed for ${key}: ${lastErr.message}`);
  return false;
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
  if (RESET_MAPPING) {
    return [];
  }
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
function dedupeMapping(mapping) {
  // Keep only the latest entry per unique r2Key; if same exercise/aspect/resolution/format repeats, keep latest uploadedAt
  const byKey = new Map();
  for (const entry of mapping) {
    const key = entry.r2Key || `${entry.exerciseId}|${entry.aspect}|${entry.resolution}|${entry.format}|${entry.sha256}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, entry);
      continue;
    }
    // Compare uploadedAt timestamps if available
    const prevTs = Date.parse(prev.uploadedAt || '');
    const currTs = Date.parse(entry.uploadedAt || '');
    if (!isNaN(currTs) && (isNaN(prevTs) || currTs >= prevTs)) {
      byKey.set(key, entry);
    }
  }
  return Array.from(byKey.values());
}

async function saveMapping(mapping) {
  const cleaned = dedupeMapping(mapping);
  await fs.writeFile(MAPPING_FILE, JSON.stringify(cleaned, null, 2));
}

/**
 * Main upload function
 */
async function main() {
  console.log('🎬 RepCue Video Publisher (Wrangler Edition)');
  console.log(`📁 Source: ${INPUT_DIR}`);
  console.log(`🪣 Bucket: ${BUCKET}`);
  console.log(`🔍 Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${RESET_MAPPING ? ' + RESET MAPPING' : ''}`);
  console.log(`🏷️  Account: ${ACCOUNT_ID || '(none)'}`);
  if (PROFILE) console.log(`👤 Profile: ${PROFILE}`);
  console.log('');

  // Check wrangler is available
  try {
    await runWrangler(['--version']);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('   Tip: Prefer local install to avoid PATH issues:');
    console.log('        pnpm add -D wrangler@4.47.0');
    console.log('        pnpm exec wrangler login');
    process.exit(1);
  }

  // Verify authentication (whoami)
  try {
    await runWrangler(['whoami'], { discardStdout: false });
  } catch {
    console.error('❌ Wrangler is installed but not authenticated.');
    console.log('   Run: pnpm exec wrangler login');
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
        console.log(`   Exists in bucket ${BUCKET}: ${r2Key}`);
        console.log(`   ⏭️  Already exists, skipping`);
        results.skipped++;
        continue;
      }

      // Upload
      const contentType = info.format === 'webm' ? 'video/webm' : 'video/mp4';
      await uploadToR2(BUCKET, r2Key, filePath, contentType);

      // Post-upload verification to ensure we don't log false positives
      const verified = await verifyExistsWithRetry(BUCKET, r2Key, 3);
      if (!verified) {
        throw new Error(`Post-upload verification failed for ${r2Key}`);
      }

      const uploadTime = ((Date.now() - fileStartTime) / 1000).toFixed(2);
      console.log(`   ✅ Uploaded successfully (${uploadTime}s)`);
      results.success++;

      // Add to mapping only after verification succeeds
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
